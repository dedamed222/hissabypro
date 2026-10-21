import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency } from "@/utils/formatters";
import { getTrialBalance } from "@/lib/accountingDatabase";
import {
  Scale, Search, Loader2, AlertCircle, FileSpreadsheet, ArrowUpDown
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AccountingTrialBalance() {
  const { isEnabled, isLoading, migrationError } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hideZero, setHideZero] = useState(true);

  const trialBalance = useMemo(() => {
    if (!isEnabled) return [];
    return getTrialBalance({ fromDate, toDate });
  }, [isEnabled, fromDate, toDate]);

  const filtered = useMemo(() => {
    let rows = hideZero
      ? trialBalance.filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0)
      : trialBalance;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.account.code.includes(s) ||
          r.account.nameAr.toLowerCase().includes(s) ||
          r.account.nameFr.toLowerCase().includes(s)
      );
    }
    return rows;
  }, [trialBalance, hideZero, searchTerm]);

  const totals = useMemo(() => ({
    debit: filtered.reduce((s, r) => s + r.totalDebit, 0),
    credit: filtered.reduce((s, r) => s + r.totalCredit, 0),
  }), [filtered]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  function exportExcel() {
    const rows = filtered.map((r) => ({
      [isFr ? "Code" : "الرمز"]: r.account.code,
      [isFr ? "Compte (AR)" : "الحساب (ع)"]: r.account.nameAr,
      [isFr ? "Compte (FR)" : "الحساب (ف)"]: r.account.nameFr,
      [isFr ? "Débit" : "مدين"]: r.totalDebit,
      [isFr ? "Crédit" : "دائن"]: r.totalCredit,
      [isFr ? "Solde" : "الرصيد"]: r.netBalance,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, isFr ? "Balance" : "ميزان المراجعة");
    XLSX.writeFile(wb, `trial-balance-${fromDate}-${toDate}.xlsx`);
  }

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Scale className="text-indigo-400 opacity-50" size={36} />
        <p className="text-slate-400 text-sm">
          {isFr ? "Module désactivé." : "الوحدة المحاسبية معطلة."}
        </p>
        <button onClick={() => navigate("/accounting/settings")}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
          {isFr ? "Paramètres" : "الإعدادات"}
        </button>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-400" size={32} />
    </div>
  );

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shadow-md">
            <Scale size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">
              {isFr ? "Balance Générale" : "ميزان المراجعة"}
            </h1>
            <p className="text-xs text-slate-500">
              {fromDate} → {toDate} • {filtered.length} {isFr ? "comptes" : "حساب"}
            </p>
          </div>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-semibold border border-emerald-600/30 transition-all">
          <FileSpreadsheet size={14} />
          Excel
        </button>
      </div>

      {/* Balance status */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
        isBalanced
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-red-500/10 border-red-500/30 text-red-400"
      }`}>
        {isBalanced
          ? (isFr ? "✓ Balance équilibrée (Débit = Crédit)" : "✓ الميزان متوازن (مدين = دائن)")
          : (isFr
              ? `⚠ Déséquilibre: ${formatCurrency(Math.abs(totals.debit - totals.credit))}`
              : `⚠ عدم توازن: ${formatCurrency(Math.abs(totals.debit - totals.credit))}`
            )
        }
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500" />
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="w-full bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 pr-8 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            placeholder={isFr ? "Filtrer..." : "تصفية..."}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0d1526] border border-slate-700/40 text-xs text-slate-400 cursor-pointer hover:border-teal-500/40">
          <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-teal-500" />
          {isFr ? "Masquer soldes nuls" : "إخفاء الحسابات الصفرية"}
        </label>
      </div>

      {/* Table */}
      <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className={`grid text-xs font-bold text-slate-400 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/50 ${isFr ? "grid-cols-12" : "grid-cols-12"}`}>
          <span className="col-span-2">{isFr ? "Code" : "الرمز"}</span>
          <span className="col-span-4">{isFr ? "Intitulé du compte" : "اسم الحساب"}</span>
          <span className="col-span-2 text-center">{isFr ? "Classe" : "الصنف"}</span>
          <span className="col-span-2 text-right">{isFr ? "Débit" : "مدين"}</span>
          <span className="col-span-2 text-right">{isFr ? "Crédit" : "دائن"}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {isFr ? "Aucun mouvement dans cette période" : "لا توجد حركات في هذه الفترة"}
          </div>
        ) : (
          <>
            {filtered.map((row) => (
              <div key={row.account.id}
                className="grid grid-cols-12 text-sm px-4 py-2.5 border-b border-slate-700/10 hover:bg-slate-800/20 transition-colors">
                <span className="col-span-2 font-mono text-indigo-400 font-bold text-xs">{row.account.code}</span>
                <span className="col-span-4 text-slate-200 text-xs">
                  {isFr ? row.account.nameFr : row.account.nameAr}
                </span>
                <span className="col-span-2 text-center">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                    {row.account.accountClass}
                  </span>
                </span>
                <span className="col-span-2 text-right font-medium text-emerald-400 text-xs">
                  {row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "-"}
                </span>
                <span className="col-span-2 text-right font-medium text-rose-400 text-xs">
                  {row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "-"}
                </span>
              </div>
            ))}

            {/* Totals row */}
            <div className="grid grid-cols-12 px-4 py-3 bg-slate-900/60 border-t-2 border-slate-600/50 font-bold">
              <span className="col-span-6 text-slate-300 text-sm">{isFr ? "TOTAL GÉNÉRAL" : "الإجمالي العام"}</span>
              <span className="col-span-2"></span>
              <span className="col-span-2 text-right text-emerald-300 text-sm">{formatCurrency(totals.debit)}</span>
              <span className="col-span-2 text-right text-rose-300 text-sm">{formatCurrency(totals.credit)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
