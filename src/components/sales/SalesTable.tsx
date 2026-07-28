
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
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
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale, index) => (
                  <TableRow key={sale.id || index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{sale.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {sale.productCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{sale.productName}</TableCell>
                    <TableCell className="text-center">{sale.quantity}</TableCell>
                    <TableCell>{formatCurrency(sale.unitPrice)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(sale.paymentMethod)}
                        <span>{translateMethod(sale.paymentMethod)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={sale.remainingQuantity !== undefined && sale.remainingQuantity < 10 ? "text-red-500 font-bold" : ""}>
                        {sale.remainingQuantity !== undefined ? sale.remainingQuantity : t('notAvailable')}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onDelete(sale)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {t('noSalesFoundPeriod')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {filteredSales.length > 0 && (
              <tfoot>
                <TableRow className="bg-gray-50 border-t-2 border-gray-300">
                  <TableCell colSpan={6} className="font-bold text-right">{t('grandTotal')}:</TableCell>
                  <TableCell className="font-bold text-green-600 text-lg">
                    {formatCurrency(totalSales)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
