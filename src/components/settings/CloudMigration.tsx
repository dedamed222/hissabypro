/**
 * CloudMigration — transfers existing localStorage data to Supabase.
 * Shows progress per entity and can be run multiple times (upsert).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, CloudUpload, Loader2 } from "lucide-react";
import { loadStoreData } from "@/utils/localStorage";
import {
  upsertProduct,
  upsertCustomer,
  upsertInvoice,
  insertDailySale,
  upsertExpense,
  upsertSupplier,
  upsertCreditor,
  upsertDebtor,
  upsertReturn,
  upsertWarehouse,
  upsertStoreSettings,
} from "@/lib/database";

interface Step {
  label: string;
  status: "pending" | "running" | "done" | "error";
  count?: number;
  error?: string;
}

const INITIAL_STEPS: Step[] = [
  { label: "المنتجات", status: "pending" },
  { label: "العملاء", status: "pending" },
  { label: "الفواتير", status: "pending" },
  { label: "المبيعات اليومية", status: "pending" },
  { label: "المصروفات", status: "pending" },
  { label: "الموردون", status: "pending" },
  { label: "الدائنون", status: "pending" },
  { label: "المدينون", status: "pending" },
  { label: "المرتجعات", status: "pending" },
  { label: "المخازن", status: "pending" },
  { label: "إعدادات المتجر", status: "pending" },
];

export function CloudMigration() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const updateStep = (index: number, update: Partial<Step>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  };

  const runMigration = async () => {
    setRunning(true);
    setDone(false);
    setSteps(INITIAL_STEPS);

    const data = loadStoreData();
    let stepIdx = 0;

    // ── Products ──────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const p of data.products) {
        await upsertProduct({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          price: p.price,
          cost: p.cost,
          quantity: p.quantity,
          low_stock_threshold: p.lowStockThreshold,
          category: p.category,
          supplier_id: p.supplierId,
          warehouse_id: p.warehouseId,
          photo_url: p.photoUrl,
          barcode: p.barcode,
          sold: p.sold ?? 0,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.products.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Customers ─────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const c of data.customers) {
        await upsertCustomer({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          company: c.company,
          photo_url: c.photoUrl,
          notes: c.notes,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.customers.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Invoices ──────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const inv of data.invoices) {
        const items = (inv.items || inv.products || []).map((it: { productId: string; productName?: string; name?: string; quantity: number; price: number }) => ({
          product_id: it.productId,
          product_name: it.productName || it.name || "",
          quantity: it.quantity,
          price: it.price,
          total: it.quantity * it.price,
        }));
        await upsertInvoice(
          {
            id: inv.id,
            invoice_number: inv.invoiceNumber,
            customer_id: inv.customerId,
            customer_name: inv.customerName,
            total: inv.total,
            subtotal: inv.subtotal,
            discount: inv.discount,
            tax: inv.tax,
            shipping_cost: inv.shippingCost,
            payment_method: inv.paymentMethod,
            status: inv.status,
            notes: inv.notes,
            date: inv.date,
          },
          items
        );
      }
      updateStep(stepIdx, { status: "done", count: data.invoices.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Daily Sales ───────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const sale of data.dailySales) {
        await insertDailySale({
          date: sale.date,
          total_sales: sale.totalSales,
          product_id: sale.productId,
          product_name: sale.productName,
          product_code: sale.productCode,
          quantity: sale.quantity,
          total: sale.total,
          unit_price: sale.unitPrice,
          payment_method: sale.paymentMethod,
          remaining_quantity: sale.remainingQuantity,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.dailySales.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Expenses ──────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const exp of data.expenses) {
        await upsertExpense({
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          category: exp.category,
          date: exp.date,
          notes: exp.notes,
          payment_method: exp.paymentMethod,
          reference: exp.reference,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.expenses.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Suppliers ─────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const sup of data.suppliers) {
        await upsertSupplier({
          id: sup.id,
          name: sup.name,
          phone: sup.phone,
          email: sup.email,
          address: sup.address,
          photo_url: sup.photoUrl,
          notes: sup.notes,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.suppliers.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Creditors ─────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const cred of data.creditors) {
        await upsertCreditor({
          id: cred.id,
          name: cred.name,
          phone: cred.phone,
          email: cred.email,
          address: cred.address,
          amount: cred.amount,
          notes: cred.notes,
          product_code: cred.productCode,
          product_name: cred.productName,
          quantity: cred.quantity,
          price: cred.price,
          total: cred.total,
          date: cred.date,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.creditors.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Debtors ───────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const deb of data.debtors) {
        await upsertDebtor({
          id: deb.id,
          name: deb.name || deb.debtorName || "",
          phone: deb.phone,
          total_amount: deb.totalAmount || deb.amount || 0,
          products: deb.products ?? [],
          notes: deb.notes,
          date: deb.date,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.debtors.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Returns ───────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const ret of data.returns) {
        await upsertReturn({
          id: ret.id,
          return_number: ret.returnNumber,
          invoice_id: ret.invoiceId,
          customer_id: ret.customerId,
          customer_name: ret.customerName,
          products: ret.products ?? [],
          total: ret.total,
          reason: ret.reason,
          notes: ret.notes,
          status: ret.status,
          date: ret.date,
          invoice_number: ret.invoiceNumber,
        });
      }
      updateStep(stepIdx, { status: "done", count: data.returns.length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Warehouses ────────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      for (const wh of data.warehouses || []) {
        await upsertWarehouse({
          id: wh.id,
          name: wh.name,
          location: wh.location,
          description: wh.description,
          is_active: wh.isActive,
        });
      }
      updateStep(stepIdx, { status: "done", count: (data.warehouses || []).length });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }
    stepIdx++;

    // ── Store Settings ────────────────────────────────────────────────────────
    updateStep(stepIdx, { status: "running" });
    try {
      await upsertStoreSettings({
        store_name: data.storeInfo?.name,
        store_phone: data.storeInfo?.phone,
        store_email: data.storeInfo?.email,
        store_photo_url: data.storeInfo?.photoUrl,
        currency: data.settings?.currency || "DZD",
        locale: data.settings?.locale || "ar",
        custom_currencies: data.settings?.customCurrencies ?? [],
        custom_payment_methods: data.settings?.customPaymentMethods ?? [],
      });
      updateStep(stepIdx, { status: "done", count: 1 });
    } catch (e: unknown) {
      updateStep(stepIdx, { status: "error", error: String(e) });
    }

    setRunning(false);
    setDone(true);
  };

  const doneCount = steps.filter((s) => s.status === "done").length;
  const errorCount = steps.filter((s) => s.status === "error").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload size={20} />
          ترحيل البيانات إلى السحابة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          انقل بياناتك المحلية (المنتجات، الفواتير، العملاء، ...) إلى قاعدة البيانات السحابية. يمكن تشغيل هذه العملية أكثر من مرة بأمان.
        </p>

        {running && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">{progress}% مكتمل</p>
          </div>
        )}

        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {step.status === "pending" && <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />}
              {step.status === "running" && <Loader2 size={16} className="animate-spin text-primary" />}
              {step.status === "done" && <CheckCircle size={16} className="text-green-500" />}
              {step.status === "error" && <AlertCircle size={16} className="text-destructive" />}
              <span className={step.status === "error" ? "text-destructive" : ""}>
                {step.label}
                {step.status === "done" && step.count !== undefined && (
                  <span className="text-muted-foreground mr-1">({step.count} سجل)</span>
                )}
                {step.status === "error" && step.error && (
                  <span className="text-xs text-destructive mr-1">— {step.error}</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {done && errorCount === 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md text-green-700 text-sm">
            <CheckCircle size={16} />
            تم ترحيل جميع البيانات بنجاح!
          </div>
        )}
        {done && errorCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md text-amber-700 text-sm">
            <AlertCircle size={16} />
            اكتمل الترحيل مع {errorCount} خطأ. راجع التفاصيل أعلاه.
          </div>
        )}

        <Button onClick={runMigration} disabled={running} className="w-full">
          {running ? (
            <>
              <Loader2 size={16} className="animate-spin ml-2" />
              جارٍ الترحيل...
            </>
          ) : done ? (
            <>
              <CloudUpload size={16} className="ml-2" />
              إعادة الترحيل
            </>
          ) : (
            <>
              <CloudUpload size={16} className="ml-2" />
              بدء ترحيل البيانات إلى السحابة
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
