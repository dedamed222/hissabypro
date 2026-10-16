import React, { useMemo } from "react";
import { Product, Customer } from "@/types";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Plus, Clock, AlertTriangle, AlertCircle } from "lucide-react";
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

  // Warning checks
  const isBelowCost = Boolean(
    selectedProduct.cost &&
    selectedProduct.cost > 0 &&
    selectedProduct.price < selectedProduct.cost
  );

  const isSignificantlyBelowLastSale = Boolean(
    lastSale &&
    lastSale.unitPrice > 0 &&
    selectedProduct.price < lastSale.unitPrice * 0.85
  );

  return (
    <div className="space-y-2 mb-4 mx-[30px]">
      <div className="flex items-center justify-between p-3 bg-arab-teal/10 rounded-md border border-arab-teal/30">
        <div>
          <p className="font-medium">{selectedProduct.name}</p>
          <p className="text-sm text-gray-500 font-sans">
            {selectedProduct.code} - {formatCurrency(selectedProduct.price)}
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="bg-arab-teal text-white px-3 py-1.5 rounded-md hover:bg-arab-teal-dark transition-colors flex items-center gap-1 font-sans text-sm font-medium shadow-sm"
          title={t("add")}
        >
          <Plus size={16} />
          <span>{t("add")}</span>
        </button>
      </div>

      {/* Smart Hints & Warnings */}
      {lastSale && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-xs font-sans">
          <Clock size={15} className="text-blue-600 shrink-0" />
          <span>
            <strong>آخر مرة بيع لهذا الزبون:</strong> بتاريخ{" "}
            {formatDate(lastSale.date)} بسعر{" "}
            <span className="font-semibold text-blue-800">
              {formatCurrency(lastSale.unitPrice)}
            </span>{" "}
            (كمية: {lastSale.quantity}
            {lastSale.invoiceNumber ? ` - فاتورة #${lastSale.invoiceNumber}` : ""})
          </span>
        </div>
      )}

      {isBelowCost && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-md text-xs font-sans">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span>
            <strong>تنبيه:</strong> سعر البيع ({formatCurrency(selectedProduct.price)}) أقل من سعر التكلفة ({formatCurrency(selectedProduct.cost || 0)})
          </span>
        </div>
      )}

      {isSignificantlyBelowLastSale && lastSale && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-300 text-orange-900 rounded-md text-xs font-sans">
          <AlertCircle size={15} className="text-orange-600 shrink-0" />
          <span>
            <strong>تنبيه:</strong> السعر الحالي أقل بأكثر من 15% من آخر سعر بيع لهذا الزبون ({formatCurrency(lastSale.unitPrice)})
          </span>
        </div>
      )}
    </div>
  );
};

export default SelectedProduct;
