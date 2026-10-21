import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounting } from "@/contexts/AccountingContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency } from "@/utils/formatters";
import { getTrialBalance } from "@/lib/accountingDatabase";
import {
  BarChart2, TrendingUp, TrendingDown, Loader2, FileSpreadsheet, Printer
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AccountingStatements() {
  const { isEnabled, isLoading, accounts } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();

  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"income" | "balance">("income");

  const trialBalance = useMemo(() => {
    if (!isEnabled) return [];
    return getTrialBalance({
      fromDate: `${year}-01-01`,
      toDate: `${year}-12-31`,
    });
  }, [isEnabled, year]);

  // Income Statement (Compte de Résultat)
  const incomeRows = useMemo(() => {
    const revenues = trialBalance.filter((r) => r.account.accountClass === 7);
    const expenses = trialBalance.filter((r) => r.account.accountClass === 6);
    const totalRevenue = revenues.reduce((s, r) => s + r.totalCredit - r.totalDebit, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.totalDebit - r.totalCredit, 0);
    const netIncome = totalRevenue - totalExpenses;
    return { revenues, expenses, totalRevenue, totalExpenses, netIncome };
  }, [trialBalance]);

  // Balance Sheet (Bilan)
  const balanceRows = useMemo(() => {
    const assets = trialBalance.filter((r) => r.account.type === "asset");
    const liabilities = trialBalance.filter((r) => r.account.type === "liability");
    const equity = trialBalance.filter((r) => r.account.type === "equity");
    const totalAssets = assets.reduce((s, r) => s + r.netBalance, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + Math.abs(r.netBalance), 0);
    const totalEquity = equity.reduce((s, r) => s + Math.abs(r.netBalance), 0);
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
  }, [trialBalance]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // Income statement sheet
    const incomeData = [
      ...[isFr ? "PRODUITS (REVENUS)" : "الإيرادات"].map((h) => [h]),
      ...incomeRows.revenues.map((r) => [
        r.account.code,
        isFr ? r.account.nameFr : r.account.nameAr,
        r.totalCredit - r.totalDebit,
      ]),
      [],
      ...[isFr ? "CHARGES (DÉPENSES)" : "المصروفات"].map((h) => [h]),
      ...incomeRows.expenses.map((r) => [
        r.account.code,
        isFr ? r.account.nameFr : r.account.nameAr,
        r.totalDebit - r.totalCredit,
      ]),
      [],
      [isFr ? "RÉSULTAT NET" : "صافي النتيجة", "", incomeRows.netIncome],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incomeData), isFr ? "Compte Résultat" : "قائمة الدخل");
    XLSX.writeFile(wb, `financial-statements-${year}.xlsx`);
  }

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <BarChart2 className="text-indigo-400 opacity-40" size={36} />
        <button onClick={() => navigate("/accounting/settings")}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
          {isFr ? "Activer le module" : "تفعيل الوحدة"}
        </button>
      </div>
    );
  }

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-400" size={32} />
    </div>
  );

  const Section = ({ title, rows, isRevenue }: { title: string; rows: typeof incomeRows.revenues; isRevenue: boolean }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 rounded-xl">
        {isRevenue ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
        <h3 className="text-sm font-bold text-slate-300">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 px-4 py-2">
          {isFr ? "Aucun mouvement" : "لا توجد حركات"}
        </p>
      ) : (
        rows.map((r) => (
          <div key={r.account.id} className="flex items-center justify-between px-6 py-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-indigo-400">{r.account.code}</span>
              <span className="text-sm text-slate-300">{isFr ? r.account.nameFr : r.account.nameAr}</span>
            </div>
            <span className={`text-sm font-semibold ${isRevenue ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(isRevenue ? r.totalCredit - r.totalDebit : r.totalDebit - r.totalCredit)}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">
              {isFr ? "États Financiers" : "القوائم المالية"}
            </h1>
            <p className="text-xs text-slate-500">{year}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-semibold border border-emerald-600/30 transition-all">
            <FileSpreadsheet size={13} />
            Excel
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-600/30 transition-all print:hidden">
            <Printer size={13} />
          </button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 items-center">
        <label className="text-xs text-slate-400">{isFr ? "Exercice :" : "السنة المالية:"}</label>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
          min={2020} max={2030}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-1.5 text-sm text-slate-200 w-24 focus:outline-none focus:border-purple-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-700/30 w-fit">
        {(["income", "balance"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            {tab === "income"
              ? (isFr ? "Compte de Résultat" : "قائمة الدخل")
              : (isFr ? "Bilan" : "الميزانية العمومية")}
          </button>
        ))}
      </div>

      {/* Income Statement */}
      {activeTab === "income" && (
        <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden space-y-0 divide-y divide-slate-700/20">
          <Section title={isFr ? "PRODUITS (Classe 7)" : "الإيرادات (الصنف 7)"} rows={incomeRows.revenues} isRevenue={true} />
          <Section title={isFr ? "CHARGES (Classe 6)" : "المصروفات (الصنف 6)"} rows={incomeRows.expenses} isRevenue={false} />

          {/* Net result */}
          <div className={`flex items-center justify-between px-5 py-4 font-bold text-lg ${
            incomeRows.netIncome >= 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}>
            <span>{isFr ? "RÉSULTAT NET" : "صافي الربح/الخسارة"}</span>
            <span className="text-xl">{formatCurrency(incomeRows.netIncome)}</span>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === "balance" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Assets */}
          <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-blue-500/10 border-b border-slate-700/40">
              <h3 className="font-bold text-blue-300 text-sm">{isFr ? "ACTIF" : "الأصول"}</h3>
            </div>
            <div className="divide-y divide-slate-700/10">
              {balanceRows.assets.map((r) => (
                <div key={r.account.id} className="flex justify-between px-4 py-2">
                  <span className="text-xs text-slate-300">{isFr ? r.account.nameFr : r.account.nameAr}</span>
                  <span className="text-xs font-semibold text-blue-400">{formatCurrency(r.netBalance)}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 font-bold bg-blue-500/5">
                <span className="text-sm text-slate-300">{isFr ? "Total Actif" : "إجمالي الأصول"}</span>
                <span className="text-sm text-blue-300">{formatCurrency(balanceRows.totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities + Equity */}
          <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-purple-500/10 border-b border-slate-700/40">
              <h3 className="font-bold text-purple-300 text-sm">{isFr ? "PASSIF" : "الخصوم وحقوق الملكية"}</h3>
            </div>
            <div className="divide-y divide-slate-700/10">
              {balanceRows.liabilities.map((r) => (
                <div key={r.account.id} className="flex justify-between px-4 py-2">
                  <span className="text-xs text-slate-300">{isFr ? r.account.nameFr : r.account.nameAr}</span>
                  <span className="text-xs font-semibold text-rose-400">{formatCurrency(Math.abs(r.netBalance))}</span>
                </div>
              ))}
              {balanceRows.equity.map((r) => (
                <div key={r.account.id} className="flex justify-between px-4 py-2">
                  <span className="text-xs text-slate-300">{isFr ? r.account.nameFr : r.account.nameAr}</span>
                  <span className="text-xs font-semibold text-purple-400">{formatCurrency(Math.abs(r.netBalance))}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 font-bold bg-purple-500/5">
                <span className="text-sm text-slate-300">{isFr ? "Total Passif" : "إجمالي الخصوم"}</span>
                <span className="text-sm text-purple-300">
                  {formatCurrency(balanceRows.totalLiabilities + balanceRows.totalEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
