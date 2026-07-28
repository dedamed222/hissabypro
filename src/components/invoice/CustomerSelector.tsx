import React, { useState, useEffect } from "react";
import { Customer } from "@/types";
import { useLocale } from "@/hooks/useLocale";

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
    <div className="arab-form-group">
      <label id="customer-label" className="arab-label">{t('customer')} <span className="text-red-500">*</span></label>
      <input
        type="text"
        list="customers-list"
        value={inputValue}
        onChange={handleChange}
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-primary bg-white font-sans"
        placeholder={t('selectCustomer') || 'اختر أو اكتب اسم العميل'}
      />
      <datalist id="customers-list">
        {customers.map((customer) => (
          <option key={customer.id} value={customer.name}>
            {customer.company ? `(${customer.company})` : ""}
          </option>
        ))}
      </datalist>
    </div>
  );
};

export default CustomerSelector;
