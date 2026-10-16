
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { History } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface RecentProductsProps {
  products: Product[];
}

export function RecentProducts({ products }: RecentProductsProps) {
  const { t } = useLocale();

  return (
    <div className="dashboard-section p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #84cc16, #10b981)" }} />
          {t('recentlyUsedProducts')}
        </h2>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(132,204,22,0.1)", color: "#84cc16" }}>
          <History size={16} />
        </div>
      </div>

      {products.length > 0 ? (
        <div className="space-y-2">
          {products.map((product, idx) => (
            <div key={product.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `hsl(${(idx * 47) % 360}, 65%, 55%)` }}>
                {product.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{product.name}</p>
                <p className="text-[0.65rem] text-gray-400">{product.code}</p>
              </div>
              <div className="text-end flex-shrink-0">
                <p className="text-xs font-bold text-indigo-600">{formatCurrency(product.price)}</p>
                <p className="text-[0.65rem] text-gray-400">{t('stock')}: {product.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <History size={32} className="mb-2 opacity-40" />
          <p className="text-xs">{t('noRecentProducts')}</p>
        </div>
      )}
    </div>
  );
}
