import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounting } from "@/contexts/AccountingContext";
import { useLocale } from "@/hooks/useLocale";
import { FiscalPeriod } from "@/types/accounting";
import { generateAccountingUUID, upsertFiscalPeriod, closeFiscalPeriod } from "@/lib/accountingDatabase";
import { toast } from "@/hooks/use-toast";
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";

export default function FiscalPeriods() {
  const { isEnabled, fiscalPeriods, refreshPeriods, recentEntries } = useAccounting();
  const { locale } = useLocale();
  const isFr = locale === "fr";
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  // Form state
  const currentYear = new Date().getFullYear();
  const [code, setCode] = useState(`FY${currentYear}`);
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  const filteredPeriods = useMemo(() => {
    return fiscalPeriods
      .filter((p) => {
        if (filter === "open" && p.isClosed) return false;
        if (filter === "closed" && !p.isClosed) return false;
        if (search) {
          const s = search.toLowerCase();
          return p.code.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [fiscalPeriods, filter, search]);

  const stats = useMemo(() => {
    const total = fiscalPeriods.length;
    const open = fiscalPeriods.filter((p) => !p.isClosed).length;
    const closed = fiscalPeriods.filter((p) => p.isClosed).length;
    return { total, open, closed };
  }, [fiscalPeriods]);

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Calendar className="text-indigo-400 opacity-50" size={36} />
        <p className="text-slate-400 text-sm">
          {isFr ? "Module comptabilité désactivé." : "وحدة المحاسبة المالية معطلة حالياً."}
        </p>
        <button
          onClick={() => navigate("/accounting/settings")}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all cursor-pointer shadow-sm"
        >
          {isFr ? "Paramètres" : "الإعدادات"}
        </button>
      </div>
    );
  }

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !startDate || !endDate) {
      toast({
        title: isFr ? "Champs obligatoires manquants" : "يرجى ملء كافة الحقول",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: isFr ? "Date de début supérieure à la date de fin" : "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
        variant: "destructive",
      });
      return;
    }

    // Check duplicate code
    if (fiscalPeriods.some((p) => p.code.toLowerCase() === code.trim().toLowerCase())) {
      toast({
        title: isFr ? "Ce code d'exercice existe déjà" : "رمز الفترة المالية موجود مسبقاً",
        variant: "destructive",
      });
      return;
    }

    const newPeriod: FiscalPeriod = {
      id: generateAccountingUUID(),
      code: code.trim(),
      startDate,
      endDate,
      isClosed: false,
      syncStatus: "pending",
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertFiscalPeriod(newPeriod);
    refreshPeriods();
    setShowAddModal(false);
    toast({
      title: isFr ? "Exercice créé avec succès" : "تم إنشاء الفترة المالية بنجاح",
    });
  };

  const handleClosePeriod = (periodId: string) => {
    const ok = closeFiscalPeriod(periodId);
    if (ok) {
      refreshPeriods();
      setConfirmCloseId(null);
      toast({
        title: isFr ? "Exercice clôturé définitivement" : "تم قفل الفترة المالية نهائياً",
      });
    } else {
      toast({
        title: isFr ? "Erreur lors de la clôture" : "تعذر قفل الفترة المالية",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6" dir={isFr ? "ltr" : "rtl"}>
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-600" />
            {isFr ? "Exercices et Périodes Comptables" : "الفترات والسنوات المالية"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isFr
              ? "Gestion des exercices fiscaux, verrouillage et clôture comptable selon la norme Sage 100"
              : "إدارة السنوات المالية، قفل الفترات ومنع التعديل على القيود التاريخية وفق معايير المحاسبة العامة"}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          {isFr ? "Nouvel Exercice" : "إضافة فترة مالية"}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {isFr ? "Total des exercices" : "إجمالي الفترات"}
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {isFr ? "Exercices ouverts" : "فترات مفتوحة (نشطة)"}
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.open}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Unlock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {isFr ? "Exercices clôturés" : "فترات مغلقة نهائياً"}
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">{stats.closed}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isFr ? "Rechercher un code..." : "البحث برمز الفترة..."}
            className="w-full ps-9 pe-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {isFr ? "Tous" : "الكل"}
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "open" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {isFr ? "Ouverts" : "المفتوحة"}
          </button>
          <button
            onClick={() => setFilter("closed")}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "closed" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            {isFr ? "Clôturés" : "المغلقة"}
          </button>
        </div>
      </div>

      {/* Periods Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 text-xs font-semibold">
              <tr>
                <th className="px-5 py-3.5 text-start">{isFr ? "Code Exercice" : "رمز الفترة"}</th>
                <th className="px-5 py-3.5 text-start">{isFr ? "Date Début" : "تاريخ البداية"}</th>
                <th className="px-5 py-3.5 text-start">{isFr ? "Date Fin" : "تاريخ النهاية"}</th>
                <th className="px-5 py-3.5 text-start">{isFr ? "Statut" : "الحالة"}</th>
                <th className="px-5 py-3.5 text-start">{isFr ? "Écritures" : "عدد القيود"}</th>
                <th className="px-5 py-3.5 text-end">{isFr ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPeriods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {isFr ? "Aucun exercice trouvé" : "لا توجد فترات مالية مطابقة"}
                  </td>
                </tr>
              ) : (
                filteredPeriods.map((period) => {
                  const entryCount = recentEntries.filter((e) => e.periodId === period.id).length;
                  return (
                    <tr key={period.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900">{period.code}</td>
                      <td className="px-5 py-4 text-slate-600 font-mono text-xs">{period.startDate}</td>
                      <td className="px-5 py-4 text-slate-600 font-mono text-xs">{period.endDate}</td>
                      <td className="px-5 py-4">
                        {period.isClosed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/50">
                            <Lock className="w-3 h-3" />
                            {isFr ? "Clôturé" : "مغلقة نهائياً"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <Unlock className="w-3 h-3" />
                            {isFr ? "Ouvert (Actif)" : "مفتوحة"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="font-semibold">{entryCount}</span> {isFr ? "écritures" : "قيد"}
                      </td>
                      <td className="px-5 py-4 text-end">
                        {period.isClosed ? (
                          <span className="text-xs text-slate-400 italic">
                            {period.closedAt ? new Date(period.closedAt).toLocaleDateString() : ""}
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmCloseId(period.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200/60"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            {isFr ? "Clôturer" : "قفل الفترة"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Create New Period */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {isFr ? "Nouvel Exercice Comptable" : "إنشاء فترة مالية جديدة"}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isFr ? "Code de l'exercice (ex: FY2026)" : "رمز الفترة (مثال: FY2026 أو 2026-M01)"}
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="FY2026"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isFr ? "Date de début" : "تاريخ البداية"}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isFr ? "Date de fin" : "تاريخ النهاية"}
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {isFr ? "Annuler" : "إلغاء"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                >
                  {isFr ? "Créer l'exercice" : "حفظ الفترة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmation for Irrevocable Close */}
      {confirmCloseId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-100 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {isFr ? "Confirmer la clôture de l'exercice ?" : "تأكيد قفل الفترة المالية نهائياً؟"}
              </h2>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {isFr
                ? "Attention : selon les règles comptables strictes de Sage 100, la clôture est irréversible. Aucune écriture ne pourra plus être modifiée ou ajoutée dans cette période."
                : "تنبيه هام: وفقاً للقواعد المحاسبية الصارمة (معايير Sage 100)، قفل الفترة نهائي ولا يمكن التراجع عنه. لن يُسمح بتعديل أو إضافة أي قيود في هذه الفترة بعد القفل."}
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmCloseId(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {isFr ? "تراجع" : "إلغاء"}
              </button>
              <button
                type="button"
                onClick={() => handleClosePeriod(confirmCloseId)}
                className="px-5 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200"
              >
                {isFr ? "Confirmer la clôture" : "تأكيد القفل النهائي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
