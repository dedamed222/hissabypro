
import React from "react";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";

interface PaymentMethodSelectorProps {
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
}

const PaymentMethodSelector = ({ paymentMethod, setPaymentMethod }: PaymentMethodSelectorProps) => {
  const { getAvailablePaymentMethods } = useSettings();
  const { t } = useLocale();
  const paymentMethods = getAvailablePaymentMethods();

  return (
    <div className="arab-form-group mx-[30px]">
      <label id="payment-method-label" className="arab-label">{t('paymentMethod')}</label>

      <div className="border border-gray-200 rounded-md overflow-hidden">
        <RadioGroup
          aria-labelledby="payment-method-label"
          value={paymentMethod}
          onValueChange={(value: string) => setPaymentMethod(value)}
          className="flex flex-wrap"
        >
          {paymentMethods.map((method) => {
            const isSelected = paymentMethod === method.id;

            return (
              <label
                key={method.id}
                htmlFor={`payment-${method.id}`}
                className={`flex-1 min-w-[80px] md:min-w-[100px] text-center py-1.5 px-2 md:py-2 md:px-3 cursor-pointer transition-all ${isSelected
                    ? "bg-arab-rose text-white"
                    : "bg-white hover:bg-gray-50"
                  }`}
                title={t(method.id as any)}
              >
                <RadioGroupItem
                  value={method.id}
                  id={`payment-${method.id}`}
                  className="sr-only"
                />
                <span className={`text-sm font-sans ${isSelected ? "font-medium" : ""}`}>
                  {t(method.id as any) !== method.id ? t(method.id as any) : method.name}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
