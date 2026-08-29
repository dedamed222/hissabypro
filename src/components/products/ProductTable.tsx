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

  return <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow-none">
    <table className="arab-table block md:table w-full">
      <thead className="bg-gray-50 hidden md:table-header-group">
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
      <tbody className="block md:table-row-group">
        {products.length > 0 ? products.map(product => {
          const profit = product.price - product.cost;
          const profitMargin = product.cost > 0 ? profit / product.cost * 100 : 0;
          return <tr key={product.id} className="hover:bg-gray-50 mobile-card-row">
            <td data-label={t('code')} className="font-medium">{product.code}</td>
            <td data-label={t('name')} className="font-bold text-gray-900">{product.name}</td>
            <td data-label={t('costPrice')}>{formatCurrency(product.cost)}</td>
            <td data-label={t('sellingPrice')} className="font-bold text-blue-600">{formatCurrency(product.price)}</td>
            <td data-label={t('profit')}>
              <div className="flex flex-col items-end md:items-start">
                <span className={profit > 0 ? "text-green-600 font-bold" : profit < 0 ? "text-red-600 font-bold" : "text-gray-600 font-bold"}>
                  {formatCurrency(profit)}
                </span>
                <span className="text-xs text-gray-500">
                  ({profitMargin.toFixed(1)}%)
                </span>
              </div>
            </td>
            <td data-label={t('addedQuantity')}>{product.quantity + (product.sold || 0)}</td>
            <td data-label={t('availableQuantity')}>
              <span className={product.quantity <= product.lowStockThreshold ? "inline-flex items-center text-amber-600 gap-1 font-bold" : "text-green-600 font-bold"}>
                {product.quantity}
                {product.quantity <= product.lowStockThreshold && <>
                  &nbsp;
                  <AlertTriangle size={14} />
                </>}
              </span>
            </td>
            <td data-label={t('productCategory')}>{product.category || "-"}</td>
            <td data-label={t('stock')}>
              {product.quantity <= product.lowStockThreshold ? <span className="text-amber-600 font-semibold">{t('lowStock')}</span> : <span className="text-green-600 font-semibold">{t('available')}</span>}
            </td>
            <td data-label={t('lastUpdated')} className="text-sm text-gray-500">{formatShortDate(product.updatedAt)}</td>
            <td data-label={t('actions')} className="mt-2 md:mt-0 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
              <div className="flex items-center justify-end gap-3 w-full md:w-auto">
                <button onClick={() => onEdit(product)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors" title={t('edit')}>
                  <Edit size={16} />
                  <span className="md:hidden text-sm font-medium">{t('edit')}</span>
                </button>
                <button onClick={() => onDelete(product)} className="flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors" title={t('delete')}>
                  <Trash2 size={16} />
                  <span className="md:hidden text-sm font-medium">{t('delete')}</span>
                </button>
              </div>
            </td>
          </tr>;
        }) : <tr className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
          <td colSpan={11} className="text-center py-8 text-gray-500 block md:table-cell">
            {searchQuery ? t('noSearchResults') : t('noProductsAdded')}
          </td>
        </tr>}
      </tbody>
    </table>
  </div>;
}