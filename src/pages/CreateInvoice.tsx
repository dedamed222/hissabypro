import React from "react";
import { useInvoiceForm } from "@/hooks/useInvoiceForm";
import InvoiceHeader from "@/components/invoice/InvoiceHeader";
import CustomerSelector from "@/components/invoice/CustomerSelector";
import ProductSearch from "@/components/invoice/ProductSearch";
import SelectedProduct from "@/components/invoice/SelectedProduct";
import InvoiceNotification from "@/components/invoice/InvoiceNotification";
import InvoiceItemsTable from "@/components/invoice/InvoiceItemsTable";
import PaymentMethodSelector from "@/components/invoice/PaymentMethodSelector";
import PaymentStatusSelector from "@/components/invoice/PaymentStatusSelector";
import InvoiceActions from "@/components/invoice/InvoiceActions";
import ProfessionalInvoice from "@/components/invoice/ProfessionalInvoice";
import { useLocale } from "@/hooks/useLocale";
import { loadStoreData } from "@/utils/localStorage";
import { useState, useEffect } from "react";
import { StoreInfo } from "@/types";
import { Receipt, FileText, DollarSign, Calendar, Layers } from "lucide-react";

export default function CreateInvoice() {
  const { t, locale } = useLocale();
  const isFr = locale === 'fr';
  const {
    customers,
    selectedCustomer,
    handleCustomerChange,
    filteredProducts,
    selectedProduct,
    setSelectedProduct,
    invoiceItems,
    paymentMethod,
    setPaymentMethod,
    paymentStatus,
    setPaymentStatus,
    invoiceType,
    setInvoiceType,
    dueDate,
    setDueDate,
    debtType,
    setDebtType,
    notes,
    setNotes,
    invoiceNumber,
    quantity,
    manualQuantity,
    handleQuantityChange,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    success,
    currentDate,
    setCurrentDate,
    subtotal,
    discount,
    setDiscount,
    taxRate,
    setTaxRate,
    taxAmount,
    total,
    handleAddProduct,
    handleRemoveItem,
    handleSaveInvoice,
    handlePrintInvoice
  } = useInvoiceForm();

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  useEffect(() => {
    const data = loadStoreData();
    if (data.storeInfo) {
      setStoreInfo(data.storeInfo);
    }
  }, []);

  return (
    <div className="space-y-6 pb-20 print:p-0">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isFr ? "Créer une nouvelle facture" : "إنشاء فاتورة جديدة"}
              </h1>
              {invoiceType === 'sales' && (
                <span className="text-xs px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                  {t('salesInvoice') || (isFr ? 'Facture de vente' : 'فاتورة بيع')}
                </span>
              )}
              {invoiceType === 'quotation' && (
                <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold">
                  {t('quotationInvoice') || (isFr ? 'Devis' : 'عرض سعر')}
                </span>
              )}
              {invoiceType === 'debt' && (
                <span className="text-xs px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold">
                  {t('debtInvoice') || (isFr ? 'Facture à terme' : 'فاتورة دين')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isFr
                ? "Émission de factures de vente directe, devis et factures à terme avec impression officielle"
                : "إصدار فواتير البيع المباشر، عروض الأسعار وفواتير الآجل مع طباعة رسمية"}
            </p>
          </div>
        </div>

        {/* Invoice Type Pills Switcher */}
        <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 self-start sm:self-auto">
          {[
            { id: 'sales', label: t('salesInvoice') || (isFr ? 'Facture de vente' : 'فاتورة بيع'), icon: Receipt },
            { id: 'quotation', label: t('quotationInvoice') || (isFr ? 'Devis' : 'عرض سعر'), icon: FileText },
            { id: 'debt', label: t('debtInvoice') || (isFr ? 'Facture à terme' : 'فاتورة دين'), icon: DollarSign },
          ].map(type => {
            const Icon = type.icon;
            const isSelected = invoiceType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setInvoiceType(type.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-white text-blue-600 shadow-sm font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={14} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="md:col-span-2 space-y-5">
          {/* Print only header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-bold font-sans">
              {invoiceType === 'sales' ? (t('salesInvoice') || (isFr ? 'Facture de vente' : 'فاتورة بيع')) :
               invoiceType === 'quotation' ? (t('quotationInvoice') || (isFr ? 'Devis' : 'عرض سعر')) :
               (t('debtInvoice') || (isFr ? 'Facture à terme' : 'فاتورة دين'))}
            </h1>
            {invoiceType === 'quotation' && (
              <p className="mt-2 text-gray-500 font-sans">
                {isFr ? "Ceci est un devis indicatif sans engagement contractuel" : "هذا عرض سعر مبدئي وغير ملزم للطرفين"}
              </p>
            )}
          </div>

          <div className="gsc-card p-4">
            <InvoiceHeader invoiceNumber={invoiceNumber} currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </div>

          <div className="gsc-card p-4">
            <CustomerSelector selectedCustomer={selectedCustomer} customers={customers} onCustomerChange={handleCustomerChange} />
          </div>

          {invoiceType === 'debt' && (
            <div className="gsc-card p-4 border-amber-200 bg-amber-50/50 print:hidden">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700">{t('debtTypeLabel') || 'نوع الدين'}</label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value as any)}
                    title={t('debtTypeLabel') || 'نوع الدين'}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="debtor">{t('debtorLabel') || 'مدين (عليه)'}</option>
                    <option value="creditor">{t('creditorLabel') || 'دائن (له)'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700">{t('dueDate') || 'تاريخ الاستحقاق'}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    title={t('dueDate') || 'تاريخ الاستحقاق'}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-xl bg-white font-sans font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="gsc-card p-4">
            <ProductSearch
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredProducts={filteredProducts}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              quantity={quantity}
              manualQuantity={manualQuantity}
              handleQuantityChange={handleQuantityChange}
            />
          </div>

          <SelectedProduct
            selectedProduct={selectedProduct}
            selectedCustomer={selectedCustomer}
            handleAddProduct={handleAddProduct}
          />

          <InvoiceNotification error={error} success={success} />

          <div className="gsc-card p-4">
            <InvoiceItemsTable
              invoiceItems={invoiceItems}
              selectedCustomer={selectedCustomer}
              handleRemoveItem={handleRemoveItem}
              subtotal={subtotal}
              tax={taxAmount}
              total={total}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="gsc-card p-5 print:hidden">
            <h2 className="font-bold text-sm mb-4 text-slate-800 flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" />
              <span>{t('paymentInfo')}</span>
            </h2>

            <div className="space-y-4">
              {invoiceType !== 'quotation' && (
                <>
                  <PaymentStatusSelector paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} />
                  <PaymentMethodSelector paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
                </>
              )}
              {invoiceType === 'quotation' && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-medium leading-relaxed text-center">
                  {isFr 
                    ? "Ceci est un devis estimatif sans engagement mutuel. Les produits ne seront déduits du stock que lors de la conversion en vente."
                    : "هذا عرض سعر مبدئي وغير ملزم للطرفين ولن يتم خصم المنتجات من المخزون إلا عند تحويله إلى بيع."}
                </div>
              )}

              <div>
                <label htmlFor="notes" className="block text-xs font-bold text-slate-700 mb-1.5">{t('notes')}</label>
                <textarea 
                  id="notes"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3} 
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium" 
                  placeholder={t('addNotesPlaceholder')}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <label htmlFor="discount" className="block text-xs font-bold text-slate-700 mb-1">{t('discount') || 'الخصم'}</label>
                  <input 
                    id="discount"
                    type="number"
                    value={discount} 
                    onChange={e => setDiscount(Number(e.target.value))} 
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans text-center" 
                  />
                </div>
                <div>
                  <label htmlFor="taxRate" className="block text-xs font-bold text-slate-700 mb-1">{t('taxRate') || 'الضريبة (%)'}</label>
                  <input 
                    id="taxRate"
                    type="number"
                    value={taxRate} 
                    onChange={e => setTaxRate(Number(e.target.value))} 
                    className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold font-sans text-center" 
                  />
                </div>
              </div>
            </div>
          </div>

          <InvoiceActions
            loading={loading}
            invoiceItems={invoiceItems}
            selectedCustomer={selectedCustomer}
            handleSaveInvoice={handleSaveInvoice}
            handlePrintInvoice={handlePrintInvoice}
          />
        </div>
      </div>

      {storeInfo && (
        <ProfessionalInvoice 
          invoice={{
            id: 'PREVIEW',
            invoiceNumber,
            customerName: selectedCustomer?.name || '---',
            items: invoiceItems,
            products: [],
            total,
            subtotal,
            tax: taxAmount,
            discount,
            paymentMethod,
            status: paymentStatus,
            type: invoiceType,
            date: currentDate.toISOString(),
            createdAt: currentDate.toISOString(),
            dueDate,
            notes
          }}
          storeInfo={storeInfo}
          customerLetterheadUrl={selectedCustomer?.letterheadUrl}
        />
      )}
    </div>
  );
}