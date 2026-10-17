import React from "react";
import { InvoiceItem, Customer } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Trash2, ShoppingBag } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('invoiceItemsLabel') || 'أصناف الفاتورة'} ({invoiceItems.length})
          </h2>
        </div>
        {selectedCustomer && (
          <span className="text-xs font-semibold text-slate-500">العميل: {selectedCustomer.name}</span>
        )}
      </div>

      {invoiceItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          <ShoppingBag size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600 mb-0.5">{t('noItemsAdded') || 'لم تتم إضافة أي أصناف بعد'}</p>
          <p className="text-[11px] text-slate-400">ابحث عن المنتجات في الحقل أعلاه وأضفها إلى قائمة الفاتورة</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">الرمز</th>
                <th className="py-2.5 px-3">اسم المنتج</th>
                <th className="py-2.5 px-3 text-center">الكمية</th>
                <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
                <th className="py-2.5 px-3 text-left">الإجمالي</th>
                <th className="py-2.5 px-3 text-center print:hidden">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoiceItems.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-medium text-slate-600">{item.productCode || "---"}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{item.productName}</td>
                  <td className="py-3 px-3 text-center font-bold font-sans text-slate-800">{item.quantity}</td>
                  <td className="py-3 px-3 text-center font-medium font-sans text-slate-600">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-3 text-left font-black font-sans text-slate-900">{formatCurrency(item.total)}</td>
                  <td className="py-3 px-3 text-center print:hidden">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invoiceItems.length > 0 && (
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 flex flex-col gap-2 max-w-sm mr-auto text-xs font-medium">
          <div className="flex items-center justify-between text-slate-600">
            <span>{t('subtotal') || 'المجموع الفرعي'}:</span>
            <span className="font-bold font-sans text-slate-800">{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>{t('tax') || 'الضريبة'}:</span>
              <span className="font-bold font-sans text-slate-800">{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
            <span>{t('total') || 'المبلغ الإجمالي النهائي'}:</span>
            <span className="text-base text-blue-600 font-sans">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceItemsTable;
