import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { getThirdPartyBalance, getJournalEntries, getJournalLinesForEntry } from "@/lib/accountingDatabase";
import { loadStoreData } from "@/utils/localStorage";
import { formatCurrency } from "@/utils/formatters";
import { Users, Search, Loader2, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";

export default function ThirdPartyAccounts() {
  const { isEnabled, isLoading } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [partyType, setPartyType] = useState<"all" | "customer" | "supplier">("all");

  // Build list from store data
  const parties = useMemo(() => {
    const store = loadStoreData();
    const customers = (store.customers || []).map((c: any) => ({
      id: c.id, name: c.name, phone: c.phone, type: "customer" as const,
    }));
    const suppliers = (store.suppliers || []).map((s: any) => ({
      id: s.id, name: s.name, phone: s.phone, type: "supplier" as const,
    }));
    let all = [...customers, ...suppliers];
    if (partyType !== "all") all = all.filter((p) => p.type === partyType);
    if (search.trim()) {
      const s = search.toLowerCase();
      all = all.filter((p) => p.name.toLowerCase().includes(s));
    }
    return all.map((p) => ({ ...p, ...getThirdPartyBalance(p.id) }));
  }, [search, partyType]);

  if (!isEnabled) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <Users size={36} className="text-cyan-400 opacity-50" />
      <p className="text-slate-400 text-sm">
        {isFr ? "Module comptabilité désactivé." : "الوحدة المحاسبية معطلة حالياً."}
      </p>
      <button
        onClick={() => navigate("/accounting/settings")}
        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-sm"
      >
        {isFr ? "Paramètres" : "الإعدادات"}
      </button>
    </div>
  );

  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>;

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md">
          <Users size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-100">
            {isFr ? "Comptes de Tiers" : "حسابات الغير"}
          </h1>
          <p className="text-xs text-slate-500">{parties.length} {isFr ? "tiers" : "طرف"}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="w-full bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 pr-8 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            placeholder={isFr ? "Rechercher..." : "بحث..."} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(["all", "customer", "supplier"] as const).map((t) => (
          <button key={t} onClick={() => setPartyType(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${partyType === t ? "bg-cyan-600 text-white" : "bg-[#0d1526] text-slate-400 border border-slate-700/40"}`}>
            {t === "all" ? (isFr ? "Tous" : "الكل") : t === "customer" ? (isFr ? "Clients" : "العملاء") : (isFr ? "Fournisseurs" : "الموردون")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 text-xs font-bold text-slate-400 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/50">
          <span className="col-span-4">{isFr ? "Nom" : "الاسم"}</span>
          <span className="col-span-2">{isFr ? "Type" : "النوع"}</span>
          <span className="col-span-2 text-right">{isFr ? "Débit" : "مدين"}</span>
          <span className="col-span-2 text-right">{isFr ? "Crédit" : "دائن"}</span>
          <span className="col-span-2 text-right">{isFr ? "Solde Net" : "الرصيد"}</span>
        </div>
        {parties.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {isFr ? "Aucun mouvement comptable" : "لا توجد حركات محاسبية لهذه الأطراف"}
          </div>
        ) : (
          parties.map((p) => (
            <div key={p.id} className="grid grid-cols-12 text-sm px-4 py-2.5 border-b border-slate-700/10 hover:bg-slate-800/20 transition-colors items-center">
              <div className="col-span-4 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigate(p.type === "customer" ? `/account-statement` : `/suppliers`)}
                  className="text-slate-200 hover:text-cyan-400 text-xs font-medium truncate flex items-center gap-1.5 transition-colors cursor-pointer text-start"
                  title={isFr ? "Voir le relevé / la fiche" : "عرض كشف الحساب / البيانات"}
                >
                  <span className="truncate">{p.name}</span>
                  <ExternalLink size={11} className="opacity-50 shrink-0 text-cyan-400" />
                </button>
              </div>
              <div className="col-span-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  p.type === "customer"
                    ? "bg-blue-500/15 text-blue-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}>
                  {p.type === "customer" ? (isFr ? "Client" : "عميل") : (isFr ? "Fourn." : "مورد")}
                </span>
              </div>
              <span className="col-span-2 text-right text-xs text-emerald-400 font-medium">
                {p.totalDebit > 0 ? formatCurrency(p.totalDebit) : "-"}
              </span>
              <span className="col-span-2 text-right text-xs text-rose-400 font-medium">
                {p.totalCredit > 0 ? formatCurrency(p.totalCredit) : "-"}
              </span>
              <div className="col-span-2 text-right">
                <span className={`text-xs font-bold ${p.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatCurrency(Math.abs(p.netBalance))}
                  {p.netBalance >= 0 ? " ↑" : " ↓"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
