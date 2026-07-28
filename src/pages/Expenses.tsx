import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { Plus, AlertCircle, Edit, Trash } from "lucide-react";
import { Expense } from "@/types";
import { ExpenseEditModal } from "@/components/expenses/ExpenseEditModal";
import { ExpenseDeleteModal } from "@/components/expenses/ExpenseDeleteModal";
import { toast } from "@/hooks/use-toast";
export default function Expenses() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "BANKILY" | "MASRVI" | "SEDAD" | "BIMBANK" | "BCIPAY" | "CLICK">("cash");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const data = loadStoreData();
  const filteredExpenses = data.expenses.filter(expense => expense.date.startsWith(dateFilter));
  const dailyExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);

  // Calculate daily sales for the same date
  const filteredSales = data.dailySales.filter(sale => sale.date.startsWith(dateFilter));
  const dailySales = filteredSales.reduce((acc, sale) => acc + sale.total, 0);

  // Calculate net profit (sales - expenses)
  const netProfit = dailySales - dailyExpenses;
  const handleAddExpense = () => {
    if (!description.trim()) {
      setError("يرجى إدخال وصف المصروف");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("يرجى إدخال مبلغ صحيح");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const storeData = loadStoreData();
      const newExpense: Expense = {
        id: generateId(),
        description: description.trim(),
        amount: Number(amount),
        category,
        paymentMethod,
        reference: "",
        date: dateFilter,
        createdAt: new Date().toISOString()
      };
      storeData.expenses = [...storeData.expenses, newExpense];
      saveStoreData(storeData);

      // Reset form
      setDescription("");
      setAmount("");
      setCategory("general");
      setPaymentMethod("cash");
      setRefreshKey(prev => prev + 1);
      toast({
        title: "تمت الإضافة",
        description: "تم إضافة المصروف بنجاح"
      });
    } catch (err) {
      console.error("Error adding expense:", err);
      setError("حدث خطأ أثناء إضافة المصروف");
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: {
      [key: string]: string;
    } = {
      general: "عام",
      utilities: "مرافق",
      salary: "رواتب",
      rent: "إيجار",
      supplies: "مستلزمات"
    };
    return categoryMap[category] || category;
  };
  const getPaymentMethodDisplayName = (method: string) => {
    return method === "cash" ? "نقداً" : method;
  };
  return <div className="space-y-6" key={refreshKey}>
      <div className="flex items-center justify-between mb-6 mx-[30px]">
        <h1 className="text-2xl font-bold">المصروفات اليومية</h1>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border rounded p-2" />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>إضافة مصروف جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">الوصف</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف المصروف" />
              </div>
              
              <div>
                <label className="block mb-1">المبلغ</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              
              <div>
                <label className="block mb-1">الفئة</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded">
                  <option value="general">عام</option>
                  <option value="utilities">مرافق</option>
                  <option value="salary">رواتب</option>
                  <option value="rent">إيجار</option>
                  <option value="supplies">مستلزمات</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-1">طريقة الدفع</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)} className="w-full p-2 border rounded">
                  <option value="cash">نقداً</option>
                  <option value="BANKILY">BANKILY</option>
                  <option value="MASRVI">MASRVI</option>
                  <option value="SEDAD">SEDAD</option>
                  <option value="BIMBANK">BIMBANK</option>
                  <option value="BCIPAY">BCIPAY</option>
                  <option value="CLICK">CLICK</option>
                </select>
              </div>
            </div>
            
            <Button onClick={handleAddExpense} disabled={loading} className="w-full md:w-auto">
              <Plus className="mr-2" size={18} />
              إضافة مصروف
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">إجمالي المبيعات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(dailySales)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">إجمالي المصروفات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(dailyExpenses)}</div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>
              صافي الربح اليومي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              المبيعات - المصروفات
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map(expense => <TableRow key={expense.id}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{getCategoryDisplayName(expense.category || "general")}</TableCell>
                    <TableCell>{getPaymentMethodDisplayName(expense.paymentMethod || "cash")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingExpense(expense)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDeletingExpense(expense)}>
                          <Trash size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
                {filteredExpenses.length === 0 && <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      لا توجد مصروفات لهذا التاريخ
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ExpenseEditModal expense={editingExpense} isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} onUpdate={handleRefresh} />

      <ExpenseDeleteModal expense={deletingExpense} isOpen={!!deletingExpense} onClose={() => setDeletingExpense(null)} onDelete={handleRefresh} />
    </div>;
}