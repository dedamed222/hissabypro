import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Invoice } from "@/types";
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  DollarSign,
  Archive as ArchiveIcon,
  Printer,
  Wallet,
  Building2,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

export default function Payments() {
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const storeData = loadStoreData();
    setInvoices(storeData.invoices || []);
  }, []);

  // Compute dynamic KPIs
  const kpis = useMemo(() => {
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalCollected = paidInvoices.reduce((sum, i) => sum + Number(i.total || 0), 0);

    const bankilyTotal = paidInvoices
      .filter((i) => (i.paymentMethod || "").toLowerCase().includes("bankily"))
      .reduce((sum, i) => sum + Number(i.total || 0), 0);

    const masriviTotal = paidInvoices
      .filter(
        (i) =>
          (i.paymentMethod || "").toLowerCase().includes("masrivi") ||
          (i.paymentMethod || "").toLowerCase().includes("sedad")
      )
      .reduce((sum, i) => sum + Number(i.total || 0), 0);

    const cashTotal = paidInvoices
      .filter(
        (i) =>
          (i.paymentMethod || "").toLowerCase().includes("cash") ||
          (i.paymentMethod || "").toLowerCase().includes("espèces") ||
          (i.paymentMethod || "").toLowerCase().includes("نقدا") ||
          (!i.paymentMethod && i.status === "paid")
      )
      .reduce((sum, i) => sum + Number(i.total || 0), 0);

    const pendingTotal = invoices
      .filter((i) => i.status === "pending")
      .reduce((sum, i) => sum + Number(i.total || 0), 0);

    return {
      totalCollected,
      bankilyTotal,
      masriviTotal,
      cashTotal,
      pendingTotal,
      paidCount: paidInvoices.length,
    };
  }, [invoices]);

  // Filtered transactions
  const displayedPayments = useMemo(() => {
    return invoices.filter((inv) => {
      const cust = (inv.customerName || "").toLowerCase();
      const num = (inv.invoiceNumber || "").toLowerCase();
      const matchesSearch =
        cust.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase());

      const method = (inv.paymentMethod || "cash").toLowerCase();
      const matchesMethod =
        methodFilter === "all" ||
        (methodFilter === "bankily" && method.includes("bankily")) ||
        (methodFilter === "masrivi" && (method.includes("masrivi") || method.includes("sedad"))) ||
        (methodFilter === "cash" && (method.includes("cash") || method.includes("espèces") || method.includes("نقدا")));

      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [invoices, searchTerm, methodFilter, statusFilter]);

  const handleArchiveInvoice = (id: string) => {
    const store = loadStoreData();
    const updated = (store.invoices || []).map((inv) =>
      inv.id === id ? { ...inv, status: ("archived" as any), updatedAt: new Date().toISOString() } : inv
    );
    store.invoices = updated;
    saveStoreData(store);
    setInvoices(updated);

    toast({
      title: isFr ? "Paiement archivé" : "تمت أرشفة الدفعة",
      description: isFr
        ? "La transaction a été classée dans l'archive financière."
        : "تم حفظ الفاتورة والدفعة في الأرشيف المركزي.",
    });
  };

  const getMethodBadge = (method?: string) => {
    const m = (method || "cash").toLowerCase();
    if (m.includes("bankily")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Bankily
        </span>
      );
    }
    if (m.includes("masrivi") || m.includes("sedad")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {m.includes("sedad") ? "Sedad" : "Masrivi"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        {isFr ? "Espèces" : "نقداً"}
      </span>
    );
  };

  return (
    <div className="w-full px-3 sm:px-6 py-4 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ──────────────── HEADER ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <CreditCard className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isFr ? "Journal des paiements & encaissements" : "سجل المدفوعات والتحصيلات"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isFr
                ? "Transactions financières, modes de règlement et archivage des flux"
                : "تتبع التدفقات المالية، وسائل الدفع وأرشفة السجلات المحصلة"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Link to Archive */}
          <Button
            onClick={() => navigate("/archive?tab=payments")}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-2 shadow-xs cursor-pointer"
          >
            <ArchiveIcon className="w-4 h-4 text-amber-600" />
            <span>{isFr ? "Archives des paiements" : "أرشيف المدفوعات"}</span>
          </Button>

          {/* New Invoice Button */}
          <Button
            onClick={() => navigate("/create-invoice")}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isFr ? "Nouvelle facture" : "إضافة فاتورة جديدة"}</span>
          </Button>
        </div>
      </div>

      {/* ──────────────── KPI SUMMARY CARDS ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Collections */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Total des encaissements" : "إجمالي المقبوضات"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(kpis.totalCollected)}
          </p>
          <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
            {kpis.paidCount} {isFr ? "transactions réussies" : "عملية دفع مسددة"}
          </span>
        </div>

        {/* Bankily */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Bankily</span>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(kpis.bankilyTotal)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Paiements mobiles" : "متحصلات محفظة بنكيلي"}
          </span>
        </div>

        {/* Masrivi / Sedad */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Masrivi & Sedad</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 tracking-tight">
            {formatCurrency(kpis.masriviTotal)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Transferts bancaires" : "متحصلات مصرفي والسداد"}
          </span>
        </div>

        {/* Cash / Espèces */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Espèces (Caisse)" : "المقبوضات النقدية"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 tracking-tight">
            {formatCurrency(kpis.cashTotal)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Espèces en magasin" : "السيولة النقدية بالصندوق"}
          </span>
        </div>
      </div>

      {/* ──────────────── SEARCH & FILTER BAR ──────────────── */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto pointer-events-none" />
          <Input
            placeholder={
              isFr ? "Rechercher par client ou facture..." : "ابحث برقم الفاتورة أو اسم العميل..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        {/* Payment Method Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100/80 p-1 rounded-xl text-xs overflow-x-auto">
          <button
            onClick={() => setMethodFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              methodFilter === "all" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Toutes les méthodes" : "الكل"} ({invoices.length})
          </button>
          <button
            onClick={() => setMethodFilter("cash")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              methodFilter === "cash" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Espèces" : "نقداً"}
          </button>
          <button
            onClick={() => setMethodFilter("bankily")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              methodFilter === "bankily" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Bankily
          </button>
          <button
            onClick={() => setMethodFilter("masrivi")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              methodFilter === "masrivi" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Masrivi
          </button>
        </div>
      </div>

      {/* ──────────────── TRANSACTIONS TABLE ──────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">{isFr ? "N° Facture" : "رقم الفاتورة"}</th>
                <th className="py-3.5 px-4">{isFr ? "Client" : "العميل"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Mode de paiement" : "طريقة الدفع"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Montant réglé" : "المبلغ المسدد"}</th>
                <th className="py-3.5 px-4">{isFr ? "Date de transaction" : "التاريخ"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Statut" : "الحالة"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPayments.length > 0 ? (
                displayedPayments.map((inv) => {
                  const isPaid = inv.status === "paid";
                  const isArchived = (inv.status as string) === "archived";
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        #{inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inv.customerName || (isFr ? "Client comptoir" : "عميل نقدي")}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getMethodBadge(inv.paymentMethod)}
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-slate-900 font-sans text-sm">
                        {formatCurrency(inv.total)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatShortDate(inv.date || inv.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <ArchiveIcon size={12} />
                            <span>{isFr ? "Archivé" : "مؤرشف"}</span>
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>{isFr ? "Encaissé" : "مسدد بالكامل"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} />
                            <span>{isFr ? "En attente" : "قيد الانتظار"}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Receipt */}
                          <button
                            onClick={() => window.print()}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                            title={isFr ? "Imprimer le reçu" : "طباعة الإيصال"}
                          >
                            <Printer size={15} />
                          </button>

                          {/* Archive Action */}
                          <button
                            onClick={() => handleArchiveInvoice(inv.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={isFr ? "Classer dans l'archive" : "أرشفة الفاتورة والدفعة"}
                          >
                            <ArchiveIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">
                      {isFr ? "Aucun paiement trouvé" : "لا توجد معاملات دفع مسجلة"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isFr
                        ? "Les règlements de vos factures apparaîtront ici."
                        : "ستظهر جميع عمليات السداد والتحصيل هنا."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
