import { useState, useEffect, useCallback, useMemo } from "react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import {
  Search,
  Loader2,
  Printer,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  FileCheck,
  Calendar,
  Filter,
  User,
  Package,
  Clock,
  ChevronDown,
  RotateCcw,
  RefreshCw,
  Archive as ArchiveIcon,
  Users,
  Building,
  CreditCard,
  Undo2,
  Phone
} from "lucide-react";
import ExportActions from "@/components/shared/ExportActions";
import { useLocale } from "@/hooks/useLocale";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProfessionalInvoice from "@/components/invoice/ProfessionalInvoice";
import { Invoice, StoreInfo, Customer, Return, Debtor, Creditor } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getInvoices, getCustomers, deleteInvoice, upsertInvoice } from "@/lib/database";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { updateInvoiceMovements, revertInvoiceMovements } from "@/utils/productMovements";
import { useToast } from "@/hooks/use-toast";

export default function Archive() {
  const { t, locale, isRTL } = useLocale();
  const isFr = locale === 'fr';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'invoices';
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [year, setYear] = useState<number>(0); // 0 means All Years
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [returnsList, setReturnsList] = useState<Return[]>([]);
  const [debtorsList, setDebtorsList] = useState<Debtor[]>([]);
  const [creditorsList, setCreditorsList] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  // Edit / Delete modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "paid" | "partial" | "cancelled">("pending");
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
  const [editType, setEditType] = useState<"sales" | "quotation" | "debt">("sales");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<Array<{ productName: string; quantity: number; price: number; total: number; productId?: string }>>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const localData = loadStoreData();
      setStoreInfo(localData.storeInfo);

      let allList: Invoice[] = [];

      if (isAuthenticated) {
        const [rows, customerRows] = await Promise.all([getInvoices(), getCustomers()]);
        setCustomers(customerRows.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email,
          address: c.address,
          company: c.company,
          letterheadUrl: c.letterhead_url,
          notes: c.notes,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        })));
        const dbMapped: Invoice[] = rows.map((row: any) => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          customerName: row.customer_name,
          total: row.total,
          subtotal: row.subtotal,
          discount: row.discount,
          tax: row.tax,
          shippingCost: row.shipping_cost,
          paymentMethod: row.payment_method,
          status: row.status,
          type: row.type || 'sales',
          notes: row.notes,
          date: row.date || row.created_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          items: (row.invoice_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.product_name,
            productCode: "",
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
          products: (row.invoice_items || []).map((item: any) => ({
            productId: item.product_id,
            quantity: item.quantity,
            price: item.price,
            name: item.product_name,
          }))
        }));

        // Combine DB invoices with any local invoices
        const localInvs = localData.invoices || [];
        const combined = [...dbMapped];
        for (const locInv of localInvs) {
          if (!combined.some(c => c.id === locInv.id || c.invoiceNumber === locInv.invoiceNumber)) {
            combined.push(locInv);
          }
        }

        // Also ensure any local daily sales are reflected if not in DB
        if (localData.dailySales && localData.dailySales.length > 0) {
          for (const ds of localData.dailySales) {
            const saleInvoiceId = ds.id || `sale_${ds.date}_${ds.productId}`;
            const saleInvoiceNumber = `INV-SALE-${(ds.id || '').slice(0, 8).toUpperCase() || 'DAILY'}`;
            const exists = combined.some(inv => inv.id === saleInvoiceId || inv.invoiceNumber === saleInvoiceNumber);
            if (!exists) {
              const saleDate = ds.date || ds.createdAt || new Date().toISOString();
              const saleQty = Number(ds.quantity) || 1;
              const salePrice = Number(ds.unitPrice) || Number(ds.total) || 0;
              const saleTotal = Number(ds.total) || (saleQty * salePrice);
              combined.push({
                id: saleInvoiceId,
                invoiceNumber: saleInvoiceNumber,
                customerId: undefined,
                customerName: (ds as any).customerName || (isFr ? "Ventes directes" : "مبيعات يومية مباشرة"),
                total: saleTotal,
                subtotal: saleTotal,
                discount: 0,
                tax: 0,
                paymentMethod: ds.paymentMethod || "cash",
                status: "paid",
                type: "sales",
                notes: isFr ? `Ventes directes - ${ds.productName || ''}` : `مبيعات يومية - ${ds.productName || ''}`,
                date: saleDate.split("T")[0],
                createdAt: ds.createdAt || (saleDate.includes("T") ? saleDate : `${saleDate}T12:00:00.000Z`),
                updatedAt: new Date().toISOString(),
                items: [
                  {
                    productId: ds.productId || "",
                    productName: ds.productName || (isFr ? "Article" : "منتج"),
                    productCode: ds.productCode || "",
                    quantity: saleQty,
                    price: salePrice,
                    total: saleTotal,
                  }
                ],
                products: [
                  {
                    productId: ds.productId || "",
                    quantity: saleQty,
                    price: salePrice,
                    name: ds.productName || (isFr ? "Article" : "منتج"),
                  }
                ]
              });
            }
          }
        }

        allList = combined;
      } else {
        const localInvs = localData.invoices || [];
        const combined = [...localInvs];
        if (localData.dailySales && localData.dailySales.length > 0) {
          for (const ds of localData.dailySales) {
            const saleInvoiceId = ds.id || `sale_${ds.date}_${ds.productId}`;
            const saleInvoiceNumber = `INV-SALE-${(ds.id || '').slice(0, 8).toUpperCase() || 'DAILY'}`;
            const exists = combined.some(inv => inv.id === saleInvoiceId || inv.invoiceNumber === saleInvoiceNumber);
            if (!exists) {
              const saleDate = ds.date || ds.createdAt || new Date().toISOString();
              const saleQty = Number(ds.quantity) || 1;
              const salePrice = Number(ds.unitPrice) || Number(ds.total) || 0;
              const saleTotal = Number(ds.total) || (saleQty * salePrice);
              combined.push({
                id: saleInvoiceId,
                invoiceNumber: saleInvoiceNumber,
                customerId: undefined,
                customerName: (ds as any).customerName || (isFr ? "Ventes directes" : "مبيعات يومية مباشرة"),
                total: saleTotal,
                subtotal: saleTotal,
                discount: 0,
                tax: 0,
                paymentMethod: ds.paymentMethod || "cash",
                status: "paid",
                type: "sales",
                notes: isFr ? `Ventes directes - ${ds.productName || ''}` : `مبيعات يومية - ${ds.productName || ''}`,
                date: saleDate.split("T")[0],
                createdAt: ds.createdAt || (saleDate.includes("T") ? saleDate : `${saleDate}T12:00:00.000Z`),
                updatedAt: new Date().toISOString(),
                items: [
                  {
                    productId: ds.productId || "",
                    productName: ds.productName || (isFr ? "Article" : "منتج"),
                    productCode: ds.productCode || "",
                    quantity: saleQty,
                    price: salePrice,
                    total: saleTotal,
                  }
                ],
                products: [
                  {
                    productId: ds.productId || "",
                    quantity: saleQty,
                    price: salePrice,
                    name: ds.productName || (isFr ? "Article" : "منتج"),
                  }
                ]
              });
            }
          }
        }
      allList = combined;
      }
      setInvoices(allList);
      setReturnsList(localData.returns || []);
      setDebtorsList(localData.debtors || []);
      setCreditorsList(localData.creditors || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      const localData = loadStoreData();
      setInvoices(localData.invoices || []);
      setReturnsList(localData.returns || []);
      setDebtorsList(localData.debtors || []);
      setCreditorsList(localData.creditors || []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time sync: reload when invoices change on any device
  useRealtimeSync(['invoices', 'invoice_items'], loadAllData, user?.id);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(invoice => {
        const invoiceType = invoice.type || 'sales';
        const invoiceDate = invoice.date || invoice.createdAt;
        const invoiceYear = invoiceDate ? new Date(invoiceDate).getFullYear() : 0;

        const matchesYear = year === 0 || invoiceYear === year;
        const matchesType = filterType === "all" || invoiceType === filterType;

        const matchesSearch = searchTerm === "" ||
          invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.items?.some(item =>
            item.productName?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        return matchesYear && matchesType && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [invoices, year, filterType, searchTerm]);

  // Dynamic KPI Stats
  const stats = useMemo(() => {
    const totalCount = filteredInvoices.length;
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const salesInvoices = filteredInvoices.filter(i => (i.type || 'sales') === 'sales');
    const salesAmount = salesInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const quotationInvoices = filteredInvoices.filter(i => i.type === 'quotation');
    const quotationAmount = quotationInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const debtInvoices = filteredInvoices.filter(i => i.type === 'debt');
    const debtAmount = debtInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    return {
      totalCount,
      totalAmount,
      salesCount: salesInvoices.length,
      salesAmount,
      quotationCount: quotationInvoices.length,
      quotationAmount,
      debtCount: debtInvoices.length,
      debtAmount,
    };
  }, [filteredInvoices]);

  // Returns Filter & Stats
  const filteredReturns = useMemo(() => {
    return returnsList.filter(r => {
      const matchSearch =
        (r.returnNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [returnsList, searchTerm]);

  const returnsStats = useMemo(() => {
    const totalCount = filteredReturns.length;
    const totalAmount = filteredReturns.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const totalUnits = filteredReturns.reduce((sum, r) => {
      const items = r.items || (r as any).products || [];
      return sum + items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
    }, 0);
    const archivedCount = filteredReturns.filter(r => r.status === 'archived').length;
    return { totalCount, totalAmount, totalUnits, archivedCount };
  }, [filteredReturns]);

  // Debtors Filter & Stats
  const filteredDebtors = useMemo(() => {
    return debtorsList.filter(d => {
      const name = d.name || d.debtorName || '';
      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.phone || '').includes(searchTerm);
      return matchSearch;
    });
  }, [debtorsList, searchTerm]);

  const debtorsStats = useMemo(() => {
    const totalCount = filteredDebtors.length;
    const totalAmount = filteredDebtors.reduce((sum, d) => sum + (Number(d.totalAmount || d.amount) || 0), 0);
    const settledCount = filteredDebtors.filter(d => d.status === 'paid').length;
    const pendingCount = filteredDebtors.filter(d => d.status !== 'paid').length;
    return { totalCount, totalAmount, settledCount, pendingCount };
  }, [filteredDebtors]);

  // Creditors Filter & Stats
  const filteredCreditors = useMemo(() => {
    return creditorsList.filter(c => {
      const matchSearch =
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm);
      return matchSearch;
    });
  }, [creditorsList, searchTerm]);

  const creditorsStats = useMemo(() => {
    const totalCount = filteredCreditors.length;
    const totalAmount = filteredCreditors.reduce((sum, c) => sum + (Number(c.total || c.amount) || 0), 0);
    const paidCount = filteredCreditors.filter(c => c.status === 'paid').length;
    const pendingCount = filteredCreditors.filter(c => c.status !== 'paid').length;
    return { totalCount, totalAmount, paidCount, pendingCount };
  }, [filteredCreditors]);

  // Payments Filter & Stats
  const filteredPayments = useMemo(() => {
    return invoices.filter(inv => {
      const isPaid = inv.status === 'paid' || inv.status === 'archived';
      if (!isPaid) return false;
      const matchSearch =
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.paymentMethod || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [invoices, searchTerm]);

  const paymentsStats = useMemo(() => {
    const totalCount = filteredPayments.length;
    const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const bankilyAmount = filteredPayments
      .filter(p => (p.paymentMethod || '').toLowerCase().includes('bankily'))
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const masriviAmount = filteredPayments
      .filter(p => (p.paymentMethod || '').toLowerCase().includes('masrivi') || (p.paymentMethod || '').toLowerCase().includes('sedad'))
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const cashAmount = filteredPayments
      .filter(p => (p.paymentMethod || '').toLowerCase().includes('cash') || (p.paymentMethod || '').toLowerCase().includes('espèces') || !p.paymentMethod)
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    return { totalCount, totalAmount, bankilyAmount, masriviAmount, cashAmount };
  }, [filteredPayments]);

  const exportColumns = [
    {
      key: "invoiceNumber",
      header: isFr ? "N° Facture" : "رقم الفاتورة",
    },
    {
      key: "customerName",
      header: isFr ? "Client" : "العميل",
    },
    {
      key: "type",
      header: isFr ? "Type" : "النوع",
      render: (invoice: any) =>
        (invoice.type || 'sales') === 'sales' ? (isFr ? 'Facture de vente' : 'فاتورة بيع') :
        invoice.type === 'quotation' ? (isFr ? 'Devis' : 'عرض سعر') : (isFr ? 'Facture à terme' : 'فاتورة دين')
    },
    {
      key: "items",
      header: isFr ? "Articles" : "المنتجات",
      render: (invoice: any) => (invoice.items || []).map((item: any) => item.productName).join(", ")
    },
    {
      key: "createdAt",
      header: isFr ? "Date" : "التاريخ",
      render: (invoice: any) => formatDate(invoice.date || invoice.createdAt)
    },
    {
      key: "total",
      header: isFr ? "Montant" : "المبلغ",
      render: (invoice: any) => formatCurrency(invoice.total)
    }
  ];

  const totals = {
    totalDebit: stats.totalAmount,
    totalCredit: 0,
    finalBalance: stats.totalAmount
  };

  const handleOpenEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditCustomerName(invoice.customerName);

    const rawDate = invoice.date || invoice.createdAt || "";
    let dStr = "";
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dStr = d.toISOString().split("T")[0];
        } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          dStr = rawDate.slice(0, 10);
        }
      } catch {
        dStr = "";
      }
    }
    setEditDate(dStr || new Date().toISOString().split("T")[0]);

    setEditStatus(invoice.status || "pending");
    setEditPaymentMethod(invoice.paymentMethod || "cash");
    setEditType(invoice.type || "sales");
    setEditNotes(invoice.notes || "");
    setEditItems((invoice.items || []).map(it => ({
      productName: it.productName,
      quantity: it.quantity,
      price: it.price,
      total: it.total,
      productId: it.productId,
    })));
    setIsEditModalOpen(true);
  };

  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoice) return;
    const computedTotal = editItems.reduce((acc, it) => acc + (it.total || 0), 0);

    let finalCreatedAt = editingInvoice.createdAt;
    const finalDate = editDate || editingInvoice.date || new Date().toISOString().split("T")[0];
    if (editDate) {
      try {
        const oldTime = editingInvoice.createdAt && editingInvoice.createdAt.includes("T")
          ? editingInvoice.createdAt.split("T")[1]
          : "12:00:00.000Z";
        const timePart = oldTime.split(".")[0] || "12:00:00";
        finalCreatedAt = new Date(`${editDate}T${timePart}`).toISOString();
      } catch {
        finalCreatedAt = new Date(editDate).toISOString();
      }
    }

    const updatedInvoice: Invoice = {
      ...editingInvoice,
      customerName: editCustomerName.trim() || editingInvoice.customerName,
      status: editStatus,
      paymentMethod: editPaymentMethod,
      type: editType,
      date: finalDate,
      createdAt: finalCreatedAt,
      notes: editNotes,
      subtotal: computedTotal,
      total: computedTotal,
      items: editItems.map(it => ({
        productId: it.productId || "",
        productName: it.productName,
        productCode: "",
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })),
      products: editItems.map(it => ({
        productId: it.productId || "",
        quantity: it.quantity,
        price: it.price,
        name: it.productName,
      })),
      updatedAt: new Date().toISOString(),
    };

    // Update locally
    const store = loadStoreData();
    if (!store.invoices) store.invoices = [];
    const idx = store.invoices.findIndex(i => i.id === updatedInvoice.id || i.invoiceNumber === updatedInvoice.invoiceNumber);
    if (idx >= 0) {
      store.invoices[idx] = updatedInvoice;
    } else {
      store.invoices.unshift(updatedInvoice);
    }
    if (store.customerFiles) {
      store.customerFiles = store.customerFiles.map(f =>
        (f.invoiceId === updatedInvoice.id || f.invoiceNumber === updatedInvoice.invoiceNumber)
          ? { ...f, customerName: updatedInvoice.customerName, total: updatedInvoice.total, date: finalDate }
          : f
      );
    }
    saveStoreData(store);

    // Update product movements
    updateInvoiceMovements(updatedInvoice);

    // Update in Supabase
    try {
      await upsertInvoice({
        id: updatedInvoice.id,
        invoice_number: updatedInvoice.invoiceNumber,
        customer_id: updatedInvoice.customerId,
        customer_name: updatedInvoice.customerName,
        total: updatedInvoice.total,
        subtotal: updatedInvoice.subtotal,
        payment_method: updatedInvoice.paymentMethod,
        status: updatedInvoice.status,
        type: updatedInvoice.type,
        date: updatedInvoice.date,
        created_at: updatedInvoice.createdAt,
        notes: updatedInvoice.notes,
      }, editItems.map(it => ({
        product_id: it.productId,
        product_name: it.productName,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      })));
    } catch (err) {
      console.error("Error updating invoice in DB:", err);
    }

    setIsEditModalOpen(false);
    setEditingInvoice(null);
    loadAllData();
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    const invId = invoiceToDelete.id;
    const invNum = invoiceToDelete.invoiceNumber;

    // Remove locally
    const store = loadStoreData();
    if (store.invoices) {
      store.invoices = store.invoices.filter(i => i.id !== invId && i.invoiceNumber !== invNum);
    }
    if (store.customerFiles) {
      store.customerFiles = store.customerFiles.filter(f => f.invoiceId !== invId && f.invoiceNumber !== invNum);
    }
    saveStoreData(store);

    revertInvoiceMovements(invId, invNum);

    // Remove from Supabase
    try {
      await deleteInvoice(invId);
    } catch (err) {
      console.error("Error deleting invoice from DB:", err);
    }

    setIsDeleteModalOpen(false);
    setInvoiceToDelete(null);
    loadAllData();
  };

  const handleRestoreReturn = (id: string) => {
    const store = loadStoreData();
    store.returns = (store.returns || []).map((r) =>
      r.id === id ? { ...r, status: "active" as any, updatedAt: new Date().toISOString() } : r
    );
    saveStoreData(store);
    toast({
      title: isFr ? "Retour restauré" : "تمت استعادة المرتجع",
      description: isFr ? "Le retour a été réactivé avec succès" : "تمت استعادة المرتجع إلى القائمة النشطة بنجاح",
    });
    loadAllData();
  };

  const handleDeleteReturn = (id: string) => {
    const store = loadStoreData();
    store.returns = (store.returns || []).filter((r) => r.id !== id);
    saveStoreData(store);
    toast({
      title: isFr ? "Retour supprimé" : "تم حذف المرتجع",
      description: isFr ? "Le retour a été supprimé des archives" : "تم حذف المرتجع من الأرشيف نهائياً",
    });
    loadAllData();
  };

  const handleRestoreDebtor = (id: string) => {
    const store = loadStoreData();
    store.debtors = (store.debtors || []).map((d) =>
      d.id === id ? { ...d, status: "pending" as any, updatedAt: new Date().toISOString() } : d
    );
    saveStoreData(store);
    toast({
      title: isFr ? "Créance restaurée" : "تمت استعادة سجل العميل",
      description: isFr ? "Le compte a été réactivé" : "تمت إعادة سجل الدين إلى القائمة النشطة بنجاح",
    });
    loadAllData();
  };

  const handleDeleteDebtor = (id: string) => {
    const store = loadStoreData();
    store.debtors = (store.debtors || []).filter((d) => d.id !== id);
    saveStoreData(store);
    toast({
      title: isFr ? "Créance supprimée" : "تم حذف السجل",
      description: isFr ? "Supprimé des archives" : "تم حذف السجل من الأرشيف نهائياً",
    });
    loadAllData();
  };

  const handleRestoreCreditor = (id: string) => {
    const store = loadStoreData();
    store.creditors = (store.creditors || []).map((c) =>
      c.id === id ? { ...c, status: "pending" as any, updatedAt: new Date().toISOString() } : c
    );
    saveStoreData(store);
    toast({
      title: isFr ? "Dette fournisseur restaurée" : "تمت استعادة دين المورد",
      description: isFr ? "Le fournisseur a été réactivé" : "تمت إعادة حساب المورد إلى القائمة النشطة بنجاح",
    });
    loadAllData();
  };

  const handleDeleteCreditor = (id: string) => {
    const store = loadStoreData();
    store.creditors = (store.creditors || []).filter((c) => c.id !== id);
    saveStoreData(store);
    toast({
      title: isFr ? "Fournisseur supprimé" : "تم حذف السجل",
      description: isFr ? "Supprimé des archives" : "تم حذف السجل من الأرشيف نهائياً",
    });
    loadAllData();
  };

  const handleRestorePayment = (id: string) => {
    const store = loadStoreData();
    store.invoices = (store.invoices || []).map((inv) =>
      inv.id === id ? { ...inv, status: "pending" as any, updatedAt: new Date().toISOString() } : inv
    );
    saveStoreData(store);
    toast({
      title: isFr ? "Paiement réinitialisé" : "تمت إعادة المعاملة",
      description: isFr ? "La facture est repassée en attente" : "تمت إعادة الفاتورة إلى قائمة المستحقات غير المسددة",
    });
    loadAllData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {isFr ? "Payée" : "مدفوع"}
        </span>;
      case 'partial':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {isFr ? "Partielle" : "جزئي"}
        </span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {isFr ? "Annulée" : "ملغي"}
        </span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {isFr ? "En attente" : "قيد الانتظار"}
        </span>;
    }
  };

  const getTypeBadge = (type?: string) => {
    const tVal = type || 'sales';
    if (tVal === 'sales') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
        <Receipt size={12} />
        {t('salesInvoice') || (isFr ? 'Facture de vente' : 'فاتورة بيع')}
      </span>;
    }
    if (tVal === 'quotation') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
        <FileText size={12} />
        {t('quotationInvoice') || (isFr ? 'Devis' : 'عرض سعر')}
      </span>;
    }
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
      <DollarSign size={12} />
      {t('debtInvoice') || (isFr ? 'Facture à terme' : 'فاتورة دين')}
    </span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">
          {isFr ? "Chargement des archives et des factures..." : "جاري تحميل سجل الأرشيف والبيانات..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isFr ? "Archives & Factures" : "سجل الأرشيف والفواتير"}
              </h1>
              <p className="text-xs text-slate-500">
                {isFr
                  ? "Consultez et gérez toutes vos factures enregistrées, devis et historiques de ventes"
                  : "استعراض وإدارة جميع الفواتير المسجلة، عروض الأسعار، والمبيعات السابقة"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportActions
            data={filteredInvoices}
            filename="archived_invoices"
            title={isFr ? `Factures archivées - ${year === 0 ? 'Toutes les années' : year}` : `الفواتير المؤرشفة - ${year === 0 ? 'كل السنوات' : year}`}
            columns={exportColumns}
            totals={totals}
          />
        </div>
      </div>

      {/* ── Top Archive Navigation Tabs ── */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto print:hidden">
        {[
          { id: "invoices", label: isFr ? "Factures & Ventes" : "الفواتير والمبيعات", icon: FileText, count: invoices.length },
          { id: "returns", label: isFr ? "Retours Produits" : "المرتجعات", icon: RotateCcw, count: returnsList.length },
          { id: "debtors", label: isFr ? "Créances Clients" : "ديون العملاء", icon: Users, count: debtorsList.length },
          { id: "creditors", label: isFr ? "Dettes Fournisseurs" : "ديون الموردين", icon: Building, count: creditorsList.length },
          { id: "payments", label: isFr ? "Paiements Reçus" : "المدفوعات المحصلة", icon: CreditCard, count: filteredPayments.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-sm ${
                isActive
                  ? "bg-blue-600 text-white shadow-blue-500/20"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                  isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab: Invoices & Sales ── */}
      {activeTab === "invoices" && (
        <>
          {/* ── Summary KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
        {/* Total Invoices */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Total des factures" : "إجمالي الفواتير"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.totalCount}</h3>
            <p className="text-[11px] font-bold text-blue-600 mt-0.5">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        {/* Sales Invoices */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Factures de vente" : "فواتير البيع المكتملة"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.salesCount}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{formatCurrency(stats.salesAmount)}</p>
          </div>
        </div>

        {/* Quotations */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Receipt size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Devis émis" : "عروض الأسعار"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.quotationCount}</h3>
            <p className="text-[11px] font-bold text-purple-600 mt-0.5">{formatCurrency(stats.quotationAmount)}</p>
          </div>
        </div>

        {/* Debt Invoices */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {isFr ? "Factures à terme / Dettes" : "فواتير الديون / الآجل"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.debtCount}</h3>
            <p className="text-[11px] font-bold text-amber-600 mt-0.5">{formatCurrency(stats.debtAmount)}</p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="gsc-card p-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className={`absolute ${isRTL ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-slate-400`} size={17} />
            <input
              type="text"
              placeholder={isFr ? "Rechercher par N° facture, client ou produit..." : "البحث برقم الفاتورة، اسم العميل، أو اسم المنتج..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pl-4 pr-10" : "pr-4 pl-10"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="md:col-span-4 relative">
            <div className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`}>
              <Filter size={16} />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pr-9 pl-8" : "pl-9 pr-8"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all`}
            >
              <option value="all">{isFr ? "Tous les types de factures" : "جميع أنواع الفواتير"}</option>
              <option value="sales">{isFr ? "Factures de vente uniquement" : "فواتير المبيعات فقط"}</option>
              <option value="quotation">{isFr ? "Devis uniquement" : "عروض الأسعار فقط"}</option>
              <option value="debt">{isFr ? "Factures de dettes uniquement" : "فواتير الديون فقط"}</option>
            </select>
            <ChevronDown size={15} className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`} />
          </div>

          {/* Year Filter */}
          <div className="md:col-span-3 relative">
            <div className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`}>
              <Calendar size={16} />
            </div>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pr-9 pl-8" : "pl-9 pr-8"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all`}
            >
              <option value={0}>{isFr ? "Toutes les années fiscales" : "كل السنوات المالية"}</option>
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={15} className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`} />
          </div>
        </div>

        {/* Quick Filter Tag Buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 ml-1">
            {isFr ? "Filtrage rapide :" : "تصفية سريعة:"}
          </span>
          {[
            { id: 'all', label: isFr ? 'Tout' : 'الكل' },
            { id: 'sales', label: isFr ? 'Ventes' : 'المبيعات' },
            { id: 'quotation', label: isFr ? 'Devis' : 'عروض الأسعار' },
            { id: 'debt', label: isFr ? 'Dettes' : 'الديون' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`text-xs px-3 py-1 rounded-lg font-bold transition-all ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="mr-auto text-xs font-medium text-slate-500">
            {isFr ? (
              <><span className="font-bold text-slate-900">{filteredInvoices.length}</span> facture(s) trouvée(s)</>
            ) : (
              <>تم العثور على <span className="font-bold text-slate-900">{filteredInvoices.length}</span> فاتورة</>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Invoices Table Card ── */}
      <div className="gsc-card overflow-hidden print:hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {isFr ? "Aucune facture correspondante" : "لا توجد فواتير مطابقة"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isFr
                ? "Aucune facture ou devis ne correspond aux critères de recherche et filtrage sélectionnés."
                : "لم نعثر على أي فواتير أو عروض أسعار تطابق معايير البحث والفلترة المحددة."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRTL ? "text-right" : "text-left"} border-collapse`}>
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">{isFr ? "N° Facture & Type" : "رقم الفاتورة والنوع"}</th>
                  <th className="py-3.5 px-4">{isFr ? "Client" : "العميل"}</th>
                  <th className="py-3.5 px-4">{isFr ? "Articles vendus" : "المنتجات المباعة"}</th>
                  <th className="py-3.5 px-4">{isFr ? "Date d'émission" : "تاريخ الإصدار"}</th>
                  <th className="py-3.5 px-4">{isFr ? "Statut & Paiement" : "الحالة والدفع"}</th>
                  <th className={`py-3.5 px-4 ${isRTL ? "text-left" : "text-right"}`}>{isFr ? "Montant total" : "المبلغ الإجمالي"}</th>
                  <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInvoices.map((invoice) => {
                  const itemsList = invoice.items || [];
                  const itemsSummary = itemsList.map(it => it.productName).filter(Boolean).join("، ") || (isFr ? "Aucun article spécifié" : "بدون منتجات محددة");
                  const totalItemsQty = itemsList.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Invoice Number & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {invoice.invoiceNumber}
                          </span>
                          {getTypeBadge(invoice.type)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                            <User size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{invoice.customerName || (isFr ? "Client divers" : "عميل عام")}</span>
                            {invoice.notes && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">{invoice.notes}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[240px]">
                          <p className="text-xs font-medium text-slate-700 truncate" title={itemsSummary}>
                            {itemsSummary}
                          </p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Package size={11} />
                            {itemsList.length} {isFr ? "articles" : "أصناف"} ({totalItemsQty} {isFr ? "unités" : "قطعة"})
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-xs text-slate-600">
                          <span className="font-medium text-slate-800">
                            {formatDate(invoice.date || invoice.createdAt)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {invoice.createdAt && invoice.createdAt.includes('T') ? invoice.createdAt.split('T')[1].slice(0, 5) : ''}
                          </span>
                        </div>
                      </td>

                      {/* Status & Payment Method */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getStatusBadge(invoice.status || 'paid')}
                          <span className="text-[11px] font-medium text-slate-500">
                            {invoice.paymentMethod === 'bank' ? (isFr ? 'Virement bancaire' : 'تحويل بنكي') :
                             invoice.paymentMethod === 'check' ? (isFr ? 'Chèque' : 'شيك بنكي') : (isFr ? 'Espèces' : 'نقداً')}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className={`py-3.5 px-4 ${isRTL ? "text-left" : "text-right"}`}>
                        <span className="font-black text-slate-900 text-base font-sans block">
                          {formatCurrency(invoice.total)}
                        </span>
                        {invoice.subtotal && invoice.subtotal !== invoice.total && (
                          <span className="text-[10px] text-slate-400 line-through block">
                            {formatCurrency(invoice.subtotal)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={isFr ? "Imprimer la facture" : "طباعة الفاتورة"}
                          >
                            <Printer size={16} />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(invoice)}
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={isFr ? "Modifier la facture" : "تعديل الفاتورة"}
                          >
                            <Edit size={16} />
                          </button>

                          {invoice.type === 'quotation' && (
                            <button
                              onClick={() => navigate(`/create-invoice?quoteId=${invoice.id}`)}
                              className="text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 px-2 py-1 rounded-md transition-colors"
                              title={isFr ? "Convertir ce devis en vente directe" : "تحويل هذا العرض إلى فاتورة بيع مباشرة"}
                            >
                              {isFr ? "Convertir en vente" : "تحويل لبيع"}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setInvoiceToDelete(invoice);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={isFr ? "Supprimer la facture" : "حذف الفاتورة"}
                          >
                            <Trash2 size={16} />
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
        </>
      )}

      {/* ── Tab: Returns Archive ── */}
      {activeTab === "returns" && (
        <>
          {/* Returns KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Total des retours" : "إجمالي المرتجعات"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{returnsStats.totalCount}</h3>
                <p className="text-[11px] font-bold text-rose-600 mt-0.5">{formatCurrency(returnsStats.totalAmount)}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <DollarSign size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Valeur remboursée" : "قيمة المبالغ المرجعة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(returnsStats.totalAmount)}</h3>
                <p className="text-[11px] font-bold text-amber-600 mt-0.5">{returnsStats.totalUnits} {isFr ? "unités" : "قطعة"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Package size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Articles retournés" : "عدد الأصناف المسترجعة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{returnsStats.totalUnits}</h3>
                <p className="text-[11px] font-bold text-purple-600 mt-0.5">{isFr ? "Unités en stock" : "قطع أعيدت للمخزن"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ArchiveIcon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Retours archivés" : "مرتجعات مؤرشفة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{returnsStats.archivedCount}</h3>
                <p className="text-[11px] font-bold text-blue-600 mt-0.5">{isFr ? "Statut archivé" : "حالة مؤرشفة"}</p>
              </div>
            </div>
          </div>

          {/* Returns Search */}
          <div className="gsc-card p-4 print:hidden">
            <div className="relative">
              <Search className={`absolute ${isRTL ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-slate-400`} size={17} />
              <input
                type="text"
                placeholder={isFr ? "Rechercher un retour par N°, client..." : "البحث برقم المرتجع أو اسم العميل..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pl-4 pr-10" : "pr-4 pl-10"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Returns Table */}
          <div className="gsc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "N° Retour" : "رقم المرتجع"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Client" : "العميل"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "N° Facture liée" : "الفاتورة الأصلية"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Date" : "التاريخ"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Montant" : "المبلغ المرجع"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Statut" : "الحالة"}</th>
                    <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <RotateCcw className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">{isFr ? "Aucun retour enregistré dans l'archive" : "لا توجد مرتجعات في الأرشيف"}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{ret.returnNumber}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{ret.customerName}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-500">{ret.invoiceNumber || ret.invoiceId || "-"}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{formatDate(ret.date || ret.createdAt)}</td>
                        <td className="py-3.5 px-4 font-black text-rose-600">{formatCurrency(ret.total)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            ret.status === "archived" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {ret.status === "archived" ? (isFr ? "Archivé" : "مؤرشف") : (isFr ? "Actif" : "نشط")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleRestoreReturn(ret.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={isFr ? "Restaurer en actif" : "استعادة إلى النشط"}
                            >
                              <Undo2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteReturn(ret.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title={isFr ? "Supprimer définitivement" : "حذف نهائي"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Tab: Debtors Archive ── */}
      {activeTab === "debtors" && (
        <>
          {/* Debtors KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Total des créances" : "إجمالي ديون العملاء"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(debtorsStats.totalAmount)}</h3>
                <p className="text-[11px] font-bold text-amber-600 mt-0.5">{debtorsStats.totalCount} {isFr ? "dossiers" : "عميل"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Dettes soldées" : "ديون مسددة بالكامل"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{debtorsStats.settledCount}</h3>
                <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{isFr ? "Payé" : "مسدد"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Créances en attente" : "ديون معلقة / متبقية"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{debtorsStats.pendingCount}</h3>
                <p className="text-[11px] font-bold text-red-600 mt-0.5">{isFr ? "À recouvrer" : "قيد التحصيل"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ArchiveIcon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Total dossiers archivés" : "إجمالي السجلات المؤرشفة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{debtorsStats.totalCount}</h3>
                <p className="text-[11px] font-bold text-blue-600 mt-0.5">{isFr ? "Historique" : "سجل كامل"}</p>
              </div>
            </div>
          </div>

          {/* Debtors Search */}
          <div className="gsc-card p-4 print:hidden">
            <div className="relative">
              <Search className={`absolute ${isRTL ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-slate-400`} size={17} />
              <input
                type="text"
                placeholder={isFr ? "Rechercher par nom ou téléphone..." : "البحث باسم العميل أو رقم الهاتف..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pl-4 pr-10" : "pr-4 pl-10"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
            </div>
          </div>

          {/* Debtors Table */}
          <div className="gsc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Client" : "العميل"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Téléphone" : "رقم الهاتف"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Date" : "التاريخ"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Montant" : "المبلغ"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Statut" : "الحالة"}</th>
                    <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDebtors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">{isFr ? "Aucune créance dans l'archive" : "لا توجد سجلات ديون في الأرشيف"}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDebtors.map((deb) => (
                      <tr key={deb.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{deb.name || deb.debtorName}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{deb.phone || "-"}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{formatDate(deb.date || deb.createdAt)}</td>
                        <td className="py-3.5 px-4 font-black text-amber-700">{formatCurrency(deb.totalAmount || deb.amount || 0)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            deb.status === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {deb.status === "paid" ? (isFr ? "Soldé" : "مسدد") : (isFr ? "En attente" : "معلق")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleRestoreDebtor(deb.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={isFr ? "Restaurer en actif" : "استعادة إلى القائمة النشطة"}
                            >
                              <Undo2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteDebtor(deb.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title={isFr ? "Supprimer définitivement" : "حذف نهائي"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Tab: Creditors Archive ── */}
      {activeTab === "creditors" && (
        <>
          {/* Creditors KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Building size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Total dettes fournisseurs" : "إجمالي ديون الموردين"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(creditorsStats.totalAmount)}</h3>
                <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{creditorsStats.totalCount} {isFr ? "fournisseurs" : "مورد"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Dettes réglées" : "ديون مسددة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{creditorsStats.paidCount}</h3>
                <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{isFr ? "Réglé" : "تم السداد"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Dettes en attente" : "ديون معلقة / متبقية"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{creditorsStats.pendingCount}</h3>
                <p className="text-[11px] font-bold text-amber-600 mt-0.5">{isFr ? "À régler" : "مستحقة للدفع"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <ArchiveIcon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Fournisseurs archivés" : "سجلات مؤرشفة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{creditorsStats.totalCount}</h3>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">{isFr ? "Historique" : "سجل كامل"}</p>
              </div>
            </div>
          </div>

          {/* Creditors Search */}
          <div className="gsc-card p-4 print:hidden">
            <div className="relative">
              <Search className={`absolute ${isRTL ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-slate-400`} size={17} />
              <input
                type="text"
                placeholder={isFr ? "Rechercher par fournisseur ou téléphone..." : "البحث باسم المورد أو رقم الهاتف..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pl-4 pr-10" : "pr-4 pl-10"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
            </div>
          </div>

          {/* Creditors Table */}
          <div className="gsc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Fournisseur" : "المورد"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Téléphone" : "رقم الهاتف"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Date" : "التاريخ"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Montant" : "المبلغ"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Statut" : "الحالة"}</th>
                    <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCreditors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Building className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">{isFr ? "Aucune dette fournisseur dans l'archive" : "لا توجد ديون موردين في الأرشيف"}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCreditors.map((cred) => (
                      <tr key={cred.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{cred.name}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{cred.phone || "-"}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{formatDate(cred.date || cred.createdAt)}</td>
                        <td className="py-3.5 px-4 font-black text-indigo-700">{formatCurrency(cred.total || cred.amount || 0)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            cred.status === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {cred.status === "paid" ? (isFr ? "Réglé" : "مسدد") : (isFr ? "En attente" : "معلق")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleRestoreCreditor(cred.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={isFr ? "Restaurer en actif" : "استعادة إلى القائمة النشطة"}
                            >
                              <Undo2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCreditor(cred.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title={isFr ? "Supprimer définitivement" : "حذف نهائي"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Tab: Payments Archive ── */}
      {activeTab === "payments" && (
        <>
          {/* Payments KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CreditCard size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Total des encaissements" : "إجمالي المدفوعات المحصلة"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(paymentsStats.totalAmount)}</h3>
                <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{paymentsStats.totalCount} {isFr ? "paiements" : "دفعة"}</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <DollarSign size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Via Bankily" : "تحصيلات بنكيلي"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(paymentsStats.bankilyAmount)}</h3>
                <p className="text-[11px] font-bold text-orange-600 mt-0.5">Bankily</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <TrendingUp size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "Via Masrivi / Sedad" : "تحصيلات مصرفي / سداد"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(paymentsStats.masriviAmount)}</h3>
                <p className="text-[11px] font-bold text-blue-600 mt-0.5">Masrivi / Sedad</p>
              </div>
            </div>

            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Receipt size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">
                  {isFr ? "En Espèces (Cash)" : "تحصيلات نقداً (Cash)"}
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(paymentsStats.cashAmount)}</h3>
                <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{isFr ? "Cash direct" : "نقدي"}</p>
              </div>
            </div>
          </div>

          {/* Payments Search */}
          <div className="gsc-card p-4 print:hidden">
            <div className="relative">
              <Search className={`absolute ${isRTL ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-slate-400`} size={17} />
              <input
                type="text"
                placeholder={isFr ? "Rechercher par N° facture, client ou mode..." : "البحث برقم الفاتورة، اسم العميل، أو طريقة الدفع..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm ${isRTL ? "pl-4 pr-10" : "pr-4 pl-10"} py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`}
              />
            </div>
          </div>

          {/* Payments Table */}
          <div className="gsc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "N° Facture / Reçu" : "رقم الفاتورة / الإيصال"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Client" : "العميل"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Mode de Paiement" : "طريقة الدفع"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Date" : "التاريخ"}</th>
                    <th className={`py-3.5 px-4 ${isRTL ? "text-right" : "text-left"}`}>{isFr ? "Montant" : "المبلغ"}</th>
                    <th className="py-3.5 px-4 text-center">{isFr ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">{isFr ? "Aucun paiement archivé" : "لا توجد مدفوعات في الأرشيف"}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{pay.invoiceNumber}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{pay.customerName}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                            {pay.paymentMethod || "cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{formatDate(pay.date || pay.createdAt)}</td>
                        <td className="py-3.5 px-4 font-black text-emerald-600">{formatCurrency(pay.total)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedInvoice(pay);
                                setTimeout(() => window.print(), 100);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={isFr ? "Imprimer le reçu" : "طباعة الإيصال"}
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => handleRestorePayment(pay.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title={isFr ? "Rétablir en impayé" : "إعادة إلى المستحقات غير المسددة"}
                            >
                              <Undo2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Invoice Modal ── */}
      {isEditModalOpen && editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 ${isRTL ? "text-right" : "text-left"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isFr ? `Modifier la facture #${editingInvoice.invoiceNumber}` : `تعديل الفاتورة #${editingInvoice.invoiceNumber}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isFr ? "Mise à jour du client, des articles et des détails du montant" : "تحديث بيانات العميل، الأصناف وتفاصيل السعر"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Customer and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("customer")}</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("date") || (isFr ? "Date de facturation" : "تاريخ الفاتورة")}</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-sans"
                  />
                </div>
              </div>

              {/* Status, Payment method and Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("invoiceStatus")}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="pending">{t("pending")}</option>
                    <option value="paid">{t("paid")}</option>
                    <option value="partial">{t("partial")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("paymentMethod")}</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="cash">{t("cash")}</option>
                    <option value="bank">{(t as any)("bank") || (isFr ? "Virement bancaire" : "تحويل بنكي")}</option>
                    <option value="check">{(t as any)("check") || (isFr ? "Chèque" : "شيك")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("invoiceTypeLabel") || (isFr ? "Type de facture" : "نوع الفاتورة")}</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="sales">{t("salesInvoice") || (isFr ? "Facture de vente" : "فاتورة بيع")}</option>
                    <option value="quotation">{t("quotationInvoice") || (isFr ? "Devis" : "عرض سعر")}</option>
                    <option value="debt">{t("debtInvoice") || (isFr ? "Facture à terme" : "فاتورة دين")}</option>
                  </select>
                </div>
              </div>

              {/* Items editing table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                  <span>{isFr ? "Articles" : t("noteItems")} ({editItems.length})</span>
                  <span className="text-[11px] text-slate-400">
                    {isFr ? "Qté × Prix = Total" : "الكمية × السعر = الإجمالي"}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3 grid grid-cols-12 gap-2.5 items-center text-xs">
                      <div className="col-span-5 font-semibold text-slate-800">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, productName: val } : it));
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                          placeholder={isFr ? "Nom de l'article" : "اسم المنتج"}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty, total: qty * it.price } : it));
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-sans"
                          placeholder={isFr ? "Quantité" : "الكمية"}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.price}
                          onChange={(e) => {
                            const pr = Number(e.target.value);
                            setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, price: pr, total: pr * it.quantity } : it));
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-sans"
                          placeholder={isFr ? "Prix" : "السعر"}
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center border-t border-emerald-100 text-xs">
                  <span className="font-bold text-emerald-800">
                    {isFr ? "Total révisé :" : "المجموع النهائي المعدل:"}
                  </span>
                  <span className="font-black text-emerald-700 text-base font-sans">
                    {formatCurrency(editItems.reduce((acc, it) => acc + (it.total || 0), 0))}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isFr ? "Notes de la facture" : "ملاحظات الفاتورة"}
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveInvoiceEdit}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-all"
              >
                <CheckCircle size={16} />
                <span>{isFr ? "Enregistrer" : t("saveEdits")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Invoice Modal ── */}
      {isDeleteModalOpen && invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center border border-slate-100 ${isRTL ? "text-right" : "text-left"}`}>
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-900">{t("confirmDeleteInvoice")}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isFr
                ? `Êtes-vous sûr de vouloir supprimer définitivement la facture "#${invoiceToDelete.invoiceNumber}" du client ${invoiceToDelete.customerName} ? Les mouvements de stock seront annulés et les articles réintégrés automatiquement.`
                : `${t("confirmDeleteInvoiceMsg")} "#${invoiceToDelete.invoiceNumber}" للعميل ${invoiceToDelete.customerName}؟ سيتم إلغاء الحركات وإرجاع المخزون المخصوم تلقائياً.`}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteInvoice}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm shadow-rose-500/20 transition-all"
              >
                {t("yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice */}
      {selectedInvoice && storeInfo && (
        <ProfessionalInvoice
          invoice={selectedInvoice}
          storeInfo={storeInfo}
          customerLetterheadUrl={customers.find(c => c.name === selectedInvoice.customerName)?.letterheadUrl}
        />
      )}
    </div>
  );
}
