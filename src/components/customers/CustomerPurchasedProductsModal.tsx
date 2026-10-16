import React, { useState, useMemo } from "react";
import {
  X,
  ShoppingBag,
  Calendar,
  DollarSign,
  Package,
  FileSpreadsheet,
  Printer,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Customer, ProductMovement } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";
import { getCustomerPurchasedProducts } from "@/utils/productMovements";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface CustomerPurchasedProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  movements: ProductMovement[];
}

export default function CustomerPurchasedProductsModal({
  isOpen,
  onClose,
  customer,
  movements,
}: CustomerPurchasedProductsModalProps) {
  const { t, isRTL, locale } = useLocale();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProductKey, setExpandedProductKey] = useState<string | null>(null);

  // Grouped products purchased by this customer
  const purchasedProducts = useMemo(() => {
    return getCustomerPurchasedProducts(customer.id, customer.name, movements);
  }, [customer, movements]);

  // Filtered by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return purchasedProducts;
    const q = searchQuery.toLowerCase();
    return purchasedProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.productCode && p.productCode.toLowerCase().includes(q))
    );
  }, [purchasedProducts, searchQuery]);

  // Total summary metrics
  const totalAmount = useMemo(
    () => purchasedProducts.reduce((sum, p) => sum + p.totalAmount, 0),
    [purchasedProducts]
  );
  const totalQuantity = useMemo(
    () => purchasedProducts.reduce((sum, p) => sum + p.totalQuantity, 0),
    [purchasedProducts]
  );
  const lastPurchaseDate = purchasedProducts[0]?.lastPurchaseDate || null;

  const handleToggleExpand = (key: string) => {
    setExpandedProductKey(expandedProductKey === key ? null : key);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredProducts.map((p, idx) => ({
      "#": idx + 1,
      [locale === "fr" ? "Produit" : "المنتج"]: p.productName,
      [locale === "fr" ? "Code" : "الكود"]: p.productCode || "-",
      [locale === "fr" ? "Dernier Prix de Vente" : "آخر سعر بيع للزبون"]: p.lastUnitPrice,
      [locale === "fr" ? "Quantité Totale" : "إجمالي الكمية"]: p.totalQuantity,
      [locale === "fr" ? "Montant Total" : "إجمالي المبلغ"]: p.totalAmount,
      [locale === "fr" ? "Dernier Achat" : "تاريخ آخر شراء"]: p.lastPurchaseDate.slice(0, 10),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AchatsClient");
    XLSX.writeFile(wb, `مشتريات_${customer.name.replace(/[\/\\?%*:|"<>]/g, "_")}.xlsx`);
  };

  // Print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const align = isRTL ? "right" : "left";
    const dir = isRTL ? "rtl" : "ltr";

    const tableRows = filteredProducts
      .map(
        (p, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: ${align}; font-weight: bold;">${p.productName}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.productCode || "-"}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: ${align}; font-weight: bold; color: #2563eb;">${formatCurrency(p.lastUnitPrice)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${p.totalQuantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: ${align}; font-weight: bold; color: #047857;">${formatCurrency(p.totalAmount)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.lastPurchaseDate.slice(0, 10)}</td>
      </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}">
      <head>
        <title>سجل مشتريات العميل - ${customer.name}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
          .stats { display: flex; gap: 15px; justify-content: space-around; background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .stat-item { text-align: center; }
          .stat-val { font-size: 18px; font-weight: bold; color: #1e40af; }
          .stat-lbl { font-size: 12px; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #1e40af; color: white; padding: 10px; border: 1px solid #1e40af; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 22px;">سجل المنتجات المشتراة للزبون: ${customer.name}</h1>
          <p style="margin: 5px 0; color: #6b7280; font-size: 13px;">هاتف: ${customer.phone || "-"} | تاريخ التقرير: ${new Date().toLocaleDateString("ar-MA")}</p>
        </div>
        <div class="stats">
          <div class="stat-item"><div class="stat-val">${purchasedProducts.length}</div><div class="stat-lbl">عدد الأصناف المشتراة</div></div>
          <div class="stat-item"><div class="stat-val">${totalQuantity}</div><div class="stat-lbl">إجمالي الكميات</div></div>
          <div class="stat-item"><div class="stat-val">${formatCurrency(totalAmount)}</div><div class="stat-lbl">إجمالي المشتريات</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المنتج</th>
              <th>الكود</th>
              <th>آخر سعر بيع</th>
              <th>الكمية</th>
              <th>الإجمالي</th>
              <th>آخر شراء</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 ${
          isRTL ? "text-right" : "text-left"
        }`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-6 py-5 shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
              <ShoppingBag size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{customer.name}</h2>
                {customer.phone && (
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono text-blue-100" dir="ltr">
                    {customer.phone}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {locale === "fr"
                  ? "Historique des produits achetés et derniers prix de vente"
                  : "سجل المنتجات المشتراة من قِبل هذا الزبون مع آخر سعر بيع لكل منتج"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 backdrop-blur-sm"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 backdrop-blur-sm"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── METRICS SUMMARY ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">الأصناف المشتراة</span>
              <Package size={15} className="text-blue-600" />
            </div>
            <div className="text-xl font-black text-gray-900 font-sans">{purchasedProducts.length}</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">إجمالي الكميات</span>
              <ShoppingBag size={15} className="text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-900 font-sans">{totalQuantity}</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">إجمالي المشتريات</span>
              <DollarSign size={15} className="text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-700 font-sans">{formatCurrency(totalAmount)}</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">آخر تاريخ شراء</span>
              <Calendar size={15} className="text-purple-600" />
            </div>
            <div className="text-sm font-bold text-gray-800 font-sans">
              {lastPurchaseDate ? lastPurchaseDate.slice(0, 10) : "-"}
            </div>
          </div>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="p-4 bg-white border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 text-gray-400 right-3" />
            <input
              type="text"
              placeholder="بحث في المنتجات المشتراة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2.5 pr-8 pl-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50/50"
            />
          </div>
        </div>

        {/* ── PRODUCTS TABLE ── */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-3">
              <ShoppingBag size={48} className="mx-auto text-gray-300" />
              <p className="font-bold text-base">لا توجد منتجات مشتراة مسجلة لهذا العميل</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                عند حفظ فواتير بيع لهذا الزبون، ستظهر الأصناف المشتراة وتفاصيلها هنا تلقائياً.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 sticky top-0 font-bold">
                  <tr>
                    <th className="py-3 px-4">المنتج</th>
                    <th className="py-3 px-3 text-center">الكود</th>
                    <th className="py-3 px-3 text-center">آخر سعر بيع للزبون</th>
                    <th className="py-3 px-3 text-center">الكمية الإجمالية</th>
                    <th className="py-3 px-3 text-center">الإجمالي</th>
                    <th className="py-3 px-3 text-center">آخر شراء</th>
                    <th className="py-3 px-3 text-center w-16">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredProducts.map((p, idx) => {
                    const key = p.productId || p.productName;
                    const isExpanded = expandedProductKey === key;
                    return (
                      <React.Fragment key={key}>
                        <tr className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{p.productName}</span>
                              {p.isManualItem && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                  إدخال يدوي
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-gray-500">
                            {p.productCode || "-"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-sans">
                              {formatCurrency(p.lastUnitPrice)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-black text-gray-800 font-sans">
                            {p.totalQuantity}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-emerald-700 font-sans">
                            {formatCurrency(p.totalAmount)}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-600 font-sans font-bold">
                            {p.lastPurchaseDate.slice(0, 10)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleToggleExpand(key)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                              title="عرض تفاصيل عمليات الشراء"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details (purchases history for this product) */}
                        {isExpanded && (
                          <tr className="bg-gray-50/70">
                            <td colSpan={7} className="p-3">
                              <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2 shadow-inner">
                                <h5 className="font-bold text-[11px] text-gray-700">
                                  سجل فواتير وعمليات شراء "{p.productName}":
                                </h5>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {p.purchases.map((pur) => (
                                    <div
                                      key={pur.id}
                                      className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg border border-gray-100"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{pur.date.slice(0, 10)}</span>
                                        <button
                                          onClick={() => {
                                            onClose();
                                            navigate(`/archive?search=${encodeURIComponent(pur.invoiceNumber)}`);
                                          }}
                                          className="text-blue-600 hover:underline font-mono text-[11px] font-bold flex items-center gap-0.5"
                                        >
                                          <span>#{pur.invoiceNumber}</span>
                                          <ExternalLink size={10} />
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-4 font-sans">
                                        <span className="text-gray-600">
                                          الكمية: <b>{pur.quantity}</b>
                                        </span>
                                        <span className="text-gray-600">
                                          السعر: <b>{formatCurrency(pur.unitPrice)}</b>
                                        </span>
                                        <span className="font-bold text-emerald-700">
                                          {formatCurrency(pur.total)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 text-xs text-gray-600">
          <div>
            <span>عدد الأصناف: </span>
            <b className="text-gray-900 font-sans">{filteredProducts.length}</b>
            <span className="mx-2">|</span>
            <span>إجمالي الكميات: </span>
            <b className="text-blue-700 font-sans">{totalQuantity}</b>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
