import { AlertCircle, Save, X, Building2, Barcode, Tag, CircleDollarSign, Hash, Layers, CheckCircle2 } from "lucide-react";
import { Product, Warehouse } from "@/types";
import React, { useEffect, useState } from "react";
import { loadStoreData } from "@/utils/localStorage";
import { useLocale } from "@/hooks/useLocale";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  formData: {
    code: string;
    name: string;
    price: string;
    cost: string;
    quantity: string;
    lowStockThreshold: string;
    category: string;
    warehouseId: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  error: string;
  loading: boolean;
  selectedProduct: Product | null;
}

export default function ProductFormModal({
  isOpen, onClose, onSubmit, formData, setFormData, error, loading, selectedProduct
}: ProductFormModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const { t, isRTL } = useLocale();
  
  useEffect(() => {
    if (isOpen) {
      const storeData = loadStoreData();
      const activeWarehouses = (storeData.warehouses || []).filter((w: Warehouse) => w.isActive);
      setWarehouses(activeWarehouses);
      
      if (!formData.warehouseId && activeWarehouses.length > 0) {
        setFormData((prev: any) => ({
          ...prev,
          warehouseId: activeWarehouses[0].id,
        }));
      }
    }
  }, [isOpen]);
  
  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-100 ${isRTL ? "text-right" : "text-left"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {selectedProduct ? t('editProduct') || 'تعديل بيانات المنتج' : t('addNewProduct') || 'إضافة منتج جديد'}
              </h3>
              <p className="text-xs text-slate-400">إدخال المواصفات، الأسعار والكمية بالمخزن</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title={t('close') as string}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-rose-50 text-rose-600 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border border-rose-200">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            {/* Warehouse Selection */}
            <div>
              <label htmlFor="warehouseId" className="block text-xs font-bold text-slate-700 mb-1.5">
                {t('warehouse') || 'المستودع / المخزن'} *
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select 
                  id="warehouseId" 
                  name="warehouseId" 
                  value={formData.warehouseId} 
                  onChange={handleInputChange}
                  className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all" 
                  required
                >
                  <option value="">{t('selectWarehouse') || 'اختر المخزن التابع له الصنف'}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="code" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('code') || 'رمز المنتج / الباركود'} *
                </label>
                <div className="relative">
                  <Barcode size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="code"
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="مثال: PRD-001"
                    className="w-full pr-10 pl-4 py-2.5 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('name') || 'اسم المنتج'} *
                </label>
                <div className="relative">
                  <Tag size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="اسم الصنف أو المادة..."
                    className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Price & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="cost" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('costPrice') || 'سعر الشراء (التكلفة)'} *
                </label>
                <input
                  id="cost"
                  type="number"
                  step="any"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans transition-all text-center"
                  required
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('sellingPrice') || 'سعر البيع'} *
                </label>
                <input
                  id="price"
                  type="number"
                  step="any"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans text-blue-600 transition-all text-center"
                  required
                />
              </div>
            </div>

            {/* Quantity, Threshold, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor="quantity" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('quantity') || 'الكمية المتوفرة'} *
                </label>
                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans text-center transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="lowStockThreshold" className="block text-xs font-bold text-slate-700 mb-1.5">
                  حد التنبيه الأدنى
                </label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  placeholder="5"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold font-sans text-center transition-all"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('productCategory') || 'الفئة / التصنيف'}
                </label>
                <input
                  id="category"
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="مثال: إلكترونيات، أغذية"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              {t('cancel') || 'إلغاء'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{loading ? (t('saving') || 'جاري الحفظ...') : (selectedProduct ? 'تحديث المنتج' : 'حفظ المنتج')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
