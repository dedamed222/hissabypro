import { useEffect, useState } from "react";
import { FormattedStat, Product, DailySale } from "@/types";
import { 
  formatCurrency, calculatePercentageChange
} from "@/utils/formatters";
import { 
  getTodaySales, getYesterdaySales,
  getTodayExpenses, getYesterdayExpenses,
  getLowStockProducts, getMostRecentProductsList,
  loadStoreData
} from "@/utils/localStorage";
import { StatCards } from "./StatCards";
import { TodaySales } from "./TodaySales";
import { TopSellingProducts } from "./TopSellingProducts";
import { LowStockAlert } from "./LowStockAlert";
import { RecentProducts } from "./RecentProducts";
import { SalesChart } from "./SalesChart";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";
import { useLocale } from "@/hooks/useLocale";

export function UnifiedDashboard() {
  const { t, locale } = useLocale();
  
  const [salesStat, setSalesStat] = useState<FormattedStat>({ 
    value: formatCurrency(0), 
    change: 0, 
    isPositive: true,
    label: t('totalSalesToday'),
  });
  
  const [expensesStat, setExpensesStat] = useState<FormattedStat>({ 
    value: formatCurrency(0), 
    change: 0, 
    isPositive: false,
    label: t('totalExpenses'),
  });
  
  const [inventoryStat, setInventoryStat] = useState<FormattedStat>({ 
    value: "0", 
    change: 0, 
    isPositive: true,
    label: t('productsInStock'),
  });

  const [todaySalesData, setTodaySalesData] = useState<DailySale[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<Array<{
    productName: string;
    totalQuantity: number;
    totalAmount: number;
  }>>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  
  useEffect(() => {
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
    const lowStockCount = getLowStockProducts();
    
    setInventoryStat({
      value: `${storeData.products.length} ${t('product')}`,
      change: 0,
      isPositive: true,
      label: t('productsInStock'),
    });
    
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
    }, [] as Array<{
      productName: string;
      totalQuantity: number;
      totalAmount: number;
    }>);

    setTopSellingProducts(
      salesByProduct.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5)
    );
  }, [t]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('mainDashboard')}
            </h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">{t('comprehensiveManagement')}</p>
          </div>
          <div className={locale === 'ar' ? "text-right" : "text-left"}>
            <p className="text-xs md:text-sm text-gray-500">{t('today')}</p>
            <p className="text-sm md:text-lg font-semibold text-gray-800">
              {new Date().toLocaleDateString(locale === 'ar' ? 'en-GB' : 'fr-FR')}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-6 space-y-6 md:space-y-8 py-4 md:py-6">
        {/* Stats Cards */}
        <StatCards 
          salesStat={salesStat}
          expensesStat={expensesStat}
          inventoryStat={inventoryStat}
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6">
            <TodaySales sales={todaySalesData} />
            <TopSellingProducts products={topSellingProducts} />
          </div>
          
          <div className="space-y-6">
            <SalesChart />
            <RecentActivity />
          </div>
        </div>

        {/* Secondary Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <LowStockAlert count={getLowStockProducts()} />
          <RecentProducts products={recentProducts} />
        </div>
      </div>
    </div>
  );
}
