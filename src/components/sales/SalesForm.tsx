
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, X, AlertCircle, Tag, Barcode, CircleDollarSign, Hash, User, Phone, CreditCard, ArrowRightLeft } from "lucide-react";
import type { Product } from "@/types";
import ProductSearch from "./ProductSearch";
import { useLocale } from "@/hooks/useLocale";

interface SalesFormProps {
  formData: any;
  setFormData: (data: any) => void;
  error: string;
  isEditing: boolean;
  handleSubmit: () => void;
  resetForm: () => void;
  showProductSearch: boolean;
  setShowProductSearch: (show: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredProducts: Product[];
  onProductSelect: (product: Product) => void;
}

export const SalesForm = ({
  formData,
  setFormData,
  error,
  isEditing,
  handleSubmit,
  resetForm,
  showProductSearch,
  setShowProductSearch,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  onProductSelect,
}: SalesFormProps) => {
  const { t } = useLocale();

  const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, productName: value });
    setSearchTerm(value);
    
    // إظهار البحث تلقائياً عند بدء الكتابة
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
        <CardTitle>{isEditing ? t('editSales') : t('addNewSales')}</CardTitle>
      </CardHeader>
      <CardContent>
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
          
          <div>
            <label htmlFor="productCode" className="arab-label">{t('productCode')}</label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Barcode size={18} />
              </div>
              <Input
                id="productCode"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                placeholder={t('productCode')}
                readOnly={!!formData.productId}
                className={formData.productId ? "bg-gray-50 pr-10" : "pr-10"}
              />
            </div>
          </div>
          
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
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {formData.productId && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-md p-3 mb-4">
            <div className="text-sm">{t('selectedProduct')}: <strong>{formData.productName}</strong></div>
            <div className="text-xs text-green-600">{t('code')}: {formData.productCode}</div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button onClick={handleSubmit}>
            {isEditing ? (
              <>
                <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                {t('updateSales')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                {t('addSales')}
              </>
            )}
          </Button>
          
          {isEditing && (
            <Button variant="outline" onClick={resetForm}>
              {t('cancel')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
