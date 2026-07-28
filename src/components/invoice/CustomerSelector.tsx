
import React from "react";
import { Customer } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/useLocale";

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  customers: Customer[];
  onCustomerChange: (customerId: string) => void;
}

const CustomerSelector = ({ selectedCustomer, customers, onCustomerChange }: CustomerSelectorProps) => {
  const { t } = useLocale();

  return (
    <div className="arab-form-group">
      <label id="customer-label" className="arab-label">{t('customer')} <span className="text-red-500">*</span></label>
      <Select
        value={selectedCustomer?.id || ""}
        onValueChange={(value) => onCustomerChange(value)}
      >
        <SelectTrigger aria-labelledby="customer-label" className="w-full font-sans" title={t('selectCustomer')}>
          <SelectValue placeholder={t('selectCustomer')} />
        </SelectTrigger>
        <SelectContent>
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id} className="font-sans">
              {customer.name} {customer.company ? `(${customer.company})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustomerSelector;
