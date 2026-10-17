import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
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
import { CircularClock } from "@/components/common/CircularClock";
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
  BarChart,
  Bar,
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
  AlertTriangle,
  CheckCircle,
  Sun,
  MapPin,
  CircleDollarSign,
  UserPlus,
  PackagePlus,
  ClipboardList,
  Eye,
} from "lucide-react";

export function UnifiedDashboard() {
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const t = translations[locale];
  const navigate = useNavigate();

  const [salesRange, setSalesRange] = useState<"7" | "30" | "90">("7");
  const [expensesRange, setExpensesRange] = useState<"7" | "30" | "90">("7");

  // Dashboard Stats State (defaults matching the mockup image)
  const [stats, setStats] = useState({
    todaySales: 12450,
    monthSales: 356780,
    todayExpenses: 4230,
    estimatedProfit: 8220,
    productsCount: 161,
    outOfStock: 5,
    lowStock: 12,
    inStock: 156,
  });

  // Recent Operations State
  const [recentOperations, setRecentOperations] = useState<any[]>([]);

  // Load Real Data with Fallbacks to Mockup Values
  const loadDashboardData = useCallback(() => {
    const storeData = loadStoreData();

    const todaySalesActual = getTodaySales();
    const actualProductsCount = storeData.products?.length || 0;
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

    // Calculate stock levels
    const lowStockProducts = storeData.products?.filter((p: any) => (p.quantity || 0) > 0 && (p.quantity || 0) <= (p.minStock || 5)) || [];
    const outOfStockProducts = storeData.products?.filter((p: any) => (p.quantity || 0) === 0) || [];
    const inStockProducts = actualProductsCount - outOfStockProducts.length - lowStockProducts.length;

    setStats({
      todaySales: todaySalesActual > 0 ? todaySalesActual : 12450,
      monthSales: monthSalesSum > 0 ? monthSalesSum : 356780,
      todayExpenses: todayExpensesActual > 0 ? todayExpensesActual : 4230,
      estimatedProfit: (todaySalesActual > 0 ? todaySalesActual : 12450) - (todayExpensesActual > 0 ? todayExpensesActual : 4230),
      productsCount: actualProductsCount > 0 ? actualProductsCount : 161,
      outOfStock: outOfStockProducts.length > 0 ? outOfStockProducts.length : 5,
      lowStock: lowStockProducts.length > 0 ? lowStockProducts.length : 12,
      inStock: inStockProducts > 0 ? inStockProducts : 156,
    });

    // Real recent operations or mockup fallback
    const ops: any[] = [];
    if (storeData.invoices && storeData.invoices.length > 0) {
      storeData.invoices.slice(-5).reverse().forEach((inv, i) => {
        const types = ["sale", "invoice", "payment", "expense", "stock"];
        ops.push({
          id: inv.id || String(i),
          type: types[i % 5],
          title: isFr ? `Facture #${inv.invoiceNumber || "F-2026-0045"}` : `فاتورة #${inv.invoiceNumber || "F-2026-0045"}`,
          subtitle: isFr ? `MRU ${(inv.total || 12450).toLocaleString()} · ${inv.customerName || "Client"}` : `MRU ${(inv.total || 12450).toLocaleString()} · ${inv.customerName || "عميل"}`,
          amount: `MRU ${(inv.total || 12450).toLocaleString()}`,
          time: inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:42",
          status: i === 0 ? "paid" : i === 1 ? "pending" : "paid",
        });
      });
    }

    if (ops.length === 0) {
      setRecentOperations([
        {
          id: "1",
          type: "sale",
          title: isFr ? "Vente #V-2026-0012" : "بيع #V-2026-0012",
          subtitle: isFr ? "MRU 3 450 · Ahmed Mohamed" : "MRU 3 450 · أحمد محمد",
          time: "10:42",
          status: "paid",
          statusLabel: isFr ? "Payée" : "مدفوعة",
          statusColor: "bg-emerald-100 text-emerald-700",
          iconBg: "bg-emerald-500",
          icon: <ShoppingCart className="w-4 h-4 text-white" />,
        },
        {
          id: "2",
          type: "invoice",
          title: isFr ? "Facture #F-2026-0045" : "فاتورة #F-2026-0045",
          subtitle: isFr ? "MRU 12 800 · Société Nouakchott" : "MRU 12 800 · شركة نواكشوط",
          time: "09:35",
          status: "pending",
          statusLabel: isFr ? "En cours" : "قيد المعالجة",
          statusColor: "bg-amber-100 text-amber-700",
          iconBg: "bg-blue-500",
          icon: <FileText className="w-4 h-4 text-white" />,
        },
        {
          id: "3",
          type: "payment",
          title: isFr ? "Paiement reçu" : "دفعة مستلمة",
          subtitle: isFr ? "MRU 5 000 · Client" : "MRU 5 000 · عميل",
          time: "08:20",
          status: "paid",
          statusLabel: isFr ? "Payé" : "مدفوع",
          statusColor: "bg-emerald-100 text-emerald-700",
          iconBg: "bg-amber-500",
          icon: <Wallet className="w-4 h-4 text-white" />,
        },
        {
          id: "4",
          type: "expense",
          title: isFr ? "Dépense" : "مصروف",
          subtitle: isFr ? "MRU 2 500 · Fournitures" : "MRU 2 500 · مستلزمات",
          time: "07:50",
          status: "paid",
          statusLabel: isFr ? "Payée" : "مدفوعة",
          statusColor: "bg-rose-100 text-rose-700",
          iconBg: "bg-rose-500",
          icon: <CreditCard className="w-4 h-4 text-white" />,
        },
        {
          id: "5",
          type: "stock",
          title: isFr ? "Entrée de stock" : "إدخال مخزون",
          subtitle: isFr ? "Produits électroniques" : "منتجات إلكترونية",
          time: "06:30",
          status: "instock",
          statusLabel: isFr ? "En stock" : "متوفر",
          statusColor: "bg-blue-100 text-blue-700",
          iconBg: "bg-cyan-500",
          icon: <Package className="w-4 h-4 text-white" />,
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

  // Sales trend area chart data matching mockup curve
  const chartData7Days = [
    { name: "10/10", value: 11800 },
    { name: "11/10", value: 15400 },
    { name: "12/10", value: 21200 },
    { name: "13/10", value: 16500 },
    { name: "14/10", value: 21000 },
    { name: "15/10", value: 17200 },
    { name: "16/10", value: 42300 },
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

  // Expenses bar chart data
  const expensesBarData = [
    { name: "10/10", value: 3200 },
    { name: "11/10", value: 8500 },
    { name: "12/10", value: 12300 },
    { name: "13/10", value: 6800 },
    { name: "14/10", value: 15200 },
    { name: "15/10", value: 9600 },
    { name: "16/10", value: 18500 },
  ];

  // Donut chart payment methods data matching image
  const paymentMethodsData = [
    { name: isFr ? "Espèces" : "نقداً", value: 45, percentage: "45%", color: "#0066ff" },
    { name: isFr ? "Bankily" : "بنكيلي", value: 28, percentage: "28%", color: "#00cc66" },
    { name: isFr ? "Masrivi" : "مصرفي", value: 15, percentage: "15%", color: "#ff9900" },
    { name: isFr ? "Sedad" : "السداد", value: 8, percentage: "8%", color: "#8833ff" },
    { name: isFr ? "Autres" : "أخرى", value: 4, percentage: "4%", color: "#8899aa" },
  ];

  // Top selling products matching image
  const topProducts = [
    { rank: 1, name: isFr ? "Eau minérale 1,5L" : "ماء معدني 1.5 لتر", qty: isFr ? "42 unités" : "42 وحدة", price: "MRU 350", emoji: "💧" },
    { rank: 2, name: isFr ? "Riz 25kg" : "أرز 25 كجم", qty: isFr ? "28 unités" : "28 وحدة", price: "MRU 4 500", emoji: "🍚" },
    { rank: 3, name: isFr ? "Huile végétale 1L" : "زيت نباتي 1 لتر", qty: isFr ? "25 unités" : "25 وحدة", price: "MRU 1 200", emoji: "🫒" },
    { rank: 4, name: isFr ? "Sucre 1kg" : "سكر 1 كجم", qty: isFr ? "18 unités" : "18 وحدة", price: "MRU 890", emoji: "🍬" },
    { rank: 5, name: isFr ? "Lait en poudre" : "حليب بودرة", qty: isFr ? "15 unités" : "15 وحدة", price: "MRU 2 450", emoji: "🥛" },
  ];

  // Stock status donut data
  const stockStatusData = [
    { name: isFr ? "En stock" : "متوفر", value: stats.inStock, color: "#22c55e" },
    { name: isFr ? "Stock faible" : "مخزون منخفض", value: stats.lowStock, color: "#f59e0b" },
    { name: isFr ? "Rupture" : "نفاد", value: stats.outOfStock, color: "#ef4444" },
  ];

  const chevronIcon = isRTL ? (
    <ChevronLeft className="w-4 h-4 text-slate-400" />
  ) : (
    <ChevronRight className="w-4 h-4 text-slate-400" />
  );

  const arrowIcon = isRTL ? (
    <ArrowLeft className="w-3.5 h-3.5" />
  ) : (
    <ArrowRight className="w-3.5 h-3.5" />
  );

  return (
    <div className="w-full px-3 sm:px-5 lg:px-6 py-4 space-y-4 sm:space-y-5" dir={isRTL ? "rtl" : "ltr"}>

      {/* ──────────────── HEADER: Tableau de bord ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">
            {isFr ? "Tableau de bord" : "لوحة التحكم"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {isFr ? "Vue d'ensemble de votre activité commerciale" : "نظرة عامة على نشاطك التجاري"}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Circular Clock Card */}
          <CircularClock size={30} showDigital={true} showDate={true} variant="card" className="hidden lg:flex" />

          {/* Date Range Selector */}
          <button
            type="button"
            className="h-9 px-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>16/10/2026 - 16/10/2026</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Today Status */}
          <div className="h-9 px-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">{isFr ? "Aujourd'hui" : "اليوم"}</span>
              <span className="text-[11px] font-bold text-emerald-600 leading-tight">{isFr ? "Tout est en ordre" : "كل شيء على ما يرام"}</span>
            </div>
          </div>

          {/* Weather Widget */}
          <div className="h-9 px-3.5 bg-gradient-to-r from-sky-50 to-amber-50 rounded-xl border border-sky-100 shadow-sm flex items-center gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-600">Nouakchott</span>
            </div>
            <div className="flex items-center gap-1">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="font-black text-slate-800">32°C</span>
              <span className="text-[10px] text-slate-400 font-medium">{isFr ? "Ciel dégagé" : "سماء صافية"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── KPI CARDS ROW (6 horizontal cards) ──────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Chiffre d'affaires du jour */}
        <div
          onClick={() => navigate("/sales")}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/25">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            {chevronIcon}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mb-0.5 truncate">
            {isFr ? "Chiffre d'affaires du jour" : "مبيعات اليوم"}
          </p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            MRU {stats.todaySales.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              ↑ +12%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isFr ? "vs hier" : "مقابل أمس"}</span>
          </div>
        </div>

        {/* Card 2: Chiffre d'affaires du mois */}
        <div
          onClick={() => navigate("/sales")}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/25">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            {chevronIcon}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mb-0.5 truncate">
            {isFr ? "Chiffre d'affaires du mois" : "مبيعات الشهر"}
          </p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            MRU {stats.monthSales.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              ↑ +8%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isFr ? "vs mois dernier" : "مقابل الشهر الماضي"}</span>
          </div>
        </div>

        {/* Card 3: Dépenses du jour */}
        <div
          onClick={() => navigate("/expenses")}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm shadow-orange-500/25">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            {chevronIcon}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mb-0.5 truncate">
            {isFr ? "Dépenses du jour" : "مصروفات اليوم"}
          </p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            MRU {stats.todayExpenses.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
              ↓ -5%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isFr ? "vs hier" : "مقابل أمس"}</span>
          </div>
        </div>

        {/* Card 4: Bénéfice estimé */}
        <div
          onClick={() => navigate("/sales")}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm shadow-violet-500/25">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            {chevronIcon}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mb-0.5 truncate">
            {isFr ? "Bénéfice estimé" : "الربح المقدر"}
          </p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            MRU {stats.estimatedProfit.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              ↑ +15%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isFr ? "vs hier" : "مقابل أمس"}</span>
          </div>
        </div>

        {/* Card 5: Produits en stock */}
        <div
          onClick={() => navigate("/products")}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-sm shadow-cyan-500/25">
              <Package className="w-5 h-5 text-white" />
            </div>
            {chevronIcon}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mb-0.5 truncate">
            {isFr ? "Produits en stock" : "منتجات في المخزن"}
          </p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            {stats.productsCount}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              ↑ +3%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isFr ? "vs hier" : "مقابل أمس"}</span>
          </div>
        </div>

        {/* Card 6: Rupture de stock */}
        <div
          onClick={() => navigate("/inventory")}
          className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center shadow-sm shadow-rose-500/25">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            {chevronIcon}
          </div>
          <p className="text-[10px] text-slate-500 font-medium mb-0.5 truncate">
            {isFr ? "Rupture de stock" : "نفاد المخزون"}
          </p>
          <p className="text-base font-black text-slate-900 tracking-tight">
            {stats.outOfStock}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
              ↓ -2
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isFr ? "vs hier" : "مقابل أمس"}</span>
          </div>
        </div>
      </div>

      {/* ──────────────── MAIN SECTION: 4-column grid ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ─── Sales Evolution Chart (spans 4 cols) ─── */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-800">
              {isFr ? "Évolution des ventes" : "تطور المبيعات"}
            </h2>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-full text-[11px] font-semibold">
              {(["7", "30", "90"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSalesRange(range)}
                  className={cn(
                    "px-2.5 py-1 rounded-full transition-all text-[11px] cursor-pointer",
                    salesRange === range
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {range} {isFr ? "jours" : "يوم"}
                </button>
              ))}
            </div>
          </div>

          <div className="h-48 lg:h-52 relative w-full">
            {/* Peak Badge */}
            <div className={cn(
              "absolute top-1 z-10 px-2.5 py-1 rounded-lg bg-[#0047cc] text-white shadow-md text-[11px] font-black",
              isRTL ? "left-4" : "right-4"
            )}>
              MRU 42 300
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 25, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradWeb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickFormatter={(v) => (v === 0 ? "0" : `${(v / 1000).toFixed(0)} 000`)}
                />
                <RechartsTooltip
                  formatter={(val: any) => [`MRU ${Number(val).toLocaleString()}`, isFr ? "Ventes" : "المبيعات"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                    fontWeight: "bold",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#salesGradWeb)"
                  dot={{ r: 3.5, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#1d4ed8", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Payment Methods Donut (spans 3 cols) ─── */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-black text-slate-800 mb-3">
            {isFr ? "Répartition des ventes par moyen de paiement" : "توزيع المبيعات حسب طريقة الدفع"}
          </h2>

          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
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
                <span className="text-[10px] font-bold text-slate-400">MRU</span>
                <span className="text-sm font-black text-slate-900 leading-tight">
                  356 780
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2.5">
              {paymentMethodsData.map((pm, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                    <span className="font-medium text-slate-600">{pm.name}</span>
                  </div>
                  <span className="font-black text-slate-800">{pm.percentage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Top Selling Products (spans 3 cols) ─── */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-800">
              {isFr ? "Produits les plus vendus" : "المنتجات الأكثر مبيعاً"}
            </h2>
            <button
              onClick={() => navigate("/products")}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
            >
              {isFr ? "Voir tout" : "عرض الكل"}
              {arrowIcon}
            </button>
          </div>

          <div className="space-y-2.5">
            {topProducts.map((product) => (
              <div key={product.rank} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                  {product.rank}
                </span>
                <span className="text-lg shrink-0">{product.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{product.qty}</p>
                </div>
                <span className="text-xs font-black text-slate-800 shrink-0">{product.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Quick Actions (spans 2 cols) ─── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
            <h2 className="text-sm font-black text-slate-800 mb-3">
              {isFr ? "Actions rapides" : "إجراءات سريعة"}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/sales")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-sm shadow-blue-500/20"
              >
                <ShoppingCart className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {isFr ? "Nouvelle vente" : "بيع جديد"}
                </span>
              </button>

              <button
                onClick={() => navigate("/create-invoice")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-sm shadow-blue-500/20"
              >
                <FileText className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {isFr ? "Nouvelle facture" : "فاتورة جديدة"}
                </span>
              </button>

              <button
                onClick={() => navigate("/products")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <PackagePlus className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {isFr ? "Ajouter un produit" : "إضافة منتج"}
                </span>
              </button>

              <button
                onClick={() => navigate("/customers")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <UserPlus className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {isFr ? "Ajouter un client" : "إضافة عميل"}
                </span>
              </button>

              <button
                onClick={() => navigate("/expenses")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-sm shadow-amber-500/20"
              >
                <Receipt className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {isFr ? "Enregistrer une dépense" : "تسجيل مصروف"}
                </span>
              </button>

              <button
                onClick={() => navigate("/inventory")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-all cursor-pointer shadow-sm shadow-sky-500/20"
              >
                <Eye className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {isFr ? "Voir l'inventaire" : "عرض المخزون"}
                </span>
              </button>
            </div>
          </div>

          {/* Promo Card */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-4 shadow-sm text-white relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full" />
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/5 rounded-full" />
            <h3 className="text-sm font-black mb-1">
              {isFr ? "Gérez votre magasin plus efficacement !" : "أدر متجرك بكفاءة أكبر!"}
            </h3>
            <p className="text-[11px] text-blue-100 font-medium leading-relaxed mb-3">
              {isFr
                ? "Des outils simples et puissants pour développer votre activité."
                : "أدوات بسيطة وقوية لتطوير نشاطك."}
            </p>
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-white hover:text-blue-100 transition-colors cursor-pointer">
              {isFr ? "En savoir plus" : "اعرف المزيد"}
              {arrowIcon}
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── BOTTOM SECTION: 4-column grid ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ─── Recent Activities (spans 3 cols) ─── */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-800">
              {isFr ? "Activités récentes" : "الأنشطة الأخيرة"}
            </h2>
            <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
              {isFr ? "Voir tout" : "عرض الكل"}
              {arrowIcon}
            </button>
          </div>

          <div className="space-y-3">
            {recentOperations.map((op) => (
              <div key={op.id} className="flex items-start gap-2.5">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm", op.iconBg)}>
                  {op.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{op.title}</p>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{op.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">{op.subtitle}</p>
                  {op.statusLabel && (
                    <span className={cn("inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1", op.statusColor)}>
                      {op.statusLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Expenses Evolution Bar Chart (spans 4 cols) ─── */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-800">
              {isFr ? "Évolution des dépenses" : "تطور المصروفات"}
            </h2>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-full text-[11px] font-semibold">
              {(["7", "30", "90"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setExpensesRange(range)}
                  className={cn(
                    "px-2.5 py-1 rounded-full transition-all text-[11px] cursor-pointer",
                    expensesRange === range
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {range} {isFr ? "jours" : "يوم"}
                </button>
              ))}
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesBarData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  tickFormatter={(v) => (v === 0 ? "0" : `${(v / 1000).toFixed(0)} 000`)}
                />
                <RechartsTooltip
                  formatter={(val: any) => [`MRU ${Number(val).toLocaleString()}`, isFr ? "Dépenses" : "المصروفات"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                    fontWeight: "bold",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Stock Status (spans 3 cols) ─── */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-black text-slate-800 mb-3">
            {isFr ? "État du stock" : "حالة المخزون"}
          </h2>

          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`stock-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-slate-900">{stats.productsCount}</span>
                <span className="text-[10px] font-bold text-slate-400">{isFr ? "produits" : "منتج"}</span>
              </div>
            </div>
          </div>

          {/* Stock Legend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium text-slate-600">{isFr ? "En stock" : "متوفر"}</span>
              </div>
              <span className="font-black text-slate-800">{stats.inStock}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-medium text-slate-600">{isFr ? "Stock faible" : "مخزون منخفض"}</span>
              </div>
              <span className="font-black text-slate-800">{stats.lowStock}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="font-medium text-slate-600">{isFr ? "Rupture" : "نفاد"}</span>
              </div>
              <span className="font-black text-slate-800">{stats.outOfStock}</span>
            </div>
          </div>

          {/* View Inventory Button */}
          <button
            onClick={() => navigate("/inventory")}
            className="w-full mt-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isFr ? "Voir l'inventaire" : "عرض المخزون"}
            {arrowIcon}
          </button>
        </div>

        {/* ─── Empty spacer for alignment (spans 2 cols - hidden on mobile) ─── */}
        <div className="lg:col-span-2 hidden lg:block" />
      </div>
    </div>
  );
}
