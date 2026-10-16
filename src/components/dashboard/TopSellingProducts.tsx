
import { formatCurrency } from "@/utils/formatters";
import { Trophy } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface TopProduct {
  productName: string;
  totalQuantity: number;
  totalAmount: number;
}

interface TopSellingProductsProps {
  products: TopProduct[];
}

const rankColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function TopSellingProducts({ products }: TopSellingProductsProps) {
  const { t } = useLocale();

  return (
    <div className="dashboard-section p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #10b981, #06b6d4)" }} />
          {t('topSellingProducts')}
        </h2>
        <div className="p-1.5 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
          <Trophy size={16} />
        </div>
      </div>

      {products.length > 0 ? (
        <div className="space-y-2.5">
          {products.map((product, idx) => (
            <div key={product.productName}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60 hover:bg-gray-50 transition-colors">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: rankColors[idx] || "#6366f1" }}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{product.productName}</p>
                <p className="text-[0.65rem] text-gray-400">{t('quantitySold')}: {product.totalQuantity}</p>
              </div>
              <p className="text-xs font-bold flex-shrink-0" style={{ color: rankColors[idx] || "#6366f1" }}>
                {formatCurrency(product.totalAmount)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Trophy size={32} className="mb-2 opacity-40" />
          <p className="text-xs">{t('noProductsSoldToday')}</p>
        </div>
      )}
    </div>
  );
}
