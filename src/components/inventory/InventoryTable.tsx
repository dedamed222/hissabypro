import React, { useMemo } from "react";
import { formatCurrency } from "@/utils/formatters";
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  PackageCheck,
  DollarSign,
  TrendingUp,
  Tag,
  Warehouse,
  Filter,
  X,
  ChevronDown,
  Layers
} from "lucide-react";
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
  // Compute key inventory metrics
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalQty = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    const totalCostValue = products.reduce((acc, p) => acc + ((Number(p.cost) || 0) * (Number(p.quantity) || 0)), 0);
    const totalSaleValue = products.reduce((acc, p) => acc + ((Number(p.price) || 0) * (Number(p.quantity) || 0)), 0);
    const expectedProfit = totalSaleValue - totalCostValue;

    const availableProducts = products.filter(p => p.quantity > p.lowStockThreshold);
    const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
    const outOfStockProducts = products.filter(p => p.quantity <= 0);

    return {
      totalCount,
      totalQty,
      totalCostValue,
      totalSaleValue,
      expectedProfit,
      availableCount: availableProducts.length,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
    };
  }, [products]);

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
    <div className="space-y-5">
      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Stock Value */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">إجمالي قيمة المخزون</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{formatCurrency(stats.totalSaleValue)}</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              التكلفة: {formatCurrency(stats.totalCostValue)}
            </p>
          </div>
        </div>

        {/* Available Items */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <PackageCheck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">منتجات متوفرة بكثرة</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.availableCount}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
              من أصل {stats.totalCount} منتج
            </p>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">قاربت على النفاذ</p>
            <h3 className="text-xl font-black text-amber-600 mt-0.5">{stats.lowStockCount}</h3>
            <p className="text-[11px] font-bold text-amber-600 mt-0.5">
              تحتاج لإعادة طلب
            </p>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">نفذت الكمية تماماً</p>
            <h3 className="text-xl font-black text-rose-600 mt-0.5">{stats.outOfStockCount}</h3>
            <p className="text-[11px] font-bold text-rose-500 mt-0.5">
              غير متاحة للبيع
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="gsc-card p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="البحث باسم المنتج، كود الصنف، أو الفئة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Stock Filter Select */}
          <div className="relative min-w-[200px]">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter size={16} />
            </div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 text-sm pr-9 pl-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all"
            >
              <option value="all">جميع الحالات</option>
              <option value="available">المتوفر فقط</option>
              <option value="low">المخزون المنخفض</option>
              <option value="out">نفذت الكمية</option>
            </select>
            <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* Export Action */}
          <div className="shrink-0">
            <ExportActions
              data={filteredProducts}
              filename={`inventory_${warehouseName}`}
              title={`تقرير المخزون - ${warehouseName}`}
              columns={exportColumns}
            />
          </div>
        </div>

        {/* Quick Filter Tag Buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 ml-1">تصفية حسب الحالة:</span>
          {[
            { id: 'all', label: 'الكل', count: products.length },
            { id: 'available', label: 'متوفر', count: stats.availableCount },
            { id: 'low', label: 'منخفض', count: stats.lowStockCount },
            { id: 'out', label: 'نفذت الكمية', count: stats.outOfStockCount }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStockFilter(tab.id)}
              className={`text-xs px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                stockFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-sans ${
                stockFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
          <div className="mr-auto text-xs font-medium text-slate-500">
            المعروض: <span className="font-bold text-slate-900">{filteredProducts.length}</span> منتج
          </div>
        </div>
      </div>

      {/* ── Products Table Card ── */}
      <div className="gsc-card overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Layers size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد منتجات مطابقة</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || stockFilter !== "all"
                ? "لا توجد نتائج تطابق معايير البحث والفلترة المحددة في هذا المخزن."
                : "لم يتم العثور على أي منتجات مخزنة في هذا القسم."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">كود الصنف</th>
                  <th className="py-3.5 px-4">اسم المنتج</th>
                  <th className="py-3.5 px-4 text-center">سعر الشراء</th>
                  <th className="py-3.5 px-4 text-center">سعر البيع</th>
                  <th className="py-3.5 px-4 text-center">الربح المتوقع</th>
                  <th className="py-3.5 px-4 text-center">الكمية الحالية</th>
                  <th className="py-3.5 px-4 text-left">إجمالي القيمة</th>
                  <th className="py-3.5 px-4 text-center">حالة المخزون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.quantity === 0;
                  const isLowStock = product.quantity > 0 && product.quantity <= product.lowStockThreshold;
                  const profit = (Number(product.price) || 0) - (Number(product.cost) || 0);
                  const profitMargin = product.cost > 0 ? ((profit / product.cost) * 100) : 0;
                  const totalValue = (Number(product.price) || 0) * (Number(product.quantity) || 0);

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Product Code */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {product.code || "---"}
                        </span>
                      </td>

                      {/* Product Name & Category */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block">
                            {product.name}
                          </span>
                          {product.category && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Tag size={10} />
                              {product.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600 font-sans">
                        {formatCurrency(product.cost)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-blue-600 font-sans">
                          {formatCurrency(product.price)}
                        </span>
                      </td>

                      {/* Profit */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold font-sans text-xs ${
                            profit > 0 ? "text-emerald-600" : profit < 0 ? "text-rose-600" : "text-slate-500"
                          }`}>
                            {formatCurrency(profit)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            ({profitMargin.toFixed(0)}%)
                          </span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className={`text-base font-black font-sans ${
                            isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-slate-900"
                          }`}>
                            {product.quantity}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            / أدنى: {product.lowStockThreshold}
                          </span>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3.5 px-4 text-left font-black text-slate-900 font-sans">
                        {formatCurrency(totalValue)}
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            نفذت الكمية
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            منخفض
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            متوفر
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
