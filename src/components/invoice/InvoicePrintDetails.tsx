
import React from "react";
import { useLocale } from "@/hooks/useLocale";

interface InvoicePrintDetailsProps {
  currentDate: Date;
  paymentMethod: string;
  paymentStatus?: "paid" | "pending" | "partial";
  notes: string;
  invoiceType?: string;
  debtType?: string;
  dueDate?: string;
}

const InvoicePrintDetails = ({ 
  currentDate, 
  paymentMethod, 
  paymentStatus = "paid",
  notes,
  invoiceType = "sales",
  debtType = "debtor",
  dueDate = ""
}: InvoicePrintDetailsProps) => {
  const { t, formatDate } = useLocale();

  return (
    <div className="hidden print:block print:mt-8">
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm font-sans">
          <div>
            <strong>{t('date')}:</strong> {formatDate(currentDate)}
          </div>
          {invoiceType !== 'quotation' && (
            <>
              <div>
                <strong>{t('paymentMethod')}:</strong> {t(paymentMethod as any)}
              </div>
              <div>
                <strong>{t('paymentStatus')}:</strong> 
                <span className={`mx-2 px-2 py-1 rounded text-xs ${
                  paymentStatus === "paid" 
                    ? "bg-green-100 text-green-800" 
                    : paymentStatus === "partial"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-orange-100 text-orange-800"
                }`}>
                  {t(paymentStatus as any)}
                </span>
              </div>
            </>
          )}
          {invoiceType === 'debt' && dueDate && (
            <div>
              <strong>{t('dueDate') || 'تاريخ الاستحقاق'}:</strong> {dueDate}
            </div>
          )}
        </div>
        
        {notes && (
          <div className="mt-4 font-sans">
            <strong>{t('notes')}:</strong>
            <p className="mt-1 text-gray-600">{notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePrintDetails;
