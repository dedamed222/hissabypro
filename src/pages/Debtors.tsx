import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import {
  Plus,
  User,
  Package,
  BarChart3,
  Archive as ArchiveIcon,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  DollarSign,
  Phone,
  MessageCircle,
  Printer,
  ChevronDown,
  Layers,
  Calendar,
  AlertCircle,
  Wallet,
} from "lucide-react";
import type { Debtor, Customer, Product } from "@/types";
import CustomerSelector from "@/components/invoice/CustomerSelector";
import ProductSearch from "@/components/sales/ProductSearch";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useToast } from "@/hooks/use-toast";
import { getDebtors, upsertDebtor, deleteDebtor, updateDebtorStatus } from "@/lib/database";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface DebtorProductItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Debtors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";

  const [formData, setFormData] = useState({
    debtorName: "",
    phone: "",
    notes: "",
    productCode: "",
    productName: "",
    quantity: "1",
    price: "",
  });
  const [selectedProducts, setSelectedProducts] = useState<DebtorProductItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [debtorsList, setDebtorsList] = useState<Debtor[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTermDebtor, setSearchTermDebtor] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "archived">("all");

  // Product search functionality
  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch,
  } = useProductSearch();

  const data = loadStoreData();

  // Load debtors on mount
  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        const remoteDebtors = await getDebtors();
        const storeData = loadStoreData();
        const localDebtors: Debtor[] = storeData.debtors || [];

        const mappedRemote: Debtor[] = remoteDebtors.map((d: any) => ({
          id: d.id,
          name: d.name,
          debtorName: d.name,
          phone: d.phone || "",
          products: Array.isArray(d.products) ? d.products : [],
          totalAmount: d.total_amount || 0,
          amount: d.total_amount || 0,
          notes: d.notes || "",
          date: d.date || d.created_at || new Date().toISOString(),
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          status: d.status || "pending",
        }));

        const remoteIds = new Set(mappedRemote.map((d) => d.id));
        const localOnly = localDebtors.filter((d) => !remoteIds.has(d.id));
        const merged = [...mappedRemote, ...localOnly];

        storeData.debtors = merged;
        saveStoreData(storeData);
        setDebtorsList(merged);
      } catch (err) {
        console.error("Failed to fetch debtors:", err);
        const storeData = loadStoreData();
        setDebtorsList(storeData.debtors || []);
      }
    };
    fetchDebtors();
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const totalAmount = debtorsList.reduce((acc, d) => acc + Number(d.totalAmount || d.amount || 0), 0);
    const paidAmount = debtorsList
      .filter((d) => d.status === "paid" || d.status === ("archived" as any))
      .reduce((acc, d) => acc + Number(d.totalAmount || d.amount || 0), 0);
    const pendingAmount = debtorsList
      .filter((d) => d.status !== "paid" && d.status !== ("archived" as any))
      .reduce((acc, d) => acc + Number(d.totalAmount || d.amount || 0), 0);
    const uniqueDebtors = new Set(debtorsList.map((d) => d.name || d.debtorName)).size;
    const archivedCount = debtorsList.filter((d) => d.status === ("archived" as any)).length;

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      uniqueDebtors,
      archivedCount,
    };
  }, [debtorsList]);

  // Filtered Debtors
  const displayedDebtors = useMemo(() => {
    return debtorsList.filter((d) => {
      const name = (d.name || d.debtorName || "").toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const matchesSearch =
        name.includes(searchTermDebtor.toLowerCase()) || phone.includes(searchTermDebtor.toLowerCase());

      const isArchived = d.status === ("archived" as any);
      if (statusFilter === "archived") return matchesSearch && isArchived;
      if (statusFilter === "paid") return matchesSearch && d.status === "paid" && !isArchived;
      if (statusFilter === "pending") return matchesSearch && d.status === "pending" && !isArchived;
      return matchesSearch;
    });
  }, [debtorsList, searchTermDebtor, statusFilter]);

  const handleToggleStatus = async (id: string, currentStatus: "pending" | "paid") => {
    const newStatus: "pending" | "paid" = currentStatus === "pending" ? "paid" : "pending";

    try {
      const storeData = loadStoreData();
      const updatedDebtors = (storeData.debtors || []).map((d: Debtor) =>
        d.id === id ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
      );

      storeData.debtors = updatedDebtors;
      saveStoreData(storeData);
      setDebtorsList(updatedDebtors);

      if (id.length === 36) {
        await updateDebtorStatus(id, newStatus);
      }

      toast({
        title:
          newStatus === "paid"
            ? isFr ? "Créance soldée" : "تم تسديد الدين بنجاح"
            : isFr ? "Remis en attente" : "تمت إعادة الدين لقائمة الانتظار",
        description: isFr ? "Statut du débiteur mis à jour." : "تم تحديث حالة العميل المدين.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveDebtor = (id: string) => {
    const storeData = loadStoreData();
    const updatedDebtors = (storeData.debtors || []).map((d: Debtor) =>
      d.id === id
        ? {
            ...d,
            status: (d.status === ("archived" as any) ? "paid" : "archived") as any,
            updatedAt: new Date().toISOString(),
          }
        : d
    );

    storeData.debtors = updatedDebtors;
    saveStoreData(storeData);
    setDebtorsList(updatedDebtors);

    toast({
      title: isFr ? "Créance archivée" : "تمت أرشفة الدين",
      description: isFr
        ? "Le dossier a été transféré vers l'archive des débiteurs."
        : "تم حفظ سجل الدين في الأرشيف المركزي.",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const storeData = loadStoreData();
      const updatedDebtors = (storeData.debtors || []).filter((d: Debtor) => d.id !== deleteId);
      storeData.debtors = updatedDebtors;
      saveStoreData(storeData);
      setDebtorsList(updatedDebtors);

      if (deleteId.length === 36) {
        await deleteDebtor(deleteId);
      }

      toast({
        title: isFr ? "Supprimé" : "تم الحذف",
        description: isFr ? "Le dossier débiteur a été supprimé." : "تم حذف سجل المدين.",
      });
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.debtorName.trim();
    if (!name) {
      setError(isFr ? "Le nom du client est requis." : "يرجى إدخال اسم العميل المدين.");
      return;
    }

    const price = parseFloat(formData.price) || 0;
    const quantity = parseInt(formData.quantity) || 1;
    let total = price * quantity;

    if (selectedProducts.length > 0) {
      total = selectedProducts.reduce((sum, p) => sum + p.total, 0);
    }

    if (total <= 0) {
      setError(isFr ? "Le montant total doit être supérieur à zéro." : "يرجى تحديد مبلغ دين صحيح.");
      return;
    }

    setLoading(true);
    const newDebtor: Debtor = {
      id: generateId(),
      name,
      debtorName: name,
      phone: formData.phone || selectedCustomer?.phone || "",
      totalAmount: total,
      amount: total,
      notes: formData.notes,
      products: selectedProducts.length > 0 ? selectedProducts : [
        {
          productId: "",
          productCode: formData.productCode || "",
          productName: formData.productName || (isFr ? "Vente à terme" : "بضاعة آجلة"),
          quantity,
          price,
          total,
        },
      ],
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
    };

    try {
      const storeData = loadStoreData();
      if (!storeData.debtors) storeData.debtors = [];
      storeData.debtors.unshift(newDebtor);
      saveStoreData(storeData);
      setDebtorsList(storeData.debtors);

      try {
        await upsertDebtor({
          name: newDebtor.name,
          phone: newDebtor.phone,
          total_amount: newDebtor.totalAmount,
          notes: newDebtor.notes,
          products: newDebtor.products,
          status: "pending",
        });
      } catch (dbErr) {
        console.warn("Could not sync to cloud, saved locally:", dbErr);
      }

      setIsAddModalOpen(false);
      setFormData({
        debtorName: "",
        phone: "",
        notes: "",
        productCode: "",
        productName: "",
        quantity: "1",
        price: "",
      });
      setSelectedProducts([]);
      setSelectedCustomer(null);
      setError("");

      toast({
        title: isFr ? "Débiteur enregistré" : "تم تسجيل الدين",
        description: isFr ? "Le compte a été créé avec succès." : "تمت إضافة سجل العميل المدين بنجاح.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setFormData((prev) => ({
      ...prev,
      productCode: product.code,
      productName: product.name,
      price: String(product.price),
    }));
    setShowProductSearch(false);
    setSearchTerm("");
  };

  const sendWhatsAppReminder = (d: Debtor) => {
    const phone = d.phone?.replace(/[^0-9]/g, "");
    if (!phone) {
      toast({
        title: isFr ? "Numéro manquant" : "رقم الهاتف غير متوفر",
        description: isFr ? "Veuillez renseigner le numéro du client." : "يرجى إضافة رقم هاتف للعميل.",
        variant: "destructive",
      });
      return;
    }
    const msg = encodeURIComponent(
      isFr
        ? `Bonjour ${d.name || d.debtorName}, nous vous rappelons votre solde de ${formatCurrency(d.totalAmount || d.amount || 0)} chez notre magasin. Merci de procéder au règlement.`
        : `السلام عليكم ${d.name || d.debtorName}، نود تذكيركم برصيد دين مستحق قدره ${formatCurrency(d.totalAmount || d.amount || 0)}. شاكرين حسن تعاونكم.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="w-full px-3 sm:px-6 py-4 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ──────────────── HEADER ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Wallet className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isFr ? "Gestion des créances clients (Débiteurs)" : "إدارة ديون العملاء والمدينين"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isFr
                ? "Suivi des impayés, rappels WhatsApp et archivage des comptes soldés"
                : "متابعة ديون العملاء، تذكيرات الواتساب، والتحصيل مع إمكانية الأرشفة"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Link to Archive */}
          <Button
            onClick={() => navigate("/archive?tab=debtors")}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-2 shadow-xs cursor-pointer"
          >
            <ArchiveIcon className="w-4 h-4 text-amber-600" />
            <span>{isFr ? "Archives des créances" : "أرشيف المدينين"}</span>
            {kpis.archivedCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black flex items-center justify-center">
                {kpis.archivedCount}
              </span>
            )}
          </Button>

          {/* Quick Overview Link */}
          <Button
            onClick={() => navigate("/debtors/overview")}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-2 shadow-xs cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>{isFr ? "Synthèse globale" : "الملخص الإحصائي"}</span>
          </Button>

          {/* Add Debtor Modal */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>{isFr ? "Nouveau débiteur" : "تسجيل دين جديد"}</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[620px] gap-0 p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              <DialogHeader className="p-5 bg-gradient-to-r from-[#0047cc] to-[#0052d9] text-white">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  <span>{isFr ? "Enregistrer une créance client" : "تسجيل دين جديد على عميل"}</span>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitNew}>
                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200">
                      {error}
                    </div>
                  )}

                  {/* Customer Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      {isFr ? "Sélectionner le client" : "اختر العميل"} *
                    </label>
                    <CustomerSelector
                      selectedCustomer={selectedCustomer}
                      customers={data.customers || []}
                      onCustomerChange={(id) => {
                        const cust = (data.customers || []).find((c) => c.id === id);
                        if (cust) {
                          setSelectedCustomer(cust);
                          setFormData((prev) => ({
                            ...prev,
                            debtorName: cust.name,
                            phone: cust.phone || "",
                          }));
                        }
                      }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                      <Input
                        value={formData.debtorName}
                        onChange={(e) => setFormData({ ...formData, debtorName: e.target.value })}
                        placeholder={isFr ? "Nom du client..." : "اسم العميل..."}
                        className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                        required
                      />
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={isFr ? "N° de téléphone..." : "رقم الهاتف..."}
                        className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>{isFr ? "Articles ou montant du crédit" : "بيانات السلع أو مبلغ الدين"}</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          {isFr ? "Code produit" : "رمز المنتج"}
                        </label>
                        <Input
                          value={formData.productCode}
                          onChange={(e) => {
                            setFormData({ ...formData, productCode: e.target.value });
                            setSearchTerm(e.target.value);
                            setShowProductSearch(true);
                          }}
                          placeholder="Ex: PRD-001"
                          className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                        />
                        <ProductSearch
                          show={showProductSearch && (searchTerm.length > 0 || formData.productCode.length > 0)}
                          searchTerm={searchTerm}
                          setSearchTerm={setSearchTerm}
                          filteredProducts={filteredProducts}
                          onSelect={handleProductSelect}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          {isFr ? "Nom de l'article" : "اسم الصنف"}
                        </label>
                        <Input
                          value={formData.productName}
                          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                          placeholder={isFr ? "Nom du produit ou motif..." : "اسم الصنف أو بيان الدين..."}
                          className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          {isFr ? "Quantité" : "الكمية"}
                        </label>
                        <Input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          placeholder="1"
                          className="h-9 text-xs bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                          {isFr ? "Montant / Prix unitaire (MRU)" : "المبلغ / سعر الوحدة (أوقية)"}
                        </label>
                        <Input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="0.00"
                          className="h-9 text-xs bg-white border-slate-200 rounded-xl font-bold font-sans text-blue-600"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      {isFr ? "Notes / Modalités de remboursement" : "ملاحظات وطريقة السداد"}
                    </label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={isFr ? "Ex: Promesse de paiement le 25..." : "مثال: وعد بالدفع يوم 25 في الشهر..."}
                      className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between w-full">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {isFr ? "Total de la créance" : "إجمالي مبلغ الدين"}
                    </span>
                    <span className="text-lg font-black text-rose-600">
                      {formatCurrency(
                        (parseFloat(formData.price) || 0) * (parseInt(formData.quantity) || 1)
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      className="rounded-xl px-4 text-xs font-bold"
                    >
                      {t("cancel") || "إلغاء"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {isFr ? "Enregistrer" : "حفظ الدين"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ──────────────── KPI SUMMARY CARDS ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Debts */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Total des créances" : "إجمالي ديون العملاء"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(kpis.totalAmount)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Montant global des crédits" : "إجمالي الديون المسجلة"}
          </span>
        </div>

        {/* Pending Unpaid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Solde restant dû" : "الديون المعلقة والمتبقية"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 tracking-tight">
            {formatCurrency(kpis.pendingAmount)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "À recouvrer auprès des clients" : "مبالغ مستحقة التحصيل"}
          </span>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Créances recouvrées" : "المبالغ المحصلة"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(kpis.paidAmount)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Montants déjà encaissés" : "تم سدادها واستلامها"}
          </span>
        </div>

        {/* Active Debtors */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Clients débiteurs" : "العملاء المدينين"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{kpis.uniqueDebtors}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Clients ayant un solde ouvert" : "عملاء عليهم حسابات جارية"}
          </span>
        </div>
      </div>

      {/* ──────────────── SEARCH & FILTER BAR ──────────────── */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto pointer-events-none" />
          <Input
            placeholder={
              isFr ? "Rechercher par client ou téléphone..." : "ابحث باسم العميل أو رقم الهاتف..."
            }
            value={searchTermDebtor}
            onChange={(e) => setSearchTermDebtor(e.target.value)}
            className="rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100/80 p-1 rounded-xl text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "all" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Tous" : "الكل"} ({debtorsList.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "pending" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "En attente" : "قيد الانتظار"}
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "paid" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isFr ? "Soldés" : "المسددة"}
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

      {/* ──────────────── DEBTORS TABLE ──────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">{isFr ? "Client débiteur" : "العميل المدين"}</th>
                <th className="py-3.5 px-4">{isFr ? "Articles / Détail" : "البيان / الأصناف"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Montant de la créance" : "إجمالي الدين"}</th>
                <th className="py-3.5 px-4">{isFr ? "Date d'octroi" : "التاريخ"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Statut" : "الحالة"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Actions rapides" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedDebtors.length > 0 ? (
                displayedDebtors.map((d) => {
                  const isPaid = d.status === "paid";
                  const isArchived = d.status === ("archived" as any);
                  const clientName = d.name || d.debtorName || (isFr ? "Client inconnu" : "عميل بدون اسم");
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            {clientName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{clientName}</p>
                            {d.phone && (
                              <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone size={10} />
                                {d.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <div className="max-w-xs truncate">
                          {d.products && d.products.length > 0 ? (
                            d.products.map((p, i) => (
                              <span key={i} className="block truncate">
                                • {p.productName} ({p.quantity}x)
                              </span>
                            ))
                          ) : (
                            <span>{d.notes || (isFr ? "Crédit général" : "دين تجاري")}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-rose-600 font-sans text-sm">
                        {formatCurrency(d.totalAmount || d.amount || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatShortDate(d.date || d.createdAt)}
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
                            <span>{isFr ? "Soldé" : "مسدد"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock size={12} />
                            <span>{isFr ? "Impayé" : "مستحق"}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Reminder */}
                          {d.phone && !isPaid && (
                            <button
                              onClick={() => sendWhatsAppReminder(d)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title={isFr ? "Envoyer rappel WhatsApp" : "إرسال تذكير واتساب"}
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}

                          {/* Toggle Paid / Pending */}
                          <button
                            onClick={() => handleToggleStatus(d.id, isPaid ? "paid" : "pending")}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isPaid
                                ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={isPaid ? (isFr ? "Marquer non soldé" : "إعادة للانتظار") : (isFr ? "Marquer soldé" : "تسجيل التحصيل")}
                          >
                            <CheckCircle2 size={15} />
                          </button>

                          {/* Archive toggle */}
                          <button
                            onClick={() => handleArchiveDebtor(d.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={
                              isArchived
                                ? isFr ? "Désarchiver" : "إلغاء الأرشفة"
                                : isFr ? "Archiver vers le registre" : "أرشفة الدين"
                            }
                          >
                            <ArchiveIcon size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteId(d.id)}
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
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">
                      {isFr ? "Aucun débiteur trouvé" : "لا توجد ديون مسجلة على العملاء"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isFr
                        ? "Cliquez sur 'Nouveau débiteur' pour enregistrer une vente à terme."
                        : "انقر على زر 'تسجيل دين جديد' لإضافة حساب آجل."}
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
              onClick={handleDelete}
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
