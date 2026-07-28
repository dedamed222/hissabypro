
import React from "react";
import { InvoiceItem, Customer } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface InvoiceItemsTableProps {
  invoiceItems: InvoiceItem[];
  selectedCustomer: Customer | null;
  handleRemoveItem: (index: number) => void;
  subtotal: number;
  tax: number;
  total: number;
}

const InvoiceItemsTable = ({
  invoiceItems,
  selectedCustomer,
  handleRemoveItem,
  subtotal,
  tax,
  total,
}: InvoiceItemsTableProps) => {
  const { t } = useLocale();

  return (
    <div className="arab-card card-amber print:shadow-none print:border-0 mx-[30px]">
      <h2 className="font-medium mb-4 text-arab-amber-dark print:text-lg print:font-bold">
        {t('invoiceItemsLabel')} {selectedCustomer && <span className="print:block">- {selectedCustomer.name}</span>}
      </h2>
      
      <div className="print:border print:border-gray-300 print:p-2">
        <table className="arab-table">
          <thead className="bg-arab-amber/10">
            <tr>
              <th className="font-medium">{t('code')}</th>
              <th className="font-medium">{t('product')}</th>
              <th className="font-medium">{t('quantity')}</th>
              <th className="font-medium">{t('productPrice')}</th>
              <th className="font-medium">{t('totalAmount')}</th>
              <th className="font-medium print:hidden">{t('delete')}</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.length > 0 ? (
              invoiceItems.map((item, index) => (
                <tr key={index} className="font-sans">
                  <td>{item.productCode}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{formatCurrency(item.total)}</td>
                  <td className="print:hidden">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800"
                      title={t('delete')}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500 font-sans">
                  {t('noItemsAdded')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex flex-col rtl:items-start ltr:items-end">
        <div className="flex items-center justify-between w-full max-w-xs font-sans">
          <span className="text-gray-500">{t('subtotal')}:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between w-full max-w-xs font-sans">
          <span className="text-gray-500">{t('tax')}:</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex items-center justify-between w-full max-w-xs font-bold text-lg mt-2 font-sans">
          <span>{t('total')}:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

export default InvoiceItemsTable;
