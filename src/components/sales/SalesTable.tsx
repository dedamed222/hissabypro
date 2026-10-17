import { formatCurrency } from "@/utils/formatters";
import { Trash2, List, Banknote, Building2, CreditCard, DollarSign } from "lucide-react";
import type { DailySale } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import { TranslationKey } from "@/locales";

interface SalesTableProps {
  filteredSales: DailySale[];
  totalSales: number;
  onDelete: (sale: DailySale) => void;
}

export const SalesTable = ({ filteredSales, totalSales, onDelete }: SalesTableProps) => {
  const { t } = useLocale();

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
        return <Banknote className="w-4 h-4 text-emerald-600" />;
      case 'bank':
      case 'تحويل بنكي':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'electronic':
      case 'دفع إلكتروني':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="gsc-card overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <List size={16} className="text-slate-500" />
          <span>{t('dailySalesDetails') || 'جدول تفاصيل المبيعات اليومية'} ({filteredSales.length})</span>
        </h3>
        <span className="text-xs font-bold text-slate-700 font-sans">
          {t('grandTotal') || 'المجموع'}: <strong className="text-blue-600">{formatCurrency(totalSales)}</strong>
        </span>
      </div>

      {filteredSales.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          <p className="text-xs font-bold text-slate-600 mb-1">{t('noSalesFoundPeriod') || 'لا توجد مبيعات مسجلة في هذا التاريخ'}</p>
          <p className="text-[11px] text-slate-400">استخدم النموذج أعلاه لتسجيل أول حركة بيع لهذا اليوم</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">{t('date') || 'التاريخ'}</th>
                <th className="py-3 px-4">{t('productCode') || 'كود الصنف'}</th>
                <th className="py-3 px-4">{t('productName') || 'اسم المنتج'}</th>
                <th className="py-3 px-4 text-center">{t('quantity') || 'الكمية'}</th>
                <th className="py-3 px-4 text-center">{t('unitPrice') || 'سعر الوحدة'}</th>
                <th className="py-3 px-4 text-center">{t('paymentMethod') || 'طريقة الدفع'}</th>
                <th className="py-3 px-4 text-left">{t('total') || 'المبلغ الإجمالي'}</th>
                <th className="py-3 px-4 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSales.map((sale, index) => (
                <tr key={sale.id || index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-xs font-medium text-slate-600">{sale.date}</td>
                  <td className="py-3 px-4 font-mono text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {sale.productCode || "---"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{sale.productName}</td>
                  <td className="py-3 px-4 text-center font-bold font-sans">{sale.quantity}</td>
                  <td className="py-3 px-4 text-center font-medium font-sans text-slate-600">{formatCurrency(sale.unitPrice)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {getPaymentMethodIcon(sale.paymentMethod)}
                      <span>{translateMethod(sale.paymentMethod)}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-left font-black text-emerald-600 font-sans">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onDelete(sale)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
              <tr>
                <td colSpan={6} className="py-3.5 px-4 text-slate-700 text-xs">{t('grandTotal') || 'المجموع الكلي'}:</td>
                <td className="py-3.5 px-4 text-left font-black text-emerald-600 text-base font-sans">
                  {formatCurrency(totalSales)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
