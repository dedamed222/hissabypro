
import { RotateCcw } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface LowStockAlertProps {
  count: number;
}

export function LowStockAlert({ count }: LowStockAlertProps) {
  const { t } = useLocale();

  return (
    <div className={`dashboard-section p-4 md:p-5 ${count > 0 ? "border-amber-200/60" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full"
            style={{ background: count > 0 ? "linear-gradient(180deg, #f59e0b, #f97316)" : "linear-gradient(180deg, #10b981, #06b6d4)" }} />
          {t('productAlert')}
        </h2>
        <div className="p-1.5 rounded-lg"
          style={{
            background: count > 0 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
            color: count > 0 ? "#f59e0b" : "#10b981"
          }}>
          <RotateCcw size={16} />
        </div>
      </div>

      <div className={`flex items-center gap-3 p-3 rounded-xl ${count > 0 ? "bg-amber-50/50" : "bg-emerald-50/50"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${
          count > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
        }`}>
          {count}
        </div>
        <div>
          <p className={`text-sm font-semibold ${count > 0 ? "text-amber-700" : "text-emerald-700"}`}>
            {count > 0 ? `${count} ${t('productsNearDepletion')}` : t('allProductsInStock')}
          </p>
          {count > 0 && (
            <a href="/inventory" className="text-[0.7rem] text-amber-600 hover:text-amber-800 font-medium underline-offset-2 hover:underline">
              {t('viewProducts')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
