import {
  Plus, Search, Edit, X, AlertCircle, Tag, Barcode, CircleDollarSign,
  Hash, User, Phone, CreditCard, ArrowRightLeft, ShoppingCart, Trash2, CheckCircle2, Calendar
} from "lucide-react";
import type { Product } from "@/types";
import type { CartItem } from "@/hooks/useSalesForm";
import ProductSearch from "./ProductSearch";
import { useLocale } from "@/hooks/useLocale";

interface SalesFormProps {
  formData: any;
  setFormData: (data: any) => void;
  error: string;
  isEditing: boolean;
  handleSubmit: () => void;
  submitCart: () => void;
  resetForm: () => void;
  showProductSearch: boolean;
  setShowProductSearch: (show: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredProducts: Product[];
  onProductSelect: (product: Product) => void;
  cartItems: CartItem[];
  addToCart: () => void;
  removeFromCart: (index: number) => void;
  cartTotal: number;
}

export const SalesForm = ({
  formData,
  setFormData,
  error,
  isEditing,
  handleSubmit,
  submitCart,
  resetForm,
  showProductSearch,
  setShowProductSearch,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  onProductSelect,
  cartItems,
  addToCart,
  removeFromCart,
  cartTotal,
}: SalesFormProps) => {
  const { t } = useLocale();

  const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, productName: value });
    setSearchTerm(value);
    if (value.trim().length > 0) {
      setShowProductSearch(true);
    } else {
      setShowProductSearch(false);
    }
  };

  const clearProductSelection = () => {
    setFormData({
      ...formData,
      productId: "",
      productName: "",
      productCode: "",
      unitPrice: "",
    });
    setSearchTerm("");
    setShowProductSearch(false);
  };

  return (
    <div className="gsc-card p-5 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
          <ShoppingCart size={17} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            {isEditing ? t('editSales') || 'تعديل حركة البيع' : t('addNewSales') || 'تسجيل حركة مبيعات جديدة'}
          </h3>
          <p className="text-[11px] text-slate-400">إضافة أصناف إلى السلة وحفظ العملية كفاتورة بيع</p>
        </div>
      </div>

      {/* ── Transaction type, customer info, payment method ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div>
          <label htmlFor="transactionType" className="block text-xs font-bold text-slate-700 mb-1.5">{t('transactionType') || 'نوع العملية'}</label>
          <div className="relative">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ArrowRightLeft size={16} />
            </div>
            <select
              id="transactionType"
              value={formData.transactionType}
              onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            >
              <option value="sale">{t('normalSale') || 'بيع نقدي مباشر'}</option>
              <option value="debt">{t('transactionDebt') || 'بيع آجل (دين على العميل)'}</option>
              <option value="credit">{t('transactionCredit') || 'دائن'}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="saleDate" className="block text-xs font-bold text-slate-700 mb-1.5">{t('date') || 'التاريخ'}</label>
          <div className="relative">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Calendar size={16} />
            </div>
            <input
              id="saleDate"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="paymentMethod" className="block text-xs font-bold text-slate-700 mb-1.5">{t('paymentMethod') || 'طريقة الدفع'}</label>
          <div className="relative">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <CreditCard size={16} />
            </div>
            <select
              id="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            >
              <option value="cash">{t('cash') || 'نقداً'}</option>
              <option value="BANKILY">بنكيلي (BANKILY)</option>
              <option value="MASRVI">مصرفي (MASRVI)</option>
              <option value="SEDAD">سداد (SEDAD)</option>
              <option value="BIMBANK">بيم بنك (BIMBANK)</option>
              <option value="BCIPAY">بي سي آي باي (BCIPAY)</option>
              <option value="CLICK">كليك (CLICK)</option>
            </select>
          </div>
        </div>

        {formData.transactionType !== 'sale' && (
          <div>
            <label htmlFor="customerName" className="block text-xs font-bold text-slate-700 mb-1.5">
              {formData.transactionType === 'debt' ? t('debtorName') || 'اسم المدين' : t('creditorName') || 'اسم الدائن'}
            </label>
            <div className="relative">
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <User size={16} />
              </div>
              <input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder={formData.transactionType === 'debt' ? t('debtorName') : t('creditorName')}
                className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
              />
            </div>
          </div>
        )}

        {formData.transactionType !== 'sale' && (
          <div>
            <label htmlFor="customerPhone" className="block text-xs font-bold text-slate-700 mb-1.5">{t('phone') || 'رقم الهاتف'}</label>
            <div className="relative">
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Phone size={16} />
              </div>
              <input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder={t('phone') || 'رقم الهاتف'}
                className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Product Picker Box ── */}
      {!isEditing && (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('product') || 'إضافة صنف إلى سلة اليومية'}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Product name & autocomplete */}
            <div className="md:col-span-6 relative">
              <label htmlFor="productName" className="block text-xs font-bold text-slate-700 mb-1.5">{t('product') || 'اسم المنتج'}</label>
              <div className="relative">
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Tag size={16} />
                </div>
                <input
                  id="productName"
                  value={formData.productName}
                  onChange={handleProductNameChange}
                  placeholder={t('searchProductPlaceholder') || 'اكتب اسم المنتج أو اضغط للبحث...'}
                  className="w-full pr-10 pl-16 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {formData.productName && (
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      onClick={clearProductSelection}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    onClick={() => setShowProductSearch(!showProductSearch)}
                  >
                    <Search size={15} />
                  </button>
                </div>
                <ProductSearch
                  show={showProductSearch}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  filteredProducts={filteredProducts}
                  onSelect={onProductSelect}
                />
              </div>
            </div>

            {/* Unit price */}
            <div className="md:col-span-3">
              <label htmlFor="unitPrice" className="block text-xs font-bold text-slate-700 mb-1.5">{t('unitPrice') || 'سعر الوحدة'}</label>
              <div className="relative">
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <CircleDollarSign size={16} />
                </div>
                <input
                  id="unitPrice"
                  type="number"
                  step="any"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full pr-10 pl-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans text-center transition-all"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="md:col-span-3">
              <label htmlFor="quantity" className="block text-xs font-bold text-slate-700 mb-1.5">{t('productQuantity') || 'الكمية'}</label>
              <div className="relative">
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Hash size={16} />
                </div>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="1"
                  className="w-full pr-10 pl-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans text-center transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={addToCart}
              className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingCart size={15} />
              <span>{t('addToCart') || 'إضافة هذا المنتج إلى السلة'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-3 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Cart summary table */}
      {!isEditing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-slate-600" />
              <span className="font-bold text-xs text-slate-800">{t('cart') || 'سلة المبيعات'}</span>
              {cartItems.length > 0 && (
                <span className="bg-blue-600 text-white text-[11px] font-bold rounded-full px-2 py-0.2 font-sans">
                  {cartItems.length}
                </span>
              )}
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
              {t('cartEmpty') || 'السلة فارغة، اختر المنتج واضغط "إضافة إلى السلة"'}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">{t('productName') || 'المنتج'}</th>
                    <th className="py-2.5 px-3 text-center">{t('productQuantity') || 'الكمية'}</th>
                    <th className="py-2.5 px-3 text-center">{t('unitPrice') || 'سعر الوحدة'}</th>
                    <th className="py-2.5 px-3 text-left">{t('total') || 'الإجمالي'}</th>
                    <th className="py-2.5 px-3 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{item.productName}</span>
                        {item.productCode && <span className="text-[10px] text-slate-400 font-mono">{item.productCode}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-sans">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-center font-medium font-sans text-slate-600">{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-left font-black font-sans text-blue-600">{Number(item.total).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-slate-700">{t('cartTotal') || 'المجموع الكلي للسلة'}:</td>
                    <td className="py-3 px-3 text-left font-black text-blue-600 text-sm font-sans">{cartTotal.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="pt-2 flex gap-3">
        {isEditing ? (
          <>
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all"
            >
              <Edit size={15} />
              <span>{t('updateSales') || 'تحديث البيانات'}</span>
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
            >
              {t('cancel') || 'إلغاء'}
            </button>
          </>
        ) : (
          <button
            onClick={submitCart}
            disabled={cartItems.length === 0}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>{t('submitCart') || 'حفظ وتثبيت المبيعات اليومية'}</span>
            {cartItems.length > 0 && (
              <span className="bg-white/20 text-white rounded-md px-1.5 py-0.2 text-xs font-sans">
                {cartItems.length} أصناف
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
