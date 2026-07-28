
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
          margin: 0
        });
      } catch (err) {
        console.error("Barcode generation failed:", err);
      }
    }
  }, [invoice.invoiceNumber]);

  return (
    <div 
      className={`professional-invoice print:block hidden bg-white p-12 mx-auto text-gray-800 font-sans border-0 w-[210mm] min-h-[297mm]`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6 print:mb-4 border-b-4 border-primary-600 pb-6 print:pb-4">
        <div className="flex flex-col gap-3 max-w-[60%]">
          {storeInfo.photoUrl ? (
            <img src={storeInfo.photoUrl} alt="Store Logo" className="w-24 h-24 print:w-20 print:h-20 object-contain rounded-xl shadow-sm bg-gray-50 p-2 border border-gray-100" />
          ) : (
            <div className="w-16 h-16 print:w-14 print:h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {storeInfo.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl print:text-xl font-black text-gray-900 mb-1">{storeInfo.name}</h1>
            <div className="space-y-0.5 text-xs print:text-[10px] text-gray-600 font-medium">
              <p className="flex items-center gap-2">{storeInfo.address}</p>
              <p dir="ltr" className={isRTL ? "text-right" : ""}>{t('phone')}: {storeInfo.phone}</p>
              {storeInfo.email && <p dir="ltr" className={isRTL ? "text-right" : ""}>{storeInfo.email}</p>}
              {storeInfo.commercialRegister && (
                <p className="mt-2 inline-block bg-gray-100 px-2 py-0.5 rounded text-[12px] font-bold border border-gray-200">
                  {t('commercialRegister')}: {storeInfo.commercialRegister}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end pt-2">
          <div className="bg-primary-600 text-white px-6 py-2 print:px-4 print:py-1 rounded-bl-2xl rounded-tr-lg shadow-md mb-4 inline-block">
            <h2 className="text-xl print:text-lg font-bold uppercase tracking-wider">
              {invoice.type === 'quotation' ? t('quotationInvoice') : 
               invoice.type === 'debt' ? t('debtInvoice') : t('salesInvoice')}
            </h2>
          </div>
          
          <div className="space-y-2 text-right">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t('invoiceNumber')}</span>
              <span className="text-xl font-mono font-black text-primary-700">#{invoice.invoiceNumber}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t('date')}</span>
              <span className="font-semibold">{formatDate(new Date(invoice.date))}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">{t('dueDate')}</span>
                <span className="font-bold text-red-600">{formatDate(new Date(invoice.dueDate))}</span>
              </div>
            )}
            <div className="mt-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-700 border border-green-200' :
                invoice.status === 'partial' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
                {t(invoice.status as any)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & QR Section */}
      <div className="grid grid-cols-12 gap-6 print:gap-4 mb-8 print:mb-4">
        <div className="col-span-8 bg-gray-50 rounded-2xl p-6 print:p-4 border border-gray-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary-100 rounded-full -mr-12 -mt-12 opacity-50"></div>
          <h3 className="text-xs uppercase font-black text-primary-600 mb-4 tracking-widest border-b border-primary-100 pb-2 inline-block">
            {t('customerInfo')}
          </h3>
          <div className="space-y-1 relative z-10">
            <p className="text-xl font-black text-gray-900">{invoice.customerName}</p>
            {/* Add customer phone/address here if available in your system */}
          </div>
        </div>
        
        <div className="col-span-4 bg-white rounded-2xl p-4 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
          <QRCodeSVG 
            value={JSON.stringify({
              id: invoice.id,
              no: invoice.invoiceNumber,
              total: invoice.total,
              store: storeInfo.name
            })} 
            size={80} 
            level="H" 
            includeMargin={false}
            className="opacity-90"
          />
          <span className="text-[9px] font-mono text-gray-400">SECURE VERIFICATION QR</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8 print:mb-4 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="px-4 py-2 print:px-2 print:py-1 font-bold uppercase tracking-wider text-right w-10">#</th>
              <th className={`px-4 py-2 print:px-2 print:py-1 font-bold uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('product')}</th>
              <th className="px-4 py-2 print:px-2 print:py-1 font-bold uppercase tracking-wider text-center">{t('quantity')}</th>
              <th className={`px-4 py-2 print:px-2 print:py-1 font-bold uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('unitPrice')}</th>
              <th className={`px-4 py-2 print:px-2 print:py-1 font-bold uppercase tracking-wider ${isRTL ? 'text-left' : 'text-right'}`}>{t('total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2 print:px-2 print:py-1 text-gray-400 font-mono text-right">{index + 1}</td>
                <td className="px-4 py-2 print:px-2 print:py-1">
                  <div className="font-bold text-gray-900 print:text-xs">{item.productName}</div>
                  <div className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{item.productCode}</div>
                </td>
                <td className="px-4 py-2 print:px-2 print:py-1 text-center">
                   <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700 print:text-[10px]">{item.quantity}</span>
                </td>
                <td className={`px-4 py-2 print:px-2 print:py-1 text-gray-600 print:text-[10px] ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(item.price)}</td>
                <td className={`px-4 py-2 print:px-2 print:py-1 font-black text-primary-700 print:text-[10px] ${isRTL ? 'text-left' : 'text-right'}`}>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer & Totals */}
      <div className="grid grid-cols-12 gap-10 print:gap-6">
        <div className="col-span-7 space-y-6">
          {invoice.notes && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
               <h4 className="text-xs uppercase font-black text-amber-700 mb-2 tracking-widest">{t('notes')}</h4>
               <p className="text-sm text-amber-800 leading-relaxed italic">{invoice.notes}</p>
            </div>
          )}

          <div className="pt-4">
            <h4 className="text-xs uppercase font-black text-gray-400 mb-3 tracking-widest">{t('termsAndConditions')}</h4>
            <ul className="text-[11px] text-gray-500 space-y-1.5 list-disc list-inside">
              <li>{isRTL ? 'البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام.' : 'Les marchandises vendues ne sont ni reprises ni échangées après 3 jours.'}</li>
              <li>{isRTL ? 'يجب إحضار الفاتورة الأصلية عند المراجعة.' : "La facture originale doit être présentée lors de l'examen."}</li>
              {invoice.type === 'quotation' && (
                <li className="font-bold text-primary-600 italic">
                  {isRTL ? 'هذه الفاتورة لا تعتبر إيصال دفع، هي مجرد عرض سعر.' : 'Cette facture n\'est pas un reçu de paiement, c\'est juste un devis.'}
                </li>
              )}
            </ul>
            <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-4">
               <div className="flex-1 text-center">
                  <div className="h-20 w-full border-b border-gray-300 mb-1 flex items-center justify-center">
                     {/* Digital Stamp Area */}
                     <div className="w-24 h-24 border-4 border-primary-200 rounded-full flex items-center justify-center opacity-10 -rotate-12">
                        <span className="text-[8px] font-black uppercase text-primary-400 text-center">{storeInfo.name}<br/>OFFICIAL STAMP</span>
                     </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{t('stamp')}</span>
               </div>
               <div className="flex-1 text-center">
                  <div className="h-20 w-full border-b border-gray-300 mb-1"></div>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{t('signature')}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="col-span-5 bg-gray-900 rounded-3xl print:rounded-2xl p-8 print:p-4 text-white shadow-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.03] rounded-full -mr-16 -mt-16"></div>
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center opacity-60 text-sm">
              <span className="font-medium tracking-wide uppercase">{t('subtotal')}</span>
              <span className="font-bold">{formatCurrency(invoice.subtotal || invoice.total)}</span>
            </div>
            
            {(invoice.discount || 0) > 0 && (
              <div className="flex justify-between items-center text-red-400 text-sm">
                <span className="font-medium tracking-wide uppercase">{t('discount')}</span>
                <span className="font-bold">-{formatCurrency(invoice.discount || 0)}</span>
              </div>
            )}
            
            {(invoice.tax || 0) > 0 && (
              <div className="flex justify-between items-center text-blue-400 text-sm">
                <span className="font-medium tracking-wide uppercase">{t('taxAmount')}</span>
                <span className="font-bold">+{formatCurrency(invoice.tax || 0)}</span>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 mt-4 print:mt-2 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase text-primary-400 tracking-[0.2em] block mb-1">
                   {isRTL ? 'إجمالي الفاتورة' : 'GRAND TOTAL'}
                </span>
                <span className="text-4xl print:text-2xl font-black tabular-nums tracking-tighter">
                   {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
            
            {invoice.type !== 'quotation' && (
              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                 <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest opacity-40">
                   <span>{t('paymentMethod')}</span>
                   <span>{t(invoice.paymentMethod as any)}</span>
                 </div>
                 {/* Future: Add Paid/Remaining here if your data supports it */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Barcode */}
      <div className="mt-8 print:mt-4 pt-4 border-t border-gray-50 flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity duration-300">
         <svg ref={barcodeRef} className="max-w-[150px] print:max-w-[120px]"></svg>
         <p className="text-[8px] font-mono mt-0.5 uppercase tracking-widest text-gray-400">
            Internal Document Reference: {invoice.id}
         </p>
         <div className="mt-2 text-[8px] font-black text-primary-600 bg-primary-50 px-3 py-0.5 rounded-full uppercase tracking-widest">
            {t('thankYou')}
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
          }
          .professional-invoice {
            display: block !important;
            box-shadow: none !important;
            border: none !important;
            padding: 10mm !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfessionalInvoice;
