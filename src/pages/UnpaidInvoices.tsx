
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/utils/formatters";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
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
  Plus
} from "lucide-react";

export default function UnpaidInvoices() {
  const { t, locale, isRTL } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    const storeData = loadStoreData();
    const unpaidInvoices = storeData.invoices.filter(invoice => invoice.status === "pending");
    setInvoices(unpaidInvoices);
  }, []);

  const getFilteredInvoices = () => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPaymentMethod = paymentMethodFilter === "all" || invoice.paymentMethod === paymentMethodFilter;
      
      const matchesDate = dateFilter === "all" || invoice.date === dateFilter;
      
      return matchesSearch && matchesPaymentMethod && matchesDate;
    });
  };

  const filteredInvoices = getFilteredInvoices();
  const totalUnpaidAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const handleMarkAsPaid = (invoiceId: string) => {
    const storeData = loadStoreData();
    const updatedInvoices = storeData.invoices.map(invoice => {
      if (invoice.id === invoiceId) {
        const updatedProducts = storeData.products.map(product => {
          const invoiceItem = invoice.items.find(item => item.productId === product.id);
          if (invoiceItem && product.quantity >= invoiceItem.quantity) {
            return {
              ...product,
              quantity: product.quantity - invoiceItem.quantity,
              updatedAt: new Date().toISOString(),
            };
          }
          return product;
        });
        
        storeData.products = updatedProducts;
        
        return {
          ...invoice,
          status: "paid" as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return invoice;
    });
    
    storeData.invoices = updatedInvoices;
    saveStoreData(storeData);
    
    setInvoices(prevInvoices => 
      prevInvoices.filter(invoice => invoice.id !== invoiceId)
    );
    
    toast({
      title: t('invoiceUpdated'),
      description: t('invoicePaidStockDeducted'),
    });
  };

  const sendReminder = (invoice: Invoice) => {
    toast({
      title: t('reminderSent'),
      description: t('reminderSentDesc').replace('{name}', invoice.customerName),
    });
  };

  const getPaymentMethods = () => {
    const methods = [...new Set(invoices.map(invoice => invoice.paymentMethod))].filter(Boolean);
    return methods;
  };

  const getDaysOverdue = (invoiceDate: string) => {
    const today = new Date();
    const invoiceDateObj = new Date(invoiceDate);
    const diffTime = today.getTime() - invoiceDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={`space-y-6 p-6 ${locale === 'ar' ? 'font-arabic' : 'font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-600" />
          {t('unpaidInvoices')}
        </h1>
        <Link to="/create-invoice">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('addNewInvoice')}
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-red-50 to-pink-100 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 mb-1">{t('totalUnpaidAmountLabel')}</p>
              <p className="text-3xl font-bold text-red-700">
                {formatCurrency(totalUnpaidAmount)}
              </p>
              <p className="text-sm text-red-600 mt-1">
                {t('invoiceCount')}: {filteredInvoices.length}
              </p>
            </div>
            <div className="bg-red-200 p-4 rounded-full">
              <DollarSign className="w-8 h-8 text-red-700" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t('searchAndFilter')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-gray-400`} />
              <Input
                placeholder={t('searchInvoicesPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'}`}
                title={t('searchInvoicesPlaceholder')}
              />
            </div>
            
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger title={t('paymentMethod')}>
                <SelectValue placeholder={t('paymentMethod')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPaymentMethods')}</SelectItem>
                {getPaymentMethods().map((method) => (
                  <SelectItem key={method} value={method}>
                    {t(method as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full"
              title={t('date')}
            />

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setPaymentMethodFilter("all");
                setDateFilter("all");
              }}
            >
              {t('clearFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Invoices Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {t('unpaidInvoicesList')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('invoiceNumber')}</TableHead>
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('customerName')}</TableHead>
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('amount')}</TableHead>
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('paymentMethod')}</TableHead>
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('invoiceDate')}</TableHead>
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('daysOverdue')}</TableHead>
                  <TableHead className={`${isRTL ? 'text-right' : 'text-left'} font-semibold`}>{t('notes')}</TableHead>
                  <TableHead className="text-center font-semibold">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => {
                    const daysOverdue = getDaysOverdue(invoice.date);
                    return (
                      <TableRow key={invoice.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="font-mono">
                            {invoice.invoiceNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            {invoice.customerName}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-red-600">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            {t(invoice.paymentMethod as any)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {invoice.date}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={daysOverdue > 30 ? "destructive" : daysOverdue > 7 ? "secondary" : "outline"}
                            className={
                              daysOverdue > 30 
                                ? "bg-red-100 text-red-800" 
                                : daysOverdue > 7 
                                ? "bg-orange-100 text-orange-800" 
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {daysOverdue} {t('daysLabel')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                          {invoice.notes || t('noNotes')}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              title={t('convertToPaid')}
                            >
                              <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                              {t('convertToPaid')}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => sendReminder(invoice)}
                              title={t('sendReminder')}
                            >
                              <Bell className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                              {t('sendReminder')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm || paymentMethodFilter !== "all" || dateFilter !== "all" 
                        ? t('noInvoicesMatchCriteria')
                        : t('noUnpaidInvoices')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">{t('overdueMore30')}</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {filteredInvoices.filter(inv => getDaysOverdue(inv.date) > 30).length}
                </p>
              </div>
              <div className="bg-yellow-200 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-red-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">{t('overdue7to30')}</p>
                <p className="text-2xl font-bold text-orange-700">
                  {filteredInvoices.filter(inv => {
                    const days = getDaysOverdue(inv.date);
                    return days > 7 && days <= 30;
                  }).length}
                </p>
              </div>
              <div className="bg-orange-200 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">{t('recentInvoices7')}</p>
                <p className="text-2xl font-bold text-blue-700">
                  {filteredInvoices.filter(inv => getDaysOverdue(inv.date) <= 7).length}
                </p>
              </div>
              <div className="bg-blue-200 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
