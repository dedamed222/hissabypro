import React, { useState } from "react";
import { useAccounting } from "@/contexts/AccountingContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { upsertAccount, upsertFiscalPeriod, updateAccountMapping, getAccounts } from "@/lib/accountingDatabase";
import { generateAccountingUUID } from "@/lib/accountingDatabase";
import { Account, FiscalPeriod, OperationKey } from "@/types/accounting";
import { DEFAULT_ACCOUNT_MAPPINGS } from "@/data/defaultChartOfAccounts";
import { toast } from "@/hooks/use-toast";
import { Settings, ToggleLeft, ToggleRight, Plus, Calendar, BookOpen, Loader2, Map } from "lucide-react";

const OPERATION_KEYS: { key: OperationKey; labelAr: string; labelFr: string }[] = [
  { key: "sales_revenue", labelAr: "حساب المبيعات", labelFr: "Compte Ventes" },
  { key: "sales_tax", labelAr: "رسم القيمة المضافة محصل", labelFr: "TVA Collectée" },
  { key: "cash_account", labelAr: "الصندوق النقدي", labelFr: "Caisse" },
  { key: "bank_account", labelAr: "البنك", labelFr: "Banque" },
  { key: "ar_customers", labelAr: "ذمم العملاء", labelFr: "Clients (AR)" },
  { key: "ap_suppliers", labelAr: "ذمم الموردين", labelFr: "Fournisseurs (AP)" },
  { key: "inventory_asset", labelAr: "أصول المخزون", labelFr: "Stock Actif" },
  { key: "cogs_expense", labelAr: "تكلفة البضاعة المباعة", labelFr: "COGS" },
  { key: "general_expense", labelAr: "المصروفات العامة", labelFr: "Charges Générales" },
];

export default function AccountingSettings() {
  const { isEnabled, accounts, accountMappings, addFiscalPeriod, setAccountMapping, isLoading } = useAccounting();
  const { updateSettings } = useSettings();
  const { locale } = useLocale();
  const isFr = locale === "fr";

  // Feature flag toggle — reads from store
  const [enabling, setEnabling] = useState(false);

  const [newPeriodCode, setNewPeriodCode] = useState(`FY${new Date().getFullYear()}`);
  const [newPeriodStart, setNewPeriodStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [newPeriodEnd, setNewPeriodEnd] = useState(`${new Date().getFullYear()}-12-31`);

  async function toggleModule() {
    setEnabling(true);
    try {
      updateSettings({ accountingModuleEnabled: !isEnabled } as any);
      toast({
        title: !isEnabled
          ? (isFr ? "Module comptabilité activé" : "تم تفعيل وحدة المحاسبة")
          : (isFr ? "Module désactivé" : "تم تعطيل وحدة المحاسبة"),
      });
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setEnabling(false);
    }
  }

  function handleAddPeriod() {
    if (!newPeriodCode || !newPeriodStart || !newPeriodEnd) return;
    const period: FiscalPeriod = {
      id: generateAccountingUUID(),
      code: newPeriodCode,
      startDate: newPeriodStart,
      endDate: newPeriodEnd,
      isClosed: false,
      syncStatus: "pending",
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addFiscalPeriod(period);
    toast({ title: isFr ? "Période créée" : "تم إنشاء الفترة المالية" });
  }

  function handleMappingChange(key: OperationKey, accountId: string) {
    setAccountMapping(key, accountId);
    toast({ title: isFr ? "Liaison mise à jour" : "تم تحديث الربط" });
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-600 to-indigo-700 flex items-center justify-center shadow-md">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-100">
            {isFr ? "Paramètres Comptabilité" : "إعدادات المحاسبة"}
          </h1>
          <p className="text-xs text-slate-500">
            {isFr ? "Configuration du module financier" : "إعداد الوحدة المالية"}
          </p>
        </div>
      </div>

      {/* Feature Flag toggle */}
      <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <BookOpen size={15} className="text-indigo-400" />
          {isFr ? "Module Comptabilité" : "وحدة المحاسبة المالية"}
        </h2>
        <p className="text-xs text-slate-500">
          {isFr
            ? "Activez ce module pour accéder au journal, grand livre, balance, et états financiers."
            : "فعّل هذه الوحدة للوصول إلى اليومية، الأستاذ، الميزان، والقوائم المالية."}
        </p>
        <button onClick={toggleModule} disabled={enabling}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isEnabled
              ? "bg-indigo-600 hover:bg-indigo-500 text-white"
              : "bg-slate-700 hover:bg-slate-600 text-slate-300"
          }`}>
          {enabling ? <Loader2 size={16} className="animate-spin" /> : (
            isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />
          )}
          {isEnabled
            ? (isFr ? "Module activé — Cliquer pour désactiver" : "الوحدة مفعّلة — انقر للتعطيل")
            : (isFr ? "Module désactivé — Cliquer pour activer" : "الوحدة معطلة — انقر للتفعيل")}
        </button>
      </div>

      {isEnabled && (
        <>
          {/* Account Mappings */}
          <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Map size={15} className="text-amber-400" />
              {isFr ? "Paramétrage des comptes (Mapping)" : "ربط العمليات بالحسابات"}
            </h2>
            <p className="text-xs text-slate-500">
              {isFr
                ? "Associez chaque type d'opération au compte comptable correspondant."
                : "اربط كل نوع من العمليات بحسابه المحاسبي المناسب."}
            </p>
            <div className="space-y-2">
              {OPERATION_KEYS.map((op) => {
                const currentMapping = accountMappings.find((m) => m.operationKey === op.key);
                const currentAccountId = currentMapping?.accountId || "";
                return (
                  <div key={op.key} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <p className="text-xs text-slate-300 font-medium">{isFr ? op.labelFr : op.labelAr}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{op.key}</p>
                    </div>
                    <div className="col-span-7">
                      <select
                        value={currentAccountId}
                        onChange={(e) => handleMappingChange(op.key, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">{isFr ? "— Sélectionner —" : "— اختر حساباً —"}</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {isFr ? a.nameFr : a.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* New Fiscal Period */}
          <div className="bg-[#0d1526] border border-slate-700/40 rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Calendar size={15} className="text-teal-400" />
              {isFr ? "Créer une période fiscale" : "إنشاء فترة مالية جديدة"}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">{isFr ? "Code" : "الرمز"}</label>
                <input value={newPeriodCode} onChange={(e) => setNewPeriodCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="FY2026" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">{isFr ? "Début" : "البداية"}</label>
                <input type="date" value={newPeriodStart} onChange={(e) => setNewPeriodStart(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">{isFr ? "Fin" : "النهاية"}</label>
                <input type="date" value={newPeriodEnd} onChange={(e) => setNewPeriodEnd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600/50 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500" />
              </div>
            </div>
            <button onClick={handleAddPeriod}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-all">
              <Plus size={14} />
              {isFr ? "Créer la période" : "إنشاء الفترة"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
