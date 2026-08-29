
import React from "react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DailySale, Product } from "@/types";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";

interface InventoryTransactionProps {
  transactions: DailySale[];
  products: Product[];
}

export function InventoryTransaction({ transactions, products }: InventoryTransactionProps) {
  const { locale } = useLocale();
  const t = translations[locale as keyof typeof translations];

  // Get product details for each transaction
  const transactionsWithProductDetails = transactions.map(transaction => {
    const product = products.find(p => p.id === transaction.productId);

    return {
      ...transaction,
      currentStock: product ? product.quantity : 0,
      lowStockThreshold: product ? product.lowStockThreshold : 0,
      isLowStock: product ? product.quantity <= product.lowStockThreshold : false
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.inventoryTransactions || "حركة المخزون"}</CardTitle>
        <div className="text-blue-600 bg-blue-100 p-2 rounded-full">
          <ShoppingCart size={18} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow-none">
          <Table className="block md:table">
            <TableHeader className="hidden md:table-header-group">
              <TableRow>
                <TableHead>{t.date || "التاريخ"}</TableHead>
                <TableHead>{t.productCode || "رمز المنتج"}</TableHead>
                <TableHead>
                  {locale === 'fr' ? "Nom du produit" : "اسم المنتج"}
                </TableHead>
                <TableHead>
                  {locale === 'fr' ? "Quantité vendue" : "الكمية المباعة"}
                </TableHead>
                <TableHead>{t.remainingStock || "المخزون المتبقي"}</TableHead>
                <TableHead>{t.stockStatus || "حالة المخزون"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="block md:table-row-group">
              {transactionsWithProductDetails.length > 0 ? (
                transactionsWithProductDetails.map(transaction => (
                  <TableRow key={transaction.id} className="mobile-card-row">
                    <TableCell data-label={t.date || "التاريخ"}>{formatDate(transaction.date)}</TableCell>
                    <TableCell data-label={t.productCode || "رمز المنتج"}>{transaction.productCode}</TableCell>
                    <TableCell data-label={locale === 'fr' ? "Nom du produit" : "اسم المنتج"}>{transaction.productName}</TableCell>
                    <TableCell data-label={locale === 'fr' ? "Quantité vendue" : "الكمية المباعة"}>{transaction.quantity}</TableCell>
                    <TableCell data-label={t.remainingStock || "المخزون المتبقي"}>{transaction.currentStock}</TableCell>
                    <TableCell data-label={t.stockStatus || "حالة المخزون"}>
                      {transaction.isLowStock ? (
                        <span className="flex items-center text-amber-600 gap-1 justify-end md:justify-start">
                          <AlertTriangle size={14} />
                          {t.lowStock || "منخفض"}
                        </span>
                      ) : transaction.currentStock === 0 ? (
                        <span className="flex items-center text-red-600 gap-1 justify-end md:justify-start">
                          <AlertTriangle size={14} />
                          {t.outOfStock || "نفذ"}
                        </span>
                      ) : (
                        <span className="text-green-600 flex justify-end md:justify-start">{t.inStock || "متوفر"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
                  <TableCell colSpan={6} className="text-center py-4 block md:table-cell">
                    {t.noTransactions || "لا توجد حركات مخزون"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default InventoryTransaction;
