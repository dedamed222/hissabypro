
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  handleSubmit: () => void;        // used for edit mode only
  submitCart: () => void;          // used for new multi-product sale
  resetForm: () => void;
  showProductSearch: boolean;
  setShowProductSearch: (show: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredProducts: Product[];
  onProductSelect: (product: Product) => void;
  // Cart props
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? t('editSales') : t('addNewSales')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* ───── Transaction type, customer info, payment method ───── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="transactionType" className="arab-label">{t('transactionType')}</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ArrowRightLeft size={18} />
              </div>
              <select
                id="transactionType"
                value={formData.transactionType}
                onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                className="w-full p-2 border rounded-md pr-10 focus:ring-2 focus:ring-arab-blue bg-white appearance-none"
              >
                <option value="sale">{t('normalSale')}</option>
                <option value="debt">{t('transactionDebt')}</option>
                <option value="credit">{t('transactionCredit')}</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="saleDate" className="arab-label">{t('date') || 'التاريخ'}</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Calendar size={18} />
              </div>
              <Input
                id="saleDate"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="pr-10"
              />
            </div>
          </div>

          {formData.transactionType !== 'sale' && (
            <div>
              <label htmlFor="customerName" className="arab-label">
                {formData.transactionType === 'debt' ? t('debtorName') : t('creditorName')}
              </label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <User size={18} />
                </div>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder={formData.transactionType === 'debt' ? t('debtorName') : t('creditorName')}
                  className="pr-10"
                />
              </div>
            </div>
          )}

          {formData.transactionType !== 'sale' && (
            <div>
              <label htmlFor="customerPhone" className="arab-label">{t('phone')}</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Phone size={18} />
                </div>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder={t('phone')}
                  className="pr-10"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="paymentMethod" className="arab-label">{t('paymentMethod')}</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <CreditCard size={18} />
              </div>
              <select
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full p-2 border rounded-md pr-10 focus:ring-2 focus:ring-arab-blue bg-white appearance-none"
              >
                <option value="cash">{t('cash')}</option>
                <option value="BANKILY">BANKILY</option>
                <option value="MASRVI">MASRVI</option>
                <option value="SEDAD">SEDAD</option>
                <option value="BIMBANK">BIMBANK</option>
                <option value="BCIPAY">BCIPAY</option>
                <option value="CLICK">CLICK</option>
              </select>
            </div>
          </div>
        </div>

        {/* ───── Product picker row ───── */}
        {!isEditing && (
          <div className="border rounded-lg p-4 mb-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag size={16} />
              {t('product')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              {/* Product name */}
              <div className="md:col-span-2">
                <label htmlFor="productName" className="arab-label">{t('product')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Tag size={18} />
                  </div>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={handleProductNameChange}
                    placeholder={t('searchProductPlaceholder')}
                    className="pl-16 pr-10"
                  />
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    {formData.productName && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                        onClick={clearProductSelection}
                      >
                        <X size={14} />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      onClick={() => setShowProductSearch(!showProductSearch)}
                    >
                      <Search size={14} />
                    </Button>
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
              <div>
                <label htmlFor="unitPrice" className="arab-label">{t('unitPrice')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <CircleDollarSign size={18} />
                  </div>
                  <Input
                    id="unitPrice"
                    type="number"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder={t('unitPrice')}
                    step="0.01"
                    className="pr-10"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="arab-label">{t('productQuantity')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Hash size={18} />
                  </div>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder={t('productQuantity')}
                    min="1"
                    className="pr-10"
                  />
                </div>
              </div>
            </div>

            {/* Product code (read-only) */}
            {formData.productCode && (
              <div className="mt-2">
                <label htmlFor="productCode" className="arab-label">{t('productCode')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Barcode size={18} />
                  </div>
                  <Input
                    id="productCode"
                    value={formData.productCode}
                    readOnly
                    className="bg-gray-50 pr-10"
                  />
                </div>
              </div>
            )}

            {/* Add to cart button */}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={addToCart}
                className="w-full border-dashed border-2 border-arab-blue text-arab-blue hover:bg-arab-blue hover:text-white transition-colors"
              >
                <ShoppingCart className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                {t('addToCart')}
              </Button>
            </div>
          </div>
        )}

        {/* ───── Edit mode product fields (single product) ───── */}
        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="productNameEdit" className="arab-label">{t('product')}</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Tag size={18} />
                </div>
                <Input
                  id="productNameEdit"
                  value={formData.productName}
                  onChange={handleProductNameChange}
                  placeholder={t('searchProductPlaceholder')}
                  className="pl-16 pr-10"
                />
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  {formData.productName && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearProductSelection}>
                      <X size={14} />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowProductSearch(!showProductSearch)}>
                    <Search size={14} />
                  </Button>
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
            <div>
              <label htmlFor="productCodeEdit" className="arab-label">{t('productCode')}</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Barcode size={18} />
                </div>
                <Input id="productCodeEdit" value={formData.productCode} readOnly className="bg-gray-50 pr-10" />
              </div>
            </div>
            <div>
              <label htmlFor="unitPriceEdit" className="arab-label">{t('unitPrice')}</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <CircleDollarSign size={18} />
                </div>
                <Input
                  id="unitPriceEdit"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  step="0.01"
                  className="pr-10"
                />
              </div>
            </div>
            <div>
              <label htmlFor="quantityEdit" className="arab-label">{t('productQuantity')}</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Hash size={18} />
                </div>
                <Input
                  id="quantityEdit"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* ───── Error message ───── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ───── Cart summary table ───── */}
        {!isEditing && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart size={18} className="text-arab-blue" />
              <span className="font-semibold text-gray-700">{t('cart')}</span>
              {cartItems.length > 0 && (
                <span className="bg-arab-blue text-white text-xs rounded-full px-2 py-0.5">
                  {cartItems.length}
                </span>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">
                {t('cartEmpty')}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-right p-2 font-medium">{t('productName')}</th>
                      <th className="text-center p-2 font-medium">{t('productQuantity')}</th>
                      <th className="text-center p-2 font-medium">{t('unitPrice')}</th>
                      <th className="text-center p-2 font-medium">{t('total')}</th>
                      <th className="text-center p-2 font-medium">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cartItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-2">
                          <div className="font-medium text-gray-800">{item.productName}</div>
                          {item.productCode && (
                            <div className="text-xs text-gray-400">{item.productCode}</div>
                          )}
                        </td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-center">{item.unitPrice.toFixed(2)}</td>
                        <td className="p-2 text-center font-semibold text-arab-blue">
                          {item.total.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeFromCart(index)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-semibold text-gray-700">
                        {t('cartTotal')}:
                      </td>
                      <td className="p-2 text-center font-bold text-lg text-arab-blue">
                        {cartTotal.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ───── Action buttons ───── */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSubmit}>
                <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                {t('updateSales')}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                {t('cancel')}
              </Button>
            </>
          ) : (
            <Button
              onClick={submitCart}
              disabled={cartItems.length === 0}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
              {t('submitCart')}
              {cartItems.length > 0 && (
                <span className="rtl:mr-2 ltr:ml-2 bg-white/20 rounded px-1.5 text-xs">
                  {cartItems.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
