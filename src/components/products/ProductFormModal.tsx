
import { AlertCircle, Save, X, Building2, Barcode, Tag, CircleDollarSign, Hash, Layers } from "lucide-react";
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
  const { t } = useLocale();
  
  useEffect(() => {
    if (isOpen) {
      const storeData = loadStoreData();
      const activeWarehouses = (storeData.warehouses || []).filter((w: Warehouse) => w.isActive);
      setWarehouses(activeWarehouses);
      
      // Set default warehouse if not set
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="font-medium text-lg">{selectedProduct ? t('editProduct') : t('addNewProduct')}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" title={t('close') as string}><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="p-4 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            
            {/* Warehouse Selection */}
            <div className="arab-form-group bg-blue-50 p-3 rounded-md border border-blue-200">
              <label htmlFor="warehouseId" className="arab-label text-blue-900">{t('warehouse')} *</label>
              <div className="relative mt-1">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-arab-blue pointer-events-none">
                  <Building2 size={18} />
                </div>
                <select 
                  id="warehouseId" 
                  name="warehouseId" 
                  value={formData.warehouseId} 
                  onChange={handleInputChange}
                  className="w-full p-2 pr-10 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none" 
                  required
                >
                  <option value="">{t('selectWarehouse')}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              {warehouses.length === 0 && (
                <p className="text-xs text-red-600 mt-1">{t('noActiveWarehouses')}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="arab-form-group">
                <label htmlFor="code" className="arab-label">{t('code')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Barcode size={18} />
                  </div>
                  <input id="code" name="code" type="text" value={formData.code} onChange={handleInputChange}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" required />
                </div>
              </div>
              <div className="arab-form-group">
                <label htmlFor="name" className="arab-label">{t('name')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Tag size={18} />
                  </div>
                  <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" required />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="arab-form-group">
                <label htmlFor="cost" className="arab-label">{t('costPrice')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <CircleDollarSign size={18} />
                  </div>
                  <input id="cost" name="cost" type="number" step="0.01" min="0" value={formData.cost} onChange={handleInputChange}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" required />
                </div>
              </div>
              <div className="arab-form-group">
                <label htmlFor="price" className="arab-label">{t('sellingPrice')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <CircleDollarSign size={18} />
                  </div>
                  <input id="price" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleInputChange}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" required />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="arab-form-group">
                <label htmlFor="quantity" className="arab-label">{t('quantity')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Hash size={18} />
                  </div>
                  <input id="quantity" name="quantity" type="number" min="0" value={formData.quantity} onChange={handleInputChange}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" required />
                </div>
              </div>
              <div className="arab-form-group">
                <label htmlFor="lowStockThreshold" className="arab-label">{t('minQuantity')}</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <AlertCircle size={18} />
                  </div>
                  <input id="lowStockThreshold" name="lowStockThreshold" type="number" min="0" value={formData.lowStockThreshold} onChange={handleInputChange}
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" required />
                </div>
              </div>
            </div>
            <div className="arab-form-group">
              <label htmlFor="category" className="arab-label">{t('productCategory')}</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Layers size={18} />
                </div>
                <input id="category" name="category" type="text" value={formData.category} onChange={handleInputChange}
                  className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue" placeholder={t('optional') as string} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading || warehouses.length === 0}
              className="bg-arab-blue text-white px-4 py-2 rounded-md hover:bg-arab-blue-dark transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{t('saving')}</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{t('saveProduct')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
