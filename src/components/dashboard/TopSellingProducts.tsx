
import { formatCurrency } from "@/utils/formatters";
import { Package2 } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface TopProduct {
  productName: string;
  totalQuantity: number;
  totalAmount: number;
}

interface TopSellingProductsProps {
  products: TopProduct[];
}

export function TopSellingProducts({ products }: TopSellingProductsProps) {
  const { t, isRTL } = useLocale();
  
  return (
    <div className="arab-card card-emerald">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">{t('topSellingProducts')}</h2>
        <div className="text-arab-emerald bg-arab-emerald-light arab-icon-bg">
          <Package2 size={20} />
        </div>
      </div>
      
      <div className="space-y-4">
        {products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => (
              <div 
                key={product.productName}
                className="flex items-center justify-between p-2 bg-white/80 rounded-md"
              >
                <div>
                  <p className="font-medium">{product.productName}</p>
                  <p className="text-sm text-gray-500">
                    {t('quantitySold')}: {product.totalQuantity}
                  </p>
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <p className="font-semibold">
                    {formatCurrency(product.totalAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {t('noProductsSoldToday')}
          </p>
        )}
      </div>
    </div>
  );
}
