
import { useEffect, useState, useCallback } from "react";
import { FormattedStat, Product, DailySale } from "@/types";
import { formatCurrency, calculatePercentageChange } from "@/utils/formatters";
import {
  getTodaySales, getYesterdaySales,
  getTodayExpenses, getYesterdayExpenses,
  getLowStockProducts, getMostRecentProductsList,
  loadStoreData
} from "@/utils/localStorage";
import { TodaySales } from "./TodaySales";
import { TopSellingProducts } from "./TopSellingProducts";
import { LowStockAlert } from "./LowStockAlert";
import { RecentProducts } from "./RecentProducts";
import { SalesChart } from "./SalesChart";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";
import { useLocale } from "@/hooks/useLocale";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { TrendingUp, TrendingDown, ShoppingCart, CreditCard, Package2, AlertTriangle } from "lucide-react";

function PremiumStatCard({
  label, value, change, isPositive, icon, gradient
}: {
  label: string;
  value: string;
  change: number;
  isPositive: boolean;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className="premium-stat p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isPositive
            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
            : "bg-red-50 text-red-500 border border-red-100"
        }`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{change}%</span>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

export function UnifiedDashboard() {
  const { t, locale } = useLocale();

  const [salesStat, setSalesStat] = useState<FormattedStat>({
    value: formatCurrency(0), change: 0, isPositive: true, label: t('totalSalesToday'),
  });
  const [expensesStat, setExpensesStat] = useState<FormattedStat>({
    value: formatCurrency(0), change: 0, isPositive: false, label: t('totalExpenses'),
  });
  const [inventoryStat, setInventoryStat] = useState<FormattedStat>({
    value: "0", change: 0, isPositive: true, label: t('productsInStock'),
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [todaySalesData, setTodaySalesData] = useState<DailySale[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<Array<{
    productName: string; totalQuantity: number; totalAmount: number;
  }>>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  const loadDashboard = useCallback(() => {
    const todaySales = getTodaySales();
    const yesterdaySales = getYesterdaySales();
    const salesChange = calculatePercentageChange(todaySales, yesterdaySales);

    setSalesStat({
      value: formatCurrency(todaySales),
      change: Math.abs(salesChange),
      isPositive: salesChange >= 0,
      label: t('totalSalesToday'),
    });

    const todayExpenses = getTodayExpenses();
    const yesterdayExpenses = getYesterdayExpenses();
    const expensesChange = calculatePercentageChange(todayExpenses, yesterdayExpenses);

    setExpensesStat({
      value: formatCurrency(todayExpenses),
      change: Math.abs(expensesChange),
      isPositive: expensesChange <= 0,
      label: t('totalExpenses'),
    });

    const storeData = loadStoreData();
    setInventoryStat({
      value: `${storeData.products.length} ${t('product')}`,
      change: 0,
      isPositive: true,
      label: t('productsInStock'),
    });

    const lowStock = getLowStockProducts();
    setLowStockCount(lowStock);

    const mruIds = getMostRecentProductsList();
    const mruProducts = mruIds.map(
      id => storeData.products.find(p => p.id === id)
    ).filter(Boolean) as Product[];
    setRecentProducts(mruProducts.slice(0, 5));

    const today = new Date().toISOString().split('T')[0];
    const todaySalesFiltered = storeData.dailySales.filter(sale =>
      sale.date.startsWith(today)
    );
    setTodaySalesData(todaySalesFiltered);

    const salesByProduct = todaySalesFiltered.reduce((acc, sale) => {
      const existing = acc.find(item => item.productName === sale.productName);
      if (existing) {
        existing.totalQuantity += sale.quantity;
        existing.totalAmount += sale.total;
      } else {
        acc.push({
          productName: sale.productName,
          totalQuantity: sale.quantity,
          totalAmount: sale.total
        });
      }
      return acc;
    }, [] as Array<{ productName: string; totalQuantity: number; totalAmount: number; }>);

    setTopSellingProducts(
      salesByProduct.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5)
    );
  }, [t]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useRealtimeSync(['invoices', 'daily_sales', 'products'], loadDashboard);

  const today = new Date().toLocaleDateString(locale === 'ar' ? 'en-GB' : 'fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="w-full min-h-screen">
      {/* Page Header */}
      <div className="page-header px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold gradient-text">
              {t('mainDashboard')}
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5">{t('comprehensiveManagement')}</p>
          </div>
          <div className="text-end">
            <p className="text-[0.7rem] text-gray-400 uppercase tracking-wide">{t('today')}</p>
            <p className="text-xs md:text-sm font-semibold text-gray-700 mt-0.5">{today}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-4 md:py-6 space-y-5 md:space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger-children">
          <PremiumStatCard
            label={salesStat.label}
            value={salesStat.value}
            change={salesStat.change}
            isPositive={salesStat.isPositive}
            icon={<ShoppingCart size={20} />}
            gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
          />
          <PremiumStatCard
            label={expensesStat.label}
            value={expensesStat.value}
            change={expensesStat.change}
            isPositive={expensesStat.isPositive}
            icon={<CreditCard size={20} />}
            gradient="linear-gradient(135deg, #ef4444, #f97316)"
          />
          <PremiumStatCard
            label={inventoryStat.label}
            value={inventoryStat.value}
            change={inventoryStat.change}
            isPositive={inventoryStat.isPositive}
            icon={<Package2 size={20} />}
            gradient="linear-gradient(135deg, #10b981, #06b6d4)"
          />
          <PremiumStatCard
            label={t('productAlert')}
            value={`${lowStockCount}`}
            change={0}
            isPositive={lowStockCount === 0}
            icon={<AlertTriangle size={20} />}
            gradient="linear-gradient(135deg, #f59e0b, #f97316)"
          />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <div className="space-y-4 md:space-y-5">
            <TodaySales sales={todaySalesData} />
            <TopSellingProducts products={topSellingProducts} />
          </div>
          <div className="space-y-4 md:space-y-5">
            <SalesChart />
            <RecentActivity />
          </div>
        </div>

        {/* Secondary Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <LowStockAlert count={lowStockCount} />
          <RecentProducts products={recentProducts} />
        </div>
      </div>
    </div>
  );
}
