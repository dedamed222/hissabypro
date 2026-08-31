import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  Edit,
  Trash2,
  User,
  Package,
  ChevronDown,
  ChevronLeft,
  Phone,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Bell
} from "lucide-react";
import type { Debtor } from "@/types";
import ExportActions from "@/components/shared/ExportActions";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface DebtorsListProps {
  debtors: Debtor[];
  onEdit: (debtor: Debtor) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: 'pending' | 'paid') => void;
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
}

const DebtorsList = ({ debtors, onEdit, onDelete, onToggleStatus, deleteId, setDeleteId }: DebtorsListProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { sendNotification } = usePushNotifications();

  const toggleRowExpansion = (debtorId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(debtorId)) {
      newExpandedRows.delete(debtorId);
    } else {
      newExpandedRows.add(debtorId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Group debtors by customer (name + phone) to consolidate multiple transactions
  const groupedDebtors = debtors.reduce((acc, debtor) => {
    const key = `${debtor.name || debtor.debtorName}_${debtor.phone}`;
    if (!acc[key]) {
      acc[key] = {
        id: debtor.id,
        name: debtor.name || debtor.debtorName || '',
        phone: debtor.phone,
        date: debtor.date,
        notes: debtor.notes,
        transactions: [],
        totalAmount: 0, // Total remaining debt
        totalPaid: 0,
        totalProducts: 0
      };
    }

    // Extract products from this debtor
    let debtorProducts = [];
    if (Array.isArray(debtor.products) && debtor.products.length > 0) {
      debtorProducts = debtor.products;
    } else if (debtor.productCode) {
      // Legacy format
      debtorProducts = [{
        productId: debtor.id,
        productCode: debtor.productCode,
        productName: debtor.productName || '',
        quantity: debtor.quantity || 0,
        price: debtor.productPrice || 0,
        total: (debtor.quantity || 0) * (debtor.productPrice || 0)
      }];
    }

    const amount = (debtor.totalAmount || debtor.amount || 0);
    const isPaid = debtor.status === 'paid';

    acc[key].transactions.push({
      id: debtor.id,
      date: debtor.date,
      products: debtorProducts,
      amount: amount,
      status: debtor.status || 'pending'
    });

    if (isPaid) {
      acc[key].totalPaid += amount;
    } else {
      acc[key].totalAmount += amount;
    }

    acc[key].totalProducts += debtorProducts.length;

    // Keep the most recent date
    if (new Date(debtor.date || 0) > new Date(acc[key].date || 0)) {
      acc[key].date = debtor.date;
    }

    return acc;
  }, {} as Record<string, any>);

  const groupedDebtorsArray = Object.values(groupedDebtors);

  const exportColumns = [
    { key: 'name', header: 'اسم المدين' },
    { key: 'phone', header: 'الهاتف' },
    {
      key: 'productsCount',
      header: 'عدد المنتجات',
      render: (debtor: Debtor) => String(Array.isArray(debtor.products) ? debtor.products.length : 1)
    },
    {
      key: 'totalAmount',
      header: 'المبلغ المتبقي',
      render: (debtor: Debtor) => formatCurrency(debtor.totalAmount || debtor.amount || 0)
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (debtor: Debtor) => debtor.status === 'paid' ? 'تم التسديد' : 'قيد الانتظار'
    },
    {
      key: 'date',
      header: 'التاريخ',
      render: (debtor: Debtor) => formatDate(debtor.date)
    },
    { key: 'notes', header: 'ملاحظات' }
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            قائمة المديونين
          </CardTitle>
          <ExportActions
            data={debtors}
            filename="المديونين"
            title="قائمة المديونين"
            columns={exportColumns}
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {groupedDebtorsArray.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد مديونين مسجلين حتى الآن</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {groupedDebtorsArray.map((debtor: any) => {
              const debtorKey = debtor.id;
              const isExpanded = expandedRows.has(debtorKey);

              return (
                <Card key={debtorKey} className={`border-2 transition-colors ${debtor.totalAmount === 0 ? 'bg-gray-50 border-green-100 opacity-80' : 'hover:border-primary/50'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(debtorKey)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-semibold">
                              {debtor.name}
                            </CardTitle>
                            {debtor.totalAmount === 0 && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                تم تسديد الكل
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{debtor.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ExportActions
                          data={debtor.transactions.flatMap((tx: any) =>
                            tx.products.map((product: any) => ({
                              productName: product.productName,
                              productCode: product.productCode,
                              quantity: product.quantity,
                              price: product.price,
                              total: product.total,
                              date: tx.date,
                              status: tx.status
                            }))
                          )}
                          filename={`المدين_${debtor.name}`}
                          title={`نشاطات المدين: ${debtor.name}`}
                          columns={[
                            { key: 'productName', header: 'اسم المنتج' },
                            { key: 'productCode', header: 'كود المنتج' },
                            { key: 'quantity', header: 'الكمية' },
                            {
                              key: 'price',
                              header: 'السعر',
                              render: (item: any) => formatCurrency(item.price)
                            },
                            {
                              key: 'total',
                              header: 'الإجمالي',
                              render: (item: any) => formatCurrency(item.total)
                            },
                            {
                              key: 'status',
                              header: 'الحالة',
                              render: (item: any) => item.status === 'paid' ? 'تم التسديد' : 'قيد الانتظار'
                            },
                            {
                              key: 'date',
                              header: 'التاريخ',
                              render: (item: any) => formatDate(item.date)
                            }
                          ]}
                          customerInfo={{
                            name: debtor.name,
                            phone: debtor.phone
                          }}
                          totals={{
                            totalQuantity: debtor.transactions.flatMap((tx: any) => tx.products).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0),
                            totalDebit: debtor.totalAmount + debtor.totalPaid,
                            totalCredit: debtor.totalPaid,
                            finalBalance: -debtor.totalAmount
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const actualDebtor = debtors.find(d =>
                              (d.name || d.debtorName) === debtor.name && d.phone === debtor.phone
                            );
                            if (actualDebtor) onEdit(actualDebtor);
                          }}
                          className="h-8 w-8 p-0"
                          disabled={debtor.totalAmount === 0}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            sendNotification(
                              "تذكير بالدين ⏰",
                              `تذكير: المدين ${debtor.name} عليه مبلغ ${formatCurrency(debtor.totalAmount)}`
                            );
                          }}
                          className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600"
                          disabled={debtor.totalAmount === 0}
                          title="إرسال تذكير"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(debtor.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center md:text-right">
                      <div className="flex flex-col md:flex-row items-center gap-2 text-sm justify-center md:justify-start">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center md:text-right">
                          <div className="text-xs text-muted-foreground">المنتجات</div>
                          <div className="font-semibold">{debtor.totalProducts}</div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-2 text-sm justify-center md:justify-start">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center md:text-right">
                          <div className="text-xs text-muted-foreground">المبلغ المتبقي</div>
                          <div className={`font-semibold ${debtor.totalAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(debtor.totalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-2 text-sm justify-center md:justify-start">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center md:text-right">
                          <div className="text-xs text-muted-foreground">آخر نشاط</div>
                          <div className="font-semibold">
                            {formatDate(debtor.date)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold mb-3 text-sm">تفاصيل النشاطات</h4>
                        <div className="space-y-3">
                          {debtor.transactions.map((transaction: any, txIndex: number) => (
                            <div key={transaction.id} className={`border rounded-lg p-3 ${transaction.status === 'paid' ? 'bg-green-50/50 border-green-100' : 'bg-muted/30'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="text-sm font-medium">
                                    {formatDate(transaction.date)}
                                  </div>
                                  {transaction.status === 'paid' ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      تم التسديد
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                      <Clock className="w-3 h-3 mr-1" />
                                      قيد الانتظار
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className={`font-semibold ${transaction.status === 'paid' ? 'text-green-600' : 'text-destructive'}`}>
                                    {formatCurrency(transaction.amount)}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onToggleStatus && onToggleStatus(transaction.id, transaction.status)}
                                    className={`h-8 px-2 text-xs flex gap-1 ${transaction.status === 'paid' ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}
                                  >
                                    {transaction.status === 'paid' ? (
                                      <>إلغاء التسديد</>
                                    ) : (
                                      <><CheckCircle2 className="w-3 h-3" /> تم التسديد</>
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {transaction.products.map((product: any, pIdx: number) => (
                                  <div key={pIdx} className="flex justify-between items-center text-sm bg-white rounded p-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <Package className="h-3 w-3 text-muted-foreground" />
                                      <span className={transaction.status === 'paid' ? 'text-muted-foreground line-through' : 'font-medium'}>
                                        {product.productName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span>الكمية: {product.quantity}</span>
                                      <span>السعر: {formatCurrency(product.price)}</span>
                                      <span className={`font-semibold ${transaction.status === 'paid' ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        الإجمالي: {formatCurrency(product.total)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex-1">
                              <span className="font-bold text-sm">إجمالي المبلغ المدفوع:</span>
                              <span className="block text-green-600 font-bold">{formatCurrency(debtor.totalPaid)}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <span className="font-bold text-sm">المجموع المتبقي:</span>
                              <span className="block text-primary text-lg font-bold">
                                {formatCurrency(debtor.totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {deleteId && (
          <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-lg shadow-xl p-6 flex flex-col gap-4 min-w-[350px] mx-4">
              <h3 className="text-lg font-semibold text-destructive">تأكيد الحذف</h3>
              <p className="text-muted-foreground">هل أنت متأكد من حذف جميع معاملات هذا المدين؟</p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="destructive"
                  onClick={() => {
                    const debtor = groupedDebtorsArray.find(d => d.id === deleteId);
                    if (debtor) {
                      debtor.transactions.forEach((tx: any) => {
                        onDelete(tx.id);
                      });
                    }
                    setDeleteId(null);
                  }}
                >
                  حذف الكل
                </Button>
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebtorsList;
