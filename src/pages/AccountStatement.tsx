import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency, formatDate, normalizeArabic } from "@/utils/formatters";
import { loadStoreData } from "@/utils/localStorage";
import { Customer, Invoice, Return, Creditor, Debtor, Product, StoreInfo, ProductMovement } from "@/types";
import {
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  CheckCircle2,
  Calendar,
  Printer,
  User,
  Phone,
  ArrowUpDown,
  Building,
  HelpCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileSpreadsheet,
  Receipt,
  Layers,
  History,
  Loader2,
  Sparkles
} from "lucide-react";
import ExportActions from "@/components/shared/ExportActions";
import { useLocale } from "@/hooks/useLocale";
import ProfessionalStatementPrint from "@/components/accountStatement/ProfessionalStatementPrint";
import {
  getCustomers,
  getInvoices,
  getCreditors,
  getDebtors,
  getProducts,
  getReturns,
  getProductMovementsDB
} from "@/lib/database";

interface AccountTransaction {
  id: string;
  date: string;
  type: "invoice" | "return" | "creditor" | "debtor";
  description: string;
  productCode?: string;
  debit: number;
  credit: number;
  quantity?: number;
  balance?: number;
  status?: 'pending' | 'paid';
  invoiceNumber?: string;
  isArchive?: boolean;
  items?: Array<{
    productName: string;
    productCode?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export default function AccountStatement() {
  const { t } = useLocale();

  // Filters & Selected State
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerSearchInput, setCustomerSearchInput] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Raw Data Repositories
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productMovements, setProductMovements] = useState<ProductMovement[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived Account Ledger State
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<AccountTransaction[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const storeData = loadStoreData();
      setStoreInfo(storeData.storeInfo || null);

      // 1. Fetch Supabase Data safely
      let dbCusts: any[] = [];
      let dbInvs: any[] = [];
      let dbCreds: any[] = [];
      let dbDebts: any[] = [];
      let dbProds: any[] = [];
      let dbRets: any[] = [];
      let dbMovements: any[] = [];

      try {
        [dbCusts, dbInvs, dbCreds, dbDebts, dbProds, dbRets, dbMovements] = await Promise.all([
          getCustomers(),
          getInvoices(),
          getCreditors(),
          getDebtors(),
          getProducts(),
          getReturns(),
          getProductMovementsDB()
        ]);
      } catch (err) {
        console.warn("DB fetch failed, relying on local archive:", err);
      }

      // 2. Build Invoices List: DB + Local + Daily Sales
      const invMap = new Map<string, Invoice>();

      // From DB
      dbInvs.forEach((i: any) => {
        invMap.set(i.id, {
          id: i.id,
          invoiceNumber: i.invoice_number,
          customerId: i.customer_id,
          customerName: i.customer_name,
          date: i.date || (i.created_at ? i.created_at.split('T')[0] : ''),
          total: Number(i.total) || 0,
          status: i.status || "paid",
          type: i.type || "sales",
          items: (i.invoice_items || []).map((it: any) => ({
            productId: it.product_id,
            productName: it.product_name,
            productCode: "",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || 0
          })),
          products: [],
          paymentMethod: i.payment_method || "cash",
          createdAt: i.created_at || new Date().toISOString()
        });
      });

      // From Local Invoices
      (storeData.invoices || []).forEach((i: any) => {
        if (!invMap.has(i.id)) {
          invMap.set(i.id, {
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            customerId: i.customerId,
            customerName: i.customerName,
            date: i.date || (i.createdAt ? i.createdAt.split('T')[0] : ''),
            total: Number(i.total) || 0,
            status: i.status || "paid",
            type: i.type || "sales",
            items: (i.items || []).map((it: any) => ({
              productId: it.productId,
              productName: it.productName,
              productCode: it.productCode || "",
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
              total: Number(it.total) || 0
            })),
            products: [],
            paymentMethod: i.paymentMethod || "cash",
            createdAt: i.createdAt || new Date().toISOString()
          });
        }
      });

      // From Daily Sales Archive
      (storeData.dailySales || []).forEach((ds: any) => {
        const saleInvoiceId = ds.id || `sale_${ds.date}_${ds.productId}`;
        const saleInvoiceNumber = `INV-SALE-${(ds.id || '').slice(0, 8).toUpperCase() || 'DAILY'}`;
        if (!invMap.has(saleInvoiceId)) {
          const sTotal = Number(ds.total) || (Number(ds.quantity || 1) * Number(ds.unitPrice || 0));
          invMap.set(saleInvoiceId, {
            id: saleInvoiceId,
            invoiceNumber: saleInvoiceNumber,
            customerId: ds.customerId,
            customerName: ds.customerName || "عميل عام",
            date: ds.date ? ds.date.split('T')[0] : new Date().toISOString().split('T')[0],
            total: sTotal,
            status: "paid",
            type: "sales",
            items: [
              {
                productId: ds.productId || "",
                productName: ds.productName || "صنف",
                productCode: ds.productCode || "",
                quantity: Number(ds.quantity) || 1,
                price: Number(ds.unitPrice) || sTotal,
                total: sTotal
              }
            ],
            products: [],
            paymentMethod: ds.paymentMethod || "cash",
            createdAt: ds.createdAt || ds.date || new Date().toISOString()
          });
        }
      });

      setInvoices(Array.from(invMap.values()));

      // 3. Creditors (Payments received)
      const credMap = new Map<string, Creditor>();
      (storeData.creditors || []).forEach((c: any) => credMap.set(c.id, c));
      dbCreds.forEach((c: any) => {
        credMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          amount: Number(c.amount) || 0,
          date: c.date,
          productName: c.product_name,
          productCode: c.product_code,
          quantity: c.quantity,
          price: c.price,
          total: c.total,
          status: c.status || 'pending',
          createdAt: c.created_at || new Date().toISOString()
        });
      });
      setCreditors(Array.from(credMap.values()));

      // 4. Debtors (Debts)
      const debtMap = new Map<string, Debtor>();
      (storeData.debtors || []).forEach((d: any) => debtMap.set(d.id, d));
      dbDebts.forEach((d: any) => {
        debtMap.set(d.id, {
          id: d.id,
          name: d.name,
          debtorName: d.debtor_name || d.name,
          phone: d.phone || '',
          totalAmount: Number(d.total_amount) || Number(d.amount) || 0,
          amount: Number(d.amount) || 0,
          date: d.date || '',
          status: d.status || 'pending',
          products: d.products || []
        });
      });
      setDebtors(Array.from(debtMap.values()));

      // 5. Returns
      const retMap = new Map<string, Return>();
      (storeData.returns || []).forEach((r: any) => retMap.set(r.id, r));
      dbRets.forEach((r: any) => {
        retMap.set(r.id, {
          id: r.id,
          returnNumber: r.return_number,
          invoiceId: r.invoice_id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          date: r.date,
          total: Number(r.total) || 0,
          products: r.return_items || [],
          createdAt: r.created_at || new Date().toISOString()
        });
      });
      setReturns(Array.from(retMap.values()));

      // 6. Products
      const prodMap = new Map<string, Product>();
      (storeData.products || []).forEach((p: any) => prodMap.set(p.id, p));
      dbProds.forEach((p: any) => {
        prodMap.set(p.id, {
          id: p.id,
          code: p.code,
          name: p.name,
          price: p.price,
          cost: p.cost || 0,
          quantity: p.quantity || 0,
          lowStockThreshold: p.low_stock_threshold || 5,
          createdAt: p.created_at || new Date().toISOString()
        });
      });
      setProducts(Array.from(prodMap.values()));

      // 7. Product Movements (Archive transactions)
      const movMap = new Map<string, ProductMovement>();
      (storeData.productMovements || []).forEach((m: any) => {
        if (!m.isDeleted) {
          movMap.set(m.id, {
            id: m.id,
            productId: m.productId || m.product_id,
            productName: m.productName || m.product_name || '',
            productCode: m.productCode || m.product_code || '',
            customerId: m.customerId || m.customer_id,
            customerName: m.customerName || m.customer_name || '',
            invoiceId: m.invoiceId || m.invoice_id,
            invoiceNumber: m.invoiceNumber || m.invoice_number || '',
            date: m.date || '',
            quantity: Number(m.quantity) || 0,
            unitPrice: Number(m.unitPrice || m.unit_price) || 0,
            total: Number(m.total) || 0,
            costPrice: Number(m.costPrice || m.cost_price) || 0,
            type: m.type || 'sale',
            isManualItem: m.isManualItem || m.is_manual_item || false,
            notes: m.notes || '',
            createdAt: m.createdAt || m.created_at || new Date().toISOString(),
            updatedAt: m.updatedAt || m.updated_at || new Date().toISOString(),
            isDeleted: false
          });
        }
      });

      dbMovements.forEach((m: any) => {
        if (!m.is_deleted) {
          movMap.set(m.id, {
            id: m.id,
            productId: m.product_id,
            productName: m.product_name || '',
            productCode: m.product_code || '',
            customerId: m.customer_id,
            customerName: m.customer_name || '',
            invoiceId: m.invoice_id,
            invoiceNumber: m.invoice_number || '',
            date: m.date || '',
            quantity: Number(m.quantity) || 0,
            unitPrice: Number(m.unit_price) || 0,
            total: Number(m.total) || 0,
            costPrice: Number(m.cost_price) || 0,
            type: m.type || 'sale',
            isManualItem: m.is_manual_item || false,
            notes: m.notes || '',
            createdAt: m.created_at || new Date().toISOString(),
            updatedAt: m.updated_at || new Date().toISOString(),
            isDeleted: false
          });
        }
      });

      const allMovements = Array.from(movMap.values());
      setProductMovements(allMovements);

      // 8. CUSTOMERS: Comprehensive aggregation from ALL sources including Archive
      const custMap = new Map<string, Customer>();

      // From customer registers
      (storeData.customers || []).forEach((c: any) => {
        if (c.id && c.name) {
          custMap.set(c.id, {
            id: c.id,
            name: c.name.trim(),
            phone: c.phone || '',
            email: c.email,
            address: c.address,
            company: c.company,
            notes: c.notes,
            createdAt: c.createdAt || c.created_at,
            updatedAt: c.updatedAt || c.updated_at
          });
        }
      });

      dbCusts.forEach((c: any) => {
        if (c.id && c.name) {
          custMap.set(c.id, {
            id: c.id,
            name: c.name.trim(),
            phone: c.phone || '',
            email: c.email,
            address: c.address,
            company: c.company,
            notes: c.notes,
            createdAt: c.created_at,
            updatedAt: c.updated_at
          });
        }
      });

      // Helper to add customer if missing by normalized name
      const addCustomerIfMissing = (cId?: string, cName?: string, phone?: string, company?: string) => {
        const cleanName = (cName || '').trim();
        if (!cleanName || cleanName === "عميل نقدي" || cleanName === "مبيعات يومية مباشرة" || cleanName === "عميل عام") return;

        const normClean = normalizeArabic(cleanName);
        const matchExisting = Array.from(custMap.values()).find(
          c => (cId && c.id === cId) || normalizeArabic(c.name) === normClean
        );

        if (!matchExisting) {
          const tempId = cId || `cust_${cleanName.replace(/\s+/g, '_')}`;
          custMap.set(tempId, {
            id: tempId,
            name: cleanName,
            phone: phone || '',
            company: company,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      };

      // Ingest from Invoices & Daily Sales
      invMap.forEach(inv => addCustomerIfMissing(inv.customerId, inv.customerName));
      (storeData.dailySales || []).forEach((ds: any) => addCustomerIfMissing(ds.customerId, ds.customerName));

      // Ingest from Archive Product Movements (CRUCIAL for archived transactions)
      allMovements.forEach(m => addCustomerIfMissing(m.customerId, m.customerName));

      // Ingest from Creditors & Debtors
      credMap.forEach(cred => addCustomerIfMissing((cred as any).customer_id || (cred as any).customerId, cred.name, cred.phone));
      debtMap.forEach(debt => addCustomerIfMissing((debt as any).customer_id || (debt as any).customerId, debt.name || debt.debtorName, debt.phone));

      // Ingest from Returns
      retMap.forEach(ret => addCustomerIfMissing(ret.customerId, ret.customerName));

      // Sort customers alphabetically
      const sortedCustomers = Array.from(custMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'ar')
      );
      setCustomers(sortedCustomers);

    } catch (err) {
      console.error("Error loading statement data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Build the complete transaction ledger for the selected customer
  useEffect(() => {
    if (!selectedCustomer) {
      setTransactions([]);
      setFilteredTransactions([]);
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    // Normalizing customer name for robust cross-source matching
    const targetNorm = normalizeArabic(customer.name);

    const matchesCustomer = (itemCustomerId?: string, itemCustomerName?: string) => {
      if (itemCustomerId && itemCustomerId === selectedCustomer) return true;
      if (!itemCustomerName) return false;
      const itemNorm = normalizeArabic(itemCustomerName);
      if (itemNorm && targetNorm) {
        if (itemNorm === targetNorm) return true;
        // Check partial match for company/customer title variations (if long enough)
        if (targetNorm.length >= 4 && itemNorm.length >= 4) {
          if (itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm)) return true;
        }
      }
      return false;
    };

    const allTransactions: AccountTransaction[] = [];

    // 1. INVOICES (Debit: Customer owes us money for purchased goods)
    invoices
      .filter((inv) => matchesCustomer(inv.customerId, inv.customerName))
      .forEach((inv) => {
        const items = inv.items || [];
        const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        const productCodes = items
          .map(it => it.productCode || products.find(p => p.id === it.productId)?.code || '')
          .filter(Boolean)
          .join(', ');

        allTransactions.push({
          id: inv.id,
          date: inv.date ? inv.date.split('T')[0] : (inv.createdAt ? inv.createdAt.split('T')[0] : ''),
          type: "invoice",
          invoiceNumber: inv.invoiceNumber,
          description: `فاتورة بيع رقم #${inv.invoiceNumber} (${items.length} أصناف)`,
          productCode: productCodes,
          debit: Number(inv.total) || 0,
          credit: 0,
          quantity: totalQuantity,
          isArchive: false,
          items: items.map(it => ({
            productName: it.productName,
            productCode: it.productCode,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.price) || 0))
          }))
        });
      });

    // 2. RETURNS (Credit: We owe customer money / reduces their debt)
    returns
      .filter((ret) => matchesCustomer(ret.customerId, ret.customerName))
      .forEach((ret) => {
        const items = (ret.products as any[]) || [];
        const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

        allTransactions.push({
          id: ret.id,
          date: ret.date ? ret.date.split('T')[0] : (ret.createdAt ? ret.createdAt.split('T')[0] : ''),
          type: "return",
          invoiceNumber: ret.returnNumber,
          description: `مرتجع مبيعات رقم #${ret.returnNumber}`,
          productCode: '',
          debit: 0,
          credit: Number(ret.total) || 0,
          quantity: totalQuantity,
          isArchive: false,
          items: items.map((it: any) => ({
            productName: it.name || it.productName || 'صنف مرتجع',
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.price) || 0))
          }))
        });
      });

    // 3. CREDITORS (Credit: Payments / receipts received from customer)
    creditors
      .filter((cred) => matchesCustomer((cred as any).customer_id || (cred as any).customerId, cred.name))
      .forEach((cred) => {
        allTransactions.push({
          id: cred.id,
          date: cred.date ? cred.date.split('T')[0] : (cred.createdAt ? cred.createdAt.split('T')[0] : ''),
          type: "creditor",
          description: `دفعة نقدية / سند قبض من العميل - ${cred.productName || 'تسديد دفعة حساب'}`,
          productCode: cred.productCode || '',
          debit: 0,
          credit: Number(cred.amount) || Number(cred.total) || 0,
          quantity: Number(cred.quantity) || 0,
          status: cred.status,
          isArchive: false
        });
      });

    // 4. DEBTORS (Debit: Debt recorded against customer)
    debtors
      .filter((debt) => matchesCustomer((debt as any).customer_id || (debt as any).customerId, debt.name || debt.debtorName))
      .forEach((debt) => {
        const pList = (debt.products as any[]) || [];
        const totalQty = pList.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
        const pCodes = pList.map(p => p.productCode || p.product_code).filter(Boolean).join(', ');

        allTransactions.push({
          id: debt.id,
          date: debt.date ? debt.date.split('T')[0] : '',
          type: "debtor",
          description: `شراء آجل / قيد دين - ${pList[0]?.productName || debt.productName || 'بضاعة آجلة'}`,
          productCode: pCodes,
          debit: Number(debt.totalAmount) || Number(debt.amount) || 0,
          credit: 0,
          quantity: totalQty,
          status: debt.status,
          isArchive: false,
          items: pList.map((p: any) => ({
            productName: p.productName || p.name || 'صنف',
            productCode: p.productCode,
            quantity: Number(p.quantity) || 1,
            price: Number(p.price) || 0,
            total: Number(p.total) || ((Number(p.quantity) || 1) * (Number(p.price) || 0))
          }))
        });
      });

    // 5. PRODUCT MOVEMENTS (Archive - key source for old/archived transactions)
    // Group movements by invoiceNumber to reconstruct complete invoice-level transactions
    const existingInvoiceNumbers = new Set(
      allTransactions
        .filter(t => t.type === 'invoice' && t.invoiceNumber)
        .map(t => t.invoiceNumber!)
    );
    const existingInvoiceIds = new Set(
      allTransactions
        .filter(t => t.type === 'invoice')
        .map(t => t.id)
    );

    // Filter movements that belong to this customer and are sales
    const customerMovements = productMovements.filter(m => {
      if (m.isDeleted) return false;
      if (!matchesCustomer(m.customerId || undefined, m.customerName)) return false;
      if (m.type !== 'sale') return false;
      // Skip if the invoice is already present in regular invoices
      if (m.invoiceNumber && existingInvoiceNumbers.has(m.invoiceNumber)) return false;
      if (m.invoiceId && existingInvoiceIds.has(m.invoiceId)) return false;
      return true;
    });

    // Group movements by invoice identifier
    const movByInvoice = new Map<string, ProductMovement[]>();
    customerMovements.forEach(m => {
      const key = m.invoiceNumber || m.invoiceId || m.id;
      if (!movByInvoice.has(key)) movByInvoice.set(key, []);
      movByInvoice.get(key)!.push(m);
    });

    // Convert grouped archive movements into official invoice transactions
    movByInvoice.forEach((movs, invKey) => {
      const firstMov = movs[0];
      const invoiceTotal = movs.reduce((sum, m) => sum + (Number(m.total) || 0), 0);
      const totalQty = movs.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      const movDate = firstMov.date ? firstMov.date.split('T')[0] : '';
      const invNum = firstMov.invoiceNumber || invKey;
      const archiveId = `archive_${firstMov.invoiceId || invKey}`;

      allTransactions.push({
        id: archiveId,
        date: movDate,
        type: "invoice",
        invoiceNumber: invNum,
        description: `فاتورة أرشيف #${invNum} (${movs.length} أصناف)`,
        productCode: movs.map(m => m.productCode).filter(Boolean).join(', '),
        debit: invoiceTotal,
        credit: 0,
        quantity: totalQty,
        isArchive: true,
        items: movs.map(m => ({
          productName: m.productName || 'صنف',
          productCode: m.productCode || '',
          quantity: Number(m.quantity) || 1,
          price: Number(m.unitPrice) || 0,
          total: Number(m.total) || 0
        }))
      });
    });

    // 6. Return movements from productMovements (Archive returns)
    const existingReturnNumbers = new Set(
      returns
        .filter(r => matchesCustomer(r.customerId, r.customerName))
        .map(r => r.returnNumber)
    );

    const customerReturnMovements = productMovements.filter(m => {
      if (m.isDeleted) return false;
      if (!matchesCustomer(m.customerId || undefined, m.customerName)) return false;
      if (m.type !== 'return') return false;
      if (m.invoiceNumber && existingReturnNumbers.has(m.invoiceNumber)) return false;
      return true;
    });

    const retMovByInvoice = new Map<string, ProductMovement[]>();
    customerReturnMovements.forEach(m => {
      const key = m.invoiceNumber || m.invoiceId || m.id;
      if (!retMovByInvoice.has(key)) retMovByInvoice.set(key, []);
      retMovByInvoice.get(key)!.push(m);
    });

    retMovByInvoice.forEach((movs, retKey) => {
      const firstMov = movs[0];
      const retTotal = movs.reduce((sum, m) => sum + (Number(m.total) || 0), 0);
      const totalQty = movs.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      const movDate = firstMov.date ? firstMov.date.split('T')[0] : '';

      allTransactions.push({
        id: `ret_mov_${retKey}`,
        date: movDate,
        type: "return",
        invoiceNumber: retKey,
        description: `مرتجع أرشيف #${retKey} (${movs.length} أصناف)`,
        productCode: movs.map(m => m.productCode).filter(Boolean).join(', '),
        debit: 0,
        credit: retTotal,
        quantity: totalQty,
        isArchive: true,
        items: movs.map(m => ({
          productName: m.productName || 'صنف مرتجع',
          productCode: m.productCode || '',
          quantity: Number(m.quantity) || 1,
          price: Number(m.unitPrice) || 0,
          total: Number(m.total) || 0
        }))
      });
    });

    // 7. Deduplication:
    // Retain all legitimate unique transactions. Prefer formal invoices over archive placeholders.
    const uniqueById = new Map<string, AccountTransaction>();
    const seenInvoiceNumbers = new Map<string, string>(); // invoiceNumber -> id

    // Pass 1: Invoices and returns
    allTransactions.forEach(t => {
      if (t.type === 'invoice' || t.type === 'return') {
        if (t.invoiceNumber && seenInvoiceNumbers.has(t.invoiceNumber)) {
          if (!t.isArchive) {
            // Replace archive version with formal invoice
            const oldId = seenInvoiceNumbers.get(t.invoiceNumber)!;
            uniqueById.delete(oldId);
            uniqueById.set(t.id, t);
            seenInvoiceNumbers.set(t.invoiceNumber, t.id);
          }
        } else {
          uniqueById.set(t.id, t);
          if (t.invoiceNumber) seenInvoiceNumbers.set(t.invoiceNumber, t.id);
        }
      } else {
        // Debts and payments: keep each by its unique ID
        uniqueById.set(t.id, t);
      }
    });

    const finalTransactions = Array.from(uniqueById.values());

    // Sort chronologically ascending
    finalTransactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    // Calculate rolling running balance across all transactions
    let rollingBalance = 0;
    const transactionsWithBalance = finalTransactions.map(transaction => {
      rollingBalance += transaction.debit - transaction.credit;
      return {
        ...transaction,
        balance: rollingBalance
      };
    });

    setTransactions(transactionsWithBalance);

    // Apply user filters
    let filtered = transactionsWithBalance;

    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }
    if (transactionType !== "all") {
      filtered = filtered.filter(t => t.type === transactionType);
    }
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchLower)) ||
        (t.productCode && t.productCode.toLowerCase().includes(searchLower)) ||
        (t.items && t.items.some(it => it.productName.toLowerCase().includes(searchLower)))
      );
    }

    setFilteredTransactions(filtered);
  }, [selectedCustomer, startDate, endDate, transactionType, searchText, invoices, creditors, debtors, returns, customers, products, productMovements]);

  // Accurate Financial Totals
  const totals = useMemo(() => {
    const totalQuantity = filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);

    // Opening Balance: Exact sum of all prior transactions strictly before startDate
    const openingBalance = startDate
      ? transactions
          .filter(t => t.date < startDate)
          .reduce((sum, t) => sum + (t.debit - t.credit), 0)
      : 0;

    // Final balance at the end of the filtered period
    const finalBalance = openingBalance + totalDebit - totalCredit;

    // Overall customer balance across all history
    const allTimeBalance = transactions.length > 0
      ? transactions[transactions.length - 1].balance || 0
      : 0;

    return { totalQuantity, totalDebit, totalCredit, finalBalance, openingBalance, allTimeBalance };
  }, [filteredTransactions, transactions, startDate]);

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  // Filtered customer list for the customer search box
  const searchableCustomers = useMemo(() => {
    if (!customerSearchInput.trim()) return customers;
    const normSearch = normalizeArabic(customerSearchInput);
    return customers.filter(c =>
      normalizeArabic(c.name).includes(normSearch) ||
      (c.phone && c.phone.includes(customerSearchInput)) ||
      (c.company && normalizeArabic(c.company).includes(normSearch))
    );
  }, [customers, customerSearchInput]);

  const exportColumns = [
    { key: 'date', header: t('date'), render: (t: AccountTransaction) => formatDate(t.date) },
    { key: 'invoiceNumber', header: 'رقم الفاتورة/المستند', render: (t: AccountTransaction) => t.invoiceNumber || '-' },
    { key: 'description', header: 'البيان والتفاصيل' },
    { key: 'quantity', header: t('quantity'), render: (item: AccountTransaction) => item.quantity?.toString() || '0' },
    { key: 'debit', header: 'مدين (المطلوب منه)', render: (item: AccountTransaction) => formatCurrency(item.debit) },
    { key: 'credit', header: 'دائن (المدفوع منه)', render: (item: AccountTransaction) => formatCurrency(item.credit) },
    { key: 'balance', header: 'الرصيد التراكمي', render: (item: AccountTransaction) => formatCurrency(item.balance || 0) }
  ];

  const handlePrintStatement = () => {
    setIsPrintModalOpen(true);
  };

  const toggleInvoiceExpand = (id: string) => {
    setExpandedInvoiceId(prev => prev === id ? null : id);
  };

  const getTransactionTypeBadge = (type: string, isArchive?: boolean) => {
    switch (type) {
      case 'invoice':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
            isArchive
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
              : 'bg-blue-50 text-blue-700 border border-blue-200/60'
          }`}>
            {isArchive ? <History size={11} /> : <FileText size={11} />}
            {isArchive ? 'فاتورة أرشيف' : 'فاتورة بيع'}
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
            <TrendingDown size={11} />
            {isArchive ? 'مرتجع أرشيف' : 'مرتجع'}
          </span>
        );
      case 'creditor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 size={11} />
            سداد / سند قبض
          </span>
        );
      case 'debtor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            <Clock size={11} />
            دين آجل
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Banner (Hidden on Print) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">كشف حساب العميل الشامل</h1>
            <p className="text-xs text-slate-500">
              استجلاب وتتبع كافة معاملات الفواتير، الأرشيف السابقة، الديون، والسدادات مع تفاصيل كل فاتورة
            </p>
          </div>
        </div>

        {selectedCustomer && (
          <div className="flex items-center gap-2">
            <ExportActions
              data={filteredTransactions}
              filename={`statement_${selectedCustomerData?.name || 'customer'}`}
              title={`كشف حساب - ${selectedCustomerData?.name || ''}`}
              columns={exportColumns}
              totals={{
                totalQuantity: totals.totalQuantity,
                totalDebit: totals.totalDebit,
                totalCredit: totals.totalCredit,
                finalBalance: totals.finalBalance
              }}
            />
            <button
              onClick={handlePrintStatement}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>معاينة وطباعة كشف الحساب</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Loading Skeleton / Indicator ── */}
      {isLoading ? (
        <div className="gsc-card p-12 text-center print:hidden">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-3 animate-pulse">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">جاري تحميل واستجلاب بيانات الحسابات والأرشيف...</h3>
          <p className="text-xs text-slate-400 mt-1">يتم دمج الفواتير السابقة وحركات الأرشيف والديون والمدفوعات</p>
        </div>
      ) : (
        <>
          {/* ── Step 1: Customer Selection & Filter Bar ── */}
          <div className="gsc-card p-5 print:hidden space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  تحديد العميل وفلترة كشف الحساب ({customers.length} عميل مسجل)
                </h3>
              </div>
              {selectedCustomerData && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-900 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                    {selectedCustomerData.name}
                  </span>
                  {selectedCustomerData.phone && (
                    <span className="text-slate-500 flex items-center gap-1 font-sans">
                      <Phone size={12} className="text-slate-400" />
                      {selectedCustomerData.phone}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Customer Selector with Search Input */}
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <span>اختر العميل *</span>
                  </span>
                  {customers.length > 5 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      ابحث بالاسم أو اختر مباشرة
                    </span>
                  )}
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-bold transition-all"
                    >
                      <option value="">-- اضغط لاختيار العميل من القائمة ({searchableCustomers.length}) --</option>
                      {searchableCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''} {c.phone ? `- ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>

                  {/* Customer Quick Search input */}
                  {customers.length > 5 && (
                    <div className="relative">
                      <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="فلترة قائمة العملاء بالاسم أو الهاتف..."
                        value={customerSearchInput}
                        onChange={(e) => setCustomerSearchInput(e.target.value)}
                        className="w-full pr-8 pl-3 py-1.5 text-xs bg-white text-slate-700 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Type Filter */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ArrowUpDown size={13} className="text-slate-400" />
                  <span>نوع المعاملات</span>
                </label>
                <div className="relative">
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all"
                  >
                    <option value="all">جميع العمليات المالية والفواتير</option>
                    <option value="invoice">فواتير المبيعات والأرشيف</option>
                    <option value="debtor">الديون والآجل</option>
                    <option value="creditor">الدفعات والسدادات</option>
                    <option value="return">المرتجعات</option>
                  </select>
                  <ChevronDown size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              {/* Start Date */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>من تاريخ</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
                />
              </div>

              {/* End Date */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>إلى تاريخ</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
                />
              </div>
            </div>

            {/* Quick Search in transactions */}
            {selectedCustomer && (
              <div className="pt-2 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث سريع برقم الفاتورة، اسم الصنف، أو البيان..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pr-9 pl-3.5 py-2 text-xs bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
                {(startDate || endDate || transactionType !== 'all' || searchText) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setTransactionType('all');
                      setSearchText('');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    إعادة تعيين الفلاتر
                  </button>
                )}
              </div>
            )}
          </div>

          {!selectedCustomer ? (
            <div className="gsc-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <User size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">يرجى اختيار العميل لعرض كشف حسابه</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                اختر العميل من القائمة المنسدلة بالأعلى لاستخراج جميع الفواتير والحركات المالية المرتبطة به بدقة متناهية، متضمنةً الفواتير المؤرشفة والمبيعات السابقة.
              </p>
            </div>
          ) : (
            <>
              {/* ── Summary Metrics Cards (Hidden on Print) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
                {/* Debit */}
                <div className="gsc-card p-4 flex items-center gap-3.5 border-rose-100">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 truncate">إجمالي المدين (عليه)</p>
                    <h3 className="text-xl font-black text-rose-600 mt-0.5 font-sans">{formatCurrency(totals.totalDebit)}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">فواتير ومشتريات الفترة</p>
                  </div>
                </div>

                {/* Credit */}
                <div className="gsc-card p-4 flex items-center gap-3.5 border-emerald-100">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingDown size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 truncate">إجمالي الدائن (له / سداداته)</p>
                    <h3 className="text-xl font-black text-emerald-600 mt-0.5 font-sans">{formatCurrency(totals.totalCredit)}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">مدفوعات وسندات قبض</p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="gsc-card p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Package size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 truncate">مجموع الكميات</p>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{totals.totalQuantity}</h3>
                    <p className="text-[11px] font-bold text-blue-600 mt-0.5">قطعة مسجلة بالفترة</p>
                  </div>
                </div>

                {/* Net Final Balance */}
                <div className={`gsc-card p-4 flex items-center gap-3.5 border-2 ${
                  totals.finalBalance > 0
                    ? "border-rose-300 bg-rose-50/30"
                    : totals.finalBalance < 0
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-200"
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    totals.finalBalance > 0 ? "bg-rose-600 text-white" : totals.finalBalance < 0 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    <DollarSign size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {totals.finalBalance > 0 ? "صافي الرصيد (مطلوب منه)" : totals.finalBalance < 0 ? "صافي الرصيد (فائض له)" : "الحساب خالص ومتزن"}
                    </p>
                    <h3 className={`text-xl font-black mt-0.5 font-sans ${
                      totals.finalBalance > 0 ? "text-rose-700" : totals.finalBalance < 0 ? "text-emerald-700" : "text-slate-800"
                    }`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                    </h3>
                    <p className="text-[11px] font-bold mt-0.5">
                      {totals.finalBalance > 0 ? (
                        <span className="text-rose-600 font-extrabold">العميل مَدين بالمبلغ</span>
                      ) : totals.finalBalance < 0 ? (
                        <span className="text-emerald-600 font-extrabold">العميل دَائن بالمبلغ</span>
                      ) : (
                        <span className="text-slate-500">لا توجد مبالغ معلقة</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Official Print Header (Only visible on print) ── */}
              <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-6 font-sans">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">{storeInfo?.name || 'مؤسسة حسابي برو التجارية'}</h1>
                    <p className="text-xs text-slate-600 mt-1">{storeInfo?.address || 'العنوان الرئيسي'}</p>
                    <p className="text-xs text-slate-600">الهاتف: {storeInfo?.phone || '---'}</p>
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-black text-blue-700 uppercase">كشف حساب رسمي مع تفاصيل الفواتير</h2>
                    <p className="text-xs text-slate-500 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                    <p className="text-xs text-slate-500">الفترة: {startDate || 'البداية'} إلى {endDate || 'الآن'}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-100 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500">اسم العميل:</span> <strong className="text-slate-900 text-sm">{selectedCustomerData?.name}</strong>
                  </div>
                  {selectedCustomerData?.phone && (
                    <div>
                      <span className="text-slate-500">رقم الهاتف:</span> <strong className="text-slate-900">{selectedCustomerData.phone}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">الرصيد المستحق:</span>{" "}
                    <strong className={`text-sm ${totals.finalBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatCurrency(Math.abs(totals.finalBalance))} ({totals.finalBalance > 0 ? "مطلوب منه" : "دائن"})
                    </strong>
                  </div>
                </div>
              </div>

              {/* ── Main Ledger Table ── */}
              <div className="gsc-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-blue-600" />
                    <span>دفتر حركات ومعاملات العميل ({filteredTransactions.length} حركة مسجلة)</span>
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    انقر على أي فاتورة لاستعراض أصنافها وتفاصيلها الكاملة
                  </span>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-xs font-bold text-slate-700 mb-1">لا توجد حركات مسجلة لهذا العميل في النطاق المحدد</p>
                    <p className="text-[11px] text-slate-400">جرب توسيع نطاق التاريخ أو إعادة تعيين الفلاتر</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <th className="py-3 px-3.5">التاريخ</th>
                          <th className="py-3 px-3.5">نوع المعاملة</th>
                          <th className="py-3 px-3.5">رقم المستند / الفاتورة</th>
                          <th className="py-3 px-3.5">البيان والأصناف</th>
                          <th className="py-3 px-3.5 text-center">الكمية</th>
                          <th className="py-3 px-3.5 text-center bg-rose-50/50 text-rose-700">مدين (المطلوب منه) +</th>
                          <th className="py-3 px-3.5 text-center bg-emerald-50/50 text-emerald-700">دائن (المدفوع منه) -</th>
                          <th className="py-3 px-3.5 text-left bg-slate-100/60 font-black">الرصيد التراكمي</th>
                          <th className="py-3 px-2 text-center print:hidden">تفاصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {/* Opening Balance Row */}
                        {startDate && totals.openingBalance !== 0 && (
                          <tr className="bg-blue-50/40 font-bold border-b border-blue-100">
                            <td className="py-2.5 px-3.5 text-xs text-slate-500 font-sans">{startDate}</td>
                            <td className="py-2.5 px-3.5">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800 font-bold">
                                رصيد سابق
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-xs text-slate-500">---</td>
                            <td className="py-2.5 px-3.5 text-slate-800 font-semibold" colSpan={2}>
                              الرصيد الافتتاحي المنقول السابق حتى تاريخ {startDate}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-sans text-rose-700">
                              {totals.openingBalance > 0 ? formatCurrency(totals.openingBalance) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-sans text-emerald-700">
                              {totals.openingBalance < 0 ? formatCurrency(Math.abs(totals.openingBalance)) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-left font-sans font-black text-slate-900">
                              {formatCurrency(Math.abs(totals.openingBalance))}
                              <span className="text-[10px] text-slate-500 mr-1">
                                {totals.openingBalance > 0 ? "(عليه)" : "(له)"}
                              </span>
                            </td>
                            <td className="print:hidden"></td>
                          </tr>
                        )}

                        {filteredTransactions.map((tx) => {
                          const currentBal = tx.balance || 0;
                          const isExpanded = expandedInvoiceId === tx.id;
                          const hasItems = tx.items && tx.items.length > 0;

                          return (
                            <React.Fragment key={tx.id}>
                              <tr
                                onClick={() => hasItems && toggleInvoiceExpand(tx.id)}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  hasItems ? "cursor-pointer" : ""
                                } ${isExpanded ? "bg-blue-50/30" : ""}`}
                              >
                                <td className="py-3 px-3.5 text-xs font-medium text-slate-600 font-sans whitespace-nowrap">
                                  {tx.date}
                                </td>

                                <td className="py-3 px-3.5">
                                  {getTransactionTypeBadge(tx.type, tx.isArchive)}
                                </td>

                                <td className="py-3 px-3.5 font-mono font-bold text-xs text-slate-800">
                                  {tx.invoiceNumber ? (
                                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      {tx.invoiceNumber}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">---</span>
                                  )}
                                </td>

                                <td className="py-3 px-3.5">
                                  <div>
                                    <span className="font-bold text-slate-900 block">{tx.description}</span>
                                    {hasItems && !isExpanded && (
                                      <span className="text-[11px] text-blue-600 font-medium block truncate max-w-xs mt-0.5 print:hidden">
                                        الأصناف: {tx.items?.map(it => `${it.productName} (${it.quantity})`).join('، ')}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3.5 text-center font-bold font-sans text-slate-700">
                                  {tx.quantity || '-'}
                                </td>

                                {/* Debit */}
                                <td className="py-3 px-3.5 text-center font-bold font-sans text-rose-600 bg-rose-50/20">
                                  {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                </td>

                                {/* Credit */}
                                <td className="py-3 px-3.5 text-center font-bold font-sans text-emerald-600 bg-emerald-50/20">
                                  {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                </td>

                                {/* Running Balance */}
                                <td className="py-3 px-3.5 text-left font-black font-sans bg-slate-50/40">
                                  <div className="flex flex-col items-start">
                                    <span className={`text-sm ${
                                      currentBal > 0 ? "text-rose-700" : currentBal < 0 ? "text-emerald-700" : "text-slate-600"
                                    }`}>
                                      {formatCurrency(Math.abs(currentBal))}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {currentBal > 0 ? "عليه" : currentBal < 0 ? "له" : "خالص"}
                                    </span>
                                  </div>
                                </td>

                                {/* Expand toggle icon */}
                                <td className="py-3 px-2 text-center print:hidden">
                                  {hasItems ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleInvoiceExpand(tx.id);
                                      }}
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="عرض تفاصيل الفاتورة"
                                    >
                                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  ) : null}
                                </td>
                              </tr>

                              {/* Expanded Invoice Items Row (Always shown in print if has items) */}
                              {hasItems && (
                                <tr className={`bg-slate-50/90 border-b border-slate-200 ${isExpanded ? "" : "hidden print:table-row"}`}>
                                  <td colSpan={9} className="p-3">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
                                        <Receipt size={14} className="text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800">
                                          تفاصيل أصناف الفاتورة #{tx.invoiceNumber}
                                        </span>
                                      </div>
                                      <table className="w-full text-right text-xs">
                                        <thead className="bg-slate-50 text-slate-500 font-bold">
                                          <tr>
                                            <th className="p-2">اسم الصنف</th>
                                            <th className="p-2 text-center">الكمية</th>
                                            <th className="p-2 text-center">سعر الوحدة</th>
                                            <th className="p-2 text-left">الإجمالي</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-sans">
                                          {tx.items?.map((it, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="p-2 font-medium text-slate-800">{it.productName}</td>
                                              <td className="p-2 text-center font-bold">{it.quantity}</td>
                                              <td className="p-2 text-center text-slate-600">{formatCurrency(it.price)}</td>
                                              <td className="p-2 text-left font-bold text-slate-900">{formatCurrency(it.total)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold">
                        <tr>
                          <td colSpan={4} className="py-3.5 px-3.5 text-slate-800 text-sm">
                            المجاميع الكلية لكافة الحركات:
                          </td>
                          <td className="py-3.5 px-3.5 text-center font-sans text-slate-800">
                            {totals.totalQuantity}
                          </td>
                          <td className="py-3.5 px-3.5 text-center font-black font-sans text-rose-700 text-sm bg-rose-100/50">
                            {formatCurrency(totals.totalDebit)}
                          </td>
                          <td className="py-3.5 px-3.5 text-center font-black font-sans text-emerald-700 text-sm bg-emerald-100/50">
                            {formatCurrency(totals.totalCredit)}
                          </td>
                          <td className="py-3.5 px-3.5 text-left font-black font-sans text-base bg-slate-200/60" colSpan={2}>
                            <span className={totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                              {formatCurrency(Math.abs(totals.finalBalance))}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 mr-1.5">
                              {totals.finalBalance > 0 ? "(مطلوب منه)" : totals.finalBalance < 0 ? "(فائض له)" : "(خالص)"}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Statement Detailed Summary Box ── */}
              <div className="gsc-card p-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/70 print:border print:border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-600" />
                      <span>الخلاصة المحاسبية المعتمدة لكشف الحساب</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      تم استجلاب وتدقيق جميع المعاملات من فواتير البيع والأرشيف السابقة والديون ({formatCurrency(totals.totalDebit)}) مع خصم السدادات والمرتجعات ({formatCurrency(totals.totalCredit)}).
                    </p>
                    {totals.allTimeBalance !== totals.finalBalance && (
                      <p className="text-[11px] text-blue-700 font-bold mt-1">
                        * إجمالي رصيد العميل عبر كل الأوقات: {formatCurrency(Math.abs(totals.allTimeBalance))} ({totals.allTimeBalance > 0 ? "عليه" : totals.allTimeBalance < 0 ? "له" : "خالص"})
                      </p>
                    )}
                  </div>

                  <div className="bg-white px-5 py-3 rounded-xl border border-blue-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 mb-0.5">الحالة الختامية لكشف الحساب</p>
                    <div className={`text-xl font-black font-sans ${totals.finalBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                    </div>
                    <span className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                      totals.finalBalance > 0 ? "bg-rose-100 text-rose-800" : totals.finalBalance < 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                    }`}>
                      {totals.finalBalance > 0 ? "مطلوب سداده من العميل" : totals.finalBalance < 0 ? "رصيد دائن للعميل" : "الحساب مسدد بالكامل"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {/* ── Official Professional Statement Print & Preview Modal ── */}
      {selectedCustomerData && (
        <ProfessionalStatementPrint
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          customer={selectedCustomerData}
          transactions={filteredTransactions}
          totals={totals}
          storeInfo={storeInfo}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}
