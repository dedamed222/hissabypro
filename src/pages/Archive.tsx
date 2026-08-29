
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
import { Printer, ArrowRightLeft } from "lucide-react";
import ProfessionalInvoice from "@/components/invoice/ProfessionalInvoice";
import { Invoice, StoreInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getInvoices } from "@/lib/database";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function Archive() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [year, setYear] = useState<number>(0); // 0 means All Years
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const localData = loadStoreData();
      setStoreInfo(localData.storeInfo);

      if (isAuthenticated) {
        const rows = await getInvoices();
        const mapped: Invoice[] = rows.map((row: any) => ({
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
            productCode: "", // Default to empty if not in DB schema
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
        setInvoices(mapped);
      } else {
        setInvoices(localData.invoices || []);
      }
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
                        <div className="flex items-center justify-end md:justify-start gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-3 flex gap-1 items-center text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setTimeout(() => window.print(), 100);
                            }}
                          >
                            <Printer size={16} />
                            <span className="hidden sm:inline">طباعة</span>
                          </Button>
                          {invoice.type === 'quotation' && (
                            <button
                              onClick={() => navigate(`/create-invoice?quoteId=${invoice.id}`)}
                              className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-2 rounded hover:bg-indigo-100 transition-colors h-10 flex items-center"
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

      {selectedInvoice && storeInfo && (
        <ProfessionalInvoice
          invoice={selectedInvoice}
          storeInfo={storeInfo}
        />
      )}
    </div>
  );
}
