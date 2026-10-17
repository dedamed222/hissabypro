import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { DollarSign, CreditCard, Banknote, Wallet, Building2, Coins } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { TranslationKey } from "@/locales";

interface PaymentMethodCardsProps {
  totalSales: number;
  paymentMethods: string[];
  getPaymentMethodTotal: (method: string) => number;
}

export const PaymentMethodCards = ({ 
  totalSales, 
  paymentMethods, 
  getPaymentMethodTotal 
}: PaymentMethodCardsProps) => {
  const { t, locale } = useLocale();
  const isFr = locale === 'fr';

  const translateMethod = (method: string) => {
    const methodLower = method?.toLowerCase();
    if (methodLower === 'cash' || method === 'نقدي') return t('cash') || 'نقداً';
    if (methodLower === 'bank' || method === 'تحويل بنكي') return t('bankTransfer') || 'تحويل بنكي';
    if (methodLower === 'electronic' || method === 'دفع إلكتروني') return t('electronicPayment') || 'دفع إلكتروني';
    
    const keys: TranslationKey[] = ['cash', 'card', 'transfer', 'bankTransfer', 'electronicPayment', 'creditPayment'];
    if (keys.includes(methodLower as TranslationKey)) return t(methodLower as TranslationKey);
    
    return method;
  };

  const getPaymentMethodIcon = (method: string) => {
    const methodLower = method?.toLowerCase();
    switch (methodLower) {
      case 'cash':
      case 'نقدي':
        return <Banknote className="w-5 h-5 text-emerald-600" />;
      case 'bank':
      case 'تحويل بنكي':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'electronic':
      case 'دفع إلكتروني':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      default:
        return <Wallet className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {/* Total Sales */}
      <div className="gsc-card p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Coins size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500 truncate">{t('totalSales') || 'إجمالي المبيعات'}</p>
          <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{formatCurrency(totalSales)}</h3>
          <p className="text-[11px] font-bold text-blue-600 mt-0.5">كافة طرق الدفع</p>
        </div>
      </div>

      {paymentMethods.map((method) => {
        const total = getPaymentMethodTotal(method);
        const percentage = totalSales > 0 ? ((total / totalSales) * 100).toFixed(0) : 0;
        
        return (
          <div key={method} className="gsc-card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
              {getPaymentMethodIcon(method)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 truncate">{translateMethod(method)}</p>
              <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{formatCurrency(total)}</h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                {isFr ? `${percentage}% des ventes` : `${percentage}% من المبيعات`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
