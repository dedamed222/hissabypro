import { Calendar, Filter, ChevronDown } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { TranslationKey } from "@/locales";

interface SalesFiltersProps {
  dateFilter: string;
  setDateFilter: (date: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  paymentMethods: string[];
}

export const SalesFilters = ({
  dateFilter,
  setDateFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  paymentMethods
}: SalesFiltersProps) => {
  const { t } = useLocale();

  const translateMethod = (method: string) => {
    if (method === 'all') return t('allPaymentMethods') || 'جميع طرق الدفع';
    const methodLower = method?.toLowerCase();
    if (methodLower === 'cash' || method === 'نقدي') return t('cash') || 'نقداً';
    if (methodLower === 'bank' || method === 'تحويل بنكي') return t('bankTransfer') || 'تحويل بنكي';
    if (methodLower === 'electronic' || method === 'دفع إلكتروني') return t('electronicPayment') || 'دفع إلكتروني';

    const keys: TranslationKey[] = ['cash', 'card', 'transfer', 'bankTransfer', 'electronicPayment', 'creditPayment'];
    if (keys.includes(methodLower as TranslationKey)) return t(methodLower as TranslationKey);

    return method;
  };

  return (
    <div className="gsc-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={15} className="text-blue-600" />
        <span className="text-xs font-bold text-slate-800">{t('filterSales') || 'فلترة مبيعات اليومية'}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="relative">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <span>{t('date') || 'تاريخ اليومية'}</span>
          </label>
          <input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
          />
        </div>

        <div className="relative">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span>{t('paymentMethod') || 'تصفية حسب طريقة الدفع'}</span>
          </label>
          <div className="relative">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all"
            >
              <option value="all">{t('allPaymentMethods') || 'جميع طرق الدفع'}</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {translateMethod(method)}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
