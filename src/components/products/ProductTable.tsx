import { formatCurrency, formatShortDate } from "@/utils/formatters";
import { AlertTriangle, Edit, Trash2 } from "lucide-react";
import type { Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";
interface ProductTableProps {
  products: Product[];
  searchQuery: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}
export default function ProductTable({
  products,
  searchQuery,
  onEdit,
  onDelete
}: ProductTableProps) {
  const { t } = useLocale();

  return <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="arab-table">
        <thead className="bg-gray-50">
          <tr>
            <th className="font-medium">{t('code')}</th>
            <th className="font-medium">{t('name')}</th>
            <th className="font-medium">{t('costPrice')}</th>
            <th className="font-medium">{t('sellingPrice')}</th>
            <th className="font-medium">{t('profit')}</th>
            <th className="font-medium">{t('addedQuantity')}</th>
            <th className="font-medium">{t('availableQuantity')}</th>
            <th className="font-medium my-0">{t('productCategory')}</th>
            <th className="font-medium">{t('stock')}</th>
            <th className="font-medium">{t('lastUpdated')}</th>
            <th className="font-medium">{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {products.length > 0 ? products.map(product => {
          const profit = product.price - product.cost;
          const profitMargin = product.cost > 0 ? profit / product.cost * 100 : 0;
          return <tr key={product.id} className="mx-[5px] py-[5px]">
                  <td className="px-[20px] my-0 py-[5px] mx-[10px]">{product.code}</td>
                  <td>{product.name}</td>
                  <td>{formatCurrency(product.cost)}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className={profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-gray-600"}>
                        {formatCurrency(profit)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({profitMargin.toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td>{product.quantity + (product.sold || 0)}</td>
                  <td>
                    <span className={product.quantity <= product.lowStockThreshold ? "inline-flex items-center text-amber-600 gap-1" : "text-green-600"}>
                      {product.quantity}
                      {product.quantity <= product.lowStockThreshold && <>
                          &nbsp;
                          <AlertTriangle size={14} />
                        </>}
                    </span>
                  </td>
                  <td>{product.category || "-"}</td>
                  <td>
                    {product.quantity <= product.lowStockThreshold ? <span className="text-amber-600 font-semibold">{t('lowStock')}</span> : <span className="text-green-600 font-semibold">{t('available')}</span>}
                  </td>
                  <td>{formatShortDate(product.updatedAt)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(product)} className="text-blue-600 hover:text-blue-800" title={t('edit')}>
                        <Edit size={18} />
                      </button>
                      <button onClick={() => onDelete(product)} className="text-red-600 hover:text-red-800" title={t('delete')}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>;
        }) : <tr>
              <td colSpan={11} className="text-center py-4 text-gray-500">
                {searchQuery ? t('noSearchResults') : t('noProductsAdded')}
              </td>
            </tr>}
        </tbody>
      </table>
    </div>;
}