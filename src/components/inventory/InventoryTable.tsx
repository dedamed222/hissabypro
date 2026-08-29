
import React from "react";
import { formatCurrency } from "@/utils/formatters";
import { AlertTriangle, Search, Printer } from "lucide-react";
import { Product } from "@/types";
import ExportActions from "@/components/shared/ExportActions";

interface InventoryTableProps {
  products: Product[];
  filteredProducts: Product[];
  lowStockCount: number;
  searchQuery: string;
  stockFilter: string;
  setSearchQuery: (query: string) => void;
  setStockFilter: (filter: string) => void;
  warehouseName: string;
}

export default function InventoryTable({
  products,
  filteredProducts,
  lowStockCount,
  searchQuery,
  stockFilter,
  setSearchQuery,
  setStockFilter,
  warehouseName
}: InventoryTableProps) {
  const exportColumns = [
    { key: 'code', header: 'رمز المنتج' },
    { key: 'name', header: 'اسم المنتج' },
    { key: 'cost', header: 'سعر الشراء', render: (item: Product) => formatCurrency(item.cost) },
    { key: 'price', header: 'سعر البيع', render: (item: Product) => formatCurrency(item.price) },
    { key: 'profit', header: 'الربح', render: (item: Product) => formatCurrency(item.price - item.cost) },
    { key: 'quantity', header: 'الكمية' },
    { key: 'totalValue', header: 'القيمة الإجمالية', render: (item: Product) => formatCurrency(item.price * item.quantity) },
    { key: 'lowStockThreshold', header: 'الحد الأدنى' },
    {
      key: 'status',
      header: 'حالة المخزون',
      render: (item: Product) => {
        const isOutOfStock = item.quantity === 0;
        const isLowStock = item.quantity <= item.lowStockThreshold;
        return isOutOfStock ? 'نفذت الكمية' : isLowStock ? 'منخفض' : 'متوفر';
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{warehouseName}</h2>

        <div className="flex items-center gap-4">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
              <AlertTriangle size={18} />
              <span>{lowStockCount} منتجات قاربت على النفاذ</span>
            </div>
          )}

          <ExportActions
            data={filteredProducts}
            filename={`inventory_${warehouseName}`}
            title={`تقرير المخزون - ${warehouseName}`}
            columns={exportColumns}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <img
              src="/lovable-uploads/9bf8f3b6-2cd1-4788-a907-3ea9cb2eb6fc.png"
              alt="Hissaby Pro"
              className="h-5 w-5 mr-1"
            />
            <Search className="text-gray-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="البحث في المخزون..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue bg-white"
          />
        </div>

        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-arab-blue bg-white"
        >
          <option value="all">جميع المنتجات</option>
          <option value="low">المخزون المنخفض</option>
          <option value="available">المتوفر</option>
          <option value="out">نفذت الكمية</option>
        </select>
      </div>

      {/* Inventory stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="arab-card bg-blue-50 border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-1">إجمالي المنتجات</h3>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>

        <div className="arab-card bg-green-50 border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-1">المنتجات المتوفرة</h3>
          <p className="text-2xl font-bold">
            {products.filter(p => p.quantity > p.lowStockThreshold).length}
          </p>
        </div>

        <div className="arab-card bg-amber-50 border-amber-100">
          <h3 className="text-sm font-medium text-amber-700 mb-1">المخزون المنخفض</h3>
          <p className="text-2xl font-bold">{lowStockCount}</p>
        </div>

        <div className="arab-card bg-red-50 border-red-100">
          <h3 className="text-sm font-medium text-red-700 mb-1">نفذت الكمية</h3>
          <p className="text-2xl font-bold">
            {products.filter(p => p.quantity === 0).length}
          </p>
        </div>
      </div>

      {/* Inventory table */}
      <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow-none">
        <table className="arab-table block md:table w-full">
          <thead className="bg-gray-50 hidden md:table-header-group">
            <tr>
              <th className="font-medium">رمز المنتج</th>
              <th className="font-medium">اسم المنتج</th>
              <th className="font-medium">سعر الشراء</th>
              <th className="font-medium">سعر البيع</th>
              <th className="font-medium">الربح</th>
              <th className="font-medium">الكمية</th>
              <th className="font-medium">القيمة الإجمالية</th>
              <th className="font-medium">الحد الأدنى</th>
              <th className="font-medium">حالة المخزون</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const isLowStock = product.quantity <= product.lowStockThreshold;
                const isOutOfStock = product.quantity === 0;
                const profit = product.price - product.cost;
                const profitMargin = product.cost > 0 ? ((profit / product.cost) * 100) : 0;

                return (
                  <tr
                    key={product.id}
                    className={`mobile-card-row ${isOutOfStock
                        ? "border-red-200"
                        : isLowStock
                          ? "border-amber-200"
                          : ""
                      }`}
                  >
                    <td data-label="رمز المنتج" className="font-mono text-sm">{product.code}</td>
                    <td data-label="اسم المنتج" className="font-bold text-gray-900">{product.name}</td>
                    <td data-label="سعر الشراء">{formatCurrency(product.cost)}</td>
                    <td data-label="سعر البيع" className="font-bold text-blue-600">{formatCurrency(product.price)}</td>
                    <td data-label="الربح">
                      <div className="flex flex-col items-end md:items-start">
                        <span className={`font-bold ${profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-gray-600"}`}>
                          {formatCurrency(profit)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({profitMargin.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                    <td data-label="الكمية" className="font-bold text-lg">{product.quantity}</td>
                    <td data-label="القيمة الإجمالية" className="font-semibold">{formatCurrency(product.price * product.quantity)}</td>
                    <td data-label="الحد الأدنى">{product.lowStockThreshold}</td>
                    <td data-label="حالة المخزون">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                          <AlertTriangle size={12} />
                          نفذت الكمية
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
                          <AlertTriangle size={12} />
                          منخفض
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                          متوفر
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
                <td colSpan={9} className="text-center py-8 text-gray-500 block md:table-cell">
                  {searchQuery || stockFilter !== "all"
                    ? "لا توجد منتجات مطابقة للفلترة"
                    : "لا توجد منتجات في المخزون"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
