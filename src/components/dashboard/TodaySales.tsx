
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
    <div className="arab-card card-sky">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">{t('todaySales')}</h2>
        <div className="text-arab-sky bg-arab-sky-light arab-icon-bg">
          <ShoppingCart size={20} />
        </div>
      </div>
      
      <div className="space-y-4">
        {sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isRTL ? "text-right" : "text-left"}>
                  <th className="p-2">{t('productColumn')}</th>
                  <th className="p-2">{t('quantityColumn')}</th>
                  <th className="p-2">{t('remainingColumn')}</th>
                  <th className="p-2">{t('totalColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t">
                    <td className="p-2">{sale.productName}</td>
                    <td className="p-2">{sale.quantity}</td>
                    <td className="p-2">
                      <span className={sale.remainingQuantity !== undefined && sale.remainingQuantity < 10 ? "text-red-500 font-bold" : ""}>
                        {sale.remainingQuantity !== undefined ? sale.remainingQuantity : "-"}
                      </span>
                    </td>
                    <td className="p-2">{formatCurrency(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {t('noSalesToday')}
          </p>
        )}
      </div>
    </div>
  );
}
