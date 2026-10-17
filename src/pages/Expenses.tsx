import { useState } from "react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import {
  Plus,
  AlertCircle,
  Edit,
  Trash2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Calendar,
  Tag,
  Receipt,
  Wallet
} from "lucide-react";
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
  const filteredExpenses = (data.expenses || []).filter(expense => expense.date.startsWith(dateFilter));
  const dailyExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);

  // Calculate daily sales for the same date
  const filteredSales = (data.dailySales || []).filter(sale => sale.date.startsWith(dateFilter));
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
      storeData.expenses = [...(storeData.expenses || []), newExpense];
      saveStoreData(storeData);

      setDescription("");
      setAmount("");
      setCategory("general");
      setPaymentMethod("cash");
      setRefreshKey(prev => prev + 1);
      toast({
        title: "تمت الإضافة",
        description: "تم تسجيل المصروف اليومي بنجاح"
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

  const getCategoryDisplayName = (cat: string) => {
    const categoryMap: Record<string, string> = {
      general: "عام",
      utilities: "فواتير ومرافق",
      salary: "رواتب وعمالة",
      rent: "إيجار المحل",
      supplies: "مستلزمات وتجهيز"
    };
    return categoryMap[cat] || cat;
  };

  const getPaymentMethodDisplayName = (method: string) => {
    return method === "cash" ? "نقداً" : method;
  };

  return (
    <div className="space-y-6 pb-20" key={refreshKey}>
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <Receipt size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">المصروفات اليومية</h1>
            <p className="text-xs text-slate-500">
              تسجيل وضبط النفقات اليومية، الرواتب، الفواتير واحتساب صافي الأرباح
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent outline-none font-sans"
          />
        </div>
      </div>

      {/* ── KPI Daily Financial Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">إجمالي المبيعات اليومية</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{formatCurrency(dailySales)}</h3>
            <p className="text-[11px] font-bold text-blue-600 mt-0.5">واردات اليوم</p>
          </div>
        </div>

        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">إجمالي المصروفات اليومية</p>
            <h3 className="text-xl font-black text-rose-600 mt-0.5 font-sans">{formatCurrency(dailyExpenses)}</h3>
            <p className="text-[11px] font-bold text-rose-500 mt-0.5">{filteredExpenses.length} بنود مسجلة</p>
          </div>
        </div>

        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">صافي الربح اليومي</p>
            <h3 className={`text-xl font-black mt-0.5 font-sans ${
              netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {formatCurrency(netProfit)}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">المبيعات - المصروفات</p>
          </div>
        </div>
      </div>

      {/* ── Add Expense Form Card ── */}
      <div className="gsc-card p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus size={16} className="text-blue-600" />
          <span>إضافة قيد مصروف جديد</span>
        </h2>

        {error && (
          <div className="mb-4 bg-rose-50 text-rose-600 px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">بيان المصروف</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="مثال: فاتورة كهرباء، شراء أدوات تنظيف..."
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المبلغ المطلوب</label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الفئة</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            >
              <option value="general">عام</option>
              <option value="utilities">مرافق وفواتير</option>
              <option value="salary">رواتب وعمالة</option>
              <option value="rent">إيجار</option>
              <option value="supplies">مستلزمات</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            >
              <option value="cash">نقداً</option>
              <option value="BANKILY">بنكيلي (BANKILY)</option>
              <option value="MASRVI">مصرفي (MASRVI)</option>
              <option value="SEDAD">سداد (SEDAD)</option>
              <option value="BIMBANK">بيم بنك (BIMBANK)</option>
              <option value="BCIPAY">بي سي آي باي (BCIPAY)</option>
              <option value="CLICK">كليك (CLICK)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              onClick={handleAddExpense}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>تسجيل المصروف في اليومية</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Expenses Log Table ── */}
      <div className="gsc-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Receipt size={16} className="text-slate-500" />
            <span>بيان المصروفات المسجلة لهذا اليوم ({filteredExpenses.length})</span>
          </h3>
          <span className="text-xs font-bold text-slate-500 font-sans">
            الإجمالي: {formatCurrency(dailyExpenses)}
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Receipt size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">لا توجد مصروفات مسجلة</h4>
            <p className="text-xs text-slate-400">لم يتم إضافة أي مصروفات لتاريخ {dateFilter}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">بيان المصروف</th>
                  <th className="py-3.5 px-4 text-center">الفئة</th>
                  <th className="py-3.5 px-4 text-center">طريقة الدفع</th>
                  <th className="py-3.5 px-4 text-left">المبلغ</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {expense.description}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <Tag size={10} />
                        {getCategoryDisplayName(expense.category || "general")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                        <Wallet size={11} />
                        {getPaymentMethodDisplayName(expense.paymentMethod || "cash")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-left font-black text-rose-600 font-sans text-base">
                      {formatCurrency(expense.amount)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingExpense(expense)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseEditModal
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={handleRefresh}
      />

      <ExpenseDeleteModal
        expense={deletingExpense}
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onDelete={handleRefresh}
      />
    </div>
  );
}