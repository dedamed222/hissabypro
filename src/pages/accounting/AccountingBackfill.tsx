import React, { useState } from "react";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency } from "@/utils/formatters";
import { generateSalesInvoiceEntry } from "@/utils/accountingEngine";
import { loadStoreData } from "@/utils/localStorage";
import { toast } from "@/hooks/use-toast";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Loader2, Eye, Play, Info
} from "lucide-react";

interface PreviewEntry {
  invoiceNumber: string;
  date: string;
  customer: string;
  total: number;
  status: "pending" | "done" | "error";
  error?: string;
}

export default function AccountingBackfill() {
  const { isEnabled, getActivePeriod } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";

  const [isDryRun, setIsDryRun] = useState(true);
  const [previews, setPreviews] = useState<PreviewEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(false);

  function buildPreviews(): PreviewEntry[] {
    const store = loadStoreData();
    const invoices = (store.invoices || []).filter(
      (inv: any) => inv.type === "sales" || !inv.type
    );
    return invoices.map((inv: any) => ({
      invoiceNumber: inv.invoiceNumber || inv.id,
      date: inv.date || inv.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
      customer: inv.customerName || "",
      total: inv.total || 0,
      status: "pending" as const,
    }));
  }

  async function runPreview() {
    setDone(false);
    const entries = buildPreviews();
    setPreviews(entries);
  }

  async function runBackfill() {
    if (isDryRun) {
      toast({ title: isFr ? "Mode prévisualisation" : "وضع المعاينة", description: isFr ? "Cochez 'Exécution réelle' pour appliquer" : "فعّل 'تطبيق فعلي' للتنفيذ الحقيقي" });
      return;
    }
    setIsRunning(true);
    const store = loadStoreData();
    const invoices = (store.invoices || []).filter(
      (inv: any) => inv.type === "sales" || !inv.type
    );

    const updated: PreviewEntry[] = [...previews];
    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      const dateStr = inv.date || new Date().toISOString().split("T")[0];
      try {
        const period = getActivePeriod(dateStr);
        if (!period) {
          updated[i] = { ...updated[i], status: "error", error: "لا توجد فترة مالية مفتوحة لهذا التاريخ" };
          continue;
        }
        // Compute COGS from items
        const items = inv.items || inv.products || [];
        const costOfGoods = items.reduce((s: number, it: any) => {
          const qty = it.quantity || 1;
          const cost = it.cost || 0;
          return s + (qty * cost);
        }, 0);

        await generateSalesInvoiceEntry({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || inv.id,
          date: dateStr,
          customerName: inv.customerName || "",
          customerId: inv.customerId,
          subtotal: inv.subtotal || inv.total || 0,
          taxAmount: inv.tax || 0,
          total: inv.total || 0,
          costOfGoods,
          paymentMethod: inv.paymentMethod || "cash",
          status: inv.status || "paid",
        });
        updated[i] = { ...updated[i], status: "done" };
      } catch (e: any) {
        updated[i] = { ...updated[i], status: "error", error: e?.message };
      }
      setPreviews([...updated]);
    }
    setIsRunning(false);
    setDone(true);
    const doneCount = updated.filter((u) => u.status === "done").length;
    toast({
      title: isFr ? "Reprise terminée" : "اكتمل الترحيل",
      description: `${doneCount}/${invoices.length} ${isFr ? "écritures générées" : "قيد تم إنشاؤه"}`,
    });
  }

  if (!isEnabled) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 text-sm">
      <RefreshCw size={32} className="opacity-30 mb-2" />
      {isFr ? "Module désactivé." : "الوحدة المحاسبية معطلة."}
    </div>
  );

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center shadow-md">
          <RefreshCw size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-100">
            {isFr ? "Reprise de l'Historique" : "ترحيل العمليات السابقة"}
          </h1>
          <p className="text-xs text-slate-500">
            {isFr ? "Génère les écritures comptables des anciennes factures" : "توليد قيود محاسبية للفواتير القديمة"}
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="flex gap-2 items-start p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-0.5">
            {isFr ? "Opération irréversible (sans suppression)" : "عملية لا رجوع فيها (بدون حذف)"}
          </p>
          <p className="text-amber-400/80">
            {isFr
              ? "Les factures originales ne seront jamais modifiées. Seules des nouvelles écritures comptables seront créées."
              : "الفواتير الأصلية لن تُمس أبداً. فقط قيود محاسبية جديدة ستُضاف."}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-2 items-start p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>
          {isFr
            ? "Commencez par la prévisualisation (Dry-Run) pour vérifier les données, puis désactivez l'option pour l'exécution réelle."
            : "ابدأ بالمعاينة (Dry-Run) لمراجعة البيانات، ثم ألغِ تفعيل الخيار للتنفيذ الفعلي."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1526] border border-slate-700/40 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={isDryRun} onChange={(e) => setIsDryRun(e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-500" />
          {isFr ? "Mode prévisualisation (Dry-Run)" : "وضع المعاينة (Dry-Run) فقط"}
        </label>

        <button onClick={runPreview} disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-all">
          <Eye size={14} />
          {isFr ? "Prévisualiser" : "معاينة"}
        </button>

        <button onClick={runBackfill} disabled={isRunning || previews.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            isDryRun
              ? "bg-slate-600 text-slate-400 cursor-not-allowed"
              : "bg-rose-600 hover:bg-rose-500 text-white"
          }`}>
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isFr ? "Exécuter le transfert" : "تنفيذ الترحيل"}
        </button>
      </div>

      {/* Preview list */}
      {previews.length > 0 && (
        <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 text-xs font-bold text-slate-400 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/50">
            <span className="col-span-3">{isFr ? "N° Facture" : "رقم الفاتورة"}</span>
            <span className="col-span-2">{isFr ? "Date" : "التاريخ"}</span>
            <span className="col-span-3">{isFr ? "Client" : "العميل"}</span>
            <span className="col-span-2 text-right">{isFr ? "Montant" : "المبلغ"}</span>
            <span className="col-span-2 text-center">{isFr ? "Statut" : "الحالة"}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {previews.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 text-xs px-4 py-2 border-b border-slate-700/10 hover:bg-slate-800/10 transition-colors">
                <span className="col-span-3 font-mono text-indigo-400">{p.invoiceNumber}</span>
                <span className="col-span-2 text-slate-400">{p.date}</span>
                <span className="col-span-3 text-slate-300 truncate">{p.customer}</span>
                <span className="col-span-2 text-right text-emerald-400">{formatCurrency(p.total)}</span>
                <div className="col-span-2 flex justify-center">
                  {p.status === "pending" && <span className="text-slate-500">—</span>}
                  {p.status === "done" && <CheckCircle2 size={14} className="text-emerald-400" />}
                  {p.status === "error" && (
                    <span title={p.error} className="cursor-help">
                      <AlertTriangle size={14} className="text-rose-400" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {done && (
            <div className="px-4 py-3 bg-emerald-500/10 border-t border-emerald-500/20 text-sm text-emerald-400 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              {previews.filter((p) => p.status === "done").length}/{previews.length}{" "}
              {isFr ? "écritures générées avec succès" : "قيد تم إنشاؤه بنجاح"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
