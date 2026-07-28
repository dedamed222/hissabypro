
import { useState, useMemo } from "react";
import { useReturns } from "@/hooks/useReturns";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency } from "@/utils/formatters";
import { 
  Undo, 
  Search, 
  Trash, 
  FileText, 
  Calendar, 
  User, 
  Hash, 
  AlertCircle,
  Plus,
  ArrowRight,
  PackageCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Separator } from "@/components/ui/separator";

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
    removeReturn 
  } = useReturns();
  
  const { t, formatDate } = useLocale();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await removeReturn(deleteId);
      setDeleteId(null);
    }
  };

  const handleSelectInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setInvoiceSearchQuery("");
    // Initialize quantities to 0
    const initialQuants: Record<string, number> = {};
    invoice.items.forEach((item: any) => {
      initialQuants[item.productId] = 0;
    });
    setReturnQuantities(initialQuants);
  };

  const handleQuantityChange = (productId: string, val: number, max: number) => {
    const safeVal = Math.max(0, Math.min(val, max));
    setReturnQuantities(prev => ({ ...prev, [productId]: safeVal }));
  };

  const calculateReturnTotal = () => {
    if (!selectedInvoice) return 0;
    return selectedInvoice.items.reduce((sum, item) => {
      const gty = returnQuantities[item.productId] || 0;
      return sum + (gty * item.price);
    }, 0);
  };

  const handleConfirmReturn = async () => {
    if (!selectedInvoice) return;
    
    const returnItems = selectedInvoice.items
      .filter(item => returnQuantities[item.productId] > 0)
      .map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: returnQuantities[item.productId],
        price: item.price,
        total: item.price * returnQuantities[item.productId]
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
        date: new Date().toISOString().split('T')[0],
        status: "completed",
        items: returnItems
      });

      setIsRegisterOpen(false);
      setSelectedInvoice(null);
      setReturnReason("");
      setReturnQuantities({});
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Undo className="w-8 h-8 text-blue-600" />
            </div>
            {t("returns")}
          </h1>
          <p className="text-gray-500 mt-1">{t("comprehensiveSystem")}</p>
        </div>

        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 h-11 px-6 rounded-xl transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" />
              {t("addNewInvoice") || "تسجيل مرتجع جديد"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden rounded-2xl" dir="rtl">
            <DialogHeader className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <PackageCheck className="w-6 h-6" />
                {t("returns") || "تسجيل مرتجع"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {!selectedInvoice ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder={t("searchInvoicesPlaceholder") || "ابحث عن فاتورة برقمها أو اسم العميل..."}
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="pr-10 h-12 text-lg border-gray-200 focus:ring-blue-500 rounded-xl"
                    />
                  </div>
                  
                  {filteredInvoices.length > 0 && (
                    <div className="border rounded-xl divide-y bg-gray-50/50">
                      {filteredInvoices.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => handleSelectInvoice(inv)}
                          className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group"
                        >
                          <div className="text-right">
                            <p className="font-bold text-gray-900 group-hover:text-blue-700">#{inv.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">{inv.customerName}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-blue-600">{formatCurrency(inv.total)}</span>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-[-4px] transition-transform" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{t("invoiceNumber")}</p>
                      <p className="font-black text-blue-900 text-lg">#{selectedInvoice.invoiceNumber}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{t("customer")}</p>
                      <p className="font-bold text-blue-900">{selectedInvoice.customerName}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)} className="text-blue-600 hover:bg-blue-100">
                      {t("change") || "تغيير"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <p className="font-bold text-gray-700 flex items-center gap-2">
                       <FileText className="w-4 h-4" />
                       {t("invoiceItems") || "أجزاء الفاتورة المرتجعة"}
                    </p>
                    <ScrollArea className="h-[250px] rounded-xl border p-4 bg-white">
                      <div className="space-y-4">
                        {selectedInvoice.items.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{item.productName}</p>
                              <p className="text-sm text-gray-500">{formatCurrency(item.price)} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-600"
                                  onClick={() => handleQuantityChange(item.productId, (returnQuantities[item.productId] || 0) - 1, item.quantity)}
                                >-</Button>
                                <Input 
                                  type="number" 
                                  className="w-16 h-8 text-center border-none focus:ring-0 font-bold"
                                  value={returnQuantities[item.productId] || 0}
                                  onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0, item.quantity)}
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-600"
                                  onClick={() => handleQuantityChange(item.productId, (returnQuantities[item.productId] || 0) + 1, item.quantity)}
                                >+</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">{t("reason") || "سبب الارتجاع"}</label>
                    <Input 
                      placeholder={t("notes") || "مثلاً: منتج تالف، تغيير رأي..."}
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="h-12 border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {selectedInvoice && (
              <DialogFooter className="p-6 bg-gray-50 border-t flex items-center justify-between sm:justify-between w-full">
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">{t("total") || "إجمالي المرتجع"}</p>
                  <p className="text-2xl font-black text-blue-700">{formatCurrency(calculateReturnTotal())}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsRegisterOpen(false)} className="rounded-xl px-6 border-gray-300">
                    {t("cancel") || "إلغاء"}
                  </Button>
                  <Button 
                    onClick={handleConfirmReturn} 
                    disabled={calculateReturnTotal() <= 0}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 shadow-lg shadow-green-100"
                  >
                    {t("confirm") || "تأكيد المرتجع"}
                  </Button>
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm overflow-hidden rounded-2xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-11 bg-white border-gray-200 focus:ring-blue-500 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl border-none rounded-2xl overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-blue-100 text-sm font-bold uppercase tracking-wider opacity-80">{t("returns")}</p>
                <h3 className="text-4xl font-black mt-1">{filteredReturns.length}</h3>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-lg group-hover:scale-110 transition-transform">
                <Undo className="w-8 h-8 text-white" />
              </div>
            </div>
            {/* Decorative background shape */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </CardContent>
        </Card>
      </div>

      {/* Returns Table */}
      <Card className="shadow-xl border-none overflow-hidden flex-1 rounded-2xl bg-white">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <FileText className="w-6 h-6 text-blue-500" />
            {t("returns")}
            <Badge variant="secondary" className="mr-auto bg-blue-100 text-blue-700 border-none font-bold">
              {filteredReturns.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/30">
                  <TableHead className="text-right py-5 text-gray-600 font-bold"><Hash className="w-4 h-4 inline ml-1 opacity-70" /> {t("code")}</TableHead>
                  <TableHead className="text-right py-5 text-gray-600 font-bold"><User className="w-4 h-4 inline ml-1 opacity-70" /> {t("customerName")}</TableHead>
                  <TableHead className="text-right py-5 text-gray-600 font-bold"><Calendar className="w-4 h-4 inline ml-1 opacity-70" /> {t("date")}</TableHead>
                  <TableHead className="text-right py-5 text-gray-600 font-bold">{t("total")}</TableHead>
                  <TableHead className="text-right py-5 text-gray-600 font-bold">{t("status")}</TableHead>
                  <TableHead className="text-center py-5 text-gray-600 font-bold">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-500 font-bold text-lg">{t("loading")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <AlertCircle className="w-20 h-20 text-gray-300" />
                        <span className="text-gray-500 font-bold text-xl">{t("noData")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((item) => (
                    <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 group">
                      <TableCell className="font-mono text-blue-600 font-black text-base py-5">#{item.returnNumber}</TableCell>
                      <TableCell className="font-bold text-gray-800 py-5">{item.customerName}</TableCell>
                      <TableCell className="text-gray-500 font-medium py-5">{formatDate(item.date)}</TableCell>
                      <TableCell className="font-black text-emerald-600 text-lg py-5">{formatCurrency(item.total)}</TableCell>
                      <TableCell className="py-5">
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3 py-1 rounded-lg">
                          {t("completed") || "مكتمل"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-5">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDeleteId(item.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash className="w-5 h-5" />
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900">{t("deleteConfirmation")}</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600">
              {t("cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-3 mt-6">
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 px-8"
            >
              {t("confirm")}
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl h-11 px-6">{t("cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
