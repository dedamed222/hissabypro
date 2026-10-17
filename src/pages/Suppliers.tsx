import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSuppliers,
  upsertSupplier,
  deleteSupplier,
  getCustomers,
  upsertCustomer,
  getInvoices,
  getDebtors,
  getCreditors,
  getProducts,
  getProductMovementsDB
} from "@/lib/database";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { formatCurrency, formatDate, normalizeArabic } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";
import {
  Supplier,
  Customer,
  Product,
  Debtor,
  Creditor,
  Invoice,
  ProductMovement
} from "@/types";
import {
  Truck,
  User,
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Layers,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  Receipt,
  Download,
  Loader2,
  ShieldCheck,
  Building2,
  Tag,
  Filter
} from "lucide-react";

interface EnrichedSupplier extends Supplier {
  matchedCustomer?: Customer;
  isDual: boolean;
  suppliedProducts: Product[];
  customerDebts: number;       // ديون عليه كعميل
  supplierPayables: number;    // مستحقات له كمورد
  netBalance: number;          // صافي المقاصة = supplierPayables - customerDebts
  archiveInvoicesCount: number;
}

export default function Suppliers() {
  const navigate = useNavigate();
  const { t, locale, isRTL } = useLocale();
  const isFr = locale === 'fr';

  // Core State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [productMovements, setProductMovements] = useState<ProductMovement[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"all" | "dual" | "payables" | "receivables" | "settled">("all");

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [createAsCustomerToo, setCreateAsCustomerToo] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: ""
  });

  // Statement / Clearing Details Drawer Modal
  const [clearingModalSupplier, setClearingModalSupplier] = useState<EnrichedSupplier | null>(null);
  const [clearingTab, setClearingTab] = useState<"statement" | "products" | "invoices">("statement");

  // Load all integrated data from Cloud & Local
  const loadData = useCallback(async () => {
    setError("");
    try {
      const storeData = loadStoreData();

      // 1. Immediately render local cached suppliers and related data
      if (storeData.suppliers && storeData.suppliers.length > 0) {
        setSuppliers(storeData.suppliers);
        setLoading(false);
      }
      if (storeData.customers) setCustomers(storeData.customers);
      if (storeData.products) setProducts(storeData.products);
      if (storeData.debtors) setDebtors(storeData.debtors);
      if (storeData.creditors) setCreditors(storeData.creditors);
      if (storeData.invoices) setInvoices(storeData.invoices);
      if (storeData.productMovements) setProductMovements(storeData.productMovements);

      // Cloud fetches with local fallbacks in the background
      let [
        dbSuppliers,
        dbCustomers,
        dbProducts,
        dbDebtors,
        dbCreditors,
        dbInvoices,
        dbMovements
      ] = await Promise.all([
        getSuppliers().catch(() => []),
        getCustomers().catch(() => []),
        getProducts().catch(() => []),
        getDebtors().catch(() => []),
        getCreditors().catch(() => []),
        getInvoices().catch(() => []),
        getProductMovementsDB().catch(() => [])
      ]);

      // Merge Suppliers
      const supMap = new Map<string, Supplier>();
      (storeData.suppliers || []).forEach((s: any) => supMap.set(s.id, s));
      dbSuppliers.forEach((s: any) => supMap.set(s.id, {
        id: s.id,
        name: s.name,
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        photoUrl: s.photo_url || '',
        notes: s.notes || '',
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at
      }));
      const allSuppliers = Array.from(supMap.values());
      setSuppliers(allSuppliers);

      // Merge Customers
      const custMap = new Map<string, Customer>();
      (storeData.customers || []).forEach((c: any) => custMap.set(c.id, c));
      dbCustomers.forEach((c: any) => custMap.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email,
        address: c.address,
        company: c.company,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));
      setCustomers(Array.from(custMap.values()));

      // Merge Products
      const prodMap = new Map<string, Product>();
      (storeData.products || []).forEach((p: any) => prodMap.set(p.id, p));
      dbProducts.forEach((p: any) => prodMap.set(p.id, {
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        cost: p.cost || 0,
        quantity: p.quantity || 0,
        supplierId: p.supplier_id || p.supplierId,
        category: p.category,
        lowStockThreshold: p.low_stock_threshold || 5,
        createdAt: p.created_at
      }));
      setProducts(Array.from(prodMap.values()));

      // Merge Debtors (Customer Debts)
      const debtList: Debtor[] = [
        ...(storeData.debtors || []),
        ...dbDebtsToDebtors(dbDebtors)
      ];
      setDebtors(debtList);

      // Merge Creditors (Supplier Credits / Payables)
      const credList: Creditor[] = [
        ...(storeData.creditors || []),
        ...dbCredsToCreditors(dbCreditors)
      ];
      setCreditors(credList);

      // Merge Invoices
      const invList: Invoice[] = [
        ...(storeData.invoices || []),
        ...dbInvoices.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          customerId: inv.customer_id,
          customerName: inv.customer_name,
          total: Number(inv.total) || 0,
          date: inv.date || (inv.created_at ? inv.created_at.split('T')[0] : ''),
          createdAt: inv.created_at || new Date().toISOString(),
          paymentMethod: inv.payment_method || 'cash',
          status: inv.status,
          type: inv.type,
          products: [],
          items: (inv.invoice_items || []).map((it: any) => ({
            productId: it.product_id,
            productName: it.product_name,
            productCode: it.product_code || '',
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || 0
          }))
        }))
      ];
      setInvoices(invList);

      // Movements
      const movList: ProductMovement[] = [
        ...(storeData.productMovements || []),
        ...dbMovements.map((m: any) => ({
          id: m.id,
          productId: m.product_id,
          productName: m.product_name || '',
          productCode: m.product_code || '',
          customerId: m.customer_id,
          customerName: m.customer_name || '',
          invoiceNumber: m.invoice_number || '',
          date: m.date || '',
          quantity: Number(m.quantity) || 0,
          unitPrice: Number(m.unit_price) || 0,
          total: Number(m.total) || 0,
          type: m.type || 'sale',
          isManualItem: false,
          createdAt: m.created_at || new Date().toISOString(),
          updatedAt: m.updated_at || new Date().toISOString()
        }))
      ];
      setProductMovements(movList);

    } catch (err: any) {
      console.error("Error loading suppliers data:", err);
      setError(isFr ? "Erreur lors du chargement des données fournisseurs, utilisation du mode local." : "حدث خطأ أثناء تحميل بيانات الموردين، يجري الاعتماد على البيانات المحلية.");
    } finally {
      setLoading(false);
    }
  }, []);

  function dbDebtsToDebtors(dbRows: any[]): Debtor[] {
    return dbRows.map(d => ({
      id: d.id,
      name: d.name,
      debtorName: d.debtor_name || d.name,
      customer_id: d.customer_id,
      phone: d.phone || '',
      totalAmount: Number(d.total_amount) || Number(d.amount) || 0,
      amount: Number(d.amount) || 0,
      date: d.date || '',
      status: d.status || 'pending',
      products: d.products || []
    }));
  }

  function dbCredsToCreditors(dbRows: any[]): Creditor[] {
    return dbRows.map(c => ({
      id: c.id,
      name: c.name,
      customer_id: c.customer_id,
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
    }));
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enrich Suppliers with Customer, Debts, Payables, and Archive Movements
  const enrichedSuppliers: EnrichedSupplier[] = useMemo(() => {
    return suppliers.map(supplier => {
      const supNorm = normalizeArabic(supplier.name);
      const supPhone = (supplier.phone || '').trim().replace(/\s+/g, '');

      // 1. Find matching customer profile
      const matchedCustomer = customers.find(c => {
        const cNorm = normalizeArabic(c.name);
        const cPhone = (c.phone || '').trim().replace(/\s+/g, '');
        if (supNorm && cNorm && supNorm === cNorm) return true;
        if (supPhone && cPhone && supPhone.length >= 7 && supPhone === cPhone) return true;
        return false;
      });

      const isDual = !!matchedCustomer;

      // 2. Products supplied by this supplier in inventory
      const suppliedProducts = products.filter(p =>
        (p.supplierId && p.supplierId === supplier.id) ||
        (p.supplierId && matchedCustomer && p.supplierId === matchedCustomer.id) ||
        (normalizeArabic(p.name).includes(supNorm) && supNorm.length > 3)
      );

      // 3. Supplier Payables (Creditors - amounts we owe him)
      const payablesList = creditors.filter(cred => {
        const credNorm = normalizeArabic(cred.name);
        if (credNorm && supNorm && credNorm === supNorm) return true;
        if (cred.customer_id && (cred.customer_id === supplier.id || (matchedCustomer && cred.customer_id === matchedCustomer.id))) return true;
        return false;
      });
      const supplierPayables = payablesList.reduce((sum, c) => sum + (Number(c.amount) || Number(c.total) || 0), 0);

      // 4. Customer Debts (Debtors - amounts he owes us as a customer)
      let customerDebts = 0;
      if (matchedCustomer) {
        const debtsList = debtors.filter(deb => {
          const debNorm = normalizeArabic(deb.name || deb.debtorName);
          if (debNorm && supNorm && debNorm === supNorm) return true;
          if (deb.customer_id && (deb.customer_id === matchedCustomer.id || deb.customer_id === supplier.id)) return true;
          return false;
        });
        customerDebts = debtsList.reduce((sum, d) => sum + (Number(d.totalAmount) || Number(d.amount) || 0), 0);
      }

      // 5. Invoices from Sales & Archive where this entity is customer
      let archiveInvoicesCount = 0;
      if (matchedCustomer) {
        const matchingInvoices = invoices.filter(inv => {
          const invCustNorm = normalizeArabic(inv.customerName);
          return (inv.customerId && inv.customerId === matchedCustomer.id) || (invCustNorm && invCustNorm === supNorm);
        });
        archiveInvoicesCount = matchingInvoices.length;
      }

      // 6. Net Financial Settlement
      // Net = We owe him (Payables) - He owes us (Debts)
      const netBalance = supplierPayables - customerDebts;

      return {
        ...supplier,
        matchedCustomer,
        isDual,
        suppliedProducts,
        customerDebts,
        supplierPayables,
        netBalance,
        archiveInvoicesCount
      };
    });
  }, [suppliers, customers, products, debtors, creditors, invoices]);

  // Overall Global Statistics
  const stats = useMemo(() => {
    const totalSuppliers = enrichedSuppliers.length;
    const dualCount = enrichedSuppliers.filter(s => s.isDual).length;
    const totalPayables = enrichedSuppliers.reduce((sum, s) => sum + s.supplierPayables, 0);
    const totalReceivables = enrichedSuppliers.reduce((sum, s) => sum + s.customerDebts, 0);
    const totalNet = totalPayables - totalReceivables;

    return { totalSuppliers, dualCount, totalPayables, totalReceivables, totalNet };
  }, [enrichedSuppliers]);

  // Filtered List by Search and Tabs
  const filteredSuppliers = useMemo(() => {
    let result = enrichedSuppliers;

    // Filter by Tab
    if (activeTab === "dual") {
      result = result.filter(s => s.isDual);
    } else if (activeTab === "payables") {
      result = result.filter(s => s.supplierPayables > 0);
    } else if (activeTab === "receivables") {
      result = result.filter(s => s.customerDebts > 0);
    } else if (activeTab === "settled") {
      result = result.filter(s => s.supplierPayables === 0 && s.customerDebts === 0);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = normalizeArabic(searchQuery);
      result = result.filter(s =>
        normalizeArabic(s.name).includes(q) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.address && normalizeArabic(s.address).includes(q)) ||
        s.suppliedProducts.some(p => normalizeArabic(p.name).includes(q))
      );
    }

    return result;
  }, [enrichedSuppliers, activeTab, searchQuery]);

  // Handle Form Open for Add / Edit
  const handleAddNew = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: ""
    });
    setSelectedSupplier(null);
    setCreateAsCustomerToo(true);
    setIsModalOpen(true);
    setError("");
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || ""
    });
    setCreateAsCustomerToo(false);
    setIsModalOpen(true);
    setError("");
  };

  // Submit Add or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError(isFr ? "Veuillez saisir le nom du fournisseur" : "يرجى إدخال اسم المورد");
      return;
    }

    setLoading(true);
    try {
      const supplierPayload = {
        id: selectedSupplier?.id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim()
      };

      // 1. Save Supplier
      await upsertSupplier(supplierPayload);

      // 2. Also register as customer if requested and not already existing
      if (createAsCustomerToo) {
        const normName = normalizeArabic(formData.name);
        const existingCust = customers.find(c => normalizeArabic(c.name) === normName);
        if (!existingCust) {
          await upsertCustomer({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            address: formData.address.trim(),
            company: isFr ? "Fournisseur & Client" : "مورد وعميل",
            notes: isFr ? "Enregistré automatiquement comme fournisseur et client" : "مسجل تلقائياً كمورد وعميل في نفس الوقت"
          }).catch(err => console.warn("Auto-create customer skipped:", err));
        }
      }

      setSuccessMessage(
        selectedSupplier
          ? (isFr ? "Fournisseur mis à jour avec succès" : "تم تعديل بيانات المورد بنجاح")
          : (isFr ? "Fournisseur ajouté et lié avec succès" : "تمت إضافة المورد وربطه بنجاح")
      );
      setTimeout(() => setSuccessMessage(""), 4000);

      setIsModalOpen(false);
      setSelectedSupplier(null);
      await loadData();
    } catch (err: any) {
      console.error("Error saving supplier:", err);
      setError(isFr ? "Une erreur est survenue lors de l'enregistrement" : "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setLoading(false);
    }
  };

  // Convert / Link Supplier as Customer with 1 click
  const handleLinkAsCustomer = async (supplier: Supplier) => {
    const confirmMsg = isFr
      ? `Voulez-vous également enregistrer le fournisseur "${supplier.name}" comme client pour unifier son relevé de compte ?`
      : `هل تريد تسجيل المورد "${supplier.name}" كعميل في النظام أيضاً لتوحيد كشف حسابه؟`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await upsertCustomer({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        company: isFr ? "Fournisseur & Client" : "مورد وعميل",
        notes: isFr ? "Converti en client et fournisseur conjoint" : "تمت ترقيته لعميل ومورد معاً"
      });

      setSuccessMessage(
        isFr
          ? `Le fournisseur "${supplier.name}" a été lié en tant que client avec succès !`
          : `تم ربط المورد "${supplier.name}" كعميل بنجاح. أصبحت حساباته ومقاصته موحدة الآن!`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      await loadData();
    } catch (err) {
      console.error("Error linking customer:", err);
      setError(isFr ? "Échec de la liaison du client" : "فشل إنشاء حساب العميل للمورد");
    } finally {
      setLoading(false);
    }
  };

  // Delete Supplier
  const handleDelete = async (supplier: Supplier) => {
    const confirmDelete = isFr
      ? `Êtes-vous sûr de vouloir supprimer le fournisseur "${supplier.name}" ?`
      : `هل أنت متأكد من حذف المورد "${supplier.name}"؟`;
    if (!window.confirm(confirmDelete)) return;

    setLoading(true);
    try {
      await deleteSupplier(supplier.id);

      const storeData = loadStoreData();
      storeData.suppliers = (storeData.suppliers || []).filter((s: any) => s.id !== supplier.id);
      saveStoreData(storeData);

      setSuccessMessage(
        isFr
          ? `Le fournisseur "${supplier.name}" a été supprimé avec succès`
          : `تم حذف المورد "${supplier.name}" بنجاح`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      await loadData();
    } catch (err) {
      console.error("Error deleting supplier:", err);
      setError(isFr ? "Erreur lors de la suppression du fournisseur" : "حدث خطأ أثناء حذف المورد");
    } finally {
      setLoading(false);
    }
  };

  // Open Full Account Statement Page for this person
  const handleOpenAccountStatement = (supplier: EnrichedSupplier) => {
    // If matched with a customer, go to account statement for that customer ID
    if (supplier.matchedCustomer) {
      navigate(`/account-statement`);
    } else {
      // Prompt to link first or view in clearing drawer
      setClearingModalSupplier(supplier);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{isFr ? "Gestion des Fournisseurs & Clients Mixtes" : "إدارة الموردين والعملاء المشتركين"}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {isFr ? "Liaison & Compensation" : "ربط شامل ومقاصة"}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              {isFr
                ? "Suivi des fournisseurs, des articles approvisionnés et rapprochement avec leurs comptes clients"
                : "متابعة الموردين، المنتجات الموردة، وربطهم بحساباتهم كعملاء في الأرشيف والديون وكشف الحساب"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{isFr ? "Nouveau Fournisseur" : "إضافة مورد جديد"}</span>
          </button>
        </div>
      </div>

      {/* ── Alerts & Notifications ── */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-700">
            <X size={15} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-400 hover:text-emerald-700">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Executive Dashboard KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Suppliers */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Total Fournisseurs" : "إجمالي الموردين"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{stats.totalSuppliers}</h3>
            <p className="text-[11px] font-bold text-indigo-600 mt-0.5">
              {isFr ? "Fournisseurs enregistrés" : "جهات توريد مسجلة"}
            </p>
          </div>
        </div>

        {/* Dual Entities: Supplier + Customer */}
        <div className="gsc-card p-4 flex items-center gap-3.5 border-purple-200 bg-gradient-to-br from-purple-50/40 to-indigo-50/30">
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
            <ArrowRightLeft size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Fournisseurs & Clients" : "موردون وعملاء معاً"}
            </p>
            <h3 className="text-xl font-black text-purple-800 mt-0.5 font-sans">{stats.dualCount}</h3>
            <p className="text-[11px] font-bold text-purple-600 mt-0.5">
              {isFr ? "Comptes avec compensation" : "حسابات مشتركة بمقاصة"}
            </p>
          </div>
        </div>

        {/* Payables (Amounts owed to suppliers) */}
        <div className="gsc-card p-4 flex items-center gap-3.5 border-emerald-100">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Dû aux Fournisseurs (Lui)" : "مستحقات الموردين (له)"}
            </p>
            <h3 className="text-xl font-black text-emerald-700 mt-0.5 font-sans">{formatCurrency(stats.totalPayables)}</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {isFr ? "Dettes Fournisseurs (+)" : "ذمم دائنة للتوريد"}
            </p>
          </div>
        </div>

        {/* Receivables (Customer debts owed by them) */}
        <div className="gsc-card p-4 flex items-center gap-3.5 border-rose-100">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Créances Clients (Moi)" : "ديونهم كعملاء (عليه)"}
            </p>
            <h3 className="text-xl font-black text-rose-600 mt-0.5 font-sans">{formatCurrency(stats.totalReceivables)}</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {isFr ? "Ventes et factures à terme (-)" : "مبيعات وفواتير آجلة"}
            </p>
          </div>
        </div>

        {/* Net Settlement Balance */}
        <div className={`gsc-card p-4 flex items-center gap-3.5 border-2 col-span-2 lg:col-span-1 ${
          stats.totalNet > 0
            ? "border-emerald-300 bg-emerald-50/20"
            : stats.totalNet < 0
            ? "border-rose-300 bg-rose-50/20"
            : "border-slate-200"
        }`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            stats.totalNet > 0 ? "bg-emerald-600 text-white" : stats.totalNet < 0 ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600"
          }`}>
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-700 truncate">
              {isFr ? "Solde Net de Compensation" : "صافي المقاصة الكلية"}
            </p>
            <h3 className={`text-xl font-black mt-0.5 font-sans ${
              stats.totalNet > 0 ? "text-emerald-700" : stats.totalNet < 0 ? "text-rose-700" : "text-slate-700"
            }`}>
              {formatCurrency(Math.abs(stats.totalNet))}
            </h3>
            <p className="text-[11px] font-bold mt-0.5">
              {stats.totalNet > 0
                ? (isFr ? "Solde net dû au fournisseur" : "صافي مستحق للموردين")
                : stats.totalNet < 0
                ? (isFr ? "Solde net à notre faveur" : "صافي مطلوب لصالحنا")
                : (isFr ? "Comptes équilibrés" : "الحسابات متزنة")}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search Bar & Filter Tabs ── */}
      <div className="gsc-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
            <input
              type="text"
              placeholder={isFr ? "Rechercher par nom, téléphone, adresse ou article fourni..." : "البحث باسم المورد، رقم الهاتف، العنوان، أو الأصناف الموردة..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {isFr ? `Tous (${enrichedSuppliers.length})` : `الكل (${enrichedSuppliers.length})`}
            </button>

            <button
              onClick={() => setActiveTab("dual")}
              className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "dual"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
              }`}
            >
              <ArrowRightLeft size={13} />
              <span>{isFr ? `Fournisseurs & Clients (${stats.dualCount})` : `عملاء وموردون معاً (${stats.dualCount})`}</span>
            </button>

            <button
              onClick={() => setActiveTab("payables")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "payables"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              {isFr ? "Dû au Fournisseur (Lui)" : "مستحقات للمورد (له)"}
            </button>

            <button
              onClick={() => setActiveTab("receivables")}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === "receivables"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"
              }`}
            >
              {isFr ? "Créances Client (Moi)" : "ديون على العميل (عليه)"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Suppliers Table & Directory ── */}
      <div className="gsc-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              {isFr
                ? `Répertoire des Fournisseurs & Comptes Mixtes (${filteredSuppliers.length})`
                : `دليل الموردين والحسابات المشتركة (${filteredSuppliers.length} مورد)`}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
            {isFr
              ? "Cliquez sur « Relevé & Solde » pour consulter la compensation consolidée"
              : "انقر على «كشف الحساب والمقاصة» لمعاينة تسوية الحساب الموحدة"}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 size={28} className="animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-xs font-bold">
              {isFr ? "Chargement des données fournisseurs et clients..." : "جاري تحميل واستجلاب بيانات الموردين والعملاء..."}
            </p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700 mb-1">
              {searchQuery
                ? (isFr ? "Aucun résultat ne correspond à votre recherche" : "لا توجد نتائج تطابق بحثك")
                : (isFr ? "Aucun fournisseur enregistré dans cette section" : "لا يوجد موردين مسجلين في هذا القسم")}
            </p>
            <p className="text-[11px] text-slate-400">
              {isFr
                ? "Vous pouvez ajouter un nouveau fournisseur et le lier automatiquement en tant que client en un clic"
                : "يمكنك إضافة مورد جديد وربطه تلقائياً كعميل بنقرة واحدة"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse text-xs`}>
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">{isFr ? "Fournisseur & Activité" : "اسم المورد والنشاط"}</th>
                  <th className="py-3.5 px-4">{isFr ? "Coordonnées" : "بيانات الاتصال"}</th>
                  <th className="py-3.5 px-4 text-center">{isFr ? "Articles Fournis" : "أصناف التوريد"}</th>
                  <th className="py-3.5 px-4 text-center bg-emerald-50/50 text-emerald-800">
                    {isFr ? "Dû au Fournisseur (Lui +)" : "مستحقاته كمورد (له +)"}
                  </th>
                  <th className="py-3.5 px-4 text-center bg-rose-50/50 text-rose-800">
                    {isFr ? "Créances Client (Moi -)" : "ديونه كعميل (عليه -)"}
                  </th>
                  <th className="py-3.5 px-4 text-center bg-slate-100/60 font-black">
                    {isFr ? "Solde Net de Compensation" : "صافي المقاصة المالية"}
                  </th>
                  <th className="py-3.5 px-4 text-center">{isFr ? "Factures / Archive" : "حركات الأرشيف"}</th>
                  <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSuppliers.map((supplier) => {
                  return (
                    <tr
                      key={supplier.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Dual Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-100 to-indigo-50 border border-slate-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {supplier.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm block">
                                {supplier.name}
                              </span>
                              {supplier.isDual && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                  <ArrowRightLeft size={10} />
                                  <span>{isFr ? "Client & Fournisseur" : "عميل ومورد"}</span>
                                </span>
                              )}
                            </div>
                            {supplier.address && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-slate-400" />
                                <span className="truncate max-w-xs">{supplier.address}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {supplier.phone ? (
                            <p className="font-sans font-bold text-xs text-slate-800 flex items-center gap-1" dir="ltr">
                              <Phone size={11} className="text-slate-400" />
                              <span>{supplier.phone}</span>
                            </p>
                          ) : (
                            <span className="text-slate-400 text-xs">---</span>
                          )}
                          {supplier.email && (
                            <p className="text-[11px] text-slate-500 font-sans truncate max-w-xs flex items-center gap-1">
                              <Mail size={11} className="text-slate-400" />
                              <span>{supplier.email}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Supplied Products */}
                      <td className="py-3 px-4 text-center">
                        {supplier.suppliedProducts.length > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold font-sans text-xs px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                              {supplier.suppliedProducts.length} {isFr ? "articles" : "صنف بالمخزن"}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                              {supplier.suppliedProducts[0]?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">{isFr ? "Aucun article lié" : "لا أصناف مرتبطة"}</span>
                        )}
                      </td>

                      {/* Payables (+) */}
                      <td className="py-3 px-4 text-center font-bold font-sans text-emerald-700 bg-emerald-50/20">
                        {supplier.supplierPayables > 0 ? (
                          <span className="text-sm font-black">{formatCurrency(supplier.supplierPayables)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">{isFr ? "Réglé (0)" : "خالص (0)"}</span>
                        )}
                      </td>

                      {/* Receivables (-) */}
                      <td className="py-3 px-4 text-center font-bold font-sans text-rose-700 bg-rose-50/20">
                        {supplier.customerDebts > 0 ? (
                          <span className="text-sm font-black">{formatCurrency(supplier.customerDebts)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">{isFr ? "Aucune dette" : "لا ديون عليه"}</span>
                        )}
                      </td>

                      {/* Net Clearing Balance */}
                      <td className="py-3 px-4 text-center font-sans font-black bg-slate-50/60">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-sm ${
                            supplier.netBalance > 0
                              ? "text-emerald-700 font-black"
                              : supplier.netBalance < 0
                              ? "text-rose-700 font-black"
                              : "text-slate-600"
                          }`}>
                            {formatCurrency(Math.abs(supplier.netBalance))}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                            supplier.netBalance > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : supplier.netBalance < 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {supplier.netBalance > 0
                              ? (isFr ? "Dû au fournisseur" : "مستحق له")
                              : supplier.netBalance < 0
                              ? (isFr ? "Dû par le client" : "مطلوب منه")
                              : (isFr ? "Équilibré" : "متزن")}
                          </span>
                        </div>
                      </td>

                      {/* Archive Invoices & Movements */}
                      <td className="py-3 px-4 text-center">
                        {supplier.archiveInvoicesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-sans">
                            <Receipt size={12} className="text-slate-500" />
                            <span>{supplier.archiveInvoicesCount} {isFr ? "factures" : "فاتورة"}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">--</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Open Statement & Clearing Modal */}
                          <button
                            onClick={() => setClearingModalSupplier(supplier)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                            title={isFr ? "Relevé de compte et compensation" : "كشف حساب وتسوية المقاصة"}
                          >
                            <FileSpreadsheet size={13} />
                            <span>{isFr ? "Relevé & Solde" : "كشف الحساب"}</span>
                          </button>

                          {/* Link as customer button (if not already dual) */}
                          {!supplier.isDual && (
                            <button
                              onClick={() => handleLinkAsCustomer(supplier)}
                              className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
                              title={isFr ? "Enregistrer aussi comme client pour unifier les comptes" : "تسجيل وربط كعميل أيضاً لتوحيد الحسابات"}
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isFr ? "Modifier le fournisseur" : "تعديل المورد"}
                          >
                            <Edit size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(supplier)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={isFr ? "Supprimer le fournisseur" : "حذف المورد"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD / EDIT SUPPLIER ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Truck size={17} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSupplier
                    ? (isFr ? "Modifier les Informations du Fournisseur" : "تعديل بيانات المورد")
                    : (isFr ? "Ajouter un Nouveau Fournisseur" : "إضافة مورد جديد للنظام")}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFr ? "Nom du Fournisseur / Société *" : "اسم المورد / الشركة *"}
                </label>
                <input
                  type="text"
                  placeholder={isFr ? "Ex: Société Commerciale, Fournisseur..." : "مثال: مؤسسة النور للتوريدات التجارية"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isFr ? "Téléphone / Mobile" : "رقم الهاتف / الجوال"}
                  </label>
                  <input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isFr ? "Adresse E-mail" : "البريد الإلكتروني"}
                  </label>
                  <input
                    type="email"
                    placeholder="contact@fournisseur.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFr ? "Adresse & Localisation" : "العنوان والموقع"}
                </label>
                <input
                  type="text"
                  placeholder={isFr ? "Ville, Quartier, Rue..." : "المدينة، الحي، الشارع الرئيسي"}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFr ? "Remarques & Conditions" : "ملاحظات إضافية"}
                </label>
                <textarea
                  placeholder={isFr ? "Ajouter des détails sur les approvisionnements ou conditions..." : "أضف أي تفاصيل خاصة بالتوريد أو شروط السداد..."}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                  rows={2}
                />
              </div>

              {/* Smart Dual Entity Checkbox */}
              {!selectedSupplier && (
                <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAsCustomerToo}
                      onChange={(e) => setCreateAsCustomerToo(e.target.checked)}
                      className="mt-0.5 rounded accent-purple-600 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-purple-900 block">
                        {isFr
                          ? "Enregistrer automatiquement ce fournisseur comme client"
                          : "تسجيل هذا المورد كعميل في نفس الوقت تلقائياً"}
                      </span>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        {isFr
                          ? "Recommandé si vous avez des flux d'achats et de ventes avec cette partie pour unifier le relevé."
                          : "يوصى به إذا كان يتعامل معك بالبيع والشراء، لتوحيد كشف حسابه وإجراء المقاصة المالية بسهولة."}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isFr ? "Annuler" : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{isFr ? "Enregistrement..." : "جاري الحفظ..."}</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>
                        {selectedSupplier
                          ? (isFr ? "Enregistrer les modifications" : "حفظ التعديلات")
                          : (isFr ? "Ajouter le Fournisseur" : "إضافة المورد")}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: COMBINED STATEMENT & CLEARING DRAWER ── */}
      {clearingModalSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{clearingModalSupplier.name}</h3>
                    {clearingModalSupplier.isDual && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                        {isFr ? "Compte Conjoint (Fournisseur & Client)" : "حساب مشترك (مورد وعميل)"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    {isFr
                      ? "Synthèse de compensation financière, articles approvisionnés et factures clients"
                      : "ملخص المقاصة المالية الموحدة، الأصناف الموردة، وفواتير المبيعات والأرشيف"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setClearingModalSupplier(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Financial Clearing Position Banner */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center shrink-0">
              <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-500">
                  {isFr ? "Dû au fournisseur (Lui)" : "مستحقاته كمورد (له علينا)"}
                </p>
                <p className="text-lg font-black font-sans text-emerald-700 mt-0.5">
                  {formatCurrency(clearingModalSupplier.supplierPayables)}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {isFr ? "Approvisionnements & Achats" : "توريدات وبضائع مشتراة"}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-500">
                  {isFr ? "Créances client (Moi)" : "ديونه كعميل (عليه لنا)"}
                </p>
                <p className="text-lg font-black font-sans text-rose-700 mt-0.5">
                  {formatCurrency(clearingModalSupplier.customerDebts)}
                </p>
                <span className="text-[10px] text-rose-600 font-semibold">
                  {isFr ? "Factures de vente à crédit" : "فواتير مبيعات آجلة"}
                </span>
              </div>

              <div className={`p-3 rounded-xl border shadow-xs ${
                clearingModalSupplier.netBalance > 0
                  ? "bg-emerald-50 border-emerald-300"
                  : clearingModalSupplier.netBalance < 0
                  ? "bg-rose-50 border-rose-300"
                  : "bg-slate-100 border-slate-300"
              }`}>
                <p className="text-[11px] font-black text-slate-700">
                  {isFr ? "Solde Net de Compensation" : "صافي المقاصة المعتمد"}
                </p>
                <p className={`text-xl font-black font-sans mt-0.5 ${
                  clearingModalSupplier.netBalance > 0
                    ? "text-emerald-700"
                    : clearingModalSupplier.netBalance < 0
                    ? "text-rose-700"
                    : "text-slate-700"
                }`}>
                  {formatCurrency(Math.abs(clearingModalSupplier.netBalance))}
                </p>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                  clearingModalSupplier.netBalance > 0
                    ? "bg-emerald-200 text-emerald-900"
                    : clearingModalSupplier.netBalance < 0
                    ? "bg-rose-200 text-rose-900"
                    : "bg-slate-200 text-slate-800"
                }`}>
                  {clearingModalSupplier.netBalance > 0
                    ? (isFr ? "Solde net en faveur du fournisseur" : "صافي مستحق للمورد")
                    : clearingModalSupplier.netBalance < 0
                    ? (isFr ? "Solde net en notre faveur" : "صافي مطلوب من العميل")
                    : (isFr ? "Comptes parfaitement équilibrés" : "الحسابات متزنة بالكامل")}
                </span>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/50 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
              <button
                onClick={() => setClearingTab("statement")}
                className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
                  clearingTab === "statement"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {isFr ? "Grand Livre & Compensation" : "دفتر المقاصة والديون المتبادلة"}
              </button>

              <button
                onClick={() => setClearingTab("products")}
                className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
                  clearingTab === "products"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {isFr
                  ? `Articles Fournis (${clearingModalSupplier.suppliedProducts.length})`
                  : `الأصناف والمنتجات الموردة (${clearingModalSupplier.suppliedProducts.length})`}
              </button>

              <button
                onClick={() => setClearingTab("invoices")}
                className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
                  clearingTab === "invoices"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {isFr
                  ? `Factures & Archive (${clearingModalSupplier.archiveInvoicesCount})`
                  : `فواتير المبيعات والأرشيف (${clearingModalSupplier.archiveInvoicesCount})`}
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {clearingTab === "statement" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                    <p className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" />
                      <span>{isFr ? "Système de compensation automatique :" : "منظومة المقاصة المحاسبية الآلية:"}</span>
                    </p>
                    {isFr
                      ? "Cette vue relie les écritures d'approvisionnement (fournisseur) avec les factures de vente (client). Les dettes de ses achats sont automatiquement déduites de ses créances de livraison pour calculer le solde net exact à régler ou à percevoir."
                      : "تقوم هذه الصفحة بربط قيود التوريد والمستحقات الدائنة مع فواتير المبيعات الآجلة للعميل. يتم خصم ديون مشترياته من مبالغ توريداته تلقائياً لتحديد المبلغ الصافي الفعلي الواجب تحويله أو تحصيله."}
                  </div>

                  {/* Summary Comparison Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
                      <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">{isFr ? "Opération" : "المعاملة"}</th>
                          <th className="p-2.5">{isFr ? "Rôle" : "الصفة"}</th>
                          <th className="p-2.5 text-center">{isFr ? "Impact sur le compte" : "التأثير على الحساب"}</th>
                          <th className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'}`}>{isFr ? "Montant" : "المبلغ"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-medium text-slate-800">
                            {isFr ? "Créances de livraison et marchandises fournies" : "مستحقات التوريد وبضائع المورد"}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {isFr ? "Fournisseur (Créditeur)" : "بصفته مورداً (دائن)"}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">
                            {isFr ? "Dû en notre passif (+)" : "مستحق له في ذمتنا (+)"}
                          </td>
                          <td className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} font-bold text-emerald-700`}>
                            {formatCurrency(clearingModalSupplier.supplierPayables)}
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-medium text-slate-800">
                            {isFr ? "Achats et factures de vente du client" : "ديون مشتريات وفواتير مبيعات العميل"}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              {isFr ? "Client (Débiteur)" : "بصفته عميلاً (مدين)"}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-rose-700">
                            {isFr ? "Exigible de sa part (-)" : "مطلوب منه في ذمتنا (-)"}
                          </td>
                          <td className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} font-bold text-rose-700`}>
                            {formatCurrency(clearingModalSupplier.customerDebts)}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={3} className="p-2.5 text-slate-800 font-black text-sm">
                            {isFr ? "Solde Net Validé pour Compensation :" : "الصافي المعتمد للمقاصة:"}
                          </td>
                          <td className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} font-black text-sm`}>
                            <span className={clearingModalSupplier.netBalance > 0 ? "text-emerald-700" : "text-rose-700"}>
                              {formatCurrency(Math.abs(clearingModalSupplier.netBalance))}
                            </span>
                            <span className="text-[10px] text-slate-500 mx-1">
                              {clearingModalSupplier.netBalance > 0
                                ? (isFr ? "(Lui)" : "(له)")
                                : clearingModalSupplier.netBalance < 0
                                ? (isFr ? "(Moi)" : "(عليه)")
                                : "(0)"}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {clearingTab === "products" && (
                <div>
                  {clearingModalSupplier.suppliedProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Package size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        {isFr
                          ? "Aucun produit associé à ce fournisseur dans le stock actuellement"
                          : "لا توجد منتجات مرتبطة بهذا المورد في المخزن حالياً"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isFr
                          ? "Vous pouvez associer des produits au fournisseur lors de leur création ou modification dans la page Produits"
                          : "يمكنك ربط المنتجات بالمورد عند إضافتها أو تعديلها من صفحة المنتجات"}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
                        <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">{isFr ? "Nom du Produit" : "اسم المنتج"}</th>
                            <th className="p-2.5">{isFr ? "Code" : "الكود"}</th>
                            <th className="p-2.5 text-center">{isFr ? "Qté Disponible" : "الكمية المتوفرة"}</th>
                            <th className="p-2.5 text-center">{isFr ? "Prix d'Achat" : "سعر التكلفة"}</th>
                            <th className="p-2.5 text-center">{isFr ? "Prix de Vente" : "سعر البيع"}</th>
                            <th className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'}`}>{isFr ? "Valeur Totale" : "إجمالي القيمة"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {clearingModalSupplier.suppliedProducts.map(prod => (
                            <tr key={prod.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{prod.name}</td>
                              <td className="p-2.5 font-mono text-slate-600">{prod.code || '-'}</td>
                              <td className="p-2.5 text-center font-bold text-slate-800">{prod.quantity}</td>
                              <td className="p-2.5 text-center text-slate-700">{formatCurrency(prod.cost || 0)}</td>
                              <td className="p-2.5 text-center text-slate-700">{formatCurrency(prod.price || 0)}</td>
                              <td className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} font-black text-slate-900`}>
                                {formatCurrency((prod.quantity || 0) * (prod.cost || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {clearingTab === "invoices" && (
                <div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
                      <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">{isFr ? "N° Facture" : "رقم الفاتورة"}</th>
                          <th className="p-2.5">{isFr ? "Date" : "التاريخ"}</th>
                          <th className="p-2.5">{isFr ? "Type" : "نوع المعاملة"}</th>
                          <th className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'}`}>{isFr ? "Total" : "المبلغ الإجمالي"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {invoices
                          .filter(inv => {
                            const invCustNorm = normalizeArabic(inv.customerName);
                            const supNorm = normalizeArabic(clearingModalSupplier.name);
                            return (inv.customerId && clearingModalSupplier.matchedCustomer && inv.customerId === clearingModalSupplier.matchedCustomer.id) || (invCustNorm === supNorm);
                          })
                          .map(inv => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                              <td className="p-2.5 text-slate-600">{inv.date}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {isFr ? "Facture de vente" : "فاتورة مبيعات"}
                                </span>
                              </td>
                              <td className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} font-bold text-slate-900`}>{formatCurrency(inv.total)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
              <span className="text-slate-500 font-medium">
                {clearingModalSupplier.isDual
                  ? (isFr ? "Compte lié au client dans l'archive, le relevé et les dettes" : "الحساب مربوط بالعميل في الأرشيف وكشف الحساب والديون")
                  : (isFr ? "Ce fournisseur n'est pas encore enregistré comme client. Cliquez sur « Lier comme client » pour unifier son relevé" : "المورد غير مسجل كعميل بعد. انقر على «ربط كعميل» لتوحيد كشف الحساب")}
              </span>

              <div className="flex items-center gap-2">
                {!clearingModalSupplier.isDual && (
                  <button
                    onClick={() => {
                      handleLinkAsCustomer(clearingModalSupplier);
                      setClearingModalSupplier(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    <ArrowRightLeft size={14} />
                    <span>{isFr ? "Lier & Créer comme Client" : "ربط وإنشاء كعميل الآن"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setClearingModalSupplier(null);
                    navigate("/account-statement");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
                >
                  <FileSpreadsheet size={14} />
                  <span>{isFr ? "Ouvrir le Relevé de Compte Complet" : "فتح كشف الحساب المالي الكامل"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
