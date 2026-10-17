import React from "react";
import { Save, Printer, CheckCircle } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface InvoiceActionsProps {
  loading: boolean;
  invoiceItems: any[];
  selectedCustomer: any | null;
  handleSaveInvoice: () => void;
  handlePrintInvoice: () => void;
}

const InvoiceActions = ({
  loading,
  invoiceItems,
  selectedCustomer,
  handleSaveInvoice,
  handlePrintInvoice,
}: InvoiceActionsProps) => {
  const { t } = useLocale();

  const isDisabled = loading || invoiceItems.length === 0 || !selectedCustomer;

  return (
    <div className="gsc-card p-5 print:hidden space-y-3">
      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        <span>{t('actions') || 'إجراءات الفاتورة'}</span>
      </h2>

      <div className="space-y-2.5">
        <button
          onClick={handleSaveInvoice}
          disabled={isDisabled}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={t('saveInvoice')}
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{t('saving') || 'جاري الحفظ...'}</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              <span>{t('saveInvoice') || 'حفظ الفاتورة وتثبيتها'}</span>
            </>
          )}
        </button>

        <button
          onClick={handlePrintInvoice}
          disabled={invoiceItems.length === 0 || !selectedCustomer}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={t('printInvoice')}
        >
          <Printer size={16} />
          <span>{t('printInvoice') || 'طباعة ومعاينة الفاتورة'}</span>
        </button>
      </div>

      {isDisabled && (
        <p className="text-[11px] text-slate-400 text-center pt-1">
          {!selectedCustomer
            ? "يرجى تحديد العميل أولاً"
            : invoiceItems.length === 0
            ? "يرجى إضافة صنف واحد على الأقل"
            : ""}
        </p>
      )}
    </div>
  );
};

export default InvoiceActions;
