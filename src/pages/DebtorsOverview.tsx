import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, TrendingUp, Users, Package, DollarSign, CalendarIcon, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { Debtor } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ExportActions from "@/components/shared/ExportActions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDebtors } from "@/lib/database";

const DebtorsOverview = () => {
  const navigate = useNavigate();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [stats, setStats] = useState({
    totalDebt: 0,
    totalDebtors: 0,
    averageDebt: 0,
    totalProducts: 0
  });

  useEffect(() => {
    const fetchAndFilter = async () => {
      // Fetch from Supabase first, then merge with localStorage
      let allDebtors: Debtor[] = [];
      try {
        const remoteDebtors = await getDebtors();
        const storeData = loadStoreData();
        const localDebtors: Debtor[] = storeData.debtors || [];

        const mappedRemote: Debtor[] = remoteDebtors.map((d: any) => ({
          id: d.id,
          name: d.name,
          debtorName: d.name,
          phone: d.phone || "",
          products: Array.isArray(d.products) ? d.products : [],
          totalAmount: d.total_amount || 0,
          amount: d.total_amount || 0,
          notes: d.notes || "",
          date: d.date || d.created_at || new Date().toISOString(),
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          status: d.status || 'pending'
        }));

        const remoteIds = new Set(mappedRemote.map((d) => d.id));
        const localOnly = localDebtors.filter((d) => !remoteIds.has(d.id));
        allDebtors = [...mappedRemote, ...localOnly];

        // Update localStorage
        storeData.debtors = allDebtors;
        saveStoreData(storeData);
      } catch (err) {
        console.error("Failed to fetch debtors from Supabase:", err);
        const storeData = loadStoreData();
        allDebtors = storeData.debtors || [];
      }

      let debtorsList = allDebtors;
      
      // Filter by date range if dates are selected
      if (startDate || endDate) {
        debtorsList = debtorsList.filter((debtor: Debtor) => {
          const debtorDate = new Date(debtor.date);
          if (startDate && endDate) {
            return debtorDate >= startDate && debtorDate <= endDate;
          } else if (startDate) {
            return debtorDate >= startDate;
          } else if (endDate) {
            return debtorDate <= endDate;
          }
          return true;
        });
      }
      
      setDebtors(debtorsList);

      // Group debtors by customer to get accurate statistics
      const groupedDebtors = debtorsList.reduce((acc, debtor) => {
        const key = `${debtor.name || debtor.debtorName}_${debtor.phone}`;
        const isPaid = debtor.status === 'paid';
        
        if (!acc[key]) {
          acc[key] = {
            name: debtor.name || debtor.debtorName || '',
            phone: debtor.phone,
            totalAmount: 0,
            totalProducts: 0
          };
        }
        
        // Only count pending debts in the total overview
        if (!isPaid) {
          let debtorProducts = [];
          if (Array.isArray(debtor.products) && debtor.products.length > 0) {
            debtorProducts = debtor.products;
          } else if (debtor.productCode) {
            debtorProducts = [{
              productId: debtor.id,
              productCode: debtor.productCode,
              productName: debtor.productName || '',
              quantity: debtor.quantity || 0,
              price: debtor.productPrice || 0,
              total: (debtor.quantity || 0) * (debtor.productPrice || 0)
            }];
          }

          acc[key].totalAmount += (debtor.totalAmount || debtor.amount || 0);
          acc[key].totalProducts += debtorProducts.length;
        }
        
        return acc;
      }, {} as Record<string, any>);

      const groupedDebtorsArray = Object.values(groupedDebtors);

      // Calculate statistics
      const totalDebt = groupedDebtorsArray.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalDebtors = groupedDebtorsArray.filter(d => d.totalAmount > 0).length;
      const averageDebt = totalDebtors > 0 ? totalDebt / totalDebtors : 0;
      const totalProducts = groupedDebtorsArray.reduce((sum, d) => sum + d.totalProducts, 0);

      setStats({
        totalDebt,
        totalDebtors,
        averageDebt,
        totalProducts
      });
    };
    fetchAndFilter();
  }, [startDate, endDate]);

  // Group debtors for charts
  const groupedDebtors = debtors.reduce((acc, debtor) => {
    const key = `${debtor.name || debtor.debtorName}_${debtor.phone}`;
    const isPaid = debtor.status === 'paid';
    
    if (isPaid) return acc; // Skip paid in charts

    if (!acc[key]) {
      acc[key] = {
        name: debtor.name || debtor.debtorName || '',
        phone: debtor.phone,
        totalAmount: 0
      };
    }
    acc[key].totalAmount += (debtor.totalAmount || debtor.amount || 0);
    return acc;
  }, {} as Record<string, any>);

  const groupedDebtorsArray = Object.values(groupedDebtors);

  // Top 10 debtors by amount
  const topDebtors = [...groupedDebtorsArray]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .map(d => ({
      name: d.name,
      amount: d.totalAmount
    }));

  // Debt distribution
  const debtRanges = [
    { range: "أقل من 10,000", min: 0, max: 10000, count: 0 },
    { range: "10,000 - 50,000", min: 10000, max: 50000, count: 0 },
    { range: "50,000 - 100,000", min: 50000, max: 100000, count: 0 },
    { range: "100,000 - 500,000", min: 100000, max: 500000, count: 0 },
    { range: "أكثر من 500,000", min: 500000, max: Infinity, count: 0 }
  ];

  groupedDebtorsArray.forEach(debtor => {
    const range = debtRanges.find(r => debtor.totalAmount >= r.min && debtor.totalAmount < r.max);
    if (range) range.count++;
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportData = groupedDebtorsArray.map(d => ({
    name: d.name,
    phone: d.phone,
    totalAmount: d.totalAmount
  }));

  const exportColumns = [
    { key: 'name', header: 'اسم المدين' },
    { key: 'phone', header: 'الهاتف' },
    { 
      key: 'totalAmount', 
      header: 'المبلغ الكلي',
      render: (item: any) => formatCurrency(item.totalAmount)
    }
  ];

  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/debtors")}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">الملخص الشامل للمدينين</h1>
            <p className="text-muted-foreground">نظرة عامة على جميع المدينين والإحصائيات</p>
          </div>
        </div>
        <ExportActions
          data={exportData}
          filename="ملخص_المدينين"
          title="الملخص الشامل للمدينين"
          columns={exportColumns}
          totals={{
            totalDebit: stats.totalDebt,
            totalCredit: 0,
            finalBalance: -stats.totalDebt
          }}
        />
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            تصفية حسب التاريخ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Start Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">من تاريخ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>اختر التاريخ</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>اختر التاريخ</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reset Button */}
            {(startDate || endDate) && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="mt-6 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                إعادة تعيين
              </Button>
            )}
          </div>
          
          {(startDate || endDate) && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">
                النطاق الزمني المحدد: 
                {startDate && ` من ${formatDate(startDate.toISOString())}`}
                {endDate && ` إلى ${formatDate(endDate.toISOString())}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الديون</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalDebt)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد المدينين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDebtors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الدين</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageDebt)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المنتجات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Debtors Chart */}
        <Card>
          <CardHeader>
            <CardTitle>أعلى 10 مدينين حسب المبلغ</CardTitle>
          </CardHeader>
          <CardContent>
            {topDebtors.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topDebtors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Bar dataKey="amount" fill="#ef4444" name="المبلغ" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                لا توجد بيانات لعرضها
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debt Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع الديون حسب النطاق</CardTitle>
          </CardHeader>
          <CardContent>
            {debtRanges.some(r => r.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={debtRanges.filter(r => r.count > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.range}: ${entry.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {debtRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                لا توجد بيانات لعرضها
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المدينين الكاملة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3 font-semibold">اسم المدين</th>
                  <th className="text-right p-3 font-semibold">الهاتف</th>
                  <th className="text-right p-3 font-semibold">المبلغ الكلي</th>
                </tr>
              </thead>
              <tbody>
                {groupedDebtorsArray.length > 0 ? (
                  groupedDebtorsArray
                    .sort((a, b) => b.totalAmount - a.totalAmount)
                    .map((debtor, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3">{debtor.name}</td>
                        <td className="p-3">{debtor.phone}</td>
                        <td className="p-3 text-destructive font-semibold">
                          {formatCurrency(debtor.totalAmount)}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center p-8 text-muted-foreground">
                      لا توجد بيانات متاحة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebtorsOverview;
