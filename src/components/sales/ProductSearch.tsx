
import React, { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";

interface ProductSearchProps {
  show: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredProducts: Product[];
  onSelect: (product: Product) => void;
}

const ProductSearch = ({
  show,
  searchTerm,
  setSearchTerm,
  filteredProducts,
  onSelect,
}: ProductSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && inputRef.current) {
      inputRef.current.focus();
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="max-h-48 overflow-y-auto">
        {searchTerm.trim() === "" ? (
          <div className="p-3 text-gray-500 text-center">
            اكتب للبحث عن منتج
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => onSelect(product)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    الرمز: {product.code}
                  </div>
                  <div className="text-sm text-gray-600">
                    المخزون: {product.quantity} وحدة
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-medium text-blue-600">
                    {formatCurrency(product.price)}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    product.quantity > 10 
                      ? 'bg-green-100 text-green-800' 
                      : product.quantity > 0 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {product.quantity > 10 ? 'متوفر' : product.quantity > 0 ? 'قليل' : 'نفذ'}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-3 text-gray-500 text-center">
            لا توجد منتجات مطابقة للبحث
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSearch;
