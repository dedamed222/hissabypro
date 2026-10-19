import {
  AlertCircle,
  Save,
  X,
  Building2,
  Barcode,
  Tag,
  CircleDollarSign,
  Hash,
  Layers,
  CheckCircle2,
  ImagePlus,
  UploadCloud,
  Trash2,
  Link as LinkIcon,
  Eye,
  Camera,
} from "lucide-react";
import { Product, Warehouse } from "@/types";
import React, { useEffect, useState, useRef } from "react";
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
    photoUrl?: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  error: string;
  loading: boolean;
  selectedProduct: Product | null;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  error,
  loading,
  selectedProduct,
}: ProductFormModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, isRTL, locale } = useLocale();
  const isFr = locale === "fr";

  useEffect(() => {
    if (isOpen) {
      const storeData = loadStoreData();
      const activeWarehouses = (storeData.warehouses || []).filter(
        (w: Warehouse) => w.isActive
      );
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Client-side image compression to keep files compact & fast
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert(isFr ? "Veuillez sélectionner un fichier image valide." : "يرجى اختيار ملف صورة صالح.");
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.82);
          setFormData((prev: any) => ({
            ...prev,
            photoUrl: compressedBase64,
          }));
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => setIsProcessingImage(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setIsProcessingImage(false);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev: any) => ({
      ...prev,
      photoUrl: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-100 ${
          isRTL ? "text-right" : "text-left"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {selectedProduct
                  ? t("editProduct") || "تعديل بيانات المنتج"
                  : t("addNewProduct") || "إضافة منتج جديد"}
              </h3>
              <p className="text-xs text-slate-400">
                {isFr
                  ? "Saisie des caractéristiques, photo, prix et stock"
                  : "إدخال المواصفات، الصورة، الأسعار والكمية بالمخزن"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            title={t("close") as string}
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

            {/* ── Product Photo Section ── */}
            <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera size={14} className="text-blue-600" />
                  <span>{isFr ? "Photo du produit" : "صورة المنتج"}</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsUrlMode(!isUrlMode)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <LinkIcon size={12} />
                  <span>
                    {isUrlMode
                      ? isFr
                        ? "Téléverser un fichier"
                        : "رفع من الجهاز"
                      : isFr
                      ? "Coller un lien URL"
                      : "إدخال رابط صورة (URL)"}
                  </span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                {/* Photo Thumbnail / Placeholder */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs group">
                  {isProcessingImage ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-1" />
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isFr ? "Traitement..." : "جاري المعالجة..."}
                      </span>
                    </div>
                  ) : formData.photoUrl ? (
                    <>
                      <img
                        src={formData.photoUrl}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 text-xs shadow-xs cursor-pointer"
                          title={isFr ? "Changer" : "تغيير"}
                        >
                          <Camera size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-xs shadow-xs cursor-pointer"
                          title={isFr ? "Supprimer" : "حذف"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center select-none">
                      <ImagePlus size={28} className="text-slate-300 mb-1" />
                      <span className="text-[10px] font-medium leading-tight">
                        {isFr ? "Aucune photo" : "لا توجد صورة"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload controls & URL input */}
                <div className="flex-1 w-full space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!isUrlMode ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 h-9 px-3.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <UploadCloud size={15} className="text-blue-600" />
                        <span>
                          {formData.photoUrl
                            ? isFr
                              ? "Remplacer l'image"
                              : "استبدال الصورة الحالية"
                            : isFr
                            ? "Choisir une image depuis l'appareil"
                            : "اختيار صورة من الجهاز أو الكاميرا"}
                        </span>
                      </button>

                      {formData.photoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>{isFr ? "Effacer" : "إزالة"}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto"
                        />
                        <input
                          type="url"
                          name="photoUrl"
                          value={formData.photoUrl || ""}
                          onChange={handleInputChange}
                          placeholder="https://example.com/product.jpg"
                          className="w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                        />
                      </div>
                      {formData.photoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="h-9 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 leading-tight">
                    {isFr
                      ? "Prend en charge JPG, PNG, WEBP. Compression automatique pour une fluidité maximale."
                      : "يدعم صيغ JPG, PNG, WEBP. يتم ضغط الصورة آلياً لضمان السرعة والمزامنة الفورية."}
                  </p>
                </div>
              </div>
            </div>

            {/* Warehouse Selection */}
            <div>
              <label
                htmlFor="warehouseId"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                {t("warehouse") || "المستودع / المخزن"}
                <span className="text-slate-400 font-normal mr-1 ltr:ml-1">
                  ({isFr ? "optionnel" : "اختياري"})
                </span>
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto"
                />
                <select
                  id="warehouseId"
                  name="warehouseId"
                  value={formData.warehouseId}
                  onChange={handleInputChange}
                  className="w-full rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                >
                  <option value="">
                    {t("selectWarehouse") || "اختر المخزن التابع له الصنف"}
                  </option>
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
                <label
                  htmlFor="code"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {t("code") || "رمز المنتج / الباركود"} *
                </label>
                <div className="relative">
                  <Barcode
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto"
                  />
                  <input
                    id="code"
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="مثال: PRD-001"
                    className="w-full rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {t("name") || "اسم المنتج"} *
                </label>
                <div className="relative">
                  <Tag
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto"
                  />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="اسم الصنف أو المادة..."
                    className="w-full rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Price & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="cost"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {t("costPrice") || "سعر الشراء (التكلفة)"} *
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
                <label
                  htmlFor="price"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {t("sellingPrice") || "سعر البيع"} *
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
                <label
                  htmlFor="quantity"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {t("quantity") || "الكمية المتوفرة"} *
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
                <label
                  htmlFor="lowStockThreshold"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {isFr ? "Seuil d'alerte" : "حد التنبيه الأدنى"}
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
                <label
                  htmlFor="category"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  {t("productCategory") || "الفئة / التصنيف"}
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

          {/* Action buttons */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {t("cancel") || "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={loading || isProcessingImage}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>
                {loading
                  ? t("saving") || "جاري الحفظ..."
                  : selectedProduct
                  ? isFr
                    ? "Mettre à jour"
                    : "تحديث المنتج"
                  : isFr
                  ? "Enregistrer"
                  : "حفظ المنتج"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
