
import { useEffect, useState } from "react";
import { loadStoreData } from "@/utils/localStorage";
import { formatCurrency } from "@/utils/formatters";
import { Activity } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'product';
  description: string;
  amount?: number;
  time: string;
}

const typeConfig = {
  sale: {
    dot: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    text: "#10b981",
    prefix: "+"
  },
  expense: {
    dot: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    text: "#ef4444",
    prefix: "-"
  },
  product: {
    dot: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
    text: "#6366f1",
    prefix: ""
  }
};

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { t, locale } = useLocale();

  useEffect(() => {
    const storeData = loadStoreData();
    const today = new Date().toISOString().split('T')[0];
    const recentActivities: ActivityItem[] = [];

    const recentSales = storeData.dailySales
      .filter(sale => sale.date.startsWith(today))
      .slice(-5)
      .map(sale => ({
        id: sale.id,
        type: 'sale' as const,
        description: `${t('saleSingle')} ${sale.productName}`,
        amount: sale.total,
        time: new Date(sale.date).toLocaleTimeString(locale === 'ar' ? 'en-GB' : 'fr-FR', {
          hour: '2-digit', minute: '2-digit'
        })
      }));

    const recentExpenses = storeData.expenses
      .filter(expense => expense.date.startsWith(today))
      .slice(-3)
      .map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        description: `${t('expenseSingle')}: ${expense.description}`,
        amount: expense.amount,
        time: new Date(expense.date).toLocaleTimeString(locale === 'ar' ? 'en-GB' : 'fr-FR', {
          hour: '2-digit', minute: '2-digit'
        })
      }));

    recentActivities.push(...recentSales, ...recentExpenses);
    recentActivities.sort((a, b) => b.time.localeCompare(a.time));
    setActivities(recentActivities.slice(0, 8));
  }, [t, locale]);

  return (
    <div className="dashboard-section p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #6366f1, #8b5cf6)" }} />
          {t('recentActivity')}
        </h2>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
          <Activity size={16} />
        </div>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map((activity) => {
            const cfg = typeConfig[activity.type];
            return (
              <div key={activity.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60 hover:bg-gray-50 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: cfg.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{activity.description}</p>
                  <p className="text-[0.65rem] text-gray-400">{activity.time}</p>
                </div>
                {activity.amount && (
                  <p className="text-xs font-bold flex-shrink-0" style={{ color: cfg.text }}>
                    {cfg.prefix}{formatCurrency(activity.amount)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Activity size={32} className="mb-2 opacity-40" />
          <p className="text-xs">{t('noRecentActivity')}</p>
        </div>
      )}
    </div>
  );
}
