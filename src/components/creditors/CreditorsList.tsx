
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { 
  Edit, 
  Trash2, 
  User, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { Creditor, Customer } from "@/types";
import CustomerSelector from "@/components/invoice/CustomerSelector";
import ExportActions from "@/components/shared/ExportActions";
import { Badge } from "@/components/ui/badge";

interface CreditorsListProps {
  creditors: Creditor[];
  customers: Customer[];
  editId: string | null;
  editForm: any;
  selectedEditCustomer: Customer | null;
  deleteId: string | null;
  onEdit: (creditor: Creditor) => void;
  onEditSubmit: (id: string) => void;
  onEditCancel: () => void;
  onEditFormChange: (field: string, value: string) => void;
  onEditCustomerChange: (customerId: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus?: (id: string, currentStatus: 'pending' | 'paid') => void;
  setDeleteId: (id: string | null) => void;
}

const CreditorsList = ({
  creditors,
  customers,
  editId,
  editForm,
  selectedEditCustomer,
  deleteId,
  onEdit,
  onEditSubmit,
  onEditCancel,
  onEditFormChange,
  onEditCustomerChange,
  onDelete,
  onToggleStatus,
  setDeleteId
}: CreditorsListProps) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (creditorId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(creditorId)) {
      newExpandedRows.delete(creditorId);
    } else {
      newExpandedRows.add(creditorId);
    }
    setExpandedRows(newExpandedRows);
  };

  const exportColumns = [
    { key: 'name', header: 'اسم الدائن' },
    { key: 'productCode', header: 'رمز المنتج' },
    { key: 'productName', header: 'اسم المنتج' },
    { key: 'quantity', header: 'الكمية' },
    { 
      key: 'status', 
      header: 'الحالة',
      render: (creditor: Creditor) => creditor.status === 'paid' ? 'تم التسديد' : 'قيد الانتظار'
    },
    { 
      key: 'date', 
      header: 'التاريخ',
      render: (creditor: Creditor) => formatDate(creditor.date)
    },
    { 
      key: 'price', 
      header: 'السعر',
      render: (creditor: Creditor) => formatCurrency(creditor.price || 0)
    }
  ];

  // Group creditors by customer name to show all products for each creditor
  const groupedCreditors = creditors.reduce((acc, creditor) => {
    const key = creditor.name;
    if (!acc[key]) {
      acc[key] = {
        id: creditor.id,
        name: creditor.name,
        date: creditor.date,
        products: [],
        totalAmount: 0, // Pending
        totalPaid: 0
      };
    }

    const amount = (creditor.total || creditor.amount || 0);
    const isPaid = creditor.status === 'paid';

    acc[key].products.push({
      id: creditor.id,
      productCode: creditor.productCode || '',
      productName: creditor.productName || '',
      quantity: creditor.quantity || 0,
      price: creditor.price || 0,
      total: amount,
      date: creditor.date,
      status: creditor.status || 'pending'
    });

    if (isPaid) {
      acc[key].totalPaid += amount;
    } else {
      acc[key].totalAmount += amount;
    }
    
    // Keep the most recent date
    if (new Date(creditor.date || 0) > new Date(acc[key].date || 0)) {
      acc[key].date = creditor.date;
    }
    return acc;
  }, {} as Record<string, any>);

  const groupedCreditorsArray = Object.values(groupedCreditors);

  return (
    <div className="space-y-4">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              قائمة الدائنين ({groupedCreditorsArray.length})
            </CardTitle>
            <ExportActions
              data={creditors}
              filename="الدائنين"
              title="قائمة الدائنين"
              columns={exportColumns}
            />
          </div>
        </CardHeader>
      </Card>

      {creditors.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">لا توجد دائنين مسجلين حتى الآن</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groupedCreditorsArray.map((creditor: any) => (
            <Card key={creditor.id} className={`shadow-md transition-shadow border-2 ${creditor.totalAmount === 0 ? 'bg-gray-50 border-green-100 opacity-90' : 'border-border hover:shadow-lg'}`}>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 
                            className="text-xl font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                            onClick={() => navigate(`/creditors/${encodeURIComponent(creditor.name)}`)}
                          >
                            {creditor.name}
                          </h3>
                          {creditor.totalAmount === 0 && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                              تم تسديد الكل
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/creditors/${encodeURIComponent(creditor.name)}`)}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-center md:text-right">
                      <div className="bg-white/70 rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground mb-1">عدد المنتجات</p>
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="text-lg font-bold">{creditor.products.length}</span>
                        </div>
                      </div>
                      
                      <div className="bg-white/70 rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground mb-1">المبلغ المتبقي</p>
                        <p className={`text-lg font-bold ${creditor.totalAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(creditor.totalAmount)}
                        </p>
                      </div>
                      
                      <div className="bg-white/70 rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground mb-1">آخر تاريخ</p>
                        <p className="text-sm font-medium">{formatDate(creditor.date)}</p>
                      </div>
                      
                      <div className="bg-white/70 rounded-lg p-3 border flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onEdit(creditor)} 
                          disabled={creditor.totalAmount === 0}
                          title="تعديل"
                          className="h-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setDeleteId(creditor.id)} 
                          title="حذف"
                          className="h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleRowExpansion(creditor.id)}
                    className="shrink-0"
                  >
                    {expandedRows.has(creditor.id) ? 
                      <ChevronUp className="w-5 h-5" /> : 
                      <ChevronDown className="w-5 h-5" />
                    }
                  </Button>
                </div>
              </CardHeader>

              {expandedRows.has(creditor.id) && (
                <CardContent className="pt-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <Package className="w-4 h-4" />
                      تفاصيل المنتجات والنشاطات
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-background">
                            <th className="text-right p-3 font-medium border">الحالة</th>
                            <th className="text-right p-3 font-medium border">رمز المنتج</th>
                            <th className="text-right p-3 font-medium border">اسم المنتج</th>
                            <th className="text-center p-3 font-medium border">الكمية</th>
                            <th className="text-center p-3 font-medium border">إجمالي المبلغ</th>
                            <th className="text-center p-3 font-medium border">التاريخ</th>
                            <th className="text-center p-3 font-medium border">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditor.products.map((product: any, index: number) => (
                            <tr key={product.id || index} className={`bg-background hover:bg-muted/50 transition-colors ${product.status === 'paid' ? 'opacity-70 bg-green-50/20' : ''}`}>
                              <td className="p-3 border text-center">
                                {product.status === 'paid' ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle2 className="w-3 h-3 ml-1" /> تم التسديد
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                    <Clock className="w-3 h-3 ml-1" /> قيد الانتظار
                                  </Badge>
                                )}
                              </td>
                              <td className={`p-3 border font-medium ${product.status === 'paid' ? 'text-muted-foreground' : 'text-primary'}`}>
                                {product.productCode}
                              </td>
                              <td className={`p-3 border ${product.status === 'paid' ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                                {product.productName}
                              </td>
                              <td className="p-3 border text-center">
                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${product.status === 'paid' ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'}`}>
                                  {product.quantity}
                                </span>
                              </td>
                              <td className={`p-3 border text-center font-bold ${product.status === 'paid' ? 'text-green-600' : 'text-destructive'}`}>
                                {formatCurrency(product.total)}
                              </td>
                              <td className="p-3 border text-center text-muted-foreground text-xs">
                                {formatDate(product.date)}
                              </td>
                              <td className="p-2 border text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onToggleStatus && onToggleStatus(product.id, product.status)}
                                  className={`h-7 px-2 text-[10px] ${product.status === 'paid' ? 'text-amber-600' : 'text-green-600'}`}
                                >
                                  {product.status === 'paid' ? 'إلغاء' : 'تسديد'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-primary/5">
                            <td colSpan={4} className="p-3 border font-bold text-right text-xs">
                              المبلغ المتبقي / المبلغ المدفوع:
                            </td>
                            <td className="p-3 border text-center font-bold text-lg">
                              <div className="flex flex-col">
                                <span className="text-destructive">{formatCurrency(creditor.totalAmount)}</span>
                                <span className="text-xs text-green-600 mt-1">مدفوع: {formatCurrency(creditor.totalPaid)}</span>
                              </div>
                            </td>
                            <td colSpan={2} className="p-3 border"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </CardContent>
              )}

              {deleteId === creditor.id && (
                <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <Card className="min-w-[350px] mx-4 shadow-2xl">
                    <CardHeader className="bg-destructive/10">
                      <CardTitle className="text-destructive flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        تأكيد الحذف
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-foreground mb-6">
                        هل أنت متأكد من حذف الدائن <strong>{creditor.name}</strong> وجميع نشاطاته؟
                      </p>
                      <div className="flex gap-3 justify-end">
                        <Button 
                          variant="destructive" 
                          onClick={() => onDelete(creditor.id)}
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          حذف
                        </Button>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>
                          إلغاء
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreditorsList;
