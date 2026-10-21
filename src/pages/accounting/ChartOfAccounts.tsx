import React, { useState, useMemo } from "react";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { Account, AccountType } from "@/types/accounting";
import { generateAccountingUUID } from "@/lib/accountingDatabase";
import { toast } from "@/hooks/use-toast";
import {
  Database, Search, Plus, ChevronDown, Loader2, Check, X
} from "lucide-react";

export default function ChartOfAccounts() {
  const { isEnabled, accounts, addAccount, isLoading } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<number | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newAcc, setNewAcc] = useState<Partial<Account>>({
    code: "", nameAr: "", nameFr: "",
    accountClass: 1,
    type: "asset" as AccountType,
    isActive: true,
  });

  const filtered = useMemo(() => {
    let list = accounts;
    if (filterClass !== "all") list = list.filter((a) => a.accountClass === filterClass);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((a) =>
        a.code.includes(s) || a.nameAr.toLowerCase().includes(s) || a.nameFr.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) => a.code.localeCompare(b.code));
  }, [accounts, search, filterClass]);

  function handleSave() {
    if (!newAcc.code || !newAcc.nameAr || !newAcc.accountClass) {
      toast({ title: isFr ? "Champs obligatoires manquants" : "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    addAccount({
      id: generateAccountingUUID(),
      code: newAcc.code!,
      nameAr: newAcc.nameAr!,
      nameFr: newAcc.nameFr || newAcc.nameAr!,
      accountClass: newAcc.accountClass!,
      type: newAcc.type || "asset",
      parentId: null,
      isActive: true,
      syncStatus: "pending",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    toast({ title: isFr ? "Compte créé" : "تم إنشاء الحساب" });
    setShowAdd(false);
    setNewAcc({ code: "", nameAr: "", nameFr: "", accountClass: 1, type: "asset", isActive: true });
  }

  const CLASS_LABELS: Record<number, string> = isFr
    ? { 1: "Capitaux", 2: "Immobilisations", 3: "Stocks", 4: "Tiers", 5: "Financiers", 6: "Charges", 7: "Produits" }
    : { 1: "حسابات رأس المال", 2: "الأصول الثابتة", 3: "المخزون", 4: "الغير", 5: "المالية", 6: "المصروفات", 7: "الإيرادات" };

  if (!isEnabled) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 text-sm">
      <Database size={32} className="opacity-30 mb-2" />
      {isFr ? "Module désactivé." : "الوحدة المحاسبية معطلة."}
    </div>
  );
  if (isLoading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>;

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">
              {isFr ? "Plan Comptable" : "دليل الحسابات"}
            </h1>
            <p className="text-xs text-slate-500">{filtered.length} {isFr ? "comptes" : "حساب"}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 text-xs font-semibold border border-violet-600/30 transition-all">
          <Plus size={14} />
          {isFr ? "Nouveau compte" : "حساب جديد"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#0d1526] border border-violet-600/30 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-300">{isFr ? "Nouveau compte" : "حساب جديد"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input placeholder={isFr ? "Code *" : "الرمز *"} value={newAcc.code || ""}
              onChange={(e) => setNewAcc((p) => ({ ...p, code: e.target.value }))}
              className="bg-slate-800 border border-slate-600/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500" />
            <input placeholder={isFr ? "Intitulé AR *" : "الاسم عربي *"} value={newAcc.nameAr || ""}
              onChange={(e) => setNewAcc((p) => ({ ...p, nameAr: e.target.value }))}
              className="bg-slate-800 border border-slate-600/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500" />
            <input placeholder={isFr ? "Intitulé FR" : "الاسم فرنسي"} value={newAcc.nameFr || ""}
              onChange={(e) => setNewAcc((p) => ({ ...p, nameFr: e.target.value }))}
              className="bg-slate-800 border border-slate-600/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500" />
            <select value={newAcc.accountClass || 1}
              onChange={(e) => setNewAcc((p) => ({ ...p, accountClass: Number(e.target.value) }))}
              className="bg-slate-800 border border-slate-600/50 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500">
              {[1, 2, 3, 4, 5, 6, 7].map((c) => (
                <option key={c} value={c}>{c} — {CLASS_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all">
              <Check size={13} />
              {isFr ? "Enregistrer" : "حفظ"}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-all">
              <X size={13} />
              {isFr ? "Annuler" : "إلغاء"}
            </button>
          </div>
        </div>
      )}

      {/* Class filter */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setFilterClass("all")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterClass === "all" ? "bg-violet-600 text-white" : "bg-[#0d1526] text-slate-400 border border-slate-700/40"}`}>
          {isFr ? "Tous" : "الكل"}
        </button>
        {[1, 2, 3, 4, 5, 6, 7].map((c) => (
          <button key={c} onClick={() => setFilterClass(c)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterClass === c ? "bg-violet-600 text-white" : "bg-[#0d1526] text-slate-400 border border-slate-700/40"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="w-full bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 pr-8 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          placeholder={isFr ? "Rechercher..." : "بحث..."} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Accounts grouped by class */}
      <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 text-xs font-bold text-slate-400 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/50">
          <span className="col-span-2">{isFr ? "Code" : "الرمز"}</span>
          <span className="col-span-4">{isFr ? "Intitulé AR" : "الاسم عربي"}</span>
          <span className="col-span-4">{isFr ? "Intitulé FR" : "الاسم فرنسي"}</span>
          <span className="col-span-1 text-center">{isFr ? "Cl." : "ص"}</span>
          <span className="col-span-1 text-center">{isFr ? "Actif" : "فعّال"}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {isFr ? "Aucun compte trouvé" : "لا توجد حسابات"}
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="grid grid-cols-12 text-xs px-4 py-2 border-b border-slate-700/10 hover:bg-slate-800/20 transition-colors">
              <span className="col-span-2 font-mono text-indigo-400 font-bold">{a.code}</span>
              <span className="col-span-4 text-slate-200">{a.nameAr}</span>
              <span className="col-span-4 text-slate-400">{a.nameFr}</span>
              <span className="col-span-1 text-center text-slate-500">{a.accountClass}</span>
              <div className="col-span-1 flex justify-center">
                {a.isActive
                  ? <div className="w-2 h-2 rounded-full bg-emerald-500 mt-0.5" />
                  : <div className="w-2 h-2 rounded-full bg-slate-600 mt-0.5" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
