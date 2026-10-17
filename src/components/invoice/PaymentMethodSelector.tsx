import React from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { Wallet } from "lucide-react";

interface PaymentMethodSelectorProps {
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
}

const PaymentMethodSelector = ({ paymentMethod, setPaymentMethod }: PaymentMethodSelectorProps) => {
  const { getAvailablePaymentMethods } = useSettings();
  const { t } = useLocale();
  const paymentMethods = getAvailablePaymentMethods();

  return (
    <div className="space-y-1.5">
      <label id="payment-method-label" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <Wallet size={13} className="text-slate-400" />
        <span>{t('paymentMethod')}</span>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {paymentMethods.map((method) => {
          const isSelected = paymentMethod === method.id;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center truncate ${
                isSelected
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title={t(method.id as any)}
            >
              {t(method.id as any) !== method.id ? t(method.id as any) : method.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
