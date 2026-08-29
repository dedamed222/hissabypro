
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { loadStoreData } from "@/utils/localStorage";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import type { Invoice } from "@/types";
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  Bell,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  DollarSign
} from "lucide-react";

export default function Payments() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { toast } = useToast();

  // Load invoices data
  useEffect(() => {
    const storeData = loadStoreData();
    setInvoices(storeData.invoices || []);
  }, []);

  // Filter invoices based on search and filters
  const getFilteredInvoices = (status: string) => {
    return invoices.filter(invoice => {
      const matchesSearch =
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesPaymentMethod = paymentMethodFilter === "all" || invoice.paymentMethod === paymentMethodFilter;
      const matchesInvoiceStatus = status === "all" || invoice.status === status;

      return matchesSearch && matchesStatus && matchesPaymentMethod && matchesInvoiceStatus;
    });
  };

  // Get paid invoices
  const paidInvoices = getFilteredInvoices("paid");

  // Get unpaid invoices
  const unpaidInvoices = getFilteredInvoices("pending");

  // Get pending invoices (waiting for payment)
  const pendingInvoices = invoices.filter(invoice =>
    invoice.status === "pending" &&
    invoice.notes?.includes("دفع متأخر") ||
    invoice.notes?.includes("جدول زمني")
  );

  // Calculate payment percentage (mock calculation)
  const getPaymentPercentage = (invoice: Invoice) => {
    // Mock calculation - in real app this would be based on actual payments
    return Math.floor(Math.random() * 100);
  };

  // Get next payment date (mock)
  const getNextPaymentDate = (invoice: Invoice) => {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
    return date.toLocaleDateString('en-GB');
  };

  // Send reminder function
  const sendReminder = (invoice: Invoice) => {
    toast({
      title: "تم إرسال التذكير",
      description: `تم إرسال تذكير دفع للعميل ${invoice.customerName}`,
    });
  };

  // Get unique payment methods
  const paymentMethods = [...new Set(invoices.map(invoice => invoice.paymentMethod))].filter(Boolean);

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600" />
          إدارة المدفوعات
        </h1>
        <Link to="/create-invoice">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 ml-2" />
            إضافة فاتورة جديدة
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            البحث والفلترة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في الفواتير..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="pending">غير مدفوعة</SelectItem>
                <SelectItem value="cancelled">ملغية</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع طرق الدفع</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="paid" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-blue-50">
          <TabsTrigger value="paid" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            الفواتير المسددة ({paidInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="unpaid" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            الفواتير غير المسددة ({unpaidInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            قائمة الانتظار ({pendingInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Paid Invoices Tab */}
        <TabsContent value="paid" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                الفواتير المسددة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow-none">
                <Table className="block md:table">
                  <TableHeader className="hidden md:table-header-group">
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-right font-semibold">رقم الفاتورة</TableHead>
                      <TableHead className="text-right font-semibold">اسم العميل</TableHead>
                      <TableHead className="text-right font-semibold">المبلغ</TableHead>
                      <TableHead className="text-right font-semibold">طريقة الدفع</TableHead>
                      <TableHead className="text-right font-semibold">التاريخ</TableHead>
                      <TableHead className="text-right font-semibold">الحالة</TableHead>
                      <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="block md:table-row-group">
                    {paidInvoices.length > 0 ? (
                      paidInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-gray-50 mobile-card-row">
                          <TableCell data-label="رقم الفاتورة" className="font-medium">
                            <Badge variant="outline" className="font-mono">
                              {invoice.invoiceNumber}
                            </Badge>
                          </TableCell>
                          <TableCell data-label="اسم العميل">
                            <div className="flex items-center gap-2 justify-end md:justify-start">
                              <User className="w-4 h-4 text-gray-500" />
                              {invoice.customerName}
                            </div>
                          </TableCell>
                          <TableCell data-label="المبلغ" className="font-bold text-green-600">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell data-label="طريقة الدفع">
                            <div className="flex items-center gap-2 justify-end md:justify-start">
                              <CreditCard className="w-4 h-4" />
                              {invoice.paymentMethod}
                            </div>
                          </TableCell>
                          <TableCell data-label="التاريخ">
                            <div className="flex items-center gap-2 justify-end md:justify-start">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {invoice.date}
                            </div>
                          </TableCell>
                          <TableCell data-label="الحالة">
                            <Badge className="bg-green-100 text-green-800">
                              {invoice.status === "paid" ? "مسددة" : invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-label="الإجراءات" className="text-center">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-10 px-4">
                              <Eye className="w-4 h-4 ml-1" />
                              عرض التفاصيل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500 block md:table-cell">
                          لا توجد فواتير مسددة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unpaid Invoices Tab */}
        <TabsContent value="unpaid" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                الفواتير غير المسددة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-right font-semibold">رقم الفاتورة</TableHead>
                      <TableHead className="text-right font-semibold">اسم العميل</TableHead>
                      <TableHead className="text-right font-semibold">المبلغ المستحق</TableHead>
                      <TableHead className="text-right font-semibold">نسبة التسديد</TableHead>
                      <TableHead className="text-right font-semibold">تاريخ الاستحقاق</TableHead>
                      <TableHead className="text-center font-semibold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.length > 0 ? (
                      unpaidInvoices.map((invoice) => {
                        const paymentPercentage = getPaymentPercentage(invoice);
                        return (
                          <TableRow key={invoice.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="font-mono">
                                {invoice.invoiceNumber}
                              </Badge>
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              {invoice.customerName}
                            </TableCell>
                            <TableCell className="font-bold text-red-600">
                              {formatCurrency(invoice.total)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={paymentPercentage} className="h-2 w-full" />
                                <span className="text-sm font-medium">{paymentPercentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {invoice.date}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => sendReminder(invoice)}
                              >
                                <Bell className="w-4 h-4 ml-1" />
                                إرسال تذكير
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          لا توجد فواتير غير مسددة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invoices Tab */}
        <TabsContent value="pending" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <Clock className="w-5 h-5" />
                قائمة الانتظار للدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="text-right font-semibold">رقم الفاتورة</TableHead>
                      <TableHead className="text-right font-semibold">العميل</TableHead>
                      <TableHead className="text-right font-semibold">المبلغ الكلي</TableHead>
                      <TableHead className="text-right font-semibold">الدفعة الأولى</TableHead>
                      <TableHead className="text-right font-semibold">المتبقي</TableHead>
                      <TableHead className="text-right font-semibold">تاريخ السداد القادم</TableHead>
                      <TableHead className="text-right font-semibold">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvoices.length > 0 ? (
                      pendingInvoices.map((invoice) => {
                        const firstPayment = invoice.total * 0.3; // 30% as first payment
                        const remaining = invoice.total - firstPayment;
                        const nextPaymentDate = getNextPaymentDate(invoice);

                        return (
                          <TableRow key={invoice.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="font-mono">
                                {invoice.invoiceNumber}
                              </Badge>
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              {invoice.customerName}
                            </TableCell>
                            <TableCell className="font-bold">
                              {formatCurrency(invoice.total)}
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {formatCurrency(firstPayment)}
                            </TableCell>
                            <TableCell className="text-red-600 font-medium">
                              {formatCurrency(remaining)}
                            </TableCell>
                            <TableCell className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              {nextPaymentDate}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {invoice.notes || "جدول زمني للدفع"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          لا توجد فواتير في قائمة الانتظار
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-green-50 to-emerald-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">إجمالي المبيعات المسددة</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(paidInvoices.reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
              <div className="bg-green-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-pink-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">المبالغ المستحقة</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
              <div className="bg-red-200 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">إجمالي الفواتير</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
