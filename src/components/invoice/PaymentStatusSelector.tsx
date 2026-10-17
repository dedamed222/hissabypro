import React from "react";
import { useLocale } from "@/hooks/useLocale";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface PaymentStatusSelectorProps {
  paymentStatus: "paid" | "pending" | "partial";
  setPaymentStatus: (status: "paid" | "pending" | "partial") => void;
}

const PaymentStatusSelector = ({ paymentStatus, setPaymentStatus }: PaymentStatusSelectorProps) => {
  const { t } = useLocale();

  const statuses = [
    { id: "paid", label: t('paid') || 'مدفوع', icon: CheckCircle2, activeBg: "bg-emerald-600 text-white border-emerald-600 shadow-xs" },
    { id: "pending", label: t('pending') || 'قيد الانتظار', icon: Clock, activeBg: "bg-amber-500 text-white border-amber-500 shadow-xs" },
    { id: "partial", label: t('partial') || 'دفع جزئي', icon: AlertCircle, activeBg: "bg-blue-600 text-white border-blue-600 shadow-xs" },
  ];

  return (
    <div className="space-y-1.5">
      <label id="payment-status-label" className="block text-xs font-bold text-slate-700">
        {t('paymentStatus') || 'حالة السداد'}
      </label>

      <div className="grid grid-cols-3 gap-2">
        {statuses.map((item) => {
          const isSelected = paymentStatus === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPaymentStatus(item.id as any)}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                isSelected
                  ? item.activeBg
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title={item.label}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentStatusSelector;
