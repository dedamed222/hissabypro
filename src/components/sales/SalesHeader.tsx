
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { ShoppingCart, TrendingUp } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface SalesHeaderProps {
  totalSales: number;
}

export const SalesHeader = ({ totalSales }: SalesHeaderProps) => {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <ShoppingCart className="w-8 h-8 text-blue-600" />
        {t('dailySales')}
      </h1>
      <div className="flex gap-4 items-center">
        <Badge variant="outline" className="text-lg px-4 py-2">
          <TrendingUp className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
          {t('totalSales')}: {formatCurrency(totalSales)}
        </Badge>
      </div>
    </div>
  );
};
