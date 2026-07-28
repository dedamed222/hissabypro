
import React from "react";
import { formatGregorianDate } from "@/utils/formatters";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";

interface InvoiceHeaderProps {
  invoiceNumber: string;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const InvoiceHeader = ({ invoiceNumber, currentDate, setCurrentDate }: InvoiceHeaderProps) => {
  const { t } = useLocale();

  return (
    <div className="arab-card card-purple mx-[30px]">
      <h2 className="font-medium mb-4 text-arab-purple-dark">{t('invoiceInfo')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="arab-form-group">
          <label htmlFor="invoice-number" className="arab-label">{t('invoiceNumber')}</label>
          <input
            id="invoice-number"
            type="text"
            value={invoiceNumber}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 font-sans"
          />
        </div>
        
        <div className="arab-form-group">
          <div>
            <label id="date-label" className="arab-label">{t('date')}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  aria-labelledby="date-label"
                  variant={"outline"}
                  className={cn(
                    "w-full p-2 border border-gray-300 rounded-md bg-background flex items-center justify-between font-sans"
                  )}
                >
                  {formatGregorianDate(currentDate)}
                  <CalendarIcon className="rtl:mr-2 ltr:ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
