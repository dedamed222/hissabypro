
import React from "react";
import { Save, Printer } from "lucide-react";
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

  return (
    <div className="arab-card card-blue print:hidden mx-[30px]">
      <h2 className="font-medium mb-4 text-arab-blue-dark">{t('actions')}</h2>
      
      <div className="space-y-3">
        <button
          onClick={handleSaveInvoice}
          disabled={loading || invoiceItems.length === 0 || !selectedCustomer}
          className="w-full bg-arab-blue text-white py-2 rounded-md hover:bg-arab-blue-dark transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={t('saveInvoice')}
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span className="font-sans">{t('saving')}</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span className="font-sans">{t('saveInvoice')}</span>
            </>
          )}
        </button>
        
        <button
          onClick={handlePrintInvoice}
          disabled={invoiceItems.length === 0 || !selectedCustomer}
          className="w-full bg-gray-100 text-gray-800 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={t('printInvoice')}
        >
          <Printer size={18} />
          <span className="font-sans">{t('printInvoice')}</span>
        </button>
      </div>
    </div>
  );
};

export default InvoiceActions;
