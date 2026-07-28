import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, TrendingUp, DollarSign, Package } from "lucide-react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { Creditor } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import ExportActions from "@/components/shared/ExportActions";
import { getCreditors } from "@/lib/database";

export default function CreditorsOverview() {
  const navigate = useNavigate();
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const remoteCreditors = await getCreditors();
      const storeData = loadStoreData();
      const localCreditors: Creditor[] = storeData.creditors || [];

      const mappedRemote: Creditor[] = remoteCreditors.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        amount: c.amount || 0,
        notes: c.notes || "",
        productCode: c.product_code || "",
        productName: c.product_name || "",
        quantity: c.quantity || 0,
        price: c.price || 0,
        total: c.total || c.amount || 0,
        date: c.date || c.created_at || new Date().toISOString(),
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        status: c.status || 'pending'
      }));

      const remoteIds = new Set(mappedRemote.map((c) => c.id));
      const localOnly = localCreditors.filter((c) => !remoteIds.has(c.id));
      const merged = [...mappedRemote, ...localOnly];

      storeData.creditors = merged;
      saveStoreData(storeData);

      setCreditors(merged);
    } catch (err) {
      console.error("Failed to fetch creditors from Supabase:", err);
      const data = loadStoreData();
      setCreditors(data.creditors || []);
    } finally {
      setLoading(false);
    }
  };

  // تجميع المعاملات حسب الدائن (فقط المبالغ غير المسددة)
  const groupedCreditors = creditors.reduce((acc, creditor) => {
    const key = creditor.name;
    const isPaid = creditor.status === 'paid';
    
    if (!acc[key]) {
      acc[key] = {
        name: creditor.name,
        address: creditor.address || '',
        totalAmount: 0,
        products: []
      };
    }
    
    if (!isPaid) {
      acc[key].totalAmount += (creditor.total || creditor.amount || 0);
      acc[key].products.push(creditor);
    }
    
    return acc;
  }, {} as Record<string, { name: string; address: string; totalAmount: number; products: Creditor[] }>);

  const creditorsArray = Object.values(groupedCreditors).filter(c => c.totalAmount > 0 || creditors.some(cr => cr.name === c.name && cr.status === 'pending'));

  // حساب الإحصائيات
  const totalDebt = creditorsArray.reduce((sum, creditor) => sum + creditor.totalAmount, 0);
  const totalCreditors = creditorsArray.length;
  const averageDebt = totalCreditors > 0 ? totalDebt / totalCreditors : 0;
  const totalProducts = creditors.filter(c => c.status !== 'paid').length;

  // أعلى 10 دائنين
  const topCreditors = [...creditorsArray]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .filter(c => c.totalAmount > 0)
    .slice(0, 10)
    .map(creditor => ({
      name: creditor.name.length > 15 ? creditor.name.substring(0, 15) + '...' : creditor.name,
      amount: creditor.totalAmount
    }));

  // توزيع الديون حسب النطاق
  const debtRanges = [
    { range: 'أقل من 1000', count: 0, color: 'hsl(var(--chart-1))' },
    { range: '1000 - 5000', count: 0, color: 'hsl(var(--chart-2))' },
    { range: '5000 - 10000', count: 0, color: 'hsl(var(--chart-3))' },
    { range: 'أكثر من 10000', count: 0, color: 'hsl(var(--chart-4))' }
  ];

  creditorsArray.forEach(creditor => {
    const amount = creditor.totalAmount;
    if (amount === 0) return;
    if (amount < 1000) debtRanges[0].count++;
    else if (amount < 5000) debtRanges[1].count++;
    else if (amount < 10000) debtRanges[2].count++;
    else debtRanges[3].count++;
  });

  // بيانات التصدير
  const exportData = creditorsArray.map(creditor => ({
    name: creditor.name,
    address: creditor.address,
    totalAmount: creditor.totalAmount,
    productsCount: creditor.products.length
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/creditors')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">ملخص شامل للدائنين</h1>
            <p className="text-muted-foreground mt-1">تحليل متقدم وإحصائيات شاملة</p>
          </div>
        </div>
        <ExportActions
          data={exportData}
          filename="ملخص_الدائنين"
          title="ملخص شامل للدائنين"
          columns={[
            { key: 'name', header: 'اسم الدائن' },
            { key: 'address', header: 'العنوان' },
            { 
              key: 'totalAmount', 
              header: 'إجمالي الديون',
              render: (item: any) => formatCurrency(item.totalAmount)
            },
            { key: 'productsCount', header: 'عدد المنتجات' }
          ]}
          totals={{
            totalDebit: totalDebt,
            totalCredit: 0,
            finalBalance: -totalDebt
          }}
        />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              عدد الدائنين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalCreditors}</div>
            <p className="text-xs text-muted-foreground mt-2">إجمالي الدائنين المسجلين</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              إجمالي الديون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{formatCurrency(totalDebt)}</div>
            <p className="text-xs text-muted-foreground mt-2">مجموع جميع الديون</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              متوسط الديون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(averageDebt)}</div>
            <p className="text-xs text-muted-foreground mt-2">متوسط الدين لكل دائن</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              إجمالي المنتجات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-2">عدد المنتجات المسجلة</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Creditors Chart */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              أعلى 10 دائنين
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {topCreditors.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topCreditors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--foreground))" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    stroke="hsl(var(--foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debt Distribution Chart */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              توزيع الديون حسب النطاق
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {debtRanges.some(range => range.count > 0) ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={debtRanges}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.range}: ${entry.count}`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {debtRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed List */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            قائمة الدائنين التفصيلية
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-3 px-4 font-semibold text-foreground">#</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">اسم الدائن</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">العنوان</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">عدد المنتجات</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">إجمالي الديون</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {creditorsArray
                  .sort((a, b) => b.totalAmount - a.totalAmount)
                  .map((creditor, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{creditor.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{creditor.address}</td>
                      <td className="py-3 px-4 text-muted-foreground">{creditor.products.length}</td>
                      <td className="py-3 px-4 font-semibold text-destructive">
                        {formatCurrency(creditor.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/creditors/${creditor.name}`)}
                        >
                          عرض التفاصيل
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {creditorsArray.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد بيانات للعرض
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
