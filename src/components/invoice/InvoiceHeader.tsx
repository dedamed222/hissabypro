import React from "react";
import { formatGregorianDate } from "@/utils/formatters";
import { Calendar as CalendarIcon, Hash } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocale } from "@/hooks/useLocale";

interface InvoiceHeaderProps {
  invoiceNumber: string;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const InvoiceHeader = ({ invoiceNumber, currentDate, setCurrentDate }: InvoiceHeaderProps) => {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('invoiceInfo') || 'بيانات الفاتورة'}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="invoice-number" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Hash size={13} className="text-slate-400" />
            <span>{t('invoiceNumber')}</span>
          </label>
          <input
            id="invoice-number"
            type="text"
            value={invoiceNumber}
            readOnly
            className="w-full px-3.5 py-2.5 text-sm font-mono font-bold text-blue-700 bg-slate-50 border border-slate-200 rounded-xl outline-none select-all"
          />
        </div>

        <div>
          <label id="date-label" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <CalendarIcon size={13} className="text-slate-400" />
            <span>{t('date')}</span>
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              >
                <span>{formatGregorianDate(currentDate)}</span>
                <CalendarIcon className="text-slate-400 h-4 w-4 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-xl" align="end">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                initialFocus
                className="rounded-2xl"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
