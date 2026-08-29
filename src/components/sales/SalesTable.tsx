
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { Trash, DollarSign, CreditCard, Banknote, List } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailySale } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import { TranslationKey } from "@/locales";

interface SalesTableProps {
  filteredSales: DailySale[];
  totalSales: number;
  onDelete: (sale: DailySale) => void;
}

export const SalesTable = ({ filteredSales, totalSales, onDelete }: SalesTableProps) => {
  const { t } = useLocale();

  const translateMethod = (method: string) => {
    const methodLower = method?.toLowerCase();
    if (methodLower === 'cash' || method === 'نقدي') return t('cash');
    if (methodLower === 'bank' || method === 'تحويل بنكي') return t('bankTransfer');
    if (methodLower === 'electronic' || method === 'دفع إلكتروني') return t('electronicPayment');

    // Check if it's a known key in our translations
    const keys: TranslationKey[] = ['cash', 'card', 'transfer', 'bankTransfer', 'electronicPayment', 'creditPayment'];
    if (keys.includes(methodLower as TranslationKey)) return t(methodLower as TranslationKey);

    return method;
  };

  const getPaymentMethodIcon = (method: string) => {
    const methodLower = method?.toLowerCase();
    switch (methodLower) {
      case 'cash':
      case 'نقدي':
        return <Banknote className="w-5 h-5" />;
      case 'bank':
      case 'تحويل بنكي':
      case 'electronic':
      case 'دفع إلكتروني':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          {t('dailySalesDetails')} ({filteredSales.length} {t('operations')})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow-none">
          <Table className="block md:table">
            <TableHeader className="hidden md:table-header-group">
              <TableRow className="bg-gray-100">
                <TableHead className="text-right font-semibold">{t('date')}</TableHead>
                <TableHead className="text-right font-semibold">{t('productCode')}</TableHead>
                <TableHead className="text-right font-semibold">{t('productName')}</TableHead>
                <TableHead className="text-right font-semibold">{t('quantity')}</TableHead>
                <TableHead className="text-right font-semibold">{t('unitPrice')}</TableHead>
                <TableHead className="text-right font-semibold">{t('paymentMethod')}</TableHead>
                <TableHead className="text-right font-semibold">{t('total')}</TableHead>
                <TableHead className="text-right font-semibold">{t('remainingQuantityColumn')}</TableHead>
                <TableHead className="text-center font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="block md:table-row-group">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale, index) => (
                  <TableRow key={sale.id || index} className="mobile-card-row hover:bg-gray-50">
                    <TableCell data-label={t('date')} className="font-medium">{sale.date}</TableCell>
                    <TableCell data-label={t('productCode')}>
                      <Badge variant="outline" className="font-mono">
                        {sale.productCode}
                      </Badge>
                    </TableCell>
                    <TableCell data-label={t('productName')} className="font-medium">{sale.productName}</TableCell>
                    <TableCell data-label={t('quantity')} className="text-center">{sale.quantity}</TableCell>
                    <TableCell data-label={t('unitPrice')}>{formatCurrency(sale.unitPrice)}</TableCell>
                    <TableCell data-label={t('paymentMethod')}>
                      <div className="flex items-center gap-2 justify-end md:justify-start">
                        {getPaymentMethodIcon(sale.paymentMethod)}
                        <span>{translateMethod(sale.paymentMethod)}</span>
                      </div>
                    </TableCell>
                    <TableCell data-label={t('total')} className="font-bold text-green-600">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell data-label={t('remainingQuantityColumn')} className="text-center">
                      <span className={sale.remainingQuantity !== undefined && sale.remainingQuantity < 10 ? "text-red-500 font-bold" : ""}>
                        {sale.remainingQuantity !== undefined ? sale.remainingQuantity : t('notAvailable')}
                      </span>
                    </TableCell>
                    <TableCell data-label={t('actions')} className="text-center">
                      <div className="flex justify-end md:justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(sale)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500 block md:table-cell">
                    {t('noSalesFoundPeriod')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {filteredSales.length > 0 && (
              <tfoot className="block md:table-footer-group">
                <TableRow className="bg-gray-50 border-t-2 border-gray-300 flex flex-col md:table-row">
                  <TableCell colSpan={6} className="font-bold text-right hidden md:table-cell">{t('grandTotal')}:</TableCell>
                  <TableCell className="font-bold text-green-600 text-lg flex justify-between md:table-cell">
                    <span className="md:hidden text-gray-500 text-sm">{t('grandTotal')}:</span>
                    {formatCurrency(totalSales)}
                  </TableCell>
                  <TableCell colSpan={2} className="hidden md:table-cell"></TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
