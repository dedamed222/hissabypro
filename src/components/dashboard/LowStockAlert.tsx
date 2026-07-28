
import { RotateCcw } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface LowStockAlertProps {
  count: number;
}

export function LowStockAlert({ count }: LowStockAlertProps) {
  const { t } = useLocale();
  
  return (
    <div className="arab-card card-orange">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">{t('productAlert')}</h2>
        <div className="text-arab-orange bg-arab-orange-light arab-icon-bg">
          <RotateCcw size={20} />
        </div>
      </div>
      <p className="text-lg">
        {count} {t('productsNearDepletion')}
      </p>
      <div className="mt-2">
        <a 
          href="/inventory" 
          className="text-sm text-arab-orange hover:text-arab-orange-dark"
        >
          {t('viewProducts')} &larr;
        </a>
      </div>
    </div>
  );
}
