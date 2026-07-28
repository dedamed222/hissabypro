
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash } from "lucide-react";
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

interface SalesListProps {
  sales: DailySale[];
  onEdit: (sale: DailySale) => void;
  onDelete: (sale: DailySale) => void;
}

export const SalesList = ({ sales, onEdit, onDelete }: SalesListProps) => {
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

  const getTransactionTypeKey = (paymentMethod: string): TranslationKey => {
    // This is a simple way to detect transaction type based on context
    return "normalSale"; // Default to regular sale for existing data
  };

  const getTransactionTypeBadge = (key: TranslationKey) => {
    const styles: Record<string, string> = {
      "normalSale": "bg-blue-100 text-blue-800",
      "transactionDebt": "bg-red-100 text-red-800", 
      "transactionCredit": "bg-green-100 text-green-800"
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[key] || styles["normalSale"]}`}>
        {t(key)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('salesList')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('transactionType')}</TableHead>
                <TableHead className="text-right">{t('productCode')}</TableHead>
                <TableHead className="text-right">{t('productName')}</TableHead>
                <TableHead className="text-right">{t('unitPrice')}</TableHead>
                <TableHead className="text-right">{t('quantity')}</TableHead>
                <TableHead className="text-right">{t('total')}</TableHead>
                <TableHead className="text-right">{t('paymentMethod')}</TableHead>
                <TableHead className="text-right">{t('date')}</TableHead>
                <TableHead className="text-right">{t('remainingQuantityColumn')}</TableHead>
                <TableHead className="text-left">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {getTransactionTypeBadge(getTransactionTypeKey(sale.paymentMethod || ""))}
                    </TableCell>
                    <TableCell>{sale.productCode}</TableCell>
                    <TableCell>{sale.productName}</TableCell>
                    <TableCell>{formatCurrency(sale.unitPrice)}</TableCell>
                    <TableCell>{sale.quantity}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell>{translateMethod(sale.paymentMethod || "")}</TableCell>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell>
                      <span className={sale.remainingQuantity !== undefined && sale.remainingQuantity < 10 ? "text-red-500 font-bold" : ""}>
                        {sale.remainingQuantity !== undefined ? sale.remainingQuantity : t('notAvailable')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEdit(sale)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onDelete(sale)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-4">
                    {t('noSalesToday')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
