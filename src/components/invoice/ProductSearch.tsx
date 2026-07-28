
import React from "react";
import { Search } from "lucide-react";
import { Product } from "@/types";
import { Input } from "@/components/ui/input";
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
    <div className="arab-card card-teal print:hidden mx-[30px]">
      <h2 className="font-medium mb-4 text-arab-teal-dark">{t('addProducts')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 relative">
          <label htmlFor="product-search-input" className="sr-only">{t('productSearch')}</label>
          <Search className="absolute rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            id="product-search-input"
            type="text"
            placeholder={t('searchProductPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rtl:pr-10 ltr:pl-10 rtl:pl-4 ltr:pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-teal font-sans"
            title={t('productSearch')}
          />
        </div>
        
        <div>
          <label htmlFor="product-quantity-input" className="sr-only">{t('quantity')}</label>
          <Input
            id="product-quantity-input"
            type="number"
            min="1"
            value={manualQuantity !== null ? manualQuantity : quantity}
            onChange={handleQuantityChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-teal font-sans"
            placeholder={t('quantity')}
            title={t('quantity')}
          />
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md mb-4">
        <table className="arab-table">
          <thead className="bg-arab-teal/10">
            <tr>
              <th className="font-medium">{t('code')}</th>
              <th className="font-medium">{t('product')}</th>
              <th className="font-medium">{t('productPrice')}</th>
              <th className="font-medium">{t('stock')}</th>
              <th className="font-medium">{t('choose')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className={selectedProduct?.id === product.id ? "bg-arab-teal/20 font-sans" : "font-sans"}
                >
                  <td>{product.code}</td>
                  <td>{product.name}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.quantity}</td>
                  <td>
                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="text-arab-teal hover:text-arab-teal-dark"
                      title={t('choose')}
                    >
                      {t('choose')}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  {searchTerm
                    ? t('noSearchResults')
                    : t('noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductSearch;
