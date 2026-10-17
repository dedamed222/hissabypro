import React, { useState, useEffect } from "react";
import { Customer } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import { User, Building, Phone } from "lucide-react";

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  customers: Customer[];
  onCustomerChange: (customerId: string) => void;
}

const CustomerSelector = ({ selectedCustomer, customers, onCustomerChange }: CustomerSelectorProps) => {
  const { t } = useLocale();
  const [inputValue, setInputValue] = useState(selectedCustomer?.name || "");

  useEffect(() => {
    setInputValue(selectedCustomer?.name || "");
  }, [selectedCustomer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const existingCustomer = customers.find(c => c.name === value);
    if (existingCustomer) {
      onCustomerChange(existingCustomer.id);
    } else if (value.trim() !== "") {
      onCustomerChange(`manual:${value}`);
    } else {
      onCustomerChange("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
          <label id="customer-label" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('customer')} <span className="text-rose-500">*</span>
          </label>
        </div>
        {selectedCustomer && selectedCustomer.phone && (
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 font-sans">
            <Phone size={11} className="text-slate-400" />
            {selectedCustomer.phone}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <User size={16} />
        </div>
        <input
          type="text"
          list="customers-list"
          value={inputValue}
          onChange={handleChange}
          className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
          placeholder={t('selectCustomer') || 'اختر من القائمة أو اكتب اسماً جديداً مباشرة...'}
        />
        <datalist id="customers-list">
          {customers.map((customer) => (
            <option key={customer.id} value={customer.name}>
              {customer.company ? `(${customer.company})` : ""}
            </option>
          ))}
        </datalist>
      </div>
    </div>
  );
};

export default CustomerSelector;
