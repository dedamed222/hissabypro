import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { useLocale } from '@/hooks/useLocale';
import { Invoice, StoreInfo } from '@/types';
import { formatCurrency } from "@/utils/formatters";

interface ProfessionalInvoiceProps {
  invoice: Invoice;
  storeInfo: StoreInfo;
}

const ProfessionalInvoice = ({ invoice, storeInfo }: ProfessionalInvoiceProps) => {
  const { t, formatDate, locale } = useLocale();
  const barcodeRef = useRef<SVGSVGElement>(null);
  const isRTL = locale === 'ar';

  useEffect(() => {
    if (barcodeRef.current && invoice.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, invoice.invoiceNumber, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 0,
          lineColor: "#374151"
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [invoice.invoiceNumber]);

  // Determine status colors and labels
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: t('paid') || 'مدفوعة', watermark: 'PAID' };
      case 'partial':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: t('partial') || 'مدفوعة جزئياً', watermark: 'PARTIAL' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: t('cancelled') || 'ملغاة', watermark: 'CANCELLED' };
      default:
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', label: t('pending') || 'غير مدفوعة', watermark: 'UNPAID' };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);

  return (
    <div
      className={`professional-invoice print:block hidden bg-white mx-auto text-gray-800 font-sans w-[210mm] min-h-[297mm] relative overflow-hidden shadow-xl`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Letterhead / Background Logo */}
      {storeInfo.photoUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
          <img
            src={storeInfo.photoUrl}
            alt="Letterhead Background"
            className="w-full h-full object-cover opacity-100 print:opacity-100"
          />
        </div>
      )}

      {/* Status Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03] print:opacity-[0.05]">
        <div className="transform -rotate-45 text-[150px] font-black tracking-widest text-gray-900 whitespace-nowrap">
          {statusConfig.watermark}
        </div>
      </div>

      <div className="relative z-10 p-8 print:p-6 flex flex-col h-full bg-white/80 print:bg-transparent">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 mt-16 print:mt-24">
          {/* Company Info */}
          <div className="flex flex-col gap-2 max-w-[50%]">
            <div>
              {/* Company name removed as per user request */}
              <div className="text-xs text-gray-800 font-medium space-y-0.5 bg-white/50 p-2 rounded-lg backdrop-blur-sm print:bg-transparent print:p-0">
                {storeInfo.address && <p>{storeInfo.address}</p>}
                {storeInfo.phone && <p dir="ltr" className={isRTL ? "text-right" : ""}>{storeInfo.phone}</p>}
                {storeInfo.email && <p dir="ltr" className={isRTL ? "text-right" : ""}>{storeInfo.email}</p>}
                {storeInfo.commercialRegister && (
                  <p className="mt-1 text-[10px] text-gray-600">
                    {t('commercialRegister')}: {storeInfo.commercialRegister}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                {statusConfig.label}
              </span>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {invoice.type === 'quotation' ? t('quotationInvoice') :
                  invoice.type === 'debt' ? t('debtInvoice') : t('salesInvoice')}
              </h2>
            </div>

            <table className="text-xs">
              <tbody>
                <tr>
                  <td className="pr-3 py-0.5 text-gray-500 font-medium uppercase text-[10px] tracking-wider">{t('invoiceNumber')}</td>
                  <td className="font-bold text-gray-900">#{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="pr-3 py-0.5 text-gray-500 font-medium uppercase text-[10px] tracking-wider">{t('date')}</td>
                  <td className="font-bold text-gray-900">{formatDate(new Date(invoice.date))}</td>
                </tr>
                {invoice.dueDate && (
                  <tr>
                    <td className="pr-3 py-0.5 text-gray-500 font-medium uppercase text-[10px] tracking-wider">{t('dueDate')}</td>
                    <td className="font-bold text-gray-900">{formatDate(new Date(invoice.dueDate))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <hr className="border-gray-200 mb-6" />

        {/* Client Info */}
        <div className="mb-6">
          <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1.5">
            {t('customerInfo') || 'فاتورة إلى'}
          </h3>
          <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-100">
            <p className="text-sm font-bold text-gray-900">{invoice.customerName}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 flex-grow">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-primary-600 text-white">
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-right w-10 rounded-tr-lg rounded-br-lg">#</th>
                <th className={`px-3 py-2 font-semibold uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('product')}</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-center w-20">{t('quantity')}</th>
                <th className={`px-3 py-2 font-semibold uppercase tracking-wider w-24 ${isRTL ? 'text-left' : 'text-right'}`}>{t('unitPrice')}</th>
                <th className={`px-3 py-2 font-semibold uppercase tracking-wider w-28 rounded-tl-lg rounded-bl-lg ${isRTL ? 'text-left' : 'text-right'}`}>{t('total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, index) => (
                <tr key={index} className="even:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-500 text-right">{index + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-gray-900">{item.productName}</div>
                    {item.productCode && <div className="text-[10px] text-gray-500 mt-0.5">{item.productCode}</div>}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700">{item.quantity}</td>
                  <td className={`px-3 py-2 text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(item.price)}</td>
                  <td className={`px-3 py-2 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-between items-start mb-8">
          <div className="w-1/2 pr-6">
            {invoice.notes && (
              <div className="mb-4">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1.5">{t('notes')}</h4>
                <p className="text-xs text-gray-600 bg-gray-50/80 p-2 rounded-lg border border-gray-100">{invoice.notes}</p>
              </div>
            )}

            {invoice.type !== 'quotation' && invoice.type !== 'debt' && (
              <div>
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1.5">{t('paymentMethod')}</h4>
                <p className="text-xs font-medium text-gray-800">{t(invoice.paymentMethod as any) || invoice.paymentMethod}</p>
              </div>
            )}
          </div>

          <div className="w-1/2 max-w-[250px]">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-1.5 text-gray-600 font-medium">{t('subtotal')}</td>
                  <td className={`py-1.5 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(invoice.subtotal || invoice.total)}</td>
                </tr>
                {(invoice.discount || 0) > 0 && (
                  <tr>
                    <td className="py-1.5 text-gray-600 font-medium">{t('discount')}</td>
                    <td className={`py-1.5 font-semibold text-red-600 ${isRTL ? 'text-left' : 'text-right'}`}>-{formatCurrency(invoice.discount || 0)}</td>
                  </tr>
                )}
                {(invoice.tax || 0) > 0 && (
                  <tr>
                    <td className="py-1.5 text-gray-600 font-medium">{t('taxAmount')}</td>
                    <td className={`py-1.5 font-semibold text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>+{formatCurrency(invoice.tax || 0)}</td>
                  </tr>
                )}
                <tr className="bg-gray-50/80">
                  <td className="py-2.5 px-2 font-bold text-gray-900 text-sm rounded-tr-lg rounded-br-lg">{t('total')}</td>
                  <td className={`py-2.5 px-2 font-bold text-primary-700 text-lg rounded-tl-lg rounded-bl-lg ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(invoice.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex justify-between items-end">
            <div className="flex-1">
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1.5">{t('termsAndConditions')}</h4>
              <ul className="text-[10px] text-gray-500 space-y-0.5 list-disc list-inside">
                <li>{isRTL ? 'البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام.' : 'Les marchandises vendues ne sont ni reprises ni échangées après 3 jours.'}</li>
                <li>{isRTL ? 'يجب إحضار الفاتورة الأصلية عند المراجعة.' : "La facture originale doit être présentée lors de l'examen."}</li>
              </ul>
              <p className="mt-3 text-xs font-medium text-gray-800">{t('thankYou') || 'شكراً لتعاملكم معنا!'}</p>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <QRCodeSVG
                value={JSON.stringify({
                  id: invoice.id,
                  no: invoice.invoiceNumber,
                  total: invoice.total
                })}
                size={50}
                level="M"
                includeMargin={false}
              />
              <svg ref={barcodeRef} className="max-w-[100px]"></svg>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .professional-invoice {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfessionalInvoice;
