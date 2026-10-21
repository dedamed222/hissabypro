/**
 * Automatic journal entry generator from application events.
 *
 * Called AFTER the original operation has succeeded — never blocks it.
 * If accounting module is disabled or an error occurs, the generator
 * silently returns null to avoid breaking the existing workflow.
 */

import {
  postJournalEntry,
  getMappedAccount,
  getActivePeriodForDate,
  generateAccountingUUID,
} from "@/lib/accountingDatabase";
import { loadStoreData } from "@/utils/localStorage";
import { JournalEntry } from "@/types/accounting";

type SafeResult = { entry: JournalEntry | null; error?: string };

function isAccountingEnabled(): boolean {
  try {
    const store = loadStoreData() as any;
    return !!(store?.settings?.accountingModuleEnabled);
  } catch {
    return false;
  }
}

function getPeriodForDate(dateStr: string) {
  const period = getActivePeriodForDate(dateStr);
  if (!period) throw new Error(`لا توجد فترة محاسبية مفتوحة لتاريخ: ${dateStr}`);
  return period;
}

// ─── 1. Sales Invoice Entry ───────────────────────────────────────────────────

export async function generateSalesInvoiceEntry(params: {
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerId?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  costOfGoods: number;
  paymentMethod: string; // "cash" | "BANKILY" | other
  status: "paid" | "pending" | "partial";
}): Promise<SaleResult> {
  if (!isAccountingEnabled()) return { entry: null };
  try {
    const {
      invoiceId, invoiceNumber, date, customerName, customerId,
      subtotal, taxAmount, total, costOfGoods, paymentMethod, status,
    } = params;

    const period = getPeriodForDate(date);

    const arAccount = getMappedAccount("ar_customers");
    const cashAccount = getMappedAccount("cash_account");
    const bankAccount = getMappedAccount("bank_account");
    const salesAccount = getMappedAccount("sales_revenue");
    const taxAccount = getMappedAccount("sales_tax");
    const cogsAccount = getMappedAccount("cogs_expense");
    const inventoryAccount = getMappedAccount("inventory_asset");

    if (!arAccount || !cashAccount || !salesAccount) {
      throw new Error("بعض حسابات الربط غير مُعيَّنة — تحقق من إعدادات الحسابات");
    }

    const isCash = status === "paid" && paymentMethod === "cash";
    const isElectronic = status === "paid" && paymentMethod !== "cash";

    const lines: any[] = [];

    // Debit: customer AR (if credit sale) or cash/bank (if paid immediately)
    if (isCash) {
      lines.push({
        accountId: cashAccount.id,
        accountCode: cashAccount.code,
        accountNameAr: cashAccount.nameAr,
        accountNameFr: cashAccount.nameFr,
        debit: total,
        credit: 0,
        description: `تحصيل نقدي — ${invoiceNumber}`,
      });
    } else if (isElectronic && bankAccount) {
      lines.push({
        accountId: bankAccount.id,
        accountCode: bankAccount.code,
        accountNameAr: bankAccount.nameAr,
        accountNameFr: bankAccount.nameFr,
        debit: total,
        credit: 0,
        description: `تحصيل إلكتروني (${paymentMethod}) — ${invoiceNumber}`,
      });
    } else {
      // Credit sale — debit customer
      lines.push({
        accountId: arAccount.id,
        accountCode: arAccount.code,
        accountNameAr: arAccount.nameAr,
        accountNameFr: arAccount.nameFr,
        thirdPartyId: customerId || null,
        thirdPartyName: customerName,
        thirdPartyType: "customer" as const,
        debit: total,
        credit: 0,
        description: `فاتورة بيع آجل — ${invoiceNumber} — ${customerName}`,
      });
    }

    // Credit: Revenue
    lines.push({
      accountId: salesAccount.id,
      accountCode: salesAccount.code,
      accountNameAr: salesAccount.nameAr,
      accountNameFr: salesAccount.nameFr,
      debit: 0,
      credit: subtotal,
      description: `إيراد مبيعات — ${invoiceNumber}`,
    });

    // Credit: Tax (if any)
    if (taxAmount > 0 && taxAccount) {
      lines.push({
        accountId: taxAccount.id,
        accountCode: taxAccount.code,
        accountNameAr: taxAccount.nameAr,
        accountNameFr: taxAccount.nameFr,
        debit: 0,
        credit: taxAmount,
        description: `رسم قيمة مضافة — ${invoiceNumber}`,
      });
    }

    const entry = postJournalEntry(
      {
        entryDate: date,
        periodId: period.id,
        sourceDocumentType: "sales_invoice",
        sourceDocumentId: invoiceId,
        sourceDocumentRef: invoiceNumber,
        description: `فاتورة بيع رقم ${invoiceNumber} — ${customerName}`,
        status: "posted",
      },
      lines
    );

    // COGS entry (cost of goods sold) — separate entry
    if (costOfGoods > 0 && cogsAccount && inventoryAccount) {
      postJournalEntry(
        {
          entryDate: date,
          periodId: period.id,
          sourceDocumentType: "cogs",
          sourceDocumentId: invoiceId,
          sourceDocumentRef: invoiceNumber,
          description: `تكلفة البضاعة المباعة — ${invoiceNumber}`,
          status: "posted",
        },
        [
          {
            accountId: cogsAccount.id,
            accountCode: cogsAccount.code,
            accountNameAr: cogsAccount.nameAr,
            accountNameFr: cogsAccount.nameFr,
            debit: costOfGoods,
            credit: 0,
            description: `تكلفة بضاعة — ${invoiceNumber}`,
          },
          {
            accountId: inventoryAccount.id,
            accountCode: inventoryAccount.code,
            accountNameAr: inventoryAccount.nameAr,
            accountNameFr: inventoryAccount.nameFr,
            debit: 0,
            credit: costOfGoods,
            description: `تخفيض مخزون — ${invoiceNumber}`,
          },
        ]
      );
    }

    return { entry };
  } catch (err: any) {
    console.warn("[AccountingEngine] generateSalesInvoiceEntry error:", err?.message);
    return { entry: null, error: err?.message };
  }
}

type SaleResult = SafeResult;

// ─── 2. Purchase / Supply Entry ───────────────────────────────────────────────

export async function generatePurchaseEntry(params: {
  referenceId: string;
  referenceNumber: string;
  date: string;
  supplierName: string;
  supplierId?: string;
  amount: number;
  paymentMethod: string;
  isPaid: boolean;
}): Promise<SafeResult> {
  if (!isAccountingEnabled()) return { entry: null };
  try {
    const {
      referenceId, referenceNumber, date,
      supplierName, supplierId, amount, paymentMethod, isPaid,
    } = params;

    const period = getPeriodForDate(date);
    const inventoryAccount = getMappedAccount("inventory_asset");
    const apAccount = getMappedAccount("ap_suppliers");
    const cashAccount = getMappedAccount("cash_account");
    const bankAccount = getMappedAccount("bank_account");

    if (!inventoryAccount || !apAccount) {
      throw new Error("حسابات الشراء غير مُعيَّنة");
    }

    const lines: any[] = [
      {
        accountId: inventoryAccount.id,
        accountCode: inventoryAccount.code,
        accountNameAr: inventoryAccount.nameAr,
        accountNameFr: inventoryAccount.nameFr,
        debit: amount,
        credit: 0,
        description: `توريد بضاعة — ${referenceNumber}`,
      },
    ];

    if (isPaid) {
      const payAccount = paymentMethod === "cash" ? cashAccount : bankAccount || cashAccount;
      if (!payAccount) throw new Error("حساب الدفع غير معيّن");
      lines.push({
        accountId: payAccount.id,
        accountCode: payAccount.code,
        accountNameAr: payAccount.nameAr,
        accountNameFr: payAccount.nameFr,
        debit: 0,
        credit: amount,
        description: `دفع للمورد ${supplierName} — ${referenceNumber}`,
      });
    } else {
      lines.push({
        accountId: apAccount.id,
        accountCode: apAccount.code,
        accountNameAr: apAccount.nameAr,
        accountNameFr: apAccount.nameFr,
        thirdPartyId: supplierId || null,
        thirdPartyName: supplierName,
        thirdPartyType: "supplier" as const,
        debit: 0,
        credit: amount,
        description: `مستحقات مورد ${supplierName} — ${referenceNumber}`,
      });
    }

    const entry = postJournalEntry(
      {
        entryDate: date,
        periodId: period.id,
        sourceDocumentType: "purchase_invoice",
        sourceDocumentId: referenceId,
        sourceDocumentRef: referenceNumber,
        description: `شراء بضاعة — ${supplierName} — ${referenceNumber}`,
        status: "posted",
      },
      lines
    );
    return { entry };
  } catch (err: any) {
    console.warn("[AccountingEngine] generatePurchaseEntry error:", err?.message);
    return { entry: null, error: err?.message };
  }
}

// ─── 3. Expense Entry ─────────────────────────────────────────────────────────

export async function generateExpenseEntry(params: {
  expenseId: string;
  description: string;
  date: string;
  amount: number;
  category: string;
  paymentMethod: string;
}): Promise<SafeResult> {
  if (!isAccountingEnabled()) return { entry: null };
  try {
    const { expenseId, description, date, amount, category, paymentMethod } = params;
    const period = getPeriodForDate(date);

    // Map category to expense account (defaults to general expense)
    const expenseAccount = getMappedAccount("general_expense");
    const cashAccount = getMappedAccount("cash_account");
    const bankAccount = getMappedAccount("bank_account");

    if (!expenseAccount) throw new Error("حساب المصاريف غير معيّن");
    const payAccount = paymentMethod === "cash" ? cashAccount : bankAccount || cashAccount;
    if (!payAccount) throw new Error("حساب الدفع غير معيّن");

    const entry = postJournalEntry(
      {
        entryDate: date,
        periodId: period.id,
        sourceDocumentType: "expense",
        sourceDocumentId: expenseId,
        description: `مصروف: ${description}`,
        status: "posted",
      },
      [
        {
          accountId: expenseAccount.id,
          accountCode: expenseAccount.code,
          accountNameAr: expenseAccount.nameAr,
          accountNameFr: expenseAccount.nameFr,
          debit: amount,
          credit: 0,
          description,
        },
        {
          accountId: payAccount.id,
          accountCode: payAccount.code,
          accountNameAr: payAccount.nameAr,
          accountNameFr: payAccount.nameFr,
          debit: 0,
          credit: amount,
          description: `دفع مصروف — ${description}`,
        },
      ]
    );
    return { entry };
  } catch (err: any) {
    console.warn("[AccountingEngine] generateExpenseEntry error:", err?.message);
    return { entry: null, error: err?.message };
  }
}

// ─── 4. Payment / Collection Entry ───────────────────────────────────────────

export async function generatePaymentEntry(params: {
  paymentId: string;
  date: string;
  partyId?: string;
  partyName: string;
  partyType: "customer" | "supplier";
  amount: number;
  paymentMethod: string;
  description: string;
}): Promise<SafeResult> {
  if (!isAccountingEnabled()) return { entry: null };
  try {
    const { paymentId, date, partyId, partyName, partyType, amount, paymentMethod, description } = params;
    const period = getPeriodForDate(date);

    const arAccount = getMappedAccount("ar_customers");
    const apAccount = getMappedAccount("ap_suppliers");
    const cashAccount = getMappedAccount("cash_account");
    const bankAccount = getMappedAccount("bank_account");

    const payAccount = paymentMethod === "cash" ? cashAccount : bankAccount || cashAccount;
    if (!payAccount) throw new Error("حساب الصندوق/البنك غير معيّن");

    let lines: any[];

    if (partyType === "customer") {
      // Customer payment collection: Dr Cash, Cr AR
      if (!arAccount) throw new Error("حساب العملاء غير معيّن");
      lines = [
        { accountId: payAccount.id, accountCode: payAccount.code, accountNameAr: payAccount.nameAr, accountNameFr: payAccount.nameFr, debit: amount, credit: 0, description },
        { accountId: arAccount.id, accountCode: arAccount.code, accountNameAr: arAccount.nameAr, accountNameFr: arAccount.nameFr, thirdPartyId: partyId || null, thirdPartyName: partyName, thirdPartyType: "customer" as const, debit: 0, credit: amount, description: `تحصيل من العميل ${partyName}` },
      ];
    } else {
      // Supplier payment: Dr AP, Cr Cash
      if (!apAccount) throw new Error("حساب الموردين غير معيّن");
      lines = [
        { accountId: apAccount.id, accountCode: apAccount.code, accountNameAr: apAccount.nameAr, accountNameFr: apAccount.nameFr, thirdPartyId: partyId || null, thirdPartyName: partyName, thirdPartyType: "supplier" as const, debit: amount, credit: 0, description: `دفع للمورد ${partyName}` },
        { accountId: payAccount.id, accountCode: payAccount.code, accountNameAr: payAccount.nameAr, accountNameFr: payAccount.nameFr, debit: 0, credit: amount, description },
      ];
    }

    const sourceType = partyType === "customer" ? "receipt" : "payment";
    const entry = postJournalEntry(
      {
        entryDate: date,
        periodId: period.id,
        sourceDocumentType: sourceType,
        sourceDocumentId: paymentId,
        description,
        status: "posted",
      },
      lines
    );
    return { entry };
  } catch (err: any) {
    console.warn("[AccountingEngine] generatePaymentEntry error:", err?.message);
    return { entry: null, error: err?.message };
  }
}

// ─── 5. Return Entry ──────────────────────────────────────────────────────────

export async function generateReturnEntry(params: {
  returnId: string;
  returnNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  date: string;
  customerName: string;
  customerId?: string;
  total: number;
  costOfGoods: number;
  paymentMethod: string;
}): Promise<SafeResult> {
  if (!isAccountingEnabled()) return { entry: null };
  try {
    const {
      returnId, returnNumber, invoiceId, invoiceNumber,
      date, customerName, customerId, total, costOfGoods, paymentMethod,
    } = params;

    const period = getPeriodForDate(date);
    const arAccount = getMappedAccount("ar_customers");
    const cashAccount = getMappedAccount("cash_account");
    const bankAccount = getMappedAccount("bank_account");
    const salesAccount = getMappedAccount("sales_revenue");
    const cogsAccount = getMappedAccount("cogs_expense");
    const inventoryAccount = getMappedAccount("inventory_asset");

    if (!salesAccount) throw new Error("حساب المبيعات غير معيّن");

    const lines: any[] = [
      // Debit: Reverse revenue (returns reduce revenue)
      {
        accountId: salesAccount.id,
        accountCode: salesAccount.code,
        accountNameAr: salesAccount.nameAr,
        accountNameFr: salesAccount.nameFr,
        debit: total,
        credit: 0,
        description: `مرتجع بيع رقم ${returnNumber}`,
      },
    ];

    // Credit: Cash refund or AR reduction
    const payAccount = paymentMethod === "cash" ? cashAccount : bankAccount || cashAccount;
    if (payAccount) {
      lines.push({
        accountId: payAccount.id,
        accountCode: payAccount.code,
        accountNameAr: payAccount.nameAr,
        accountNameFr: payAccount.nameFr,
        debit: 0,
        credit: total,
        description: `استرداد نقدي — مرتجع ${returnNumber}`,
      });
    } else if (arAccount) {
      lines.push({
        accountId: arAccount.id,
        accountCode: arAccount.code,
        accountNameAr: arAccount.nameAr,
        accountNameFr: arAccount.nameFr,
        thirdPartyId: customerId || null,
        thirdPartyName: customerName,
        thirdPartyType: "customer" as const,
        debit: 0,
        credit: total,
        description: `خصم من ذمة العميل ${customerName} — مرتجع ${returnNumber}`,
      });
    }

    const entry = postJournalEntry(
      {
        entryDate: date,
        periodId: period.id,
        sourceDocumentType: "return",
        sourceDocumentId: returnId,
        sourceDocumentRef: returnNumber,
        description: `مرتجع بيع ${returnNumber} — ${customerName}`,
        status: "posted",
      },
      lines
    );

    // Reverse COGS (goods returned to inventory)
    if (costOfGoods > 0 && cogsAccount && inventoryAccount) {
      postJournalEntry(
        {
          entryDate: date,
          periodId: period.id,
          sourceDocumentType: "cogs",
          sourceDocumentId: returnId,
          sourceDocumentRef: returnNumber,
          description: `استرداد مخزون — مرتجع ${returnNumber}`,
          status: "posted",
        },
        [
          { accountId: inventoryAccount.id, accountCode: inventoryAccount.code, accountNameAr: inventoryAccount.nameAr, accountNameFr: inventoryAccount.nameFr, debit: costOfGoods, credit: 0, description: `استعادة مخزون مرتجع — ${returnNumber}` },
          { accountId: cogsAccount.id, accountCode: cogsAccount.code, accountNameAr: cogsAccount.nameAr, accountNameFr: cogsAccount.nameFr, debit: 0, credit: costOfGoods, description: `عكس تكلفة مرتجع — ${returnNumber}` },
        ]
      );
    }

    return { entry };
  } catch (err: any) {
    console.warn("[AccountingEngine] generateReturnEntry error:", err?.message);
    return { entry: null, error: err?.message };
  }
}
