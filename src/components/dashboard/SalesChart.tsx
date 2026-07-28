
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { loadStoreData } from "@/utils/localStorage";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";

interface ChartData {
  name: string;
  amount: number;
}

export function SalesChart() {
  const [salesData, setSalesData] = useState<ChartData[]>([]);
  const { t } = useLocale();

  useEffect(() => {
    const storeData = loadStoreData();
    const today = new Date().toISOString().split('T')[0];
    
    // Group sales by product name
    const groupedSales = storeData.dailySales
      .filter(sale => sale.date.startsWith(today))
      .reduce((acc, sale) => {
        const existing = acc.find(item => item.name === sale.productName);
        if (existing) {
          existing.amount += sale.total;
        } else {
          acc.push({
            name: sale.productName,
            amount: sale.total
          });
        }
        return acc;
      }, [] as ChartData[]);

    // Sort by amount and get top 5
    const topSales = groupedSales
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    setSalesData(topSales);
  }, []);

  return (
    <div className="arab-card card-indigo">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">{t('salesDistribution')}</h2>
        <div className="text-arab-indigo bg-arab-indigo-light arab-icon-bg">
          <BarChart3 size={20} />
        </div>
      </div>
      
      <div className="h-60">
        {salesData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12 }}
                interval={0}
                height={60}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), t('salesLabel')]}
                labelStyle={{ textAlign: 'right' }}
              />
              <Bar dataKey="amount" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-center">{t('noSalesToday')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
