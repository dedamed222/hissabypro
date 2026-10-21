import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { formatCurrency } from "@/utils/formatters";
import { JournalEntry, JournalLine } from "@/types/accounting";
import {
  getJournalEntries,
  getJournalLinesForEntry,
  reverseJournalEntry,
} from "@/lib/accountingDatabase";
import {
  BookOpen, Plus, Search, Filter, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, RotateCcw, Eye, Calendar, Loader2,
  FileSpreadsheet, ArrowRightLeft, Layers, Settings, X, Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AccountingJournal() {
  const { isEnabled, isLoading, migrationError, accounts, fiscalPeriods, postEntry, getActivePeriod } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [entryLines, setEntryLines] = useState<Record<string, JournalLine[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "posted" | "reversed">("all");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // New manual entry modal state
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEntryDesc, setNewEntryDesc] = useState("");
  const [newEntryRef, setNewEntryRef] = useState("");
  const [newEntryLines, setNewEntryLines] = useState<{ accountId: string; debit: number; credit: number; description: string }[]>([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" },
  ]);

  const newEntryTotals = useMemo(() => {
    const totalDebit = newEntryLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = newEntryLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01 && totalDebit > 0;
    return { totalDebit, totalCredit, diff, isBalanced };
  }, [newEntryLines]);

  function handleAddLine() {
    setNewEntryLines((prev) => [...prev, { accountId: "", debit: 0, credit: 0, description: "" }]);
  }

  function handleRemoveLine(index: number) {
    if (newEntryLines.length <= 2) {
      toast({
        title: isFr ? "Au moins 2 lignes requises" : "يجب أن يحتوي القيد على سطرين على الأقل",
        variant: "destructive",
      });
      return;
    }
    setNewEntryLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLineChange(index: number, field: string, value: any) {
    setNewEntryLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleSaveNewEntry() {
    if (!newEntryDesc.trim()) {
      toast({
        title: isFr ? "Description requise" : "يرجى إدخال بيان القيد",
        variant: "destructive",
      });
      return;
    }

    const invalidLines = newEntryLines.some((l) => !l.accountId || (Number(l.debit) <= 0 && Number(l.credit) <= 0));
    if (invalidLines) {
      toast({
        title: isFr ? "Vérifiez les comptes et montants" : "يرجى تحديد الحساب ومبلغ المدين أو الدائن لكل سطر",
        variant: "destructive",
      });
      return;
    }

    if (!newEntryTotals.isBalanced) {
      toast({
        title: isFr ? "Écriture non équilibrée" : "القيد غير متوازن: إجمالي المدين يجب أن يساوي إجمالي الدائن",
        variant: "destructive",
      });
      return;
    }

    const period = getActivePeriod(newEntryDate) || fiscalPeriods.find((p) => !p.isClosed);
    if (!period) {
      toast({
        title: isFr ? "Aucune période fiscale ouverte" : "لا توجد فترة مالية مفتوحة لهذا التاريخ",
        variant: "destructive",
      });
      return;
    }

    try {
      postEntry(
        {
          entryDate: newEntryDate,
          periodId: period.id,
          sourceDocumentType: "manual",
          sourceDocumentRef: newEntryRef.trim() || undefined,
          description: newEntryDesc.trim(),
          status: "posted",
        },
        newEntryLines.map((l) => {
          const acc = accounts.find((a) => a.id === l.accountId);
          return {
            accountId: l.accountId,
            accountCode: acc?.code,
            accountNameAr: acc?.nameAr,
            accountNameFr: acc?.nameFr,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description.trim() || newEntryDesc.trim(),
          };
        })
      );

      toast({
        title: isFr ? "Écriture enregistrée avec succès" : "تم حفظ القيد المحاسبي بنجاح",
      });
      setShowNewEntryModal(false);
      setNewEntryDesc("");
      setNewEntryRef("");
      setNewEntryLines([
        { accountId: "", debit: 0, credit: 0, description: "" },
        { accountId: "", debit: 0, credit: 0, description: "" },
      ]);
      loadEntries();
    } catch (err: any) {
      toast({
        title: isFr ? "Erreur d'enregistrement" : "خطأ أثناء تسجيل القيد",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    if (isEnabled) loadEntries();
  }, [isEnabled, fromDate, toDate, filterStatus]);

  function loadEntries() {
    setLoading(true);
    try {
      const opts: any = { fromDate, toDate };
      if (filterStatus !== "all") opts.status = filterStatus;
      setEntries(getJournalEntries(opts));
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    if (expandedEntry === id) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(id);
      if (!entryLines[id]) {
        setEntryLines((prev) => ({ ...prev, [id]: getJournalLinesForEntry(id) }));
      }
    }
  }

  function startReverse(entryId: string) {
    setReversingId(entryId);
    setReverseReason("");
    setShowReverseModal(true);
  }

  function confirmReverse() {
    if (!reversingId || !reverseReason.trim()) return;
    try {
      reverseJournalEntry(reversingId, reverseReason);
      toast({ title: isFr ? "Contre-passation créée" : "تم إنشاء قيد عكسي بنجاح" });
      setShowReverseModal(false);
      loadEntries();
    } catch (e: any) {
      toast({ title: isFr ? "Erreur" : "خطأ", description: e.message, variant: "destructive" });
    }
  }

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const s = searchTerm.toLowerCase();
    return entries.filter(
      (e) =>
        e.entryNumber.toLowerCase().includes(s) ||
        e.description.toLowerCase().includes(s) ||
        (e.sourceDocumentRef || "").toLowerCase().includes(s)
    );
  }, [entries, searchTerm]);

  // ─── Guard: module disabled ────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <BookOpen className="text-indigo-400" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-200">
          {isFr ? "Module Comptabilité" : "وحدة المحاسبة المالية"}
        </h2>
        <p className="text-slate-400 max-w-sm">
          {isFr
            ? "Ce module est désactivé. Activez-le depuis les paramètres."
            : "هذه الوحدة معطلة حالياً. فعّلها من إعدادات النظام."}
        </p>
        <button
          onClick={() => navigate("/accounting/settings")}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
        >
          {isFr ? "Paramètres comptabilité" : "إعدادات المحاسبة"}
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-indigo-400" size={36} />
      </div>
    );
  }

  if (migrationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <AlertCircle className="text-red-400" size={32} />
        <p className="text-red-400 max-w-sm">{migrationError}</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    if (status === "posted") return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
        <CheckCircle2 size={11} />
        {isFr ? "Comptabilisé" : "مرحَّل"}
      </span>
    );
    if (status === "reversed") return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-semibold">
        <RotateCcw size={11} />
        {isFr ? "Contre-passé" : "معكوس"}
      </span>
    );
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">{status}</span>
    );
  };

  return (
    <div className="space-y-4 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">
              {isFr ? "Journal Général" : "دفتر اليومية العامة"}
            </h1>
            <p className="text-xs text-slate-500">
              {filtered.length} {isFr ? "écritures" : "قيد"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewEntryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus size={14} />
            {isFr ? "Nouvelle écriture" : "قيد يدوي جديد"}
          </button>
          <button
            onClick={() => navigate("/accounting/settings")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/50 transition-all cursor-pointer"
            title={isFr ? "Paramètres" : "الإعدادات"}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="relative col-span-2 sm:col-span-2">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 pr-8 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            placeholder={isFr ? "Rechercher..." : "بحث..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
          className="bg-[#0d1526] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
      </div>
      <div className="flex gap-2">
        {(["all", "posted", "reversed"] as const).map((s) => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-[#0d1526] text-slate-400 border border-slate-700/40 hover:border-indigo-600/50"}`}
          >
            {s === "all" ? (isFr ? "Tous" : "الكل") : s === "posted" ? (isFr ? "Comptabilisé" : "مرحَّل") : (isFr ? "Contre-passé" : "معكوس")}
          </button>
        ))}
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-slate-500">
          <Layers size={36} className="opacity-40" />
          <p className="text-sm">{isFr ? "Aucune écriture trouvée" : "لا توجد قيود محاسبية"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const lines = entryLines[entry.id] || [];
            const isExpanded = expandedEntry === entry.id;
            return (
              <div key={entry.id}
                className="bg-[#0d1526] border border-slate-700/40 rounded-xl overflow-hidden transition-all hover:border-indigo-600/30">
                {/* Entry header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-indigo-400 font-bold">{entry.entryNumber}</span>
                      {statusBadge(entry.status)}
                      {entry.sourceDocumentRef && (
                        <span className="text-xs text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded">
                          {entry.sourceDocumentRef}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 mt-0.5 truncate">{entry.description}</p>
                    <p className="text-xs text-slate-500">{entry.entryDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-indigo-300">{formatCurrency(entry.totalDebit)}</p>
                    <p className="text-xs text-slate-500">{isFr ? "Débit" : "مدين"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.status === "posted" && (
                      <button onClick={() => startReverse(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-orange-500/15 text-orange-400 transition-all" title={isFr ? "Contre-passer" : "عكس القيد"}>
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <button onClick={() => toggleExpand(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-indigo-400 transition-all">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded lines */}
                {isExpanded && (
                  <div className="border-t border-slate-700/40 bg-slate-900/40">
                    <div className="grid grid-cols-12 text-xs text-slate-500 px-4 py-2 border-b border-slate-700/20">
                      <span className="col-span-2">{isFr ? "Compte" : "الحساب"}</span>
                      <span className="col-span-4">{isFr ? "Libellé" : "البيان"}</span>
                      <span className="col-span-3 text-right">{isFr ? "Débit" : "مدين"}</span>
                      <span className="col-span-3 text-right">{isFr ? "Crédit" : "دائن"}</span>
                    </div>
                    {lines.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-500">
                        {isFr ? "Chargement..." : "جاري التحميل..."}
                      </div>
                    ) : (
                      lines.map((line) => (
                        <div key={line.id} className="grid grid-cols-12 text-xs px-4 py-2 border-b border-slate-700/10 hover:bg-slate-800/20">
                          <span className="col-span-2 font-mono text-indigo-400">{line.accountCode}</span>
                          <span className="col-span-4 text-slate-300 truncate">{isFr ? line.accountNameFr : line.accountNameAr}</span>
                          <span className="col-span-3 text-right text-emerald-400 font-medium">
                            {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                          </span>
                          <span className="col-span-3 text-right text-rose-400 font-medium">
                            {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                          </span>
                        </div>
                      ))
                    )}
                    <div className="grid grid-cols-12 text-xs px-4 py-2 font-bold">
                      <span className="col-span-6 text-slate-400">{isFr ? "Total" : "الإجمالي"}</span>
                      <span className="col-span-3 text-right text-emerald-400">{formatCurrency(entry.totalDebit)}</span>
                      <span className="col-span-3 text-right text-rose-400">{formatCurrency(entry.totalCredit)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reverse Modal */}
      {showReverseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#0d1526] border border-slate-700 rounded-2xl p-5 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <RotateCcw size={16} className="text-orange-400" />
              {isFr ? "Contre-passation du journal" : "عكس القيد المحاسبي"}
            </h3>
            <p className="text-xs text-slate-400">
              {isFr
                ? "Cette opération créera un contre-écriture miroir. Elle est irréversible."
                : "سيتم إنشاء قيد معاكس. القيد الأصلي يبقى محفوظاً ولا يُحذف."}
            </p>
            <textarea
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 resize-none"
              rows={3}
              placeholder={isFr ? "Motif de la contre-passation..." : "سبب العكس..."}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReverseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold transition-all">
                {isFr ? "Annuler" : "إلغاء"}
              </button>
              <button onClick={confirmReverse}
                disabled={!reverseReason.trim()}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all">
                {isFr ? "Confirmer la contre-passation" : "تأكيد العكس"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Manual Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0d1526] border border-slate-700/80 rounded-2xl p-5 w-full max-w-2xl space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-base">
                <Plus size={18} className="text-indigo-400" />
                {isFr ? "Nouvelle écriture manuelle" : "تسجيل قيد محاسبي يدوي جديد"}
              </h3>
              <button
                onClick={() => setShowNewEntryModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">
                  {isFr ? "Date de l'écriture *" : "تاريخ القيد *"}
                </label>
                <input
                  type="date"
                  required
                  value={newEntryDate}
                  onChange={(e) => setNewEntryDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 block mb-1 font-medium">
                  {isFr ? "Libellé / Description *" : "بيان القيد المحاسبي *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isFr ? "Ex: Régularisation, loyer, etc." : "مثال: تسوية مصاريف، إيجار، قيد افتتاحي..."}
                  value={newEntryDesc}
                  onChange={(e) => setNewEntryDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-medium">
                {isFr ? "Référence pièce (optionnel)" : "رقم أو مرجع السند (اختياري)"}
              </label>
              <input
                type="text"
                placeholder="REF-2026-001"
                value={newEntryRef}
                onChange={(e) => setNewEntryRef(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Entry lines table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-bold">
                  {isFr ? "Lignes d'écriture (Partie Double)" : "سطور القيد (القيد المزدوج)"}
                </label>
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <Plus size={14} />
                  {isFr ? "Ajouter une ligne" : "إضافة سطر"}
                </button>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                <div className="grid grid-cols-12 text-[11px] font-semibold text-slate-400 px-3 py-2 bg-slate-800/40">
                  <span className="col-span-5">{isFr ? "Compte *" : "الحساب *"}</span>
                  <span className="col-span-3 text-right">{isFr ? "Débit" : "مدين"}</span>
                  <span className="col-span-3 text-right">{isFr ? "Crédit" : "دائن"}</span>
                  <span className="col-span-1 text-center"></span>
                </div>

                {newEntryLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                    <div className="col-span-5">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, "accountId", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">{isFr ? "— Choisir un compte —" : "— اختر حساباً —"}</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} — {isFr ? acc.nameFr : acc.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit || ""}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleLineChange(idx, "debit", val);
                          if (val > 0) handleLineChange(idx, "credit", 0);
                        }}
                        className="w-full text-right bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit || ""}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleLineChange(idx, "credit", val);
                          if (val > 0) handleLineChange(idx, "debit", 0);
                        }}
                        className="w-full text-right bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-rose-400 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title={isFr ? "Supprimer" : "حذف السطر"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Equilibrium verification */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span>
                    {isFr ? "Total Débit :" : "إجمالي المدين:"}{" "}
                    <strong className="text-emerald-400 font-mono">{formatCurrency(newEntryTotals.totalDebit)}</strong>
                  </span>
                  <span>
                    {isFr ? "Total Crédit :" : "إجمالي الدائن:"}{" "}
                    <strong className="text-rose-400 font-mono">{formatCurrency(newEntryTotals.totalCredit)}</strong>
                  </span>
                </div>
                <div>
                  {newEntryTotals.isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 size={13} />
                      {isFr ? "Équilibré ✓" : "القيد متوازن ✓"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                      <AlertCircle size={13} />
                      {isFr ? `Écart: ${formatCurrency(newEntryTotals.diff)}` : `الفرق: ${formatCurrency(newEntryTotals.diff)}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                {isFr ? "Annuler" : "إلغاء"}
              </button>
              <button
                type="button"
                onClick={handleSaveNewEntry}
                disabled={!newEntryTotals.isBalanced}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
              >
                {isFr ? "Valider et enregistrer le قيد" : "حفظ وترحيل القيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
