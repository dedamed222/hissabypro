import React, { useState, useEffect, useMemo } from "react";
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
  Edit,
  DollarSign,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Creditor, Customer, Product } from "@/types";
import CustomerSelector from "@/components/invoice/CustomerSelector";
import ProductSearch from "@/components/sales/ProductSearch";
import NewProductForm from "@/components/creditors/NewProductForm";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import {
  getCreditors,
  upsertCreditor,
  deleteCreditor,
  updateCreditorStatus,
} from "@/lib/database";
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

export default function Creditors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, locale, isRTL } = useLocale();
  const isFr = locale === "fr";

  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    productName: "",
    quantity: "",
    price: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditorsList, setCreditorsList] = useState<Creditor[]>(() => {
    try {
      return loadStoreData().creditors || [];
    } catch {
      return [];
    }
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTermCreditor, setSearchTermCreditor] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "archived">("all");

  // For delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Product search functionality
  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch,
    products,
    setProducts,
  } = useProductSearch();

  const data = loadStoreData();

  // Fetch creditors on mount
  useEffect(() => {
    const fetchCreditors = async () => {
      try {
        const remoteCreditors = await getCreditors();
        const storeData = loadStoreData();
        const localCreditors: Creditor[] = storeData.creditors || [];

        const mappedRemote: Creditor[] = remoteCreditors.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          address: c.address || "",
          amount: c.amount || 0,
          notes: c.notes || "",
          productCode: c.product_code || "",
          productName: c.product_name || "",
          quantity: c.quantity || 0,
          price: c.price || 0,
          total: c.total || c.amount || 0,
          date: c.date || c.created_at || new Date().toISOString(),
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          status: c.status || "pending",
        }));

        const remoteIds = new Set(mappedRemote.map((c) => c.id));
        const localOnly = localCreditors.filter((c) => !remoteIds.has(c.id));
        const merged = [...mappedRemote, ...localOnly];

        storeData.creditors = merged;
        saveStoreData(storeData);
        setCreditorsList(merged);
      } catch (err) {
        console.error("Failed to fetch creditors:", err);
        const storeData = loadStoreData();
        setCreditorsList(storeData.creditors || []);
      }
    };
    fetchCreditors();

    const handleStorage = () => {
      fetchCreditors();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Dynamic KPIs
  const kpis = useMemo(() => {
    const totalAmount = creditorsList.reduce((acc, c) => acc + Number(c.total || c.amount || 0), 0);
    const paidAmount = creditorsList
      .filter((c) => c.status === "paid" || c.status === ("archived" as any))
      .reduce((acc, c) => acc + Number(c.total || c.amount || 0), 0);
    const pendingAmount = creditorsList
      .filter((c) => c.status !== "paid" && c.status !== ("archived" as any))
      .reduce((acc, c) => acc + Number(c.total || c.amount || 0), 0);
    const uniqueCreditors = new Set(creditorsList.map((c) => c.name)).size;
    const archivedCount = creditorsList.filter((c) => c.status === ("archived" as any)).length;

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      uniqueCreditors,
      archivedCount,
    };
  }, [creditorsList]);

  // Filtered List
  const displayedCreditors = useMemo(() => {
    return creditorsList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTermCreditor.toLowerCase()) ||
        (c.productName || "").toLowerCase().includes(searchTermCreditor.toLowerCase()) ||
        (c.productCode || "").toLowerCase().includes(searchTermCreditor.toLowerCase());

      const isArchived = c.status === ("archived" as any);
      if (statusFilter === "archived") return matchesSearch && isArchived;
      if (statusFilter === "paid") return matchesSearch && c.status === "paid" && !isArchived;
      if (statusFilter === "pending") return matchesSearch && c.status === "pending" && !isArchived;
      return matchesSearch;
    });
  }, [creditorsList, searchTermCreditor, statusFilter]);

  const handleToggleStatus = async (id: string, currentStatus: "pending" | "paid") => {
    const newStatus: "pending" | "paid" = currentStatus === "pending" ? "paid" : "pending";

    try {
      const storeData = loadStoreData();
      const updatedCreditors = (storeData.creditors || []).map((c: Creditor) =>
        c.id === id ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c
      );

      storeData.creditors = updatedCreditors;
      saveStoreData(storeData);
      setCreditorsList(updatedCreditors);

      if (id.length === 36) {
        await updateCreditorStatus(id, newStatus);
      }

      toast({
        title:
          newStatus === "paid"
            ? isFr ? "Payé avec succès" : "تم التسديد بنجاح"
            : isFr ? "Remis en attente" : "تمت الإعادة إلى قيد الانتظار",
        description: isFr ? "Statut mis à jour." : "تم تحديث حالة الدين للمورد.",
      });
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleArchiveCreditor = (id: string) => {
    const storeData = loadStoreData();
    const updatedCreditors = (storeData.creditors || []).map((c: Creditor) =>
      c.id === id
        ? {
            ...c,
            status: (c.status === ("archived" as any) ? "paid" : "archived") as any,
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    storeData.creditors = updatedCreditors;
    saveStoreData(storeData);
    setCreditorsList(updatedCreditors);

    toast({
      title: isFr ? "Statut d'archive mis à jour" : "تم تحديث حالة الأرشفة",
      description: isFr
        ? "Le compte a été transféré vers l'archive des créanciers."
        : "تم حفظ حساب المورد في الأرشيف المركزي.",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const storeData = loadStoreData();
      const updatedCreditors = (storeData.creditors || []).filter((c: Creditor) => c.id !== deleteId);
      storeData.creditors = updatedCreditors;
      saveStoreData(storeData);
      setCreditorsList(updatedCreditors);

      if (deleteId.length === 36) {
        await deleteCreditor(deleteId);
      }

      toast({
        title: isFr ? "Supprimé" : "تم الحذف",
        description: isFr ? "L'entrée a été supprimée." : "تم حذف سجل الدائنية بنجاح.",
      });
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(isFr ? "Le nom est obligatoire." : "يرجى إدخال اسم الدائن.");
      return;
    }

    const price = parseFloat(formData.price) || 0;
    const quantity = parseInt(formData.quantity) || 1;
    const total = price * quantity;

    if (total <= 0) {
      setError(isFr ? "Veuillez saisir un montant ou prix valide." : "يرجى إدخال مبلغ صحيح.");
      return;
    }

    setLoading(true);
    const newCreditor: Creditor = {
      id: generateId(),
      name: formData.name.trim(),
      phone: selectedCustomer?.phone || "",
      amount: total,
      total: total,
      price: price,
      quantity: quantity,
      productName: formData.productName || (isFr ? "Fourniture" : "بضاعة / مستلزمات"),
      productCode: formData.productCode || "",
      notes: formData.notes,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
    };

    try {
      // Save locally
      const storeData = loadStoreData();
      if (!storeData.creditors) storeData.creditors = [];
      storeData.creditors.unshift(newCreditor);
      saveStoreData(storeData);
      setCreditorsList(storeData.creditors);

      // Try Supabase sync
      try {
        await upsertCreditor({
          name: newCreditor.name,
          phone: newCreditor.phone,
          amount: newCreditor.total,
          product_code: newCreditor.productCode,
          product_name: newCreditor.productName,
          quantity: newCreditor.quantity,
          price: newCreditor.price,
          total: newCreditor.total,
          notes: newCreditor.notes,
          status: "pending",
        });
      } catch (dbErr) {
        console.warn("Could not sync to cloud, saved locally:", dbErr);
      }

      setIsAddModalOpen(false);
      setFormData({
        name: "",
        productCode: "",
        productName: "",
        quantity: "",
        price: "",
        notes: "",
      });
      setSelectedCustomer(null);
      setError("");

      toast({
        title: isFr ? "Créancier ajouté" : "تمت إضافة الدائن",
        description: isFr ? "Le compte a été enregistré." : "تم تسجيل حساب الدائنية بنجاح.",
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

  return (
    <div className="w-full px-3 sm:px-6 py-4 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* ──────────────── HEADER ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Building2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isFr ? "Gestion des dettes fournisseurs (Créditeurs)" : "إدارة ديون الموردين والدائنين"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isFr
                ? "Suivi des paiements fournisseurs, échéances et archivage des comptes soldés"
                : "تتبع المستحقات للدائنين والموردين، تسجيل الدفعات وأرشفة الحسابات المسواة"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Link to Archive */}
          <Button
            onClick={() => navigate("/archive?tab=creditors")}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-2 shadow-xs cursor-pointer"
          >
            <ArchiveIcon className="w-4 h-4 text-amber-600" />
            <span>{isFr ? "Archives des dettes" : "أرشيف الدائنين"}</span>
            {kpis.archivedCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black flex items-center justify-center">
                {kpis.archivedCount}
              </span>
            )}
          </Button>

          {/* Quick Overview Link */}
          <Button
            onClick={() => navigate("/creditors/overview")}
            variant="outline"
            className="h-10 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs gap-2 shadow-xs cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>{isFr ? "Synthèse globale" : "الملخص الإحصائي"}</span>
          </Button>

          {/* Add Creditor Modal Button */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>{isFr ? "Nouveau créancier" : "إضافة دائن جديد"}</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[620px] gap-0 p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              <DialogHeader className="p-5 bg-gradient-to-r from-[#0047cc] to-[#0052d9] text-white">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <span>{isFr ? "Ajouter une dette fournisseur / créancier" : "تسجيل دائن جديد"}</span>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitNew}>
                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200">
                      {error}
                    </div>
                  )}

                  {/* Customer / Supplier selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      {isFr ? "Fournisseur / Dépositaire" : "المورد / الدائن"} *
                    </label>
                    <CustomerSelector
                      selectedCustomer={selectedCustomer}
                      customers={data.customers || []}
                      onCustomerChange={(id) => {
                        const cust = (data.customers || []).find((c) => c.id === id);
                        if (cust) {
                          setSelectedCustomer(cust);
                          setFormData((prev) => ({ ...prev, name: cust.name }));
                        }
                      }}
                    />
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={isFr ? "Ou saisissez le nom manuellement..." : "أو اكتب اسم الدائن يدوياً..."}
                      className="mt-2 h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                      required
                    />
                  </div>

                  {/* Product Details */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-blue-600" />
                        <span>{isFr ? "Détails de l'article / fourniture" : "بيانات الصنف أو الخدمة"}</span>
                      </span>
                    </div>

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
                          {isFr ? "Nom de l'article" : "اسم المنتج أو البيان"}
                        </label>
                        <Input
                          value={formData.productName}
                          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                          placeholder={isFr ? "Nom du produit..." : "اسم الصنف..."}
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
                          {isFr ? "Montant unitaire / Prix (MRU)" : "سعر الوحدة (أوقية)"}
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
                      {isFr ? "Notes / Échéance" : "ملاحظات وتاريخ الاستحقاق"}
                    </label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder={isFr ? "Ex: À payer fin du mois..." : "مثال: يستحق الدفع نهاية الشهر..."}
                      className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between w-full">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {isFr ? "Total de la dette" : "إجمالي المبلغ المستحق"}
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
                      {isFr ? "Enregistrer" : "حفظ الدائن"}
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
              {isFr ? "Total des dettes" : "إجمالي الديون"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(kpis.totalAmount)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Dettes fournisseurs totales" : "المستحقات الإجمالية للموردين"}
          </span>
        </div>

        {/* Pending Unpaid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Solde restant dû" : "المتبقي غير المسدد"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 tracking-tight">
            {formatCurrency(kpis.pendingAmount)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "En attente de règlement" : "مبالغ قيد الدفع والانتظار"}
          </span>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Total réglé" : "المبالغ المسددة"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(kpis.paidAmount)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Montants payés aux fournisseurs" : "ديون تمت تسويتها"}
          </span>
        </div>

        {/* Active Suppliers */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isFr ? "Créanciers actifs" : "الدائنين النشطين"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{kpis.uniqueCreditors}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            {isFr ? "Comptes fournisseurs ouverts" : "موردون لهم حسابات جارية"}
          </span>
        </div>
      </div>

      {/* ──────────────── SEARCH & FILTER BAR ──────────────── */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto pointer-events-none" />
          <Input
            placeholder={
              isFr ? "Rechercher par créancier, produit..." : "ابحث باسم الدائن، الصنف أو الرمز..."
            }
            value={searchTermCreditor}
            onChange={(e) => setSearchTermCreditor(e.target.value)}
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
            {isFr ? "Tous" : "الكل"} ({creditorsList.length})
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
            {isFr ? "Réglés" : "المسددة"}
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

      {/* ──────────────── CREDITORS TABLE ──────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">{isFr ? "Créancier" : "الدائن / المورد"}</th>
                <th className="py-3.5 px-4">{isFr ? "Article / Fourniture" : "الصنف / البيان"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Quantité" : "الكمية"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Prix unitaire" : "السعر"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Total dû" : "الإجمالي"}</th>
                <th className="py-3.5 px-4">{isFr ? "Date" : "التاريخ"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Statut" : "الحالة"}</th>
                <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedCreditors.length > 0 ? (
                displayedCreditors.map((c) => {
                  const isPaid = c.status === "paid";
                  const isArchived = c.status === ("archived" as any);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{c.name}</p>
                            {c.phone && <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span>{c.productName || (isFr ? "Boutique" : "سلع عامة")}</span>
                        {c.productCode && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            #{c.productCode}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-sans">
                        {c.quantity || 1}
                      </td>

                      <td className="py-3.5 px-4 text-center font-semibold text-slate-600 font-sans">
                        {formatCurrency(c.price || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-rose-600 font-sans text-sm">
                        {formatCurrency(c.total || c.amount || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {formatShortDate(c.date || c.createdAt)}
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
                            <span>{isFr ? "Réglé" : "مسدد"}</span>
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
                          {/* Toggle Paid / Pending */}
                          <button
                            onClick={() => handleToggleStatus(c.id, isPaid ? "paid" : "pending")}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isPaid
                                ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={isPaid ? (isFr ? "Marquer non payé" : "إعادة للانتظار") : (isFr ? "Marquer payé" : "تسجيل الدفع")}
                          >
                            <CheckCircle2 size={15} />
                          </button>

                          {/* Archive toggle */}
                          <button
                            onClick={() => handleArchiveCreditor(c.id)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={
                              isArchived
                                ? isFr ? "Désarchiver" : "إلغاء الأرشفة"
                                : isFr ? "Archiver vers le registre" : "أرشفة الحساب"
                            }
                          >
                            <ArchiveIcon size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteId(c.id)}
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
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">
                      {isFr ? "Aucun créancier trouvé" : "لا توجد حسابات دائنين مسجلة"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isFr
                        ? "Cliquez sur 'Nouveau créancier' pour enregistrer une dette fournisseur."
                        : "انقر على زر 'إضافة دائن جديد' لتسجيل حساب مورد جديد."}
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
