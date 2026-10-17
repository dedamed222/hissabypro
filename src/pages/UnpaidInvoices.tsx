import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import type { Invoice } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import {
  CreditCard,
  Search,
  Filter,
  AlertCircle,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Bell,
  Plus,
  Archive,
  ArrowUpRight,
  Send,
  MessageCircle,
  Clock,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Printer
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UnpaidInvoices() {
  const { t, locale, isRTL } = useLocale();
  const isFr = locale === 'fr';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [overdueFilter, setOverdueFilter] = useState<string>("all");

  // Pay / Settle Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settlementMethod, setSettlementMethod] = useState("cash");
  const [autoArchive, setAutoArchive] = useState(true);

  const loadData = () => {
    const storeData = loadStoreData();
    // Exclude archived and cancelled, keep pending and partial
    const unpaid = (storeData.invoices || []).filter(
      (invoice) => invoice.status === "pending" || invoice.status === "partial"
    );
    setInvoices(unpaid);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getDaysOverdue = (invoiceDate?: string) => {
    if (!invoiceDate) return 0;
    const today = new Date();
    const invoiceDateObj = new Date(invoiceDate);
    const diffTime = today.getTime() - invoiceDateObj.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays;
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        (invoice.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPaymentMethod =
        paymentMethodFilter === "all" || invoice.paymentMethod === paymentMethodFilter;

      const days = getDaysOverdue(invoice.date || invoice.createdAt);
      let matchesOverdue = true;
      if (overdueFilter === "critical") matchesOverdue = days > 30;
      else if (overdueFilter === "medium") matchesOverdue = days > 7 && days <= 30;
      else if (overdueFilter === "recent") matchesOverdue = days <= 7;

      return matchesSearch && matchesPaymentMethod && matchesOverdue;
    });
  }, [invoices, searchTerm, paymentMethodFilter, overdueFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const count = invoices.length;
    const criticalCount = invoices.filter((inv) => getDaysOverdue(inv.date || inv.createdAt) > 30).length;
    const criticalAmount = invoices
      .filter((inv) => getDaysOverdue(inv.date || inv.createdAt) > 30)
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const recentCount = invoices.filter((inv) => getDaysOverdue(inv.date || inv.createdAt) <= 7).length;

    return { totalAmount, count, criticalCount, criticalAmount, recentCount };
  }, [invoices]);

  // Open settle modal
  const openSettleModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSettlementMethod(invoice.paymentMethod || "cash");
    setAutoArchive(true);
    setIsPayModalOpen(true);
  };

  // Perform Settlement & optional Archive
  const handleConfirmSettlement = () => {
    if (!selectedInvoice) return;

    const storeData = loadStoreData();
    const updatedInvoices = (storeData.invoices || []).map((inv) => {
      if (inv.id === selectedInvoice.id) {
        // Deduct inventory if not already deducted
        if (storeData.products && inv.items) {
          storeData.products = storeData.products.map((prod) => {
            const item = inv.items.find((i) => i.productId === prod.id);
            if (item && prod.quantity >= item.quantity) {
              return {
                ...prod,
                quantity: prod.quantity - item.quantity,
                updatedAt: new Date().toISOString(),
              };
            }
            return prod;
          });
        }

        return {
          ...inv,
          status: (autoArchive ? "archived" : "paid") as any,
          paymentMethod: settlementMethod,
          updatedAt: new Date().toISOString(),
          notes: `${inv.notes ? inv.notes + " | " : ""}${isFr ? "Payé le " : "تم التحصيل في "}${new Date().toLocaleDateString()}`,
        };
      }
      return inv;
    });

    storeData.invoices = updatedInvoices;
    saveStoreData(storeData);

    toast({
      title: isFr ? "Facture réglée avec succès" : "تم تحصيل الفاتورة بنجاح",
      description: autoArchive
        ? isFr
          ? "La facture a été transférée vers l'archive"
          : "تمت تسوية الفاتورة ونقلها مباشرة إلى الأرشيف"
        : isFr
          ? "Le statut a été mis à jour"
          : "تم تحديث حالة الفاتورة كمدفوعة",
    });

    setIsPayModalOpen(false);
    setSelectedInvoice(null);
    loadData();
  };

  // Archive without paying (e.g. written-off or settled externally)
  const handleArchiveOnly = (invoiceId: string) => {
    const storeData = loadStoreData();
    storeData.invoices = (storeData.invoices || []).map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: "archived" as any,
          updatedAt: new Date().toISOString(),
        };
      }
      return inv;
    });
    saveStoreData(storeData);

    toast({
      title: isFr ? "Facture archivée" : "تم أرشفة الفاتورة",
      description: isFr
        ? "La facture a été déplacée vers les archives"
        : "تم نقل الفاتورة إلى الأرشيف المركزي",
    });

    loadData();
  };

  // WhatsApp reminder
  const sendWhatsAppReminder = (invoice: Invoice) => {
    const amountStr = formatCurrency(invoice.total);
    const dateStr = formatDate(invoice.date || invoice.createdAt || new Date().toISOString());
    const days = getDaysOverdue(invoice.date || invoice.createdAt);

    const message = isFr
      ? `Bonjour ${invoice.customerName},\nNous vous rappelons que la facture N° *${invoice.invoiceNumber}* émise le ${dateStr} d'un montant de *${amountStr}* (${days} jours de retard) reste en attente de paiement.\nMerci de régulariser la situation dès que possible.`
      : `السلام عليكم ${invoice.customerName}،\nنود تذكيركم بمستحقات الفاتورة رقم *${invoice.invoiceNumber}* الصادرة بتاريخ ${dateStr} بمبلغ *${amountStr}* (تأخير ${days} يوم).\nنرجو منكم التكرم بالسداد في أقرب وقت. شاكرين حسن تعاونكم.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div
      className={`w-full max-w-[100vw] overflow-x-hidden p-3 sm:p-6 space-y-6 ${
        locale === "ar" ? "font-arabic" : "font-sans"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-red-900 via-slate-900 to-slate-950 p-6 rounded-2xl text-white shadow-xl border border-red-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/30 rounded-xl border border-red-500/40 text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                {isFr ? "Factures Impayées & Créances" : "المستحقات والفواتير المعلقة"}
                <span className="text-xs bg-red-500/20 border border-red-500/40 text-red-300 font-semibold px-2.5 py-0.5 rounded-full">
                  {invoices.length} {isFr ? "En attente" : "معلقة"}
                </span>
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                {isFr
                  ? "Suivi et recouvrement des créances clients avec archivage direct"
                  : "متابعة وتحصيل مستحقات العملاء والفواتير غير المسددة مع ربط فوري بالأرشيف"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => navigate("/archive?tab=invoices")}
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <Archive className="w-4 h-4 ltr:mr-2 rtl:ml-2 text-amber-400" />
            {isFr ? "Archive des Factures" : "أرشيف الفواتير"}
          </Button>
          <Link to="/create-invoice">
            <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-red-600/30">
              <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {isFr ? "Nouvelle Facture" : "فاتورة جديدة"}
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Modern KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-red-200/80 bg-gradient-to-br from-red-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                  {isFr ? "Total Impayé" : "إجمالي المستحقات غير المحصلة"}
                </p>
                <p className="text-2xl font-black text-red-950 mt-1">
                  {formatCurrency(stats.totalAmount)}
                </p>
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isFr ? "Requiert un suivi" : "تتطلب متابعة التحصيل"}
                </p>
              </div>
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  {isFr ? "Retard Critique (>30j)" : "متأخرات حرجة (> 30 يوم)"}
                </p>
                <p className="text-2xl font-black text-amber-950 mt-1">
                  {stats.criticalCount} <span className="text-sm font-normal text-amber-700">({formatCurrency(stats.criticalAmount)})</span>
                </p>
                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {isFr ? "Priorité de relance" : "أولوية قصوى للتذكير"}
                </p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  {isFr ? "Factures Récentes (≤7j)" : "فواتير حديثة (≤ 7 أيام)"}
                </p>
                <p className="text-2xl font-black text-blue-950 mt-1">
                  {stats.recentCount}
                </p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isFr ? "Délai de grâce normal" : "ضمن المهلة المعتادة"}
                </p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isFr ? "Factures Actives" : "إجمالي المعاملات المعلقة"}
                </p>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {stats.count}
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {isFr ? "Dans cette section" : "في جدول المستحقات"}
                </p>
              </div>
              <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5 relative">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 ${
                  isRTL ? "right-3" : "left-3"
                } w-4 h-4 text-slate-400`}
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isFr
                    ? "Rechercher par client, N° facture, note..."
                    : "بحث بالعميل، رقم الفاتورة، ملاحظات..."
                }
                className={`${isRTL ? "pr-9" : "pl-9"} bg-slate-50/50 border-slate-200 h-10`}
              />
            </div>

            <div className="md:col-span-3">
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-10">
                  <SelectValue placeholder={isFr ? "Mode de paiement" : "طريقة الدفع"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isFr ? "Toutes les méthodes" : "جميع طرق الدفع"}</SelectItem>
                  <SelectItem value="cash">{isFr ? "Espèces (Cash)" : "نقداً (Cash)"}</SelectItem>
                  <SelectItem value="bankily">Bankily</SelectItem>
                  <SelectItem value="masrivi">Masrivi</SelectItem>
                  <SelectItem value="sedad">Sedad</SelectItem>
                  <SelectItem value="check">{isFr ? "Chèque" : "شيك"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={overdueFilter} onValueChange={setOverdueFilter}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-10">
                  <SelectValue placeholder={isFr ? "Délai de retard" : "فترة التأخير"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isFr ? "Tous les délais" : "كل الفترات"}</SelectItem>
                  <SelectItem value="critical">{isFr ? "Critique (> 30 jours)" : "حرجة (> 30 يوم)"}</SelectItem>
                  <SelectItem value="medium">{isFr ? "Moyen (8 à 30 jours)" : "متوسطة (8 إلى 30 يوم)"}</SelectItem>
                  <SelectItem value="recent">{isFr ? "Récent (≤ 7 jours)" : "حديثة (≤ 7 أيام)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setPaymentMethodFilter("all");
                  setOverdueFilter("all");
                }}
                className="h-10 w-full text-slate-600 hover:text-slate-900 border-slate-200"
                title={isFr ? "Réinitialiser" : "إعادة تعيين"}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <FileText className="w-5 h-5 text-red-600" />
            <span>{isFr ? "Tableau des المستحقات المعلقة" : "قائمة الفواتير المستحقة للتحصيل"}</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-normal">
              {filteredInvoices.length}
            </span>
          </div>
          <span className="text-xs font-semibold text-red-600">
            {isFr ? "Total affiché : " : "مجموع المعروض : "}
            {formatCurrency(filteredInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0))}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/75">
              <TableRow className="border-slate-200">
                <TableHead className={`${isRTL ? "text-right" : "text-left"} font-bold text-slate-700`}>
                  {isFr ? "N° Facture" : "رقم الفاتورة"}
                </TableHead>
                <TableHead className={`${isRTL ? "text-right" : "text-left"} font-bold text-slate-700`}>
                  {isFr ? "Client" : "العميل"}
                </TableHead>
                <TableHead className={`${isRTL ? "text-right" : "text-left"} font-bold text-slate-700`}>
                  {isFr ? "Montant Dû" : "المبلغ المستحق"}
                </TableHead>
                <TableHead className={`${isRTL ? "text-right" : "text-left"} font-bold text-slate-700`}>
                  {isFr ? "Date & Retard" : "التاريخ وفترة التأخير"}
                </TableHead>
                <TableHead className={`${isRTL ? "text-right" : "text-left"} font-bold text-slate-700`}>
                  {isFr ? "Méthode" : "طريقة الدفع"}
                </TableHead>
                <TableHead className={`${isRTL ? "text-right" : "text-left"} font-bold text-slate-700`}>
                  {isFr ? "Notes" : "ملاحظات"}
                </TableHead>
                <TableHead className="text-center font-bold text-slate-700">
                  {isFr ? "Actions" : "الإجراءات"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-2 opacity-50" />
                    <p className="text-base font-semibold text-slate-600">
                      {isFr ? "Aucune créance en attente" : "لا توجد مستحقات معلقة حالياً"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isFr
                        ? "Toutes les factures sont soldées ou archivées."
                        : "تم تحصيل وأرشفة جميع الفواتير أو لا توجد نتائج تطابق الفلتر."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const days = getDaysOverdue(invoice.date || invoice.createdAt);
                  const isCritical = days > 30;
                  const isMedium = days > 7 && days <= 30;

                  return (
                    <TableRow key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono font-bold text-slate-800">
                        <Badge variant="outline" className="bg-slate-100 font-mono text-xs">
                          {invoice.invoiceNumber}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold">
                            {(invoice.customerName || "؟").charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-900">{invoice.customerName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="font-extrabold text-red-600 text-base">
                        {formatCurrency(invoice.total)}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {invoice.date || formatDate(invoice.createdAt || new Date().toISOString())}
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isCritical
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : isMedium
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              <Clock className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                              {days} {isFr ? "j de retard" : "يوم تأخير"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium text-xs">
                          {t(invoice.paymentMethod as any) || invoice.paymentMethod}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-slate-500 max-w-[180px] truncate">
                        {invoice.notes || "-"}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Settle & Archive */}
                          <Button
                            size="sm"
                            onClick={() => openSettleModal(invoice)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs font-bold shadow-sm"
                            title={isFr ? "Encaisser & Archiver" : "تحصيل وأرشفة"}
                          >
                            <CheckCircle className="w-3.5 h-3.5 ltr:mr-1 rtl:ml-1" />
                            {isFr ? "Encaisser" : "تحصيل"}
                          </Button>

                          {/* WhatsApp Reminder */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendWhatsAppReminder(invoice)}
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8 px-2 text-xs"
                            title={isFr ? "Rappel WhatsApp" : "تذكير عبر واتساب"}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>

                          {/* Direct Archive */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleArchiveOnly(invoice.id)}
                            className="text-amber-700 hover:bg-amber-50 h-8 px-2 text-xs"
                            title={isFr ? "Archiver directement" : "أرشفة إلى السجل المركزي"}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Settle Modal */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              {isFr ? "Encaisser la Facture" : "تحصيل وتسوية الفاتورة"}
            </DialogTitle>
            <DialogDescription>
              {isFr
                ? `Enregistrement du règlement pour la facture N° ${selectedInvoice?.invoiceNumber}`
                : `تسجيل استلام المبلغ للفاتورة رقم ${selectedInvoice?.invoiceNumber}`}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{isFr ? "Client :" : "العميل :"}</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{isFr ? "Montant à encaisser :" : "المبلغ المحصل :"}</span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatCurrency(selectedInvoice.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {isFr ? "Mode de paiement reçu" : "طريقة الاستلام / التحصيل"}
                </label>
                <Select value={settlementMethod} onValueChange={setSettlementMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{isFr ? "Espèces (Cash)" : "نقداً (Cash)"}</SelectItem>
                    <SelectItem value="bankily">Bankily (بنكيلي)</SelectItem>
                    <SelectItem value="masrivi">Masrivi (مصرفي)</SelectItem>
                    <SelectItem value="sedad">Sedad (السداد)</SelectItem>
                    <SelectItem value="check">{isFr ? "Chèque" : "شيك"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="autoArchiveCheckbox"
                  checked={autoArchive}
                  onChange={(e) => setAutoArchive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="autoArchiveCheckbox" className="text-xs font-semibold text-amber-900 cursor-pointer">
                  {isFr
                    ? "Transférer automatiquement vers l'Archive centrale"
                    : "نقل الفاتورة تلقائياً إلى الأرشيف المركزي بعد التحصيل"}
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>
              {isFr ? "Annuler" : "إلغاء"}
            </Button>
            <Button
              onClick={handleConfirmSettlement}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <CheckCircle className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {isFr ? "Confirmer l'encaissement" : "تأكيد التحصيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
