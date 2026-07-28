
import React from "react";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Plus } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface SelectedProductProps {
  selectedProduct: Product | null;
  handleAddProduct: () => void;
}

const SelectedProduct = ({ selectedProduct, handleAddProduct }: SelectedProductProps) => {
  const { t } = useLocale();
  if (!selectedProduct) return null;
  
  return (
    <div className="flex items-center justify-between p-3 bg-arab-teal/10 rounded-md mb-4 border border-arab-teal/30 mx-[30px]">
      <div>
        <p className="font-medium">{selectedProduct.name}</p>
        <p className="text-sm text-gray-500 font-sans">
          {selectedProduct.code} - {formatCurrency(selectedProduct.price)}
        </p>
      </div>
      <button
        onClick={handleAddProduct}
        className="bg-arab-teal text-white px-3 py-1 rounded-md hover:bg-arab-teal-dark transition-colors flex items-center gap-1 font-sans"
        title={t('add')}
      >
        <Plus size={16} />
        <span>{t('add')}</span>
      </button>
    </div>
  );
};

export default SelectedProduct;
