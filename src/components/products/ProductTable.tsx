import React, { useState } from "react";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import {
  AlertTriangle,
  Edit,
  Trash2,
  History,
  Tag,
  CheckCircle2,
  XCircle,
  Package,
  Eye,
  X,
} from "lucide-react";
import type { Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";

interface ProductTableProps {
  products: Product[];
  searchQuery: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
}

export default function ProductTable({
  products,
  searchQuery,
  onEdit,
  onDelete,
  onViewHistory,
}: ProductTableProps) {
  const { t, locale } = useLocale();
  const isFr = locale === "fr";
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  return (
    <div className="gsc-card overflow-hidden">
      {/* ── Image Lightbox Modal ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {previewImage.name}
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 bg-slate-50 flex items-center justify-center overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-xs"
              />
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-14">
                {isFr ? "Photo" : "الصورة"}
              </th>
              <th className="py-3.5 px-4">{t("code")}</th>
              <th className="py-3.5 px-4">{t("name")}</th>
              <th className="py-3.5 px-4 text-center">{t("costPrice")}</th>
              <th className="py-3.5 px-4 text-center">{t("sellingPrice")}</th>
              <th className="py-3.5 px-4 text-center">{t("profit")}</th>
              <th className="py-3.5 px-4 text-center">{t("addedQuantity")}</th>
              <th className="py-3.5 px-4 text-center">{t("availableQuantity")}</th>
              <th className="py-3.5 px-4">{t("productCategory")}</th>
              <th className="py-3.5 px-4 text-center">{t("stock")}</th>
              <th className="py-3.5 px-4">{t("lastUpdated")}</th>
              <th className="py-3.5 px-4 text-center">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {products.length > 0 ? (
              products.map((product) => {
                const profit =
                  Number(product.price || 0) - Number(product.cost || 0);
                const profitMargin =
                  product.cost > 0 ? (profit / product.cost) * 100 : 0;
                const isOutOfStock = Number(product.quantity || 0) <= 0;
                const isLowStock =
                  !isOutOfStock &&
                  Number(product.quantity || 0) <=
                    Number(product.lowStockThreshold || 5);

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Photo Thumbnail */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mx-auto flex items-center justify-center shrink-0 shadow-xs">
                        {product.photoUrl ? (
                          <img
                            src={product.photoUrl}
                            alt={product.name}
                            className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={() =>
                              setPreviewImage({
                                url: product.photoUrl!,
                                name: product.name,
                              })
                            }
                            title={isFr ? "Agrandir l'image" : "تكبير الصورة"}
                          />
                        ) : (
                          <Package size={18} className="text-slate-400" />
                        )}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {product.code || "---"}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block">
                        {product.name}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 font-sans">
                      {formatCurrency(product.cost)}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-blue-600 font-sans">
                        {formatCurrency(product.price)}
                      </span>
                    </td>

                    {/* Profit */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`font-bold font-sans text-xs ${
                            profit > 0
                              ? "text-emerald-600"
                              : profit < 0
                              ? "text-rose-600"
                              : "text-slate-500"
                          }`}
                        >
                          {formatCurrency(profit)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          ({profitMargin.toFixed(0)}%)
                        </span>
                      </div>
                    </td>

                    {/* Total Added Qty */}
                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium font-sans">
                      {Number(product.quantity || 0) + Number(product.sold || 0)}
                    </td>

                    {/* Available Qty */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span
                          className={`text-base font-black font-sans ${
                            isOutOfStock
                              ? "text-rose-600"
                              : isLowStock
                              ? "text-amber-600"
                              : "text-slate-900"
                          }`}
                        >
                          {product.quantity}
                        </span>
                        {isLowStock && (
                          <AlertTriangle
                            size={13}
                            className="text-amber-500 shrink-0"
                          />
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {product.category ? (
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Tag size={11} className="text-slate-400" />
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {locale === "fr" ? "Épuisé" : "نفذت"}
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {t("lowStock")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {t("available")}
                        </span>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {formatShortDate(product.updatedAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {onViewHistory && (
                          <button
                            onClick={() => onViewHistory(product)}
                            className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title={
                              locale === "fr"
                                ? "Historique"
                                : "سجل حركة المنتج"
                            }
                          >
                            <History size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(product)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={t("edit")}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(product)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={t("delete")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="text-center py-12 text-slate-500">
                  <p className="text-base font-bold text-slate-700 mb-1">
                    {searchQuery ? t("noSearchResults") : t("noProductsAdded")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? locale === "fr"
                        ? "Essayez avec d'autres mots-clés ou un autre code"
                        : "جرب البحث بكلمات أخرى أو رمز مختلف"
                      : locale === "fr"
                      ? "Cliquez sur 'Ajouter un nouveau produit' en haut pour ajouter le premier article"
                      : "انقر على زر 'إضافة منتج جديد' في الأعلى لإضافة أول منتج"}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}