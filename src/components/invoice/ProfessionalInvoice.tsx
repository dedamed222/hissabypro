import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { useLocale } from '@/hooks/useLocale';
import { Invoice, StoreInfo } from '@/types';
import { formatCurrency } from "@/utils/formatters";

interface ProfessionalInvoiceProps {
  invoice: Invoice;
  storeInfo: StoreInfo;
  customerLetterheadUrl?: string;
}

const ProfessionalInvoice = ({ invoice, storeInfo, customerLetterheadUrl }: ProfessionalInvoiceProps) => {
  const { t, formatDate, locale } = useLocale();
  const barcodeRef = useRef<SVGSVGElement>(null);
  const isRTL = locale === 'ar';

  useEffect(() => {
    if (barcodeRef.current && invoice.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, invoice.invoiceNumber, {
          format: "CODE128",
          width: 1.5,
          height: 35,
          displayValue: false,
          margin: 0,
          lineColor: "#374151"
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [invoice.invoiceNumber]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: '#dcfce7', text: '#15803d', border: '#86efac', label: t('paid') || 'مدفوعة', watermark: 'PAID' };
      case 'partial':
        return { bg: '#fef9c3', text: '#a16207', border: '#fde047', label: t('partial') || 'مدفوعة جزئياً', watermark: 'PARTIAL' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: t('cancelled') || 'ملغاة', watermark: 'CANCELLED' };
      default:
        return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74', label: t('pending') || 'غير مدفوعة', watermark: 'UNPAID' };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);
  const paperSize = storeInfo.printSettings?.paperSize || 'A4';
  const orientation = storeInfo.printSettings?.orientation || 'portrait';
  const printWithLetterhead = storeInfo.printSettings?.printWithLetterhead || false;
  // Read from dedicated localStorage key (large base64 no longer stored in storeInfo)
  const storedLetterhead = typeof window !== 'undefined' ? (localStorage.getItem('store-letterhead-v1') || storeInfo.letterheadUrl || '') : '';
  const letterheadUrl = customerLetterheadUrl || storedLetterhead;
  const margins = storeInfo.printSettings?.margins || { top: 15, bottom: 15, left: 15, right: 15 };

  const getDims = () => {
    switch (paperSize) {
      case 'A3': return orientation === 'portrait' ? { w: '297mm', h: '420mm' } : { w: '420mm', h: '297mm' };
      case 'A4': return orientation === 'portrait' ? { w: '210mm', h: '297mm' } : { w: '297mm', h: '210mm' };
      case 'A5': return orientation === 'portrait' ? { w: '148mm', h: '210mm' } : { w: '210mm', h: '148mm' };
      case 'A6': return orientation === 'portrait' ? { w: '105mm', h: '148mm' } : { w: '148mm', h: '105mm' };
      default: return { w: '210mm', h: '297mm' };
    }
  };
  const dims = getDims();

  const invoiceTitle = invoice.type === 'quotation'
    ? (t('quotationInvoice') || 'عرض سعر')
    : invoice.type === 'debt'
    ? (t('debtInvoice') || 'فاتورة دين')
    : (t('salesInvoice') || 'فاتورة بيع');

  return (
    <div
      className="professional-invoice print:block hidden bg-white mx-auto text-gray-800 font-sans relative shadow-xl"
      style={{ maxWidth: dims.w, width: dims.w, height: dims.h, direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* Letterhead Background - full page at invoice size */}
      {printWithLetterhead && letterheadUrl && (
        <img
          src={letterheadUrl}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ objectFit: 'fill', opacity: 1 }}
          alt=""
        />
      )}

      {/* Status Watermark */}
      {invoice.type !== 'quotation' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.04] print:opacity-[0.05]">
          <div className="transform -rotate-45 text-[120px] font-black tracking-widest text-gray-900 whitespace-nowrap">
            {statusConfig.watermark}
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div
        className="relative z-10 flex flex-col"
        style={{
          position: 'absolute',
          top: `${margins.top}mm`,
          bottom: `${margins.bottom}mm`,
          left: `${margins.left}mm`,
          right: `${margins.right}mm`,
          overflow: 'hidden',
        }}
      >
        {/* Content column - full width of the safe area */}
        <div style={{ width: '100%' }}>

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start mb-5 gap-4">
          {/* Left: Logo / Company Info */}
          <div className="flex flex-col gap-1.5 min-w-0">
            {!printWithLetterhead && storeInfo.photoUrl && (
              <img src={storeInfo.photoUrl} alt="Logo" className="max-h-16 max-w-[160px] object-contain mb-1" />
            )}
            {!printWithLetterhead && (
              <div className="text-xs text-gray-600 space-y-0.5 leading-relaxed">
                {storeInfo.address && <p className="font-medium">{storeInfo.address}</p>}
                {storeInfo.phone && <p dir="ltr" className={isRTL ? 'text-right' : ''}>{storeInfo.phone}</p>}
                {storeInfo.email && <p dir="ltr" className={isRTL ? 'text-right' : ''}>{storeInfo.email}</p>}
                {storeInfo.commercialRegister && (
                  <p className="text-gray-500">{t('commercialRegister')}: {storeInfo.commercialRegister}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Invoice Title + Meta */}
          <div className={`flex flex-col ${isRTL ? 'items-start' : 'items-end'} shrink-0`}>
            {/* Title row */}
            <div className="flex items-center gap-2 mb-2">
              {invoice.type !== 'quotation' && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border"
                  style={{ background: statusConfig.bg, color: statusConfig.text, borderColor: statusConfig.border }}
                >
                  {statusConfig.label}
                </span>
              )}
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{invoiceTitle}</h2>
            </div>

            {/* Meta table */}
            <table className="text-xs border-collapse">
              <tbody>
                <tr>
                  <td className={`py-0.5 text-gray-500 font-semibold uppercase tracking-wider ${isRTL ? 'pl-4' : 'pr-4'}`}>
                    {t('invoiceNumber')}
                  </td>
                  <td className="font-bold text-gray-900 py-0.5">#{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className={`py-0.5 text-gray-500 font-semibold uppercase tracking-wider ${isRTL ? 'pl-4' : 'pr-4'}`}>
                    {t('date')}
                  </td>
                  <td className="font-bold text-gray-900 py-0.5">{formatDate(new Date(invoice.date))}</td>
                </tr>
                {invoice.dueDate && (
                  <tr>
                    <td className={`py-0.5 text-gray-500 font-semibold uppercase tracking-wider ${isRTL ? 'pl-4' : 'pr-4'}`}>
                      {t('dueDate')}
                    </td>
                    <td className="font-bold text-gray-900 py-0.5">{formatDate(new Date(invoice.dueDate))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-gray-800 mb-4" />

        {/* ── CLIENT INFO ── */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            {t('customerInfo') || 'معلومات العميل'}
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
            <p className="font-bold text-gray-900 text-sm">{invoice.customerName}</p>
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div className="mb-5">
          <table className="w-full text-xs border-collapse border border-gray-800">
            <thead>
              <tr style={{ backgroundColor: '#bfdbfe', color: '#1e3a8a' }}>
                <th className="px-2 py-2 text-center w-8 border border-blue-300">#</th>
                <th className={`px-3 py-2 border border-blue-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('product')}
                </th>
                <th className="px-2 py-2 text-center w-16 border border-blue-300">{t('quantity')}</th>
                <th className={`px-2 py-2 w-24 border border-blue-300 ${isRTL ? 'text-left' : 'text-right'}`}>
                  {t('unitPrice')}
                </th>
                <th className={`px-2 py-2 w-24 border border-blue-300 ${isRTL ? 'text-left' : 'text-right'}`}>
                  {t('total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#eff6ff' }}>
                  <td className="px-2 py-2 text-center text-gray-600 border border-blue-200">{index + 1}</td>
                  <td className={`px-3 py-2 border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="font-semibold text-gray-900">{item.productName}</div>
                    {item.productCode && (
                      <div className="text-[10px] text-gray-500 mt-0.5">{item.productCode}</div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-800 font-medium border border-blue-200">
                    {item.quantity}
                  </td>
                  <td className={`px-2 py-2 text-gray-700 border border-blue-200 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {formatCurrency(item.price)}
                  </td>
                  <td className={`px-2 py-2 font-bold text-gray-900 border border-blue-200 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TOTALS + NOTES ROW ── */}
        <div className="flex justify-between items-start mb-6 gap-6">
          {/* Notes / Payment Method */}
          <div className="flex-1 space-y-3">
            {invoice.notes && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('notes')}</p>
                <p className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2 leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.type !== 'quotation' && invoice.type !== 'debt' && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('paymentMethod')}</p>
                <p className="text-sm font-bold text-gray-900">
                  {t(invoice.paymentMethod as any) || invoice.paymentMethod}
                </p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="shrink-0 w-56">
            <table className="w-full text-xs border-collapse border border-blue-300">
              <tbody>
                <tr>
                  <td className={`py-2 px-3 text-gray-700 font-semibold border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}
                    style={{ backgroundColor: '#eff6ff' }}>
                    {t('subtotal')}
                  </td>
                  <td className={`py-2 px-3 font-semibold text-gray-900 border border-blue-200 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {formatCurrency(invoice.subtotal || invoice.total)}
                  </td>
                </tr>
                {(invoice.discount || 0) > 0 && (
                  <tr>
                    <td className={`py-2 px-3 text-gray-700 font-semibold border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}
                      style={{ backgroundColor: '#eff6ff' }}>
                      {t('discount')}
                    </td>
                    <td className={`py-2 px-3 font-semibold text-red-600 border border-blue-200 ${isRTL ? 'text-left' : 'text-right'}`}>
                      -{formatCurrency(invoice.discount || 0)}
                    </td>
                  </tr>
                )}
                {(invoice.tax || 0) > 0 && (
                  <tr>
                    <td className={`py-2 px-3 text-gray-700 font-semibold border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}
                      style={{ backgroundColor: '#eff6ff' }}>
                      {t('taxAmount')}
                    </td>
                    <td className={`py-2 px-3 font-semibold text-gray-900 border border-blue-200 ${isRTL ? 'text-left' : 'text-right'}`}>
                      +{formatCurrency(invoice.tax || 0)}
                    </td>
                  </tr>
                )}
                <tr className="total-row" style={{ backgroundColor: '#f3f4f6', color: '#000000' }}>
                  <td className={`py-2.5 px-3 font-black text-sm border border-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('total')}
                  </td>
                  <td className={`py-2.5 px-3 font-black text-sm border border-gray-300 ${isRTL ? 'text-left' : 'text-right'}`}>
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="mt-auto pt-4 border-t border-gray-300">
          <div className="flex justify-between items-end gap-4">
            {/* Terms */}
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {t('termsAndConditions')}
              </p>
              <ul className="text-[10px] text-gray-500 space-y-0.5 list-disc list-inside leading-relaxed">
                <li>
                  {isRTL
                    ? 'البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام.'
                    : 'Les marchandises vendues ne sont ni reprises ni échangées après 3 jours.'}
                </li>
                <li>
                  {isRTL
                    ? 'يجب إحضار الفاتورة الأصلية عند المراجعة.'
                    : "La facture originale doit être présentée lors de l'examen."}
                </li>
              </ul>
              <p className="mt-2 text-xs font-semibold text-gray-700">
                {t('thankYou') || 'شكراً لتعاملكم معنا!'}
              </p>
            </div>

            {/* QR + Barcode */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <QRCodeSVG
                value={JSON.stringify({ id: invoice.id, no: invoice.invoiceNumber, total: invoice.total })}
                size={48}
                level="M"
                includeMargin={false}
              />
              <svg ref={barcodeRef} className="max-w-[90px]"></svg>
            </div>
          </div>{/* end flex row */}
        </div>{/* end footer */}

        </div>{/* end centered content column */}

      </div>{/* end main content */}

      <style>{`
        @media print {
          @page {
            size: ${paperSize.toLowerCase()} ${orientation};
            margin: 0mm;
          }

          /* Force color/background printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide everything via visibility (keeps DOM hierarchy intact) */
          body {
            visibility: hidden !important;
          }

          /* Show only the invoice and ALL its children */
          .professional-invoice,
          .professional-invoice * {
            visibility: visible !important;
          }

          /* Position invoice at top of page */
          .professional-invoice {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          /* Ensure table header light blue background prints */
          thead tr {
            background-color: #bfdbfe !important;
            color: #1e3a8a !important;
          }

          /* Total row light gray / black */
          tr.total-row {
            background-color: #f3f4f6 !important;
            color: #000000 !important;
          }

          /* Ensure zebra striping prints */
          tr:nth-child(even) {
            background-color: #eff6ff !important;
          }

          /* Avoid breaking rows across pages */
          table { page-break-inside: auto; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>
    </div>
  );
};

export default ProfessionalInvoice;

