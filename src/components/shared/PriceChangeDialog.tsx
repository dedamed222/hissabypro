import React from "react";
import { AlertTriangle, Check, RefreshCw, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";

interface PriceChangeDialogProps {
  isOpen: boolean;
  productName: string;
  oldPrice: number;
  newPrice: number;
  costPrice?: number;
  onChoice: (updateOriginal: boolean) => void;
  onCancel: () => void;
}

export const PriceChangeDialog: React.FC<PriceChangeDialogProps> = ({
  isOpen,
  productName,
  oldPrice,
  newPrice,
  costPrice = 0,
  onChoice,
  onCancel,
}) => {
  const { t } = useLocale();

  if (!isOpen) return null;

  const isBelowCost = costPrice > 0 && newPrice < costPrice;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-arab-blue to-arab-blue-dark text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={20} className="animate-spin-slow" />
            <h3 className="font-bold text-lg">{t("priceChangePrompt") || "تعديل سعر الصنف"}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-gray-600 text-sm">
            لقد قمت بتعديل سعر الصنف <span className="font-bold text-gray-900">"{productName}"</span>.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 grid grid-cols-2 gap-3 text-center">
            <div>
              <span className="text-xs text-gray-500 block mb-1">السعر السابق</span>
              <span className="text-base font-semibold text-gray-700 line-through">
                {formatCurrency(oldPrice)}
              </span>
            </div>
            <div>
              <span className="text-xs text-blue-600 block mb-1">السعر الجديد</span>
              <span className="text-lg font-bold text-blue-700">
                {formatCurrency(newPrice)}
              </span>
            </div>
          </div>

          {/* Gentle Warning if below cost */}
          {isBelowCost && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">تنبيه لطيف: السعر الجديد أقل من سعر التكلفة!</p>
                <p className="mt-0.5 text-amber-700">
                  سعر التكلفة هو {formatCurrency(costPrice)}. يمكنك المتابعة بشكل طبيعي إذا رغبت في ذلك.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">
            اختر كيف تريد تطبيق السعر الجديد:
          </p>

          {/* Options */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => onChoice(false)}
              className="w-full text-right p-3 rounded-lg border-2 border-gray-200 hover:border-arab-blue hover:bg-blue-50/50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-gray-900 block text-sm group-hover:text-arab-blue">
                  1) لهذه الملاحظة / الفاتورة فقط
                </span>
                <span className="text-xs text-gray-500 block mt-0.5">
                  يبقى السعر الأصلي في المخزون كما هو دون أي تغيير في قائمة الأصناف.
                </span>
              </div>
              <Check size={18} className="text-gray-300 group-hover:text-arab-blue transition-colors shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onChoice(true)}
              className="w-full text-right p-3 rounded-lg border-2 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 hover:border-arab-blue transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-arab-blue block text-sm">
                  2) تحديث السعر الأصلي في المخزون
                </span>
                <span className="text-xs text-gray-600 block mt-0.5">
                  يُحدَّث سعر الصنف في المخزون ليصبح هذا السعر هو الافتراضي مستقبلاً، مع حفظ سجل التغيير.
                </span>
              </div>
              <Check size={18} className="text-arab-blue shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-600 hover:text-gray-800 text-sm px-4 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
          >
            إلغاء التعديل
          </button>
        </div>
      </div>
    </div>
  );
};
