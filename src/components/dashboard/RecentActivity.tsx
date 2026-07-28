
import { useEffect, useState } from "react";
import { loadStoreData } from "@/utils/localStorage";
import { formatCurrency } from "@/utils/formatters";
import { Activity, Clock } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'product';
  description: string;
  amount?: number;
  time: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { t, locale, isRTL } = useLocale();

  useEffect(() => {
    const storeData = loadStoreData();
    const today = new Date().toISOString().split('T')[0];
    
    const recentActivities: ActivityItem[] = [];
    
    // Add recent sales
    const recentSales = storeData.dailySales
      .filter(sale => sale.date.startsWith(today))
      .slice(-5)
      .map(sale => ({
        id: sale.id,
        type: 'sale' as const,
        description: `${t('saleSingle')} ${sale.productName} - ${t('quantityColumn')}: ${sale.quantity}`,
        amount: sale.total,
        time: new Date(sale.date).toLocaleTimeString(locale === 'ar' ? 'en-GB' : 'fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
    
    // Add recent expenses
    const recentExpenses = storeData.expenses
      .filter(expense => expense.date.startsWith(today))
      .slice(-3)
      .map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        description: `${t('expenseSingle')}: ${expense.description}`,
        amount: expense.amount,
        time: new Date(expense.date).toLocaleTimeString(locale === 'ar' ? 'en-GB' : 'fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));
    
    recentActivities.push(...recentSales, ...recentExpenses);
    
    // Sort by time (most recent first)
    recentActivities.sort((a, b) => b.time.localeCompare(a.time));
    
    setActivities(recentActivities.slice(0, 8));
  }, [t, locale]);

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'text-green-600 bg-green-50';
      case 'expense':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          {t('recentActivity')}
        </h2>
        <Clock className="w-4 h-4 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type)}`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
              {activity.amount && (
                <div className={isRTL ? "text-left" : "text-right"}>
                  <p className={`text-sm font-semibold ${
                    activity.type === 'sale' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.type === 'sale' ? '+' : '-'}{formatCurrency(activity.amount)}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('noRecentActivity')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
