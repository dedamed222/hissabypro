
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { loadStoreData } from "@/utils/localStorage";
import { Search, Loader2 } from "lucide-react";
import ExportActions from "@/components/shared/ExportActions";
import { useLocale } from "@/hooks/useLocale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowRightLeft, Edit, Trash2, X, CheckCircle, AlertCircle } from "lucide-react";
import ProfessionalInvoice from "@/components/invoice/ProfessionalInvoice";
import { Invoice, StoreInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getInvoices, getCustomers, deleteInvoice, upsertInvoice } from "@/lib/database";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Customer } from "@/types";
import { saveStoreData } from "@/utils/localStorage";

export default function Archive() {
  const { t, isRTL } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [year, setYear] = useState<number>(0); // 0 means All Years
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  // Edit / Delete modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
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

        // Combine DB invoices with any local invoices that haven't synced or from notes
        const localInvs = localData.invoices || [];
        const combined = [...dbMapped];
        for (const locInv of localInvs) {
          if (!combined.some(c => c.id === locInv.id || c.invoiceNumber === locInv.invoiceNumber)) {
            combined.push(locInv);
          }
        }
        allList = combined;
      } else {
        allList = localData.invoices || [];
      }
      setInvoices(allList);
    } catch (error) {
      console.error("Error loading invoices:", error);
      const localData = loadStoreData();
      setInvoices(localData.invoices || []);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time sync: reload when invoices change on any device
  useRealtimeSync(['invoices', 'invoice_items'], loadAllData, user?.id);

  const filteredInvoices = invoices
    .filter(invoice => {
      const invoiceType = invoice.type || 'sales';
      const invoiceYear = new Date(invoice.createdAt).getFullYear();

      const matchesYear = year === 0 || invoiceYear === year;
      const matchesType = filterType === "all" || invoiceType === filterType;
      // Removed matchesArchiveCondition (paid/partial only) to show ALL invoices as requested

      const matchesSearch = searchTerm === "" ||
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.items.some(item =>
          item.productName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesYear && matchesType && matchesSearch;
    });

  const exportColumns = [
    {
      key: "invoiceNumber",
      header: "رقم الفاتورة",
    },
    {
      key: "customerName",
      header: "العميل",
    },
    {
      key: "items",
      header: "المنتجات",
      render: (invoice: any) => invoice.items.map((item: any) => item.productName).join(", ")
    },
    {
      key: "createdAt",
      header: "التاريخ",
      render: (invoice: any) => formatDate(invoice.createdAt)
    },
    {
      key: "total",
      header: "المبلغ",
      render: (invoice: any) => formatCurrency(invoice.total)
    }
  ];

  const totals = {
    totalDebit: filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
    totalCredit: 0,
    finalBalance: filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const handleOpenEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditCustomerName(invoice.customerName);
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
    const updatedInvoice: Invoice = {
      ...editingInvoice,
      customerName: editCustomerName.trim() || editingInvoice.customerName,
      status: editStatus,
      paymentMethod: editPaymentMethod,
      type: editType,
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
    // Also update any customer file entry
    if (store.customerFiles) {
      store.customerFiles = store.customerFiles.map(f => 
        (f.invoiceId === updatedInvoice.id || f.invoiceNumber === updatedInvoice.invoiceNumber)
          ? { ...f, customerName: updatedInvoice.customerName, total: updatedInvoice.total }
          : f
      );
    }
    saveStoreData(store);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold">الأرشيف</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <ExportActions
            data={filteredInvoices}
            filename="archived_invoices"
            title={`الفواتير المؤرشفة - ${year === 0 ? 'كل السنوات' : year}`}
            columns={exportColumns}
            totals={totals}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded p-2"
            title={t('invoiceTypeLabel') || 'نوع الفاتورة'}
          >
            <option value="all">{t('all') || 'الكل'}</option>
            <option value="sales">{t('salesInvoice') || 'فاتورة بيع'}</option>
            <option value="quotation">{t('quotationInvoice') || 'عرض سعر'}</option>
            <option value="debt">{t('debtInvoice') || 'فاتورة دين'}</option>
          </select>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-10"
            />
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded p-2"
            title={t('filter') || 'فلترة بالعام'}
          >
            <option value={0}>كل السنوات</option>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            الفواتير المؤرشفة
            <span className="text-sm font-normal text-gray-500">
              إجمالي: {filteredInvoices.length} فاتورة - {formatCurrency(totals.finalBalance)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow-none">
            <Table className="block md:table">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المنتجات</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="block md:table-row-group">
                {filteredInvoices.length === 0 ? (
                  <TableRow className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 block md:table-cell">
                      لا توجد فواتير مؤرشفة في هذا النطاق
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map(invoice => (
                    <TableRow key={invoice.id} className="mobile-card-row">
                      <TableCell data-label="رقم الفاتورة" className="font-medium">
                        <div className="flex flex-col gap-1 items-end md:items-start">
                          <span>{invoice.invoiceNumber}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded w-fit ${(invoice.type || 'sales') === 'sales' ? 'bg-green-100 text-green-800' :
                            invoice.type === 'quotation' ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                            {(invoice.type || 'sales') === 'sales' ? (t('salesInvoice') || 'فاتورة بيع') :
                              invoice.type === 'quotation' ? (t('quotationInvoice') || 'عرض سعر') :
                                (t('debtInvoice') || 'فاتورة دين')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-label="العميل">{invoice.customerName}</TableCell>
                      <TableCell data-label="المنتجات">
                        <div className="max-w-xs truncate text-left md:text-right" title={invoice.items.map(item => item.productName).join(", ")}>
                          {invoice.items.map(item => item.productName).join(", ")}
                        </div>
                      </TableCell>
                      <TableCell data-label="التاريخ">{formatDate(invoice.createdAt)}</TableCell>
                      <TableCell data-label="المبلغ" className="font-medium text-green-600">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell data-label="الإجراءات">
                        <div className="flex items-center justify-end md:justify-start gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2.5 flex gap-1 items-center text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setTimeout(() => window.print(), 100);
                            }}
                            title="طباعة"
                          >
                            <Printer size={15} />
                            <span className="hidden sm:inline">طباعة</span>
                          </Button>

                          {/* Edit button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2.5 flex gap-1 items-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                            onClick={() => handleOpenEdit(invoice)}
                            title={t("editInvoice")}
                          >
                            <Edit size={15} />
                            <span className="hidden sm:inline">{t("editInvoice")}</span>
                          </Button>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-2.5 flex gap-1 items-center text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            onClick={() => { setInvoiceToDelete(invoice); setIsDeleteModalOpen(true); }}
                            title={t("deleteInvoice")}
                          >
                            <Trash2 size={15} />
                            <span className="hidden sm:inline">{t("deleteInvoice")}</span>
                          </Button>

                          {invoice.type === 'quotation' && (
                            <button
                              onClick={() => navigate(`/create-invoice?quoteId=${invoice.id}`)}
                              className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors h-9 flex items-center"
                            >
                              تحويل لبيع
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Invoice Modal */}
      {isEditModalOpen && editingInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ${isRTL ? "text-right" : "text-left"}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900 text-base">
                {t("editInvoice")} #{editingInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Customer and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t("customer")}</label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t("invoiceStatus")}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue"
                  >
                    <option value="pending">{t("pending")}</option>
                    <option value="paid">{t("paid")}</option>
                    <option value="partial">{t("partial")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                  </select>
                </div>
              </div>

              {/* Payment method and Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t("paymentMethod")}</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue"
                  >
                    <option value="cash">{t("cash")}</option>
                    <option value="bank">{t("bank")}</option>
                    <option value="check">{t("check")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{t("invoiceTypeLabel") || "نوع الفاتورة"}</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full p-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-arab-blue"
                  >
                    <option value="sales">{t("salesInvoice") || "فاتورة بيع"}</option>
                    <option value="quotation">{t("quotationInvoice") || "عرض سعر"}</option>
                    <option value="debt">{t("debtInvoice") || "فاتورة دين"}</option>
                  </select>
                </div>
              </div>

              {/* Items editing table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                  {t("noteItems")} ({editItems.length})
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5 font-semibold text-gray-800 truncate">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, productName: val } : it));
                          }}
                          className="w-full p-1.5 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-arab-blue"
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
                          className="w-full p-1.5 border border-gray-200 rounded-lg text-center font-bold"
                          placeholder="الكمية"
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
                          className="w-full p-1.5 border border-gray-200 rounded-lg text-center font-bold"
                          placeholder="السعر"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-50 px-4 py-2 flex justify-between items-center border-t border-emerald-100 text-xs">
                  <span className="font-bold text-emerald-800">المجموع الجديد:</span>
                  <span className="font-black text-emerald-700 text-sm font-sans">
                    {formatCurrency(editItems.reduce((acc, it) => acc + (it.total || 0), 0))}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات الفاتورة</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-arab-blue resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveInvoiceEdit}
                className="flex-1 py-2.5 rounded-xl bg-arab-blue text-white font-bold text-sm hover:bg-arab-blue-dark flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                <span>{t("saveEdits")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {isDeleteModalOpen && invoiceToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center ${isRTL ? "text-right" : "text-left"}`}>
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t("confirmDeleteInvoice")}</h3>
            <p className="text-sm text-gray-500">
              {t("confirmDeleteInvoiceMsg")} "<span className="font-bold text-gray-800">#{invoiceToDelete.invoiceNumber}</span>" للعميل {invoiceToDelete.customerName}؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleDeleteInvoice}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm"
              >
                {t("yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

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
