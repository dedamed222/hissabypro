
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
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
            <TableBody>
              {transactionsWithProductDetails.length > 0 ? (
                transactionsWithProductDetails.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.productCode}</TableCell>
                    <TableCell>{transaction.productName}</TableCell>
                    <TableCell>{transaction.quantity}</TableCell>
                    <TableCell>{transaction.currentStock}</TableCell>
                    <TableCell>
                      {transaction.isLowStock ? (
                        <span className="flex items-center text-amber-600 gap-1">
                          <AlertTriangle size={14} />
                          {t.lowStock || "منخفض"}
                        </span>
                      ) : transaction.currentStock === 0 ? (
                        <span className="flex items-center text-red-600 gap-1">
                          <AlertTriangle size={14} />
                          {t.outOfStock || "نفذ"}
                        </span>
                      ) : (
                        <span className="text-green-600">{t.inStock || "متوفر"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
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
