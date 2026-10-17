import React, { useState, useMemo } from "react";
import { useReturns } from "@/hooks/useReturns";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import {
  Undo,
  Search,
  Trash2,
  FileText,
  Calendar,
  User,
  Hash,
  AlertCircle,
  Plus,
  ArrowRight,
  PackageCheck,
  Archive as ArchiveIcon,
  Printer,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";

export default function Returns() {
  const {
    filteredReturns,
    filteredInvoices,
    searchQuery,
    setSearchQuery,
    invoiceSearchQuery,
    setInvoiceSearchQuery,
    selectedInvoice,
    setSelectedInvoice,
    loading,
    saveReturn,
    removeReturn,
  } = useReturns();

  const { t, locale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const totalCount = filteredReturns.length;
    const totalValue = filteredReturns.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const totalItems = filteredReturns.reduce((sum, r) => {
      const itemsCount = (r.items || []).reduce((iSum, it) => iSum + (Number(it.quantity) || 0), 0);
      return sum + itemsCount;
    }, 0);
    const archivedCount = filteredReturns.filter((r) => r.status === "archived").length;

    return {
      totalCount,
      totalValue,
      totalItems,
      archivedCount,
    };
  }, [filteredReturns]);

  // Filter returns by tab/status
  const displayedReturns = useMemo(() => {
    return filteredReturns.filter((r) => {
      if (statusFilter === "archived") return r.status === "archived";
      if (statusFilter === "active") return r.status !== "archived";
      return true;
    });
  }, [filteredReturns, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await removeReturn(deleteId);
      setDeleteId(null);
      toast({
        title: isFr ? "Retour supprimé" : "تم حذف المرتجع",
        description: isFr ? "Le bon de retour a été supprimé avec succès." : "تم حذف سجل الإرجاع بنجاح.",
      });
    }
  };

  const handleArchiveReturn = (returnId: string) => {
    const store = loadStoreData();
    if (!store.returns) store.returns = [];
    const index = store.returns.findIndex((r) => r.id === returnId);
    if (index >= 0) {
      const isCurrentlyArchived = store.returns[index].status === "archived";
      store.returns[index].status = isCurrentlyArchived ? "completed" : "archived";
      store.returns[index].updatedAt = new Date().toISOString();
      saveStoreData(store);

      toast({
        title: isCurrentlyArchived
          ? isFr ? "Désarchivé" : "تم إلغاء الأرشفة"
          : isFr ? "Archivé avec succès" : "تمت الأرشفة بنجاح",
        description: isCurrentlyArchived
          ? isFr ? "Le retour a été réactivé." : "تم استرجاع المرتجع إلى السجلات النشطة."
          : isFr ? "Le retour a été déplacé vers l'archive." : "تم نقل المرتجع إلى سجل الأرشيف المركزي.",
      });

      // Reload returns list
      window.location.reload();
    }
  };

  const handleSelectInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setInvoiceSearchQuery("");
    const initialQuants: Record<string, number> = {};
    (invoice.items || []).forEach((item: any) => {
      initialQuants[item.productId] = 0;
    });
    setReturnQuantities(initialQuants);
  };

  const handleQuantityChange = (productId: string, val: number, max: number) => {
    const safeVal = Math.max(0, Math.min(val, max));
    setReturnQuantities((prev) => ({ ...prev, [productId]: safeVal }));
  };

  const calculateReturnTotal = () => {
    if (!selectedInvoice) return 0;
    return (selectedInvoice.items || []).reduce((sum: number, item: any) => {
      const qty = returnQuantities[item.productId] || 0;
      return sum + qty * Number(item.price || 0);
    }, 0);
  };

  const handleConfirmReturn = async () => {
    if (!selectedInvoice) return;

    const returnItems = (selectedInvoice.items || [])
      .filter((item: any) => (returnQuantities[item.productId] || 0) > 0)
      .map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: returnQuantities[item.productId],
        price: item.price,
        total: item.price * returnQuantities[item.productId],
      }));

    if (returnItems.length === 0) return;

    const total = calculateReturnTotal();

    try {
      await saveReturn({
        returnNumber: `RET-${Date.now().toString().slice(-6)}`,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        customerId: selectedInvoice.customerId,
        customerName: selectedInvoice.customerName,
        total: total,
        reason: returnReason,
        date: new Date().toISOString().split("T")[0],
        status: "completed",
        items: returnItems,
      });

      setIsRegisterOpen(false);
      setSelectedInvoice(null);
      setReturnReason("");
      setReturnQuantities({});

      toast({
        title: isFr ? "Retour enregistré" : "تم تسجيل المرتجع بنجاح",
        description: isFr ? "Les articles ont été réintégrés au stock." : "تم استعادة الكميات إلى المخزون.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const printReturnVoucher = (r: any) => {
    window.print();
  };

  return (
    <div className="w-full px-3 sm:px-6 py-4 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ──────────────── HEADER ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <RotateCcw className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isFr ? "Gestion des retours de vente" : "إدارة مرتجعات المبيعات"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isFr
                ? "Traitement, annulation et archivage des retours d'articles"
                : "معالجة مرتجعات المنتجات، تسوية الفواتير والأرشفة التلقائية"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Link directly to Archive */}
          <Button
            onClick={() => navigate("/archive?tab=returns")}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-2 shadow-xs cursor-pointer"
          >
            <ArchiveIcon className="w-4 h-4 text-amber-600" />
            <span>{isFr ? "Consulter l'archive" : "سجل الأرشيف"}</span>
            {kpiStats.archivedCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black flex items-center justify-center">
                {kpiStats.archivedCount}
              </span>
            )}
          </Button>

          {/* Dialog to register a new return */}
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>{isFr ? "Nouveau retour" : "تسجيل مرتجع جديد"}</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              <DialogHeader className="p-5 bg-gradient-to-r from-[#0047cc] to-[#0052d9] text-white">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <PackageCheck className="w-5 h-5" />
                  <span>{isFr ? "Enregistrer un retour de marchandise" : "تسجيل مرتجع مبيعات"}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {!selectedInvoice ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto pointer-events-none" />
                      <Input
                        placeholder={
                          isFr
                            ? "Rechercher une facture par N° ou nom du client..."
                            : "ابحث عن فاتورة برقمها أو اسم العميل..."
                        }
                        value={invoiceSearchQuery}
                        onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                        className="rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 h-11 text-sm bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>

                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[300px] overflow-y-auto bg-slate-50/50">
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv) => (
                          <button
                            key={inv.id}
                            onClick={() => handleSelectInvoice(inv)}
                            className="w-full p-3.5 flex items-center justify-between hover:bg-blue-50/80 transition-colors cursor-pointer text-start"
                          >
                            <div>
                              <p className="font-bold text-slate-900 text-sm">#{inv.invoiceNumber}</p>
                              <p className="text-xs text-slate-500">{inv.customerName}</p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-black text-blue-600 text-sm">
                                {formatCurrency(inv.total)}
                              </span>
                              <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          {isFr ? "Aucune facture trouvée" : "لا توجد فواتير مطابقة للبحث"}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected invoice summary banner */}
                    <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-blue-600 font-bold uppercase block">
                          {isFr ? "Facture source" : "الفاتورة الأصلية"}
                        </span>
                        <span className="font-black text-blue-950 text-sm">#{selectedInvoice.invoiceNumber}</span>
                        <span className="text-xs text-slate-500 block">{selectedInvoice.customerName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoice(null)}
                        className="text-blue-600 hover:bg-blue-100 text-xs font-bold"
                      >
                        {isFr ? "Changer" : "تغيير"}
                      </Button>
                    </div>

                    {/* Invoice items to return */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>{isFr ? "Sélectionner les quantités à retourner" : "حدد الكميات المرتجعة لكل منتج"}</span>
                      </label>

                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                        {(selectedInvoice.items || []).map((item: any) => (
                          <div
                            key={item.productId}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-xs truncate">{item.productName}</p>
                              <p className="text-[11px] text-slate-500">
                                {formatCurrency(item.price)} × {item.quantity}{" "}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ({isFr ? "Acheté" : "تم شراؤه"})
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 cursor-pointer"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      (returnQuantities[item.productId] || 0) - 1,
                                      item.quantity
                                    )
                                  }
                                >
                                  -
                                </button>
                                <span className="w-10 text-center font-black text-sm text-blue-600">
                                  {returnQuantities[item.productId] || 0}
                                </span>
                                <button
                                  type="button"
                                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 cursor-pointer"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      (returnQuantities[item.productId] || 0) + 1,
                                      item.quantity
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Return Reason */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {isFr ? "Motif du retour (optionnel)" : "سبب الإرجاع (اختياري)"}
                      </label>
                      <Input
                        placeholder={
                          isFr
                            ? "Ex: Produit défectueux, changement d'avis..."
                            : "مثال: عيب مصنعي، منتج تالف، تبديل مقاس..."
                        }
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {selectedInvoice && (
                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between w-full">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {isFr ? "Montant à rembourser" : "إجمالي المبلغ المسترد"}
                    </span>
                    <span className="text-xl font-black text-blue-600">
                      {formatCurrency(calculateReturnTotal())}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsRegisterOpen(false)}
                      className="rounded-xl px-4 text-xs font-bold"
                    >
                      {t("cancel") || "إلغاء"}
                    </Button>
                    <Button
                      onClick={handleConfirmReturn}
                      disabled={calculateReturnTotal() <= 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {isFr ? "Confirmer le retour" : "تأكيد واسترجاع للمخزن"}
                    </Button>
                  </div>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ──────────────── KPI SUMMARY CARDS ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Returns Count */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Total des retours" : "إجمالي المرتجعات"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Undo className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{kpiStats.totalCount}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Bons de retour émis" : "عمليات إرجاع مسجلة"}
          </span>
        </div>

        {/* Card 2: Total Return Value */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Valeur remboursée" : "قيمة المرتجعات"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 tracking-tight">
            {formatCurrency(kpiStats.totalValue)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Montant total restitué" : "إجمالي المبالغ المستردة"}
          </span>
        </div>

        {/* Card 3: Total Returned Items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Unités retournées" : "القطع المرتجعة"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{kpiStats.totalItems}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Articles réintégrés au stock" : "تمت إعادتها للمستودع"}
          </span>
        </div>

        {/* Card 4: Archived Returns */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Retours archivés" : "المرتجعات المؤرشفة"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArchiveIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 tracking-tight">{kpiStats.archivedCount}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Classés dans l'archive" : "محفوظة في الأرشيف المركزي"}
          </span>
        </div>
      </div>

      {/* ──────────────── SEARCH & FILTER BAR ──────────────── */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto pointer-events-none" />
          <Input
            placeholder={
              isFr ? "Rechercher par N° retour, client..." : "البحث برقم المرتجع، العميل أو الفاتورة..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        {/* Tabs: All / Active / Archived */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100/80 p-1 rounded-xl text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "all" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Tous" : "الكل"} ({filteredReturns.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "active" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Actifs" : "النشطة"}
          </button>
          <button
            onClick={() => setStatusFilter("archived")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "archived" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Archivés" : "المؤرشفة"}
          </button>
        </div>
      </div>

      {/* ──────────────── RETURNS DATA TABLE ──────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">{isFr ? "N° Retour" : "رقم المرتجع"}</th>
                <th className="py-3.5 px-4">{isFr ? "N° Facture" : "الفاتورة"}</th>
                <th className="py-3.5 px-4">{isFr ? "Client" : "العميل"}</th>
                <th className="py-3.5 px-4">{isFr ? "Articles retournés" : "المنتجات المرتجعة"}</th>
                <th className="py-3.5 px-4">{isFr ? "Date" : "التاريخ"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Montant" : "المبلغ المسترد"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Statut" : "الحالة"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedReturns.length > 0 ? (
                displayedReturns.map((item) => {
                  const isArchived = item.status === "archived";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        #{item.returnNumber}
                      </td>

                      {/* Invoice Ref */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                        {item.invoiceNumber ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            #{item.invoiceNumber}
                          </span>
                        ) : (
                          "---"
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.customerName || (isFr ? "Client comptoir" : "عميل نقدي")}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex flex-col gap-0.5 max-w-xs truncate">
                          {(item.items || []).map((it: any, i: number) => (
                            <span key={i} className="truncate">
                              • {it.productName} ({it.quantity}x)
                            </span>
                          ))}
                          {item.reason && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              {isFr ? "Motif:" : "السبب:"} {item.reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatShortDate(item.date || item.createdAt)}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-center font-black text-rose-600 font-sans text-sm">
                        {formatCurrency(item.total)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <ArchiveIcon size={12} />
                            <span>{isFr ? "Archivé" : "مؤرشف"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>{isFr ? "Complété" : "مكتمل"}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print voucher */}
                          <button
                            onClick={() => printReturnVoucher(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                            title={isFr ? "Imprimer le reçu" : "طباعة الإيصال"}
                          >
                            <Printer size={15} />
                          </button>

                          {/* Archive toggle */}
                          <button
                            onClick={() => handleArchiveReturn(item.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={
                              isArchived
                                ? isFr ? "Désarchiver" : "إلغاء الأرشفة"
                                : isFr ? "Archiver" : "أرشفة إلى سجل الأرشيف"
                            }
                          >
                            <ArchiveIcon size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={t("delete")}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Undo className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">
                      {isFr ? "Aucun retour enregistré" : "لا توجد عمليات إرجاع مسجلة"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isFr
                        ? "Cliquez sur 'Nouveau retour' pour enregistrer un retour d'article."
                        : "انقر على زر 'تسجيل مرتجع جديد' لإضافة أول عملية إرجاع."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              {t("deleteConfirmation")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              {t("cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="rounded-xl text-xs font-bold">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
