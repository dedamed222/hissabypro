
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { History } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface RecentProductsProps {
  products: Product[];
}

export function RecentProducts({ products }: RecentProductsProps) {
  const { t, isRTL } = useLocale();
  
  return (
    <div className="arab-card card-lime">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">{t('recentlyUsedProducts')}</h2>
        <div className="text-arab-lime bg-arab-lime-light arab-icon-bg">
          <History size={20} />
        </div>
      </div>
      
      {products.length > 0 ? (
        <div className="overflow-hidden">
          <ul className="space-y-1">
            {products.map((product) => (
              <li 
                key={product.id}
                className="flex items-center justify-between bg-white/80 p-2 rounded-md"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.code}</p>
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p className="font-medium">
                    {formatCurrency(product.price)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('stock')}: {product.quantity}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500">{t('noRecentProducts')}</p>
      )}
    </div>
  );
}
