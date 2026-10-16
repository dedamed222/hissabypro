
import { DailySale } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { ShoppingCart } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface TodaySalesProps {
  sales: DailySale[];
}

export function TodaySales({ sales }: TodaySalesProps) {
  const { t, isRTL } = useLocale();

  return (
    <div className="dashboard-section p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #0ea5e9, #06b6d4)" }} />
          {t('todaySales')}
        </h2>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9" }}>
          <ShoppingCart size={16} />
        </div>
      </div>

      {sales.length > 0 ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className={`${isRTL ? "text-right" : "text-left"} border-b border-gray-100`}>
                <th className="pb-2 px-1 font-semibold text-gray-500">{t('productColumn')}</th>
                <th className="pb-2 px-1 font-semibold text-gray-500">{t('quantityColumn')}</th>
                <th className="pb-2 px-1 font-semibold text-gray-500">{t('remainingColumn')}</th>
                <th className="pb-2 px-1 font-semibold text-gray-500">{t('totalColumn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2 px-1 font-medium text-gray-800">{sale.productName}</td>
                  <td className="py-2 px-1 text-gray-600">{sale.quantity}</td>
                  <td className="py-2 px-1">
                    <span className={sale.remainingQuantity !== undefined && sale.remainingQuantity < 10
                      ? "text-red-500 font-bold"
                      : "text-gray-600"}>
                      {sale.remainingQuantity !== undefined ? sale.remainingQuantity : "–"}
                    </span>
                  </td>
                  <td className="py-2 px-1 font-bold text-indigo-600">{formatCurrency(sale.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <ShoppingCart size={32} className="mb-2 opacity-40" />
          <p className="text-xs">{t('noSalesToday')}</p>
        </div>
      )}
    </div>
  );
}
