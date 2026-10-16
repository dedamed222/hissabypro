import React, { useState, useMemo } from "react";
import {
  X,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Clock,
  Users,
  FileSpreadsheet,
  Printer,
  Calendar,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Package,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { Product, ProductMovement } from "@/types";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";
import {
  getStagnantProducts,
  getProductSalesRanking,
  migrateHistoricalInvoicesToMovements,
} from "@/utils/productMovements";
import * as XLSX from "xlsx";

interface ProductMovementsReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  movements: ProductMovement[];
  onRefreshData?: () => void;
}

export default function ProductMovementsReportsModal({
  isOpen,
  onClose,
  products,
  movements,
  onRefreshData,
}: ProductMovementsReportsModalProps) {
  const { t, isRTL, locale } = useLocale();

  const [activeTab, setActiveTab] = useState<"ranking" | "stagnant" | "customerBreakdown" | "migration">("ranking");

  // Tab 1: Ranking filters
  const [rankingDateFrom, setRankingDateFrom] = useState("");
  const [rankingDateTo, setRankingDateTo] = useState("");
  const [rankingSort, setRankingSort] = useState<"best" | "least">("best");
  const [rankingSearch, setRankingSearch] = useState("");

  // Tab 2: Stagnant filters
  const [stagnantDays, setStagnantDays] = useState<number>(30);
  const [customDaysInput, setCustomDaysInput] = useState<string>("30");

  // Tab 3: Customer breakdown filters
  const [breakdownProductId, setBreakdownProductId] = useState<string>(products[0]?.id || "");
  const [breakdownSearch, setBreakdownSearch] = useState("");

  // Migration status
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ migratedInvoices: number; createdMovements: number } | null>(null);

  // ── COMPUTED DATA ──

  // 1. Rankings
  const rankings = useMemo(() => {
    return getProductSalesRanking(movements, rankingDateFrom, rankingDateTo);
  }, [movements, rankingDateFrom, rankingDateTo]);

  const displayedRankings = useMemo(() => {
    let list = rankingSort === "best" ? rankings.bestSelling : rankings.leastSelling;
    if (rankingSearch.trim()) {
      const q = rankingSearch.toLowerCase();
      list = list.filter((item) =>
        item.productName.toLowerCase().includes(q) || (item.productCode || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rankings, rankingSort, rankingSearch]);

  // 2. Stagnant products
  const stagnantList = useMemo(() => {
    return getStagnantProducts(products, movements, stagnantDays);
  }, [products, movements, stagnantDays]);

  // 3. Customer breakdown for selected product
  const selectedBreakdownProduct = useMemo(() => {
    return products.find((p) => p.id === breakdownProductId) || products[0];
  }, [products, breakdownProductId]);

  const customerBreakdownList = useMemo(() => {
    if (!selectedBreakdownProduct) return [];
    const prodMovements = movements.filter(
      (m) =>
        !m.isDeleted &&
        m.type === "sale" &&
        ((m.productId && m.productId === selectedBreakdownProduct.id) ||
          m.productName.trim().toLowerCase() === selectedBreakdownProduct.name.trim().toLowerCase())
    );

    // Group by customer
    const map: {
      [key: string]: {
        customerName: string;
        customerId?: string | null;
        totalQuantity: number;
        totalAmount: number;
        lastPurchaseDate: string;
        orderCount: number;
      };
    } = {};

    for (const m of prodMovements) {
      const custName = m.customerName.trim() || "عميل غير مسمى";
      if (!map[custName]) {
        map[custName] = {
          customerName: custName,
          customerId: m.customerId,
          totalQuantity: 0,
          totalAmount: 0,
          lastPurchaseDate: m.date,
          orderCount: 0,
        };
      }
      map[custName].totalQuantity += m.quantity;
      map[custName].totalAmount += m.total;
      map[custName].orderCount += 1;
      if (new Date(m.date).getTime() >= new Date(map[custName].lastPurchaseDate).getTime()) {
        map[custName].lastPurchaseDate = m.date;
      }
    }

    let result = Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity);
    if (breakdownSearch.trim()) {
      const q = breakdownSearch.toLowerCase();
      result = result.filter((item) => item.customerName.toLowerCase().includes(q));
    }
    return result;
  }, [movements, selectedBreakdownProduct, breakdownSearch]);

  // ── ACTIONS ──

  const handleRunMigration = () => {
    setMigrating(true);
    setTimeout(() => {
      try {
        const res = migrateHistoricalInvoicesToMovements();
        setMigrationResult(res);
        if (onRefreshData) onRefreshData();
      } catch (err) {
        console.error("Migration error:", err);
      } finally {
        setMigrating(false);
      }
    }, 400);
  };

  const handleExportRankingExcel = () => {
    const rows = displayedRankings.map((r, i) => ({
      "#": i + 1,
      [locale === "fr" ? "Produit" : "المنتج"]: r.productName,
      [locale === "fr" ? "Code" : "الكود"]: r.productCode || "-",
      [locale === "fr" ? "Quantité Vendue" : "الكمية المباعة"]: r.totalQuantity,
      [locale === "fr" ? "Revenu Total" : "إجمالي الإيراد"]: r.totalRevenue,
      [locale === "fr" ? "Nombre de Ventes" : "عدد العمليات"]: r.ordersCount,
      [locale === "fr" ? "Clients Uniques" : "عدد الزبائن"]: r.customersCount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classement");
    XLSX.writeFile(wb, `ترتيب_حركة_المنتجات_${rankingSort}.xlsx`);
  };

  const handleExportStagnantExcel = () => {
    const rows = stagnantList.map((item, i) => ({
      "#": i + 1,
      [locale === "fr" ? "Produit" : "المنتج"]: item.product.name,
      [locale === "fr" ? "Code" : "الكود"]: item.product.code || "-",
      [locale === "fr" ? "Stock Actuel" : "المخزون الحالي"]: item.product.quantity,
      [locale === "fr" ? "Prix Vente" : "سعر البيع"]: item.product.price,
      [locale === "fr" ? "Valeur Stock" : "قيمة المخزون"]: item.product.quantity * item.product.price,
      [locale === "fr" ? "Jours Sans Vente" : "أيام دون بيع"]: item.neverSold ? "لم يُبع مطلقاً" : item.daysSinceLastSale,
      [locale === "fr" ? "Dernière Vente" : "تاريخ آخر بيع"]: item.lastSaleDate ? item.lastSaleDate.slice(0, 10) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stagnant");
    XLSX.writeFile(wb, `المنتجات_الراكدة_${stagnantDays}_يوم.xlsx`);
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
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {locale === "fr" ? "Rapports & Indicateurs de Mouvements" : "تقارير ومؤشرات حركة المنتجات"}
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                {locale === "fr"
                  ? "Analyse détaillée des ventes, produits stagnants et ventilation par client"
                  : "تحليل حركة المبيعات، المنتجات الأكثر والأقل مبيعاً، الراكدة وتوزيعها على الزبائن"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── NAVIGATION TABS ── */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50/70 shrink-0 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ranking")}
            className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "ranking"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <TrendingUp size={16} />
            <span>{locale === "fr" ? "Plus & Moins Vendus" : "الأكثر والأقل مبيعاً"}</span>
          </button>

          <button
            onClick={() => setActiveTab("stagnant")}
            className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "stagnant"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Clock size={16} />
            <span>{locale === "fr" ? "Produits Stagnants" : "المنتجات الراكدة"}</span>
            {stagnantList.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.2 rounded-full font-sans font-bold">
                {stagnantList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("customerBreakdown")}
            className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "customerBreakdown"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <Users size={16} />
            <span>{locale === "fr" ? "Ventes Produit par Client" : "مبيعات منتج لكل زبون"}</span>
          </button>

          <button
            onClick={() => setActiveTab("migration")}
            className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "migration"
                ? "border-blue-600 text-blue-700 bg-white shadow-sm rounded-t-xl"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <RefreshCw size={16} />
            <span>{locale === "fr" ? "Import Historique" : "استيراد الحركات السابقة"}</span>
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ────── TAB 1: RANKING ────── */}
          {activeTab === "ranking" && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 shrink-0">من:</span>
                  <input
                    type="date"
                    value={rankingDateFrom}
                    onChange={(e) => setRankingDateFrom(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white font-sans"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 shrink-0">إلى:</span>
                  <input
                    type="date"
                    value={rankingDateTo}
                    onChange={(e) => setRankingDateTo(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white font-sans"
                  />
                </div>
                <div>
                  <select
                    value={rankingSort}
                    onChange={(e) => setRankingSort(e.target.value as any)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-white font-bold"
                  >
                    <option value="best">{locale === "fr" ? "Plus vendus (Décroissant)" : "الأكثر مبيعاً أولاً 📈"}</option>
                    <option value="least">{locale === "fr" ? "Moins vendus (Croissant)" : "الأقل مبيعاً أولاً 📉"}</option>
                  </select>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute top-1/2 -translate-y-1/2 text-gray-400 right-2.5" />
                  <input
                    type="text"
                    placeholder="بحث في المنتجات..."
                    value={rankingSearch}
                    onChange={(e) => setRankingSearch(e.target.value)}
                    className="w-full text-xs p-2 pr-7 border border-gray-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <button
                    onClick={handleExportRankingExcel}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileSpreadsheet size={15} />
                    <span>تصدير Excel</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-4 text-right">المنتج</th>
                      <th className="py-3 px-3 text-center">الكود</th>
                      <th className="py-3 px-3 text-center">الكمية المباعة</th>
                      <th className="py-3 px-3 text-center">إجمالي الإيراد</th>
                      <th className="py-3 px-3 text-center">عدد العمليات</th>
                      <th className="py-3 px-3 text-center">عدد الزبائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {displayedRankings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400 font-bold">
                          لا توجد بيانات مبيعات في هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      displayedRankings.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 text-center font-bold text-gray-400 font-sans">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-gray-900">
                            {item.productName}
                            {item.isManualItem && (
                              <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                يدوي
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                            {item.productCode || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-black font-sans text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                              {item.totalQuantity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-emerald-700 font-sans">
                            {formatCurrency(item.totalRevenue)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-sans text-gray-600">
                            {item.ordersCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-sans text-gray-600">
                            {item.customersCount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────── TAB 2: STAGNANT PRODUCTS ────── */}
          {activeTab === "stagnant" && (
            <div className="space-y-4">
              {/* Presets Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-xs text-amber-900">
                      تحديد فترة ركود المنتجات (المنتجات التي لم تباع منذ فترة)
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      يساعدك في تصفية البضائع الراكدة وتقديم عروض أسعار عليها.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setStagnantDays(d);
                        setCustomDaysInput(d.toString());
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        stagnantDays === d
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-white text-gray-700 hover:bg-amber-100 border border-amber-200"
                      }`}
                    >
                      {d} يوم
                    </button>
                  ))}

                  <div className="flex items-center gap-1 bg-white border border-amber-200 rounded-xl px-2 py-1">
                    <input
                      type="number"
                      min="1"
                      value={customDaysInput}
                      onChange={(e) => {
                        setCustomDaysInput(e.target.value);
                        const v = Number(e.target.value);
                        if (v > 0) setStagnantDays(v);
                      }}
                      className="w-14 text-center text-xs font-bold outline-none font-sans"
                    />
                    <span className="text-[11px] text-gray-500">يوم</span>
                  </div>

                  <button
                    onClick={handleExportStagnantExcel}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Stagnant List */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-4 text-right">المنتج</th>
                      <th className="py-3 px-3 text-center">المخزون الحالي</th>
                      <th className="py-3 px-3 text-center">سعر البيع</th>
                      <th className="py-3 px-3 text-center">قيمة المخزون الراكد</th>
                      <th className="py-3 px-3 text-center">فترة الركود</th>
                      <th className="py-3 px-4 text-center">تاريخ آخر بيع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {stagnantList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-emerald-600 font-bold">
                          🎉 ممتاز! لا توجد منتجات راكدة لأكثر من {stagnantDays} يوم.
                        </td>
                      </tr>
                    ) : (
                      stagnantList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/30">
                          <td className="py-2.5 px-3 text-center font-bold text-gray-400 font-sans">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-gray-900">
                            {item.product.name}
                            {item.product.code && (
                              <span className="mr-2 text-[10px] text-gray-400 font-mono">
                                ({item.product.code})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-black font-sans text-sm text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg">
                              {item.product.quantity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-sans text-gray-700">
                            {formatCurrency(item.product.price)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-amber-700 font-sans">
                            {formatCurrency(item.product.quantity * item.product.price)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.neverSold ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                لم يُبع مطلقاً
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold font-sans">
                                {item.daysSinceLastSale} يوم
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-gray-600 font-sans">
                            {item.lastSaleDate ? item.lastSaleDate.slice(0, 10) : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────── TAB 3: CUSTOMER BREAKDOWN ────── */}
          {activeTab === "customerBreakdown" && (
            <div className="space-y-4">
              {/* Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">اختر المنتج لعرض تفصيله حسب الزبائن:</label>
                  <select
                    value={breakdownProductId}
                    onChange={(e) => setBreakdownProductId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white font-bold"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="relative w-full">
                    <Search size={14} className="absolute top-1/2 -translate-y-1/2 text-gray-400 right-2.5" />
                    <input
                      type="text"
                      placeholder="بحث في أسماء الزبائن..."
                      value={breakdownSearch}
                      onChange={(e) => setBreakdownSearch(e.target.value)}
                      className="w-full text-xs p-2.5 pr-8 border border-gray-200 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-4 text-right">الزبون</th>
                      <th className="py-3 px-3 text-center">إجمالي الكمية المشتراة</th>
                      <th className="py-3 px-3 text-center">إجمالي المبلغ</th>
                      <th className="py-3 px-3 text-center">عدد مرات الشراء</th>
                      <th className="py-3 px-4 text-center">تاريخ آخر شراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {customerBreakdownList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400 font-bold">
                          لم يتم شراء هذا المنتج من قبل أي زبون حتى الآن
                        </td>
                      </tr>
                    ) : (
                      customerBreakdownList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 text-center font-bold text-gray-400 font-sans">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-gray-900">
                            {item.customerName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-black font-sans text-sm text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg">
                              {item.totalQuantity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-emerald-700 font-sans">
                            {formatCurrency(item.totalAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-sans text-gray-600">
                            {item.orderCount}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-gray-600 font-sans">
                            {item.lastPurchaseDate.slice(0, 10)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────── TAB 4: HISTORICAL MIGRATION ────── */}
          {activeTab === "migration" && (
            <div className="max-w-xl mx-auto py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <RefreshCw size={32} className={migrating ? "animate-spin" : ""} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">استيراد وترحيل الفواتير السابقة</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  إذا كانت لديك فواتير محفوظة سابقة قبل تفعيل ميزة سجل الحركة، يمكنك الآن قراءتها وترحيل بنودها إلى سجل
                  الحركة بضغطة زر واحدة بأمان ودون تكرار.
                </p>
              </div>

              {migrationResult && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>تمت العملية بنجاح!</span>
                  </div>
                  <p>
                    تم فحص الفواتير وترحيل <b>{migrationResult.migratedInvoices}</b> فاتورة، وتم إنشاء{" "}
                    <b>{migrationResult.createdMovements}</b> حركة منتج جديدة في السجل.
                  </p>
                </div>
              )}

              <button
                disabled={migrating}
                onClick={handleRunMigration}
                className="px-6 py-3 rounded-2xl bg-arab-blue hover:bg-arab-blue-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                <RefreshCw size={16} className={migrating ? "animate-spin" : ""} />
                <span>{migrating ? "جاري الفحص والاستيراد..." : "بدء استيراد الفواتير السابقة الآن"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
