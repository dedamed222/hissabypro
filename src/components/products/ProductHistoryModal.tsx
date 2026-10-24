import React, { useState, useMemo } from "react";
import {
  X,
  History,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Package,
} from "lucide-react";
import { Product, ProductMovement } from "@/types";
import { formatCurrency, formatDate, formatShortDate } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";
import { getProductMovementStats } from "@/utils/productMovements";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface ProductHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  movements: ProductMovement[];
}

export default function ProductHistoryModal({
  isOpen,
  onClose,
  product,
  movements,
}: ProductHistoryModalProps) {
  const { t, isRTL, locale } = useLocale();
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Filter movements for this product
  const productMovements = useMemo(() => {
    return movements.filter((m) => {
      if (m.isDeleted || m.type === "cancellation") return false;
      const idMatch = m.productId === product.id;
      const nameMatch = m.productName.trim().toLowerCase() === product.name.trim().toLowerCase();
      return idMatch || nameMatch;
    });
  }, [movements, product]);

  // Unique customers for the filter dropdown
  const uniqueCustomerNames = useMemo(() => {
    const set = new Set<string>();
    productMovements.forEach((m) => {
      if (m.customerName) set.add(m.customerName.trim());
    });
    return Array.from(set).sort();
  }, [productMovements]);

  // Overall analytics stats
  const stats = useMemo(() => {
    return getProductMovementStats(product.id, product.name, productMovements);
  }, [product, productMovements]);

  // Filtered movements based on active filters
  const filteredMovements = useMemo(() => {
    return productMovements
      .filter((m) => {
        // Date range
        const mDate = m.date.slice(0, 10);
        if (dateFrom && mDate < dateFrom) return false;
        if (dateTo && mDate > dateTo) return false;

        // Customer filter
        if (selectedCustomer !== "all" && m.customerName.trim() !== selectedCustomer) {
          return false;
        }

        // Type filter
        if (typeFilter !== "all" && m.type !== typeFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchInv = m.invoiceNumber.toLowerCase().includes(q);
          const matchCust = m.customerName.toLowerCase().includes(q);
          const matchNotes = (m.notes || "").toLowerCase().includes(q);
          if (!matchInv && !matchCust && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productMovements, dateFrom, dateTo, selectedCustomer, typeFilter, searchQuery]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredMovements.map((m) => ({
      [locale === "fr" ? "Date" : "التاريخ"]: m.date.slice(0, 10),
      [locale === "fr" ? "Client" : "الزبون"]: m.customerName,
      [locale === "fr" ? "N° Facture" : "رقم الفاتورة"]: m.invoiceNumber,
      [locale === "fr" ? "Type" : "نوع الحركة"]:
        m.type === "return" ? "مرتجع" : m.isManualItem ? "إدخال يدوي" : "بيع",
      [locale === "fr" ? "Quantité" : "الكمية"]: m.quantity,
      [locale === "fr" ? "Prix Unitaire" : "سعر الوحدة"]: m.unitPrice,
      [locale === "fr" ? "Total" : "الإجمالي"]: m.total,
      [locale === "fr" ? "Coût" : "التكلفة"]: m.costPrice || 0,
      [locale === "fr" ? "Notes" : "ملاحظات"]: m.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mouvements");
    XLSX.writeFile(wb, `حركة_${product.name.replace(/[/\\?%*:|"<>]/g, "_")}.xlsx`);
  };

  // Print view
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const align = isRTL ? "right" : "left";
    const dir = isRTL ? "rtl" : "ltr";

    const tableRows = filteredMovements
      .map(
        (m, idx) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.date.slice(0, 10)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: ${align}; font-weight: bold;">${m.customerName}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">#${m.invoiceNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: ${align};">${formatCurrency(m.unitPrice)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: ${align}; font-weight: bold; color: #047857;">${formatCurrency(m.total)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.type === "return" ? "مرتجع" : "بيع"}</td>
        </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}">
      <head>
        <title>سجل حركة المنتج - ${product.name}</title>
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
          <h1 style="margin: 0; font-size: 22px;">سجل تاريخ وحركة المنتج: ${product.name}</h1>
          <p style="margin: 5px 0; color: #6b7280; font-size: 13px;">كود: ${product.code || "-"} | تاريخ الطباعة: ${new Date().toLocaleDateString("ar-MA")}</p>
        </div>
        <div class="stats">
          <div class="stat-item"><div class="stat-val">${stats.totalQuantitySold}</div><div class="stat-lbl">إجمالي المباع</div></div>
          <div class="stat-item"><div class="stat-val">${stats.uniqueCustomersCount}</div><div class="stat-lbl">عدد الزبائن</div></div>
          <div class="stat-item"><div class="stat-val">${formatCurrency(stats.avgPrice)}</div><div class="stat-lbl">متوسط السعر</div></div>
          <div class="stat-item"><div class="stat-val">${formatCurrency(stats.totalRevenue)}</div><div class="stat-lbl">إجمالي الإيراد</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>التاريخ</th>
              <th>الزبون</th>
              <th>رقم الفاتورة</th>
              <th>الكمية</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
              <th>النوع</th>
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
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 ${
          isRTL ? "text-right" : "text-left"
        }`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-6 py-5 shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
              <History size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{product.name}</h2>
                {product.code && (
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono text-blue-100">
                    {product.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-2">
                <span>{locale === "fr" ? "Historique complet des mouvements" : "السجل التاريخي الشامل لحركة ومبيعات المنتج"}</span>
                <span>•</span>
                <span>{locale === "fr" ? "Stock actuel:" : "المخزون الحالي:"} <b className="text-white font-sans">{product.quantity}</b></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 backdrop-blur-sm"
              title={locale === "fr" ? "Exporter Excel" : "تصدير إكسل"}
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 backdrop-blur-sm"
              title={locale === "fr" ? "Imprimer" : "طباعة"}
            >
              <Printer size={15} />
              <span className="hidden sm:inline">{locale === "fr" ? "Imprimer" : "طباعة"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── TOP SUMMARY METRICS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-gray-50/80 border-b border-gray-100 shrink-0">
          {/* Total Sold */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{locale === "fr" ? "Total Vendu" : "إجمالي المباع"}</span>
              <Package size={15} className="text-blue-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900 font-sans">{stats.totalQuantitySold}</span>
              <span className="text-xs text-gray-400 font-medium">{locale === "fr" ? "unités" : "قطعة"}</span>
            </div>
          </div>

          {/* Unique Customers */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{locale === "fr" ? "Clients Uniques" : "الزبائن"}</span>
              <Users size={15} className="text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-900 font-sans">{stats.uniqueCustomersCount}</span>
              <span className="text-xs text-gray-400 font-medium">{locale === "fr" ? "clients" : "زبون"}</span>
            </div>
          </div>

          {/* Average Selling Price */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{locale === "fr" ? "Prix Moyen" : "متوسط السعر"}</span>
              <DollarSign size={15} className="text-emerald-600" />
            </div>
            <div>
              <span className="text-lg font-black text-emerald-700 font-sans">
                {formatCurrency(stats.avgPrice)}
              </span>
            </div>
          </div>

          {/* Highest & Lowest Selling Price */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{locale === "fr" ? "Fourchette Prix" : "أعلى / أقل سعر"}</span>
              <TrendingUp size={15} className="text-amber-600" />
            </div>
            <div className="text-xs space-y-0.5 font-sans">
              <div className="text-emerald-700 font-bold flex items-center justify-between">
                <span>أعلى:</span>
                <span>{formatCurrency(stats.maxPrice)}</span>
              </div>
              <div className="text-amber-700 font-bold flex items-center justify-between">
                <span>أدنى:</span>
                <span>{formatCurrency(stats.minPrice)}</span>
              </div>
            </div>
          </div>

          {/* First & Last Sale Dates */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-bold uppercase">{locale === "fr" ? "Dates Ventes" : "أول / آخر بيع"}</span>
              <Calendar size={15} className="text-purple-600" />
            </div>
            <div className="text-xs space-y-0.5 text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-400">أول:</span>
                <span className="font-bold">{stats.firstSaleDate ? stats.firstSaleDate.slice(0, 10) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">آخر:</span>
                <span className="font-bold text-blue-700">{stats.lastSaleDate ? stats.lastSaleDate.slice(0, 10) : "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTERS BAR ── */}
        <div className="p-4 bg-white border-b border-gray-100 shrink-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 text-gray-400 right-3 rtl:right-3 ltr:left-3" />
            <input
              type="text"
              placeholder={locale === "fr" ? "Rechercher facture, client..." : "بحث برقم الفاتورة، الزبون..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2.5 px-8 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50/50"
            />
          </div>

          {/* Customer Filter */}
          <div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full text-xs py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="all">{locale === "fr" ? "Tous les clients" : "جميع الزبائن"}</option>
              {uniqueCustomerNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 shrink-0">{locale === "fr" ? "Du:" : "من:"}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs p-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-sans"
            />
          </div>

          {/* Date Range: To */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 shrink-0">{locale === "fr" ? "Au:" : "إلى:"}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs p-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-sans"
            />
          </div>
        </div>

        {/* ── TIMELINE TABLE ── */}
        <div className="flex-1 overflow-y-auto">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-3">
              <History size={48} className="mx-auto text-gray-300" />
              <p className="font-bold text-base">{locale === "fr" ? "Aucun mouvement trouvé" : "لا توجد حركات مسجلة لهذا المنتج"}</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {locale === "fr"
                  ? "Les mouvements s'enregistrent automatiquement lors de l'enregistrement de factures contenant ce produit."
                  : "يتم تسجيل الحركات تلقائياً وبأثر رجعي عند إنشاء أي فاتورة بيع تحتوي على هذا المنتج."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 font-bold text-gray-700">{locale === "fr" ? "Date" : "التاريخ"}</th>
                    <th className="py-3 px-4 font-bold text-gray-700">{locale === "fr" ? "Client" : "الزبون"}</th>
                    <th className="py-3 px-3 font-bold text-center text-gray-700">{locale === "fr" ? "N° Facture" : "رقم الفاتورة"}</th>
                    <th className="py-3 px-3 font-bold text-center text-gray-700">{locale === "fr" ? "النوع" : "النوع"}</th>
                    <th className="py-3 px-3 font-bold text-center text-gray-700">{locale === "fr" ? "Quantité" : "الكمية"}</th>
                    <th className="py-3 px-3 font-bold text-center text-gray-700">{locale === "fr" ? "Prix Unitaire" : "سعر الوحدة"}</th>
                    <th className="py-3 px-4 font-bold text-gray-700 text-left rtl:text-left ltr:text-right">{locale === "fr" ? "Total" : "الإجمالي"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 text-gray-600 font-sans whitespace-nowrap">
                        <div className="font-bold text-gray-900">{mov.date.slice(0, 10)}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {mov.date.includes("T") ? mov.date.split("T")[1].slice(0, 5) : ""}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedCustomer(mov.customerName.trim())}
                          className="font-bold text-gray-900 hover:text-blue-700 hover:underline flex items-center gap-1.5 text-right"
                          title="فلترة حركات هذا الزبون"
                        >
                          <span>{mov.customerName}</span>
                          <Filter size={11} className="text-gray-400" />
                        </button>
                        {mov.notes && (
                          <div className="text-[10px] text-gray-400 truncate max-w-xs">{mov.notes}</div>
                        )}
                      </td>

                      {/* Invoice Number */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/archive?search=${encodeURIComponent(mov.invoiceNumber)}`);
                          }}
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors border border-blue-100"
                          title="عرض الفاتورة في الأرشيف"
                        >
                          <span>#{mov.invoiceNumber}</span>
                          <ExternalLink size={10} />
                        </button>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 text-center">
                        {mov.type === "return" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                            <ArrowDownRight size={12} />
                            مرتجع
                          </span>
                        ) : mov.isManualItem ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            <Tag size={11} />
                            إدخال يدوي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <ArrowUpRight size={12} />
                            بيع
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-gray-900 text-sm font-sans bg-gray-100 px-2.5 py-1 rounded-lg">
                          {mov.quantity}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-center font-bold text-gray-700 font-sans">
                        {formatCurrency(mov.unitPrice)}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 font-black text-emerald-700 text-sm font-sans text-left rtl:text-left ltr:text-right">
                        {formatCurrency(mov.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between shrink-0 text-xs text-gray-500">
          <div>
            <span>{locale === "fr" ? "Total mouvements affichés:" : "عدد الحركات المعروضة:"} </span>
            <b className="text-gray-900 font-sans font-bold">{filteredMovements.length}</b>
            <span className="mx-2">|</span>
            <span>{locale === "fr" ? "Quantité:" : "إجمالي الكمية:"} </span>
            <b className="text-blue-700 font-sans font-bold">
              {filteredMovements.reduce((sum, m) => sum + m.quantity, 0)}
            </b>
            <span className="mx-2">|</span>
            <span>{locale === "fr" ? "Montant:" : "إجمالي المبالغ:"} </span>
            <b className="text-emerald-700 font-sans font-bold">
              {formatCurrency(filteredMovements.reduce((sum, m) => sum + m.total, 0))}
            </b>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-colors"
          >
            {locale === "fr" ? "Fermer" : "إغلاق"}
          </button>
        </div>
      </div>
    </div>
  );
}
