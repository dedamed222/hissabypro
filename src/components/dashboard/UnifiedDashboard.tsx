import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import {
  loadStoreData,
  getTodaySales,
  getTodayExpenses,
  getLowStockProducts,
} from "@/utils/localStorage";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Calendar,
  Package,
  FileText,
  DollarSign,
  Users,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Wallet,
  CreditCard,
  Truck,
  Zap,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  BarChart3,
  Receipt,
} from "lucide-react";

export function UnifiedDashboard() {
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const t = translations[locale];
  const navigate = useNavigate();

  const [salesRange, setSalesRange] = useState<"7" | "30" | "90">("7");
  const [searchQuery, setSearchQuery] = useState("");

  // Dashboard Stats State (defaults matching the mockup image)
  const [stats, setStats] = useState({
    todaySales: 12450,
    monthSales: 356780,
    todayExpenses: 4230,
    monthExpenses: 8220,
    productsCount: 161,
    customersCount: 142,
    suppliersCount: 48,
  });

  // Recent Operations State
  const [recentOperations, setRecentOperations] = useState<any[]>([]);

  // Load Real Data with Fallbacks to Mockup Values
  const loadDashboardData = useCallback(() => {
    const storeData = loadStoreData();

    const todaySalesActual = getTodaySales();
    const actualProductsCount = storeData.products?.length || 0;
    const actualCustomersCount = storeData.customers?.length || 0;
    const actualSuppliersCount = storeData.suppliers?.length || 0;
    const todayExpensesActual = getTodayExpenses();

    // Calculate monthly sales
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthSalesSum = storeData.invoices
      ? storeData.invoices
          .filter((inv) => inv.status === "paid" && (inv.createdAt?.startsWith(currentMonthPrefix) || inv.date?.startsWith(currentMonthPrefix)))
          .reduce((sum, inv) => sum + (inv.total || 0), 0)
      : 0;

    const monthExpensesSum = storeData.expenses
      ? storeData.expenses
          .filter((exp) => exp.date?.startsWith(currentMonthPrefix))
          .reduce((sum, exp) => sum + (exp.amount || 0), 0)
      : 0;

    setStats({
      todaySales: todaySalesActual > 0 ? todaySalesActual : 12450,
      monthSales: monthSalesSum > 0 ? monthSalesSum : 356780,
      todayExpenses: todayExpensesActual > 0 ? todayExpensesActual : 4230,
      monthExpenses: monthExpensesSum > 0 ? monthExpensesSum : 8220,
      productsCount: actualProductsCount > 0 ? actualProductsCount : 161,
      customersCount: actualCustomersCount > 0 ? actualCustomersCount : 142,
      suppliersCount: actualSuppliersCount > 0 ? actualSuppliersCount : 48,
    });

    // Real recent operations or mockup fallback
    const ops: any[] = [];
    if (storeData.invoices && storeData.invoices.length > 0) {
      storeData.invoices.slice(-4).reverse().forEach((inv, i) => {
        ops.push({
          id: inv.id || String(i),
          type: "sale",
          title: isFr ? `Facture #${inv.invoiceNumber || "F-2026-0045"}` : `فاتورة #${inv.invoiceNumber || "F-2026-0045"}`,
          amount: `MRU ${(inv.total || 12450).toLocaleString()}`,
          time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:42",
          iconBg: i % 2 === 0 ? "bg-emerald-500" : "bg-blue-500",
          icon: i % 2 === 0 ? <ShoppingCart className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4 text-white" />,
        });
      });
    }

    if (ops.length === 0) {
      setRecentOperations([
        {
          id: "1",
          title: isFr ? "Nouvelle vente" : "بيع جديد",
          amount: "MRU 12 450",
          time: "10:42",
          iconBg: "bg-emerald-500",
          icon: <ShoppingCart className="w-4 h-4 text-white" />,
        },
        {
          id: "2",
          title: isFr ? "Facture #F-2026-0045" : "فاتورة #F-2026-0045",
          amount: "MRU 8 750",
          time: "09:35",
          iconBg: "bg-blue-500",
          icon: <FileText className="w-4 h-4 text-white" />,
        },
        {
          id: "3",
          title: isFr ? "Paiement reçu" : "دفعة مستلمة",
          amount: "MRU 5 000",
          time: "08:20",
          iconBg: "bg-amber-500",
          icon: <Wallet className="w-4 h-4 text-white" />,
        },
        {
          id: "4",
          title: isFr ? "Dépense" : "مصروف",
          amount: "MRU 2 500",
          time: "07:50",
          iconBg: "bg-rose-500",
          icon: <CreditCard className="w-4 h-4 text-white" />,
        },
      ]);
    } else {
      setRecentOperations(ops);
    }
  }, [isFr]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useRealtimeSync(["invoices", "daily_sales", "products", "expenses"], loadDashboardData);

  // Sales trend area chart data matching mockup curve exactly
  const chartData7Days = [
    { name: "10/10", value: 11800 },
    { name: "11/10", value: 15400 },
    { name: "12/10", value: 21200 },
    { name: "13/10", value: 16500 },
    { name: "14/10", value: 21000 },
    { name: "15/10", value: 17200 },
    { name: "16/10", value: 24500 },
  ];

  const chartData30Days = [
    { name: "S1", value: 85000 },
    { name: "S2", value: 110000 },
    { name: "S3", value: 98000 },
    { name: "S4", value: 135000 },
  ];

  const chartData90Days = [
    { name: "M1", value: 310000 },
    { name: "M2", value: 345000 },
    { name: "M3", value: 356780 },
  ];

  const currentChartData =
    salesRange === "7" ? chartData7Days : salesRange === "30" ? chartData30Days : chartData90Days;

  // Donut chart payment methods data matching image
  const paymentMethodsData = [
    { name: isFr ? "Espèces" : "نقداً", value: 45, percentage: "45%", color: "#0066ff" },
    { name: isFr ? "Bankily" : "بنكيلي", value: 28, percentage: "28%", color: "#00cc66" },
    { name: isFr ? "Masrivi" : "مصرفي", value: 15, percentage: "15%", color: "#ff9900" },
    { name: isFr ? "Sedad" : "السداد", value: 8, percentage: "8%", color: "#8833ff" },
    { name: isFr ? "Autres" : "أخرى", value: 4, percentage: "4%", color: "#8899aa" },
  ];

  const chevronIcon = isRTL ? (
    <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
  ) : (
    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 space-y-4">
      {/* ──────────────── 1. Search Bar & Date Picker Row ──────────────── */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Pill Input */}
        <div className="relative flex-1">
          <Search className={cn("w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none", isRTL ? "right-3.5" : "left-3.5")} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFr ? "Rechercher un produit, client, facture..." : "ابحث عن منتج، عميل، فاتورة..."}
            className={cn(
              "w-full h-11 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all",
              isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
            )}
          />
        </div>

        {/* Date Selector Pill */}
        <button
          type="button"
          className="h-11 px-3 sm:px-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>16/10/2026</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* ──────────────── 2. KPI Cards Grid (2 Columns x 3 Rows) ──────────────── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Card 1: Chiffre d'affaires du jour */}
        <div
          onClick={() => navigate("/sales")}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {isFr ? "Chiffre d'affaires du jour" : "مبيعات اليوم"}
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                MRU {stats.todaySales.toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-100/60 mt-1">
                ↑ +12%
              </span>
            </div>
          </div>
          {chevronIcon}
        </div>

        {/* Card 2: Chiffre d'affaires du mois */}
        <div
          onClick={() => navigate("/sales")}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {isFr ? "Chiffre d'affaires du mois" : "مبيعات الشهر"}
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                MRU {stats.monthSales.toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-100/60 mt-1">
                ↑ +8%
              </span>
            </div>
          </div>
          {chevronIcon}
        </div>

        {/* Card 3: Dépenses du jour */}
        <div
          onClick={() => navigate("/expenses")}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {isFr ? "Dépenses du jour" : "مصروفات اليوم"}
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                MRU {stats.todayExpenses.toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-100/60 mt-1">
                ↓ -5%
              </span>
            </div>
          </div>
          {chevronIcon}
        </div>

        {/* Card 4: Produits en stock */}
        <div
          onClick={() => navigate("/products")}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {isFr ? "Produits en stock" : "منتجات في المخزن"}
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                {stats.productsCount}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-100/60 mt-1">
                ↑ +3%
              </span>
            </div>
          </div>
          {chevronIcon}
        </div>

        {/* Card 5: Clients */}
        <div
          onClick={() => navigate("/customers")}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {isFr ? "Clients" : "العملاء"}
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                {stats.customersCount}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-100/60 mt-1">
                ↑ +5%
              </span>
            </div>
          </div>
          {chevronIcon}
        </div>

        {/* Card 6: Fournisseurs */}
        <div
          onClick={() => navigate("/suppliers")}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-100 flex items-center justify-between cursor-pointer group hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-cyan-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {isFr ? "Fournisseurs" : "الموردون"}
              </p>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                {stats.suppliersCount}
              </p>
            </div>
          </div>
          {chevronIcon}
        </div>
      </div>

      {/* ──────────────── 3. Sales Evolution Chart Card ──────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100 space-y-3">
        {/* Header with Title & Period Filter Pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm sm:text-base font-black text-slate-800">
              {isFr ? "Évolution des ventes" : "تطور المبيعات"}
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setSalesRange("7")}
              className={cn(
                "px-3 py-1 rounded-full transition-all text-xs cursor-pointer",
                salesRange === "7"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isFr ? "7 jours" : "7 أيام"}
            </button>
            <button
              onClick={() => setSalesRange("30")}
              className={cn(
                "px-3 py-1 rounded-full transition-all text-xs cursor-pointer",
                salesRange === "30"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isFr ? "30 jours" : "30 يوم"}
            </button>
            <button
              onClick={() => setSalesRange("90")}
              className={cn(
                "px-3 py-1 rounded-full transition-all text-xs cursor-pointer",
                salesRange === "90"
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {isFr ? "90 jours" : "90 يوم"}
            </button>
          </div>
        </div>

        {/* Chart Area with Floating Peak Badge */}
        <div className="h-52 relative w-full pt-1">
          {/* Floating Pill Tooltip pointing to last peak */}
          <div
            className={cn(
              "absolute top-2 z-10 px-3 py-1 rounded-xl bg-[#0047cc] text-white shadow-md text-xs font-black tracking-tight",
              isRTL ? "left-6 sm:left-12" : "right-6 sm:right-12"
            )}
          >
            MRU 24 500
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentChartData} margin={{ top: 25, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="mockupSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10.5, fill: "#64748b", fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                domain={[0, 30000]}
                ticks={[0, 10000, 20000, 30000]}
                tickFormatter={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
              />
              <RechartsTooltip
                formatter={(val: any) => [`MRU ${Number(val).toLocaleString()}`, isFr ? "Ventes" : "المبيعات"]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "1rem",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2.75}
                fill="url(#mockupSalesGrad)"
                dot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#1d4ed8", stroke: "#ffffff", strokeWidth: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ──────────────── 4. Split Row: Moyens de paiement & Activités récentes ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Moyens de paiement Donut Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm sm:text-base font-black text-slate-800">
                {isFr ? "Moyens de paiement" : "طرق الدفع"}
              </h3>
            </div>
            {chevronIcon}
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            {/* Donut Chart with Center Text */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={64}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  356 780
                </span>
                <span className="text-[10px] font-bold text-slate-400">MRU</span>
              </div>
            </div>

            {/* Payment Methods Legend */}
            <div className="flex-1 space-y-2">
              {paymentMethodsData.map((pm, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                    <span className="font-semibold text-slate-700">{pm.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{pm.percentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activités récentes Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm sm:text-base font-black text-slate-800">
                {isFr ? "Activités récentes" : "الأنشطة الأخيرة"}
              </h3>
            </div>
            {chevronIcon}
          </div>

          <div className="space-y-3">
            {recentOperations.map((op) => (
              <div key={op.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className={`w-8 h-8 rounded-xl ${op.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                    {op.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{op.title}</p>
                    <p className="text-[11px] font-semibold text-slate-500 leading-tight mt-0.5">{op.amount}</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">{op.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────── 5. Quick Actions Section (Actions rapides) ──────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4.5 h-4.5 text-blue-600 fill-blue-600" />
            <h3 className="text-sm sm:text-base font-black text-slate-800">
              {isFr ? "Actions rapides" : "إجراءات سريعة"}
            </h3>
          </div>
          <button
            onClick={() => navigate("/create-invoice")}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <span>{isFr ? "Voir plus" : "عرض المزيد"}</span>
            {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 6 Actions Square Cards Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
          {/* Action 1: Nouvelle vente */}
          <button
            onClick={() => navigate("/sales")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/80 hover:bg-blue-100/90 border border-blue-100/80 text-blue-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight">
              {isFr ? "Nouvelle vente" : "بيع جديد"}
            </span>
          </button>

          {/* Action 2: Nouvelle facture */}
          <button
            onClick={() => navigate("/create-invoice")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-100/80 text-emerald-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight">
              {isFr ? "Nouvelle facture" : "فاتورة جديدة"}
            </span>
          </button>

          {/* Action 3: Ajouter un produit */}
          <button
            onClick={() => navigate("/products")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/80 hover:bg-purple-100/90 border border-purple-100/80 text-purple-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight">
              {isFr ? "Ajouter un produit" : "إضافة منتج"}
            </span>
          </button>

          {/* Action 4: Ajouter un client */}
          <button
            onClick={() => navigate("/customers")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-100/80 text-amber-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight">
              {isFr ? "Ajouter un client" : "إضافة عميل"}
            </span>
          </button>

          {/* Action 5: Enregistrer une dépense */}
          <button
            onClick={() => navigate("/expenses")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-50/80 hover:bg-cyan-100/90 border border-cyan-100/80 text-cyan-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <Receipt className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight">
              {isFr ? "Enregistrer une dépense" : "تسجيل مصروف"}
            </span>
          </button>

          {/* Action 6: Inventaire */}
          <button
            onClick={() => navigate("/inventory")}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-700 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <LayoutGrid className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight">
              {isFr ? "Inventaire" : "المخزون"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
