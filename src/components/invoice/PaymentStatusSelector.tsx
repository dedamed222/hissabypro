
import React from "react";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { useLocale } from "@/hooks/useLocale";

interface PaymentStatusSelectorProps {
  paymentStatus: "paid" | "pending" | "partial";
  setPaymentStatus: (status: "paid" | "pending" | "partial") => void;
}

const PaymentStatusSelector = ({ paymentStatus, setPaymentStatus }: PaymentStatusSelectorProps) => {
  const { t } = useLocale();

  return (
    <div className="arab-form-group mx-[30px]">
      <label id="payment-status-label" className="arab-label">{t('paymentStatus')}</label>
      
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <RadioGroup
          aria-labelledby="payment-status-label"
          value={paymentStatus}
          onValueChange={(value: "paid" | "pending" | "partial") => setPaymentStatus(value)}
          className="flex flex-col sm:flex-row gap-2"
        >
          <label
            htmlFor="status-paid"
            className={`flex-1 text-center py-3 px-4 cursor-pointer transition-all ${
              paymentStatus === "paid"
                ? "bg-green-500 text-white"
                : "bg-white hover:bg-gray-50"
            }`}
            title={t('paid')}
          >
            <RadioGroupItem value="paid" id="status-paid" className="sr-only" />
            <span className={`text-sm font-medium font-sans ${paymentStatus === "paid" ? "text-white" : "text-gray-700"}`}>
              {t('paid')}
            </span>
          </label>

          <label
            htmlFor="status-pending"
            className={`flex-1 text-center py-3 px-4 cursor-pointer transition-all border-r border-gray-200 ${
              paymentStatus === "pending"
                ? "bg-orange-500 text-white"
                : "bg-white hover:bg-gray-50"
            }`}
            title={t('pending')}
          >
            <RadioGroupItem value="pending" id="status-pending" className="sr-only" />
            <span className={`text-sm font-medium font-sans ${paymentStatus === "pending" ? "text-white" : "text-gray-700"}`}>
              {t('pending')}
            </span>
          </label>

          <label
            htmlFor="status-partial"
            className={`flex-1 text-center py-3 px-4 cursor-pointer transition-all rounded-md sm:rounded-none sm:rounded-r-md border border-gray-200 sm:border-l-0 ${
              paymentStatus === "partial"
                ? "bg-blue-500 text-white"
                : "bg-white hover:bg-gray-50"
            }`}
            title={t('partiallyPaid')}
          >
            <RadioGroupItem value="partial" id="status-partial" className="sr-only" />
            <span className={`text-sm font-medium font-sans ${paymentStatus === "partial" ? "text-white" : "text-gray-700"}`}>
              {t('partiallyPaid')}
            </span>
          </label>
        </RadioGroup>
      </div>
      
      {paymentStatus === "pending" && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-700 font-sans">
            {t('pendingWarning')}
          </p>
        </div>
      )}
      
      {paymentStatus === "partial" && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700 font-sans">
            يرجى تسجيل المبلغ المدفوع بدقة عند حفظ الفاتورة.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusSelector;
