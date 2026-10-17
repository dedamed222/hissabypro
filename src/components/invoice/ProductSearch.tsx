import React from "react";
import { Search, Plus, Check, Tag } from "lucide-react";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";

interface ProductSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredProducts: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  quantity: number;
  manualQuantity: number | null;
  handleQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProductSearch = ({
  searchTerm,
  setSearchTerm,
  filteredProducts,
  selectedProduct,
  setSelectedProduct,
  quantity,
  manualQuantity,
  handleQuantityChange,
}: ProductSearchProps) => {
  const { t } = useLocale();

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('addProducts') || 'اختيار الأصناف'}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            id="product-search-input"
            type="text"
            placeholder={t('searchProductPlaceholder') || 'ابحث برمز الصنف، الاسم، أو الفئة...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            title={t('productSearch')}
          />
        </div>

        <div>
          <input
            id="product-quantity-input"
            type="number"
            min="1"
            value={manualQuantity !== null ? manualQuantity : quantity}
            onChange={handleQuantityChange}
            className="w-full p-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans text-center transition-all"
            placeholder={t('quantity') || 'الكمية'}
            title={t('quantity')}
          />
        </div>
      </div>

      {searchTerm && (
        <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="py-2.5 px-3">الرمز</th>
                <th className="py-2.5 px-3">اسم المنتج</th>
                <th className="py-2.5 px-3 text-center">سعر البيع</th>
                <th className="py-2.5 px-3 text-center">المتوفر</th>
                <th className="py-2.5 px-3 text-center">اختيار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  const isOut = Number(product.quantity || 0) <= 0;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50 text-blue-900 font-bold" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono">{product.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{product.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600 font-sans">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-sans font-bold ${
                          isOut ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                          className={`p-1 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected ? <Check size={14} /> : <Plus size={14} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    لا توجد منتجات مطابقة لـ "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
