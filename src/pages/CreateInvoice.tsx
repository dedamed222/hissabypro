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
import InvoicePrintDetails from "@/components/invoice/InvoicePrintDetails";
import ProfessionalInvoice from "@/components/invoice/ProfessionalInvoice";
import { useLocale } from "@/hooks/useLocale";
import { loadStoreData } from "@/utils/localStorage";
import { useState, useEffect } from "react";
import { StoreInfo } from "@/types";

export default function CreateInvoice() {
  const { t } = useLocale();
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

  return <div className="space-y-6 print:p-0">
      <div className="flex items-center justify-between mb-6 print:hidden mx-[30px]">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          {t('createInvoice')}
          {invoiceType === 'sales' && <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">{t('salesInvoice') || 'فاتورة بيع'}</span>}
          {invoiceType === 'quotation' && <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full">{t('quotationInvoice') || 'عرض سعر'}</span>}
          {invoiceType === 'debt' && <span className="text-sm px-3 py-1 bg-orange-100 text-orange-800 rounded-full">{t('debtInvoice') || 'فاتورة دين'}</span>}
        </h1>
      </div>
      
      <div className="arab-card mx-[30px] mb-6 print:hidden">
        <h2 className="font-medium mb-4 text-arab-dark">{t('invoiceTypeLabel') || 'نوع الفاتورة'}</h2>
        <select
          value={invoiceType}
          onChange={(e) => setInvoiceType(e.target.value as any)}
          title={t('invoiceTypeLabel') || 'نوع الفاتورة'}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-primary bg-white"
        >
          <option value="sales">{t('salesInvoice') || 'فاتورة بيع'}</option>
          <option value="quotation">{t('quotationInvoice') || 'عرض سعر'}</option>
          <option value="debt">{t('debtInvoice') || 'فاتورة دين'}</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="md:col-span-2 space-y-6">
          {/* Print only header */}
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-bold font-sans">
              {invoiceType === 'sales' ? (t('salesInvoice') || 'فاتورة بيع') :
               invoiceType === 'quotation' ? (t('quotationInvoice') || 'عرض سعر') :
               (t('debtInvoice') || 'فاتورة دين')}
            </h1>
            {invoiceType === 'quotation' && (
              <p className="mt-2 text-gray-500 font-sans">هذا عرض سعر مبدئي وغير ملزم للطرفين</p>
            )}
          </div>
          
          <InvoiceHeader invoiceNumber={invoiceNumber} currentDate={currentDate} setCurrentDate={setCurrentDate} />
          
          <div className={`arab-card mx-[30px] ${
            invoiceType === 'sales' ? 'border-green-200 shadow-sm shadow-green-100/50' :
            invoiceType === 'quotation' ? 'border-blue-200 shadow-sm shadow-blue-100/50' :
            'border-orange-200 shadow-sm shadow-orange-100/50'
          }`}>
            <CustomerSelector selectedCustomer={selectedCustomer} customers={customers} onCustomerChange={handleCustomerChange} />
          </div>
          
          {invoiceType === 'debt' && (
            <div className="mx-[30px] p-4 border rounded-md border-orange-200 bg-orange-50 print:hidden">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 font-sans">{t('debtTypeLabel') || 'نوع الدين'}</label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value as any)}
                    title={t('debtTypeLabel') || 'نوع الدين'}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white font-sans"
                  >
                    <option value="debtor">{t('debtorLabel') || 'مدين (عليه)'}</option>
                    <option value="creditor">{t('creditorLabel') || 'دائن (له)'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 font-sans">{t('dueDate') || 'تاريخ الاستحقاق'}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    title={t('dueDate') || 'تاريخ الاستحقاق'}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white font-sans"
                  />
                </div>
              </div>
            </div>
          )}
          
          <ProductSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} filteredProducts={filteredProducts} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} quantity={quantity} manualQuantity={manualQuantity} handleQuantityChange={handleQuantityChange} />
          
          <SelectedProduct selectedProduct={selectedProduct} handleAddProduct={handleAddProduct} />
          
          <InvoiceNotification error={error} success={success} />
          
          <InvoiceItemsTable invoiceItems={invoiceItems} selectedCustomer={selectedCustomer} handleRemoveItem={handleRemoveItem} subtotal={subtotal} tax={taxAmount} total={total} />
        </div>
        
        <div className="space-y-6">
          <div className="arab-card card-rose print:hidden">
            <h2 className="font-medium mb-4 text-arab-rose-dark">{t('paymentInfo')}</h2>
            
            <div className="space-y-4">
              {invoiceType !== 'quotation' && (
                <>
                  <PaymentStatusSelector paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} />
                  <PaymentMethodSelector paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} />
                </>
              )}
              {invoiceType === 'quotation' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-center font-medium font-sans">
                  هذا عرض سعر مبدئي وغير ملزم للطرفين ولن يتم خصم المنتجات من المخزون.
                </div>
              )}
              
              <div className="arab-form-group">
                <label htmlFor="notes" className="arab-label">{t('notes')}</label>
                <textarea 
                  id="notes"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3} 
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-rose" 
                  placeholder={t('addNotesPlaceholder')}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-rose-100">
                <div className="arab-form-group">
                  <label htmlFor="discount" className="arab-label">{t('discount') || 'الخصم'}</label>
                  <input 
                    id="discount"
                    type="number"
                    value={discount} 
                    onChange={e => setDiscount(Number(e.target.value))} 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-rose" 
                  />
                </div>
                <div className="arab-form-group">
                  <label htmlFor="taxRate" className="arab-label">{t('taxRate') || 'نسبة الضريبة (%)'}</label>
                  <input 
                    id="taxRate"
                    type="number"
                    value={taxRate} 
                    onChange={e => setTaxRate(Number(e.target.value))} 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-rose" 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <InvoiceActions loading={loading} invoiceItems={invoiceItems} selectedCustomer={selectedCustomer} handleSaveInvoice={handleSaveInvoice} handlePrintInvoice={handlePrintInvoice} />
          
        </div>
      </div>

      {storeInfo && (
        <ProfessionalInvoice 
          invoice={{
            id: 'PREVIEW',
            invoiceNumber,
            customerName: selectedCustomer?.name || '---',
            items: invoiceItems,
            products: [], // Not needed for print
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
        />
      )}
    </div>;
}