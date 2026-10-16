
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { loadStoreData } from "@/utils/localStorage";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";

interface ChartData {
  name: string;
  amount: number;
}

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b"];

export function SalesChart() {
  const [salesData, setSalesData] = useState<ChartData[]>([]);
  const { t } = useLocale();

  useEffect(() => {
    const storeData = loadStoreData();
    const today = new Date().toISOString().split('T')[0];

    const groupedSales = storeData.dailySales
      .filter(sale => sale.date.startsWith(today))
      .reduce((acc, sale) => {
        const existing = acc.find(item => item.name === sale.productName);
        if (existing) {
          existing.amount += sale.total;
        } else {
          acc.push({ name: sale.productName, amount: sale.total });
        }
        return acc;
      }, [] as ChartData[]);

    setSalesData(groupedSales.sort((a, b) => b.amount - a.amount).slice(0, 5));
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2">
          <p className="text-xs font-semibold text-gray-700">{label}</p>
          <p className="text-sm font-bold text-indigo-600">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-section p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #6366f1, #0ea5e9)" }} />
          {t('salesDistribution')}
        </h2>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
          <BarChart3 size={16} />
        </div>
      </div>

      <div className="h-52">
        {salesData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                interval={0}
                height={50}
                angle={-35}
                textAnchor="end"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {salesData.map((_, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <BarChart3 size={32} className="mb-2 opacity-40" />
            <p className="text-xs">{t('noSalesToday')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
