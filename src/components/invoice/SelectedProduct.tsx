import React, { useMemo } from "react";
import { Product, Customer } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Plus, Check, AlertTriangle, Package } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { loadStoreData } from "@/utils/localStorage";
import { getLastSaleToCustomer } from "@/utils/productMovements";

interface SelectedProductProps {
  selectedProduct: Product | null;
  selectedCustomer?: Customer | null;
  handleAddProduct: () => void;
}

const SelectedProduct = ({
  selectedProduct,
  selectedCustomer,
  handleAddProduct,
}: SelectedProductProps) => {
  const { t } = useLocale();

  const lastSale = useMemo(() => {
    if (!selectedProduct) return null;
    try {
      const store = loadStoreData();
      return getLastSaleToCustomer(
        selectedCustomer?.id,
        selectedCustomer?.name,
        selectedProduct.id,
        selectedProduct.name,
        store.productMovements || []
      );
    } catch {
      return null;
    }
  }, [selectedProduct, selectedCustomer]);

  if (!selectedProduct) return null;

  return (
    <div className="gsc-card p-3.5 bg-blue-50/40 border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Package size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{selectedProduct.name}</span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 bg-white rounded border border-blue-200 text-blue-700 font-bold">
              {selectedProduct.code}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span>سعر البيع: <strong className="text-slate-800 font-sans">{formatCurrency(selectedProduct.price)}</strong></span>
            <span>•</span>
            <span>المتوفر: <strong className="text-slate-800 font-sans">{selectedProduct.quantity}</strong></span>
            {lastSale && (
              <>
                <span>•</span>
                <span className="text-blue-700">آخر بيع: <strong>{formatCurrency(lastSale.unitPrice)}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddProduct}
        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto"
      >
        <Plus size={15} />
        <span>إضافة إلى الفاتورة</span>
      </button>
    </div>
  );
};

export default SelectedProduct;
