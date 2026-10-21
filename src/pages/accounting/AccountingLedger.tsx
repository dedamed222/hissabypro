import React, { useState, useMemo } from "react";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { getGeneralLedgerForAccount } from "@/lib/accountingDatabase";
import { formatCurrency } from "@/utils/formatters";
import { Search, BookOpen, ChevronDown, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

export default function AccountingLedger() {
  const { isEnabled, accounts, isLoading } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [searchAccount, setSearchAccount] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-01-01`;
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);

  const filteredAccounts = useMemo(() => {
    const s = searchAccount.toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.includes(s) ||
        a.nameAr.toLowerCase().includes(s) ||
        a.nameFr.toLowerCase().includes(s)
    );
  }, [accounts, searchAccount]);

  const ledgerRows = useMemo(() => {
    if (!selectedAccountId) return [];
    return getGeneralLedgerForAccount(selectedAccountId, { fromDate, toDate });
  }, [selectedAccountId, fromDate, toDate]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const finalBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].runningBalance : 0;

  function exportExcel() {
    if (!selectedAccount || !ledgerRows.length) return;
    const rows = ledgerRows.map((r) => ({
      [isFr ? "Date" : "التاريخ"]: r.entryDate,
      [isFr ? "N° Écriture" : "رقم القيد"]: r.entryNumber,
      [isFr ? "Libellé" : "البيان"]: r.description || "",
      [isFr ? "Débit" : "مدين"]: r.debit,
      [isFr ? "Crédit" : "دائن"]: r.credit,
      [isFr ? "Solde Cumulé" : "الرصيد التراكمي"]: r.runningBalance,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows),
      `${selectedAccount.code}`);
    XLSX.writeFile(wb, `ledger-${selectedAccount.code}-${fromDate}-${toDate}.xlsx`);
  }

  if (!isEnabled) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 text-sm">
      <BookOpen size={32} className="opacity-30 mb-2" />
      {isFr ? "Module désactivé." : "الوحدة المحاسبية معطلة."}
    </div>
  );
  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>;

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center shadow-md">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-100">
            {isFr ? "Grand Livre" : "دفتر الأستاذ العام"}
          </h1>
          <p className="text-xs text-slate-500">
            {selectedAccount ? `${selectedAccount.code} — ${isFr ? selectedAccount.nameFr : selectedAccount.nameAr}` : (isFr ? "Sélectionner un compte" : "اختر حساباً")}
          </p>
        </div>
      </div>

      {/* Account selector + date filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative sm:col-span-1">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="w-full bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 pr-8 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            placeholder={isFr ? "Chercher un compte..." : "ابحث عن حساب..."}
            value={searchAccount} onChange={(e) => setSearchAccount(e.target.value)} />
        </div>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500" />
      </div>

      {/* Account list (if no account selected) */}
      {!selectedAccountId && (
        <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
          {filteredAccounts.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">{isFr ? "Aucun compte trouvé" : "لا توجد حسابات"}</div>
          ) : (
            filteredAccounts.map((a) => (
              <button key={a.id} onClick={() => setSelectedAccountId(a.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-600/10 border-b border-slate-700/10 transition-all text-left">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-indigo-400 font-bold">{a.code}</span>
                  <span className="text-sm text-slate-200">{isFr ? a.nameFr : a.nameAr}</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">{a.accountClass}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Ledger for selected account */}
      {selectedAccountId && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedAccountId("")}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              ← {isFr ? "Changer de compte" : "تغيير الحساب"}
            </button>
            {ledgerRows.length > 0 && (
              <button onClick={exportExcel}
                className="text-xs px-3 py-1.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/40 transition-all">
                Excel
              </button>
            )}
          </div>

          {/* Balance summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: isFr ? "Total Débit" : "إجمالي المدين",
                value: ledgerRows.reduce((s, r) => s + r.debit, 0),
                color: "text-emerald-400"
              },
              {
                label: isFr ? "Total Crédit" : "إجمالي الدائن",
                value: ledgerRows.reduce((s, r) => s + r.credit, 0),
                color: "text-rose-400"
              },
              {
                label: isFr ? "Solde Final" : "الرصيد النهائي",
                value: finalBalance,
                color: finalBalance >= 0 ? "text-blue-400" : "text-orange-400"
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0d1526] border border-slate-700/40 rounded-xl px-3 py-2.5 text-center">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className={`text-sm font-bold ${stat.color}`}>{formatCurrency(Math.abs(stat.value))}</p>
              </div>
            ))}
          </div>

          {/* Movements table */}
          <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/50">
              <span className="col-span-2">{isFr ? "Date" : "التاريخ"}</span>
              <span className="col-span-2">{isFr ? "N° Écriture" : "رقم القيد"}</span>
              <span className="col-span-4">{isFr ? "Libellé" : "البيان"}</span>
              <span className="col-span-2 text-right">{isFr ? "Débit" : "مدين"}</span>
              <span className="col-span-2 text-right">{isFr ? "Crédit" : "دائن"}</span>
            </div>

            {ledgerRows.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                {isFr ? "Aucun mouvement" : "لا توجد حركات"}
              </div>
            ) : (
              ledgerRows.map((row, idx) => (
                <div key={`${row.id}-${idx}`}
                  className="grid grid-cols-12 text-xs px-4 py-2 border-b border-slate-700/10 hover:bg-slate-800/20 transition-colors">
                  <span className="col-span-2 text-slate-400">{row.entryDate}</span>
                  <span className="col-span-2 font-mono text-indigo-400 text-[10px]">{row.entryNumber}</span>
                  <span className="col-span-4 text-slate-300 truncate">{row.description || "—"}</span>
                  <span className="col-span-2 text-right text-emerald-400 font-medium">
                    {row.debit > 0 ? formatCurrency(row.debit) : ""}
                  </span>
                  <span className="col-span-2 text-right text-rose-400 font-medium">
                    {row.credit > 0 ? formatCurrency(row.credit) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
