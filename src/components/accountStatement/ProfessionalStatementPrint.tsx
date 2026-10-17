import React, { useState } from "react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Customer, StoreInfo } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import {
  Printer,
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Building,
  Phone,
  Calendar,
  Layers,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react";

export interface StatementItem {
  productName: string;
  productCode?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface StatementTransaction {
  id: string;
  date: string;
  type: "invoice" | "return" | "creditor" | "debtor";
  description: string;
  productCode?: string;
  debit: number;
  credit: number;
  quantity?: number;
  balance?: number;
  invoiceNumber?: string;
  isArchive?: boolean;
  items?: StatementItem[];
}

export interface StatementTotals {
  totalQuantity: number;
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
  openingBalance: number;
  allTimeBalance: number;
}

interface ProfessionalStatementPrintProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  transactions: StatementTransaction[];
  totals: StatementTotals;
  storeInfo: StoreInfo | null;
  startDate?: string;
  endDate?: string;
}

export default function ProfessionalStatementPrint({
  isOpen,
  onClose,
  customer,
  transactions,
  totals,
  storeInfo,
  startDate,
  endDate
}: ProfessionalStatementPrintProps) {
  const { locale, isRTL } = useLocale();
  const isFr = locale === 'fr';

  // Printing options
  const [includeItemDetails, setIncludeItemDetails] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeSummaryCards, setIncludeSummaryCards] = useState<boolean>(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString(isFr ? 'fr-FR' : 'ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const statementRefNumber = `STMT-${new Date().getFullYear()}-${customer.id.slice(-6).toUpperCase()}`;

  const getBadgeTitle = (type: string, isArchive?: boolean) => {
    switch (type) {
      case 'invoice':
        return isArchive
          ? (isFr ? 'Facture Archive' : 'فاتورة أرشيف')
          : (isFr ? 'Facture Vente' : 'فاتورة مبيعات');
      case 'return':
        return isArchive
          ? (isFr ? 'Retour Archive' : 'مرتجع أرشيف')
          : (isFr ? 'Retour Vente' : 'مرتجع مبيعات');
      case 'creditor':
        return isFr ? 'Règlement / Reçu' : 'سداد / سند قبض';
      case 'debtor':
        return isFr ? 'Dette à terme (Lui)' : 'دين آجل (له)';
      default:
        return isFr ? 'Opération financière' : 'معاملة مالية';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:static print:bg-white print:overflow-visible">
      {/* ── Outer Modal Window (Hidden on print) ── */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Modal Top Control Bar (Screen Only) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isFr ? "Aperçu & Impression du Relevé Financier Officiel" : "معاينة وطباعة كشف الحساب المالي الرسمي"}
              </h3>
              <p className="text-xs text-slate-300">
                {isFr ? "Client : " : "العميل: "}
                <strong className="text-white">{customer.name}</strong> ({transactions.length} {isFr ? "mouvements" : "حركة"})
              </p>
            </div>
          </div>

          {/* Quick Print Options */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white">
              <input
                type="checkbox"
                checked={includeItemDetails}
                onChange={(e) => setIncludeItemDetails(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <span>{isFr ? "Détails des articles" : "تفاصيل الأصناف للفواتير"}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <span>{isFr ? "Signatures & Cachet" : "قسم التوقيعات والختم"}</span>
            </label>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>{isFr ? "Imprimer le document" : "طباعة المستند"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFr ? "Fermer" : "إغلاق"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Document Preview Container ── */}
        <div className="overflow-y-auto flex-1 bg-slate-100/70 p-4 sm:p-6 print:p-0 print:bg-white print:overflow-visible">
          
          {/* ── THE PRINTABLE DOCUMENT (A4 Format) ── */}
          <div
            id="statement-print-zone"
            className="statement-print-zone bg-white mx-auto p-8 sm:p-10 rounded-xl shadow-lg border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none max-w-4xl text-slate-800 font-sans"
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            {/* 1. Official Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex justify-between items-start gap-4">
                {/* Right: Company Logo / Name */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {storeInfo?.photoUrl && (
                      <img
                        src={storeInfo.photoUrl}
                        alt="Logo"
                        className="h-14 max-w-[130px] object-contain"
                      />
                    )}
                    <div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        {storeInfo?.name || (isFr ? 'Hissaby Pro SARL' : 'مؤسسة حسابي برو التجارية')}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">
                        {storeInfo?.businessType || (isFr ? 'Commerce Général, Vente en Gros et Détail' : 'لتجارة الجملة والتجزئة والمبيعات')}
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 pt-1 space-y-0.5">
                    {storeInfo?.address && (
                      <p className="flex items-center gap-1.5">
                        <Building size={12} className="text-slate-400" />
                        <span>{storeInfo.address}</span>
                      </p>
                    )}
                    {storeInfo?.phone && (
                      <p className="flex items-center gap-1.5 font-sans">
                        <Phone size={12} className="text-slate-400" />
                        <span dir="ltr">{storeInfo.phone}</span>
                      </p>
                    )}
                    {storeInfo?.commercialRegister && (
                      <p className="text-[10px] text-slate-500">
                        {isFr ? "Registre de Commerce : " : "السجل التجاري: "}
                        <span className="font-mono font-bold">{storeInfo.commercialRegister}</span>
                      </p>
                    )}
                    {storeInfo?.taxNumber && (
                      <p className="text-[10px] text-slate-500">
                        {isFr ? "NIF / Fiscal : " : "الرقم الضريبي: "}
                        <span className="font-mono font-bold">{storeInfo.taxNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Left: Statement Document Meta */}
                <div className={`${isRTL ? 'text-left' : 'text-right'} bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[220px]`}>
                  <div className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-xs mb-1">
                    {isFr ? "RELEVÉ DE COMPTE OFFICIEL" : "كشف حساب مالي تفصيلي"}
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                    {isFr ? "Réf : " : "رقم الكشف: "}
                    {statementRefNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isFr ? "Date : " : "تاريخ الإصدار: "}
                    <span className="font-sans font-medium text-slate-800">{todayStr}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isFr ? "Période : " : "فترة الكشف: "}
                    <span className="font-sans font-bold text-slate-900">
                      {startDate ? startDate : (isFr ? 'Origine' : 'بداية التعامل')} {isFr ? 'au' : 'إلى'} {endDate ? endDate : (isFr ? 'Présent' : 'تاريخه')}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Customer Profile & Account Scope Box */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Customer Data */}
                <div className={`space-y-1.5 ${isRTL ? 'border-l pl-4' : 'border-r pr-4'} border-slate-200`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">{isFr ? "Client / Raison sociale :" : "اسم العميل / المؤسسة:"}</span>
                    <strong className="text-sm font-black text-slate-900">{customer.name}</strong>
                  </div>
                  {customer.company && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">{isFr ? "Activité / Entreprise :" : "الشركة / النشاط:"}</span>
                      <span className="font-bold text-slate-800">{customer.company}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">{isFr ? "Tél / Mobile :" : "رقم الهاتف / الجوال:"}</span>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">{isFr ? "Adresse :" : "العنوان:"}</span>
                      <span className="text-slate-700 font-medium">{customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Account Summary Status */}
                <div className="space-y-1.5 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">{isFr ? "Solde reporté antérieur :" : "الرصيد السابق (المنقول):"}</span>
                    <span className="font-sans font-bold text-slate-800">
                      {formatCurrency(Math.abs(totals.openingBalance))}
                      <span className="text-[10px] text-slate-400 mr-1 ml-1">
                        {totals.openingBalance > 0 ? (isFr ? "(Dû)" : "(عليه)") : totals.openingBalance < 0 ? (isFr ? "(Crédit)" : "(له)") : "(0)"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">{isFr ? "Total Débit de la période :" : "إجمالي فواتير الفترة (مدين):"}</span>
                    <span className="font-sans font-bold text-rose-700">{formatCurrency(totals.totalDebit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">{isFr ? "Total Règlements & Avoirs (Crédit) :" : "إجمالي السدادات والمرتجع (دائن):"}</span>
                    <span className="font-sans font-bold text-emerald-700">{formatCurrency(totals.totalCredit)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs">{isFr ? "Solde Net Final :" : "صافي الرصيد الختامي:"}</span>
                    <span className={`text-sm font-black font-sans ${
                      totals.finalBalance > 0 ? "text-rose-700" : totals.finalBalance < 0 ? "text-emerald-700" : "text-slate-800"
                    }`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                      <span className="text-[11px] mr-1 ml-1 font-bold">
                        {totals.finalBalance > 0
                          ? (isFr ? " (À régler par le client)" : " (مطلوب سداده منه)")
                          : totals.finalBalance < 0
                          ? (isFr ? " (Solde créditeur au client)" : " (رصيد دائن له)")
                          : (isFr ? " (Compte soldé)" : " (خالص ومسدد)")}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Executive Mini-Cards (if enabled) */}
            {includeSummaryCards && (
              <div className="grid grid-cols-4 gap-2.5 mb-5 text-center text-xs">
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-500">{isFr ? "Opérations" : "حركات الفترة"}</p>
                  <p className="text-sm font-black font-sans text-slate-800 mt-0.5">{transactions.length}</p>
                </div>
                <div className="border border-rose-200 rounded-lg p-2.5 bg-rose-50/40">
                  <p className="text-[10px] font-bold text-rose-700">{isFr ? "Total Débit (+)" : "إجمالي المدين (+)"}</p>
                  <p className="text-sm font-black font-sans text-rose-700 mt-0.5">{formatCurrency(totals.totalDebit)}</p>
                </div>
                <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/40">
                  <p className="text-[10px] font-bold text-emerald-700">{isFr ? "Total Crédit (-)" : "إجمالي الدائن (-)"}</p>
                  <p className="text-sm font-black font-sans text-emerald-700 mt-0.5">{formatCurrency(totals.totalCredit)}</p>
                </div>
                <div className={`border rounded-lg p-2.5 ${
                  totals.finalBalance > 0 ? "border-rose-300 bg-rose-100/50" : "border-emerald-300 bg-emerald-100/50"
                }`}>
                  <p className="text-[10px] font-black text-slate-700">{isFr ? "Solde Net Dû" : "الرصيد المستحق"}</p>
                  <p className={`text-sm font-black font-sans mt-0.5 ${
                    totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"
                  }`}>
                    {formatCurrency(Math.abs(totals.finalBalance))}
                  </p>
                </div>
              </div>
            )}

            {/* 4. THE MASTER LEDGER PRINT TABLE */}
            <div className="mb-6">
              <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse text-[11px] statement-table border border-slate-300`}>
                <thead>
                  <tr className="bg-slate-800 text-white font-bold border-b-2 border-slate-900">
                    <th className="py-2.5 px-2 text-center w-8 border-l border-slate-700">#</th>
                    <th className="py-2.5 px-2.5 w-20 border-l border-slate-700">{isFr ? "Date" : "التاريخ"}</th>
                    <th className="py-2.5 px-2.5 w-24 border-l border-slate-700">{isFr ? "Type" : "نوع المعاملة"}</th>
                    <th className="py-2.5 px-2.5 w-24 border-l border-slate-700">{isFr ? "N° Facture/Réf" : "رقم الفاتورة/المستند"}</th>
                    <th className="py-2.5 px-3 border-l border-slate-700">{isFr ? "Libellé & Détails de l'opération" : "البيان وتفاصيل العملية"}</th>
                    <th className="py-2.5 px-2 text-center w-12 border-l border-slate-700">{isFr ? "Qté" : "الكمية"}</th>
                    <th className="py-2.5 px-2.5 text-center w-24 border-l border-slate-700 bg-rose-900/40">{isFr ? "Débit (+)" : "مدين (+)"}</th>
                    <th className="py-2.5 px-2.5 text-center w-24 border-l border-slate-700 bg-emerald-900/40">{isFr ? "Crédit (-)" : "دائن (-)"}</th>
                    <th className={`py-2.5 px-3 ${isRTL ? 'text-left' : 'text-right'} w-28 bg-slate-900`}>{isFr ? "Solde Cumulé" : "الرصيد التراكمي"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Opening Balance Row */}
                  {startDate && totals.openingBalance !== 0 && (
                    <tr className="bg-blue-50/70 font-bold border-b border-blue-200">
                      <td className="py-2 px-2 text-center text-slate-500 font-sans border-l border-slate-200">--</td>
                      <td className="py-2 px-2.5 text-slate-700 font-sans border-l border-slate-200">{startDate}</td>
                      <td className="py-2 px-2.5 border-l border-slate-200 text-blue-900">
                        {isFr ? "Solde Antérieur" : "رصيد سابق"}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-400 border-l border-slate-200">---</td>
                      <td className="py-2 px-3 text-slate-900 border-l border-slate-200 font-bold" colSpan={2}>
                        {isFr
                          ? `Solde d'ouverture reporté jusqu'au ${startDate}`
                          : `رصيد افتتاحي سابق منقول حتى تاريخ ${startDate}`}
                      </td>
                      <td className="py-2 px-2.5 text-center font-sans text-rose-700 border-l border-slate-200">
                        {totals.openingBalance > 0 ? formatCurrency(totals.openingBalance) : '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center font-sans text-emerald-700 border-l border-slate-200">
                        {totals.openingBalance < 0 ? formatCurrency(Math.abs(totals.openingBalance)) : '-'}
                      </td>
                      <td className={`py-2 px-3 ${isRTL ? 'text-left' : 'text-right'} font-black font-sans text-slate-900 bg-blue-100/40`}>
                        {formatCurrency(Math.abs(totals.openingBalance))}
                        <span className="text-[9px] text-slate-500 mr-1 ml-1">
                          {totals.openingBalance > 0 ? (isFr ? "Dû" : "عليه") : (isFr ? "Crédit" : "له")}
                        </span>
                      </td>
                    </tr>
                  )}

                  {transactions.map((tx, idx) => {
                    const currentBal = tx.balance || 0;
                    const hasItems = tx.items && tx.items.length > 0;

                    return (
                      <React.Fragment key={tx.id || idx}>
                        <tr className="even:bg-slate-50/60 hover:bg-slate-100/50 transition-colors">
                          <td className="py-2 px-2 text-center font-sans text-slate-500 border-l border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 text-slate-700 font-sans whitespace-nowrap border-l border-slate-200">
                            {tx.date}
                          </td>
                          <td className="py-2 px-2.5 font-bold border-l border-slate-200">
                            <span className="text-[10px] text-slate-800">
                              {getBadgeTitle(tx.type, tx.isArchive)}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-800 border-l border-slate-200">
                            {tx.invoiceNumber || '---'}
                          </td>
                          <td className="py-2 px-3 text-slate-800 border-l border-slate-200">
                            <span className="font-semibold block">{tx.description}</span>
                          </td>
                          <td className="py-2 px-2 text-center font-sans font-bold text-slate-700 border-l border-slate-200">
                            {tx.quantity || '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-sans font-bold text-rose-700 bg-rose-50/20 border-l border-slate-200">
                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-sans font-bold text-emerald-700 bg-emerald-50/20 border-l border-slate-200">
                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                          </td>
                          <td className={`py-2 px-3 ${isRTL ? 'text-left' : 'text-right'} font-black font-sans bg-slate-100/60`}>
                            <span className={currentBal > 0 ? "text-rose-700" : currentBal < 0 ? "text-emerald-700" : "text-slate-600"}>
                              {formatCurrency(Math.abs(currentBal))}
                            </span>
                            <span className="text-[9px] text-slate-400 mr-1 ml-1 font-bold">
                              {currentBal > 0 ? (isFr ? "Dû" : "عليه") : currentBal < 0 ? (isFr ? "Crédit" : "له") : (isFr ? "Soldé" : "خالص")}
                            </span>
                          </td>
                        </tr>

                        {/* Itemized Sub-Table (if enabled) */}
                        {includeItemDetails && hasItems && (
                          <tr className="bg-slate-100/40 border-b border-slate-200">
                            <td colSpan={9} className="py-2 px-4">
                              <div className="bg-white rounded-md border border-slate-300 p-2 text-[10px]">
                                <div className="flex items-center gap-1.5 mb-1 text-slate-700 font-bold">
                                  <Receipt size={11} className="text-blue-600" />
                                  <span>
                                    {isFr
                                      ? `Articles de la facture #${tx.invoiceNumber} (${tx.items?.length} articles) :`
                                      : `أصناف الفاتورة #${tx.invoiceNumber} (${tx.items?.length} صنف):`}
                                  </span>
                                </div>
                                <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`}>
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                      <th className="p-1">{isFr ? "Désignation" : "اسم الصنف"}</th>
                                      <th className="p-1 w-24">{isFr ? "Code" : "كود الصنف"}</th>
                                      <th className="p-1 text-center w-16">{isFr ? "Quantité" : "الكمية"}</th>
                                      <th className="p-1 text-center w-24">{isFr ? "Prix Unitaire" : "سعر الوحدة"}</th>
                                      <th className={`p-1 ${isRTL ? 'text-left' : 'text-right'} w-24`}>{isFr ? "Total" : "الإجمالي"}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-sans">
                                    {tx.items?.map((it, itemIdx) => (
                                      <tr key={itemIdx} className="hover:bg-slate-50">
                                        <td className="p-1 font-medium text-slate-800">{it.productName}</td>
                                        <td className="p-1 font-mono text-slate-500">{it.productCode || '-'}</td>
                                        <td className="p-1 text-center font-bold text-slate-700">{it.quantity}</td>
                                        <td className="p-1 text-center text-slate-600">{formatCurrency(it.price)}</td>
                                        <td className={`p-1 ${isRTL ? 'text-left' : 'text-right'} font-bold text-slate-900`}>{formatCurrency(it.total)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-800 text-[11px]">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 font-black text-slate-900 text-xs">
                      {isFr ? "Total général des opérations de la période :" : "المجموع العام لحركات الفترة:"}
                    </td>
                    <td className="py-2.5 px-2 text-center font-sans font-bold text-slate-900 border-l border-slate-300">
                      {totals.totalQuantity}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-black font-sans text-rose-700 bg-rose-100/60 border-l border-slate-300">
                      {formatCurrency(totals.totalDebit)}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-black font-sans text-emerald-700 bg-emerald-100/60 border-l border-slate-300">
                      {formatCurrency(totals.totalCredit)}
                    </td>
                    <td className={`py-2.5 px-3 ${isRTL ? 'text-left' : 'text-right'} font-black font-sans text-xs bg-slate-300/70`}>
                      <span className={totals.finalBalance > 0 ? "text-rose-800" : "text-emerald-800"}>
                        {formatCurrency(Math.abs(totals.finalBalance))}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 mr-1 ml-1">
                        {totals.finalBalance > 0 ? (isFr ? "(Dû)" : "(عليه)") : totals.finalBalance < 0 ? (isFr ? "(Crédit)" : "(له)") : (isFr ? "(Soldé)" : "(خالص)")}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Official Accounting Declaration & Summary Text */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6 text-xs text-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck size={14} className="text-blue-600" />
                  <span>{isFr ? "Attestation et certification comptable :" : "الإقرار والاعتماد المحاسبي:"}</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 font-medium">
                  {transactions.length} {isFr ? "opérations enregistrées" : "حركات مسجلة"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {isFr ? (
                  <>
                    Nous certifions que le présent relevé de compte représente fidèlement la situation comptable de notre client M./Société{" "}
                    <strong className="text-slate-900">{customer.name}</strong>, comprenant l'ensemble des factures de vente, mouvements d'archive et règlements jusqu'à ce jour. Le solde définitif arrêté est de{" "}
                    <strong className={`font-sans text-xs ${totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                    </strong>{" "}
                    ({totals.finalBalance > 0 ? "à régler à notre établissement" : totals.finalBalance < 0 ? "solde créditeur en sa faveur" : "compte entièrement soldé"}).
                  </>
                ) : (
                  <>
                    نشهد بأن هذا الكشف يمثل الحساب الدقيق والمعتمد للعميل المحترم/{" "}
                    <strong className="text-slate-900">{customer.name}</strong>، ويشمل جميع الفواتير والمبيعات السابقة المستخرجة والمطابقة من السجلات والأرشيف حتى تاريخه، والرصيد النهائي المعتمد هو{" "}
                    <strong className={`font-sans text-xs ${totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                    </strong>{" "}
                    ({totals.finalBalance > 0 ? "مطلوب سداده لصالح المؤسسة" : totals.finalBalance < 0 ? "رصيد دائن مستحق للعميل" : "الحساب مسدد بالكامل"}).
                  </>
                )}
              </p>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                {isFr
                  ? "* Mention légale : Ce relevé est réputé exact et approuvé entre les parties à défaut de contestation écrite dans un délai de 15 jours suivant sa notification."
                  : "* ملاحظة قانونية: يعتبر هذا الكشف نهائياً وصحيحاً وموافقاً عليه من الطرفين في حال عدم ورود أي إخطار كتابي خلال 15 يوماً من تاريخ استلامه."}
              </p>
            </div>

            {/* 6. Signatures & Stamp Zone */}
            {includeSignatures && (
              <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-center text-xs">
                {/* Accountant Signature */}
                <div className="space-y-6">
                  <p className="font-bold text-slate-700 text-[11px]">{isFr ? "Le Responsable Comptable" : "إعداد المحاسب المسؤول"}</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mx-4"></div>
                  <p className="text-[10px] text-slate-400">{isFr ? "Date & Signature" : "التوقيع والتاريخ"}</p>
                </div>

                {/* Management Stamp */}
                <div className="space-y-6 border-r border-l border-slate-200 px-2">
                  <p className="font-bold text-slate-700 text-[11px]">{isFr ? "Cachet de l'Établissement" : "ختم واعتماد المؤسسة"}</p>
                  <div className="h-12 flex items-center justify-center">
                    <div className="w-16 h-12 border-2 border-blue-900/30 rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-900/40 transform -rotate-6">
                      {isFr ? "Cachet Officiel" : "الختم الرسمي"}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">{isFr ? "Direction Financière" : "الإدارة المالية"}</p>
                </div>

                {/* Customer Signature */}
                <div className="space-y-6">
                  <p className="font-bold text-slate-700 text-[11px]">{isFr ? "Signature du Client" : "توقيع واستلام العميل"}</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mx-4"></div>
                  <p className="text-[10px] text-slate-400">{isFr ? "Nom & Signature" : "الاسم والتوقيع"}</p>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-sans">
              <span>{isFr ? "Système Hissaby Pro - Gestion Commerciale & Comptable" : "نظام حسابي برو لإدارة الحسابات والمبيعات"}</span>
              <span>{isFr ? "Page 1 sur 1" : "صفحة 1 من 1"}</span>
              <span>{isFr ? "Date d'impression : " : "تاريخ الطباعة: "}{todayStr}</span>
            </div>

          </div>{/* End printable statement */}

        </div>{/* End scrollable container */}

        {/* Modal Bottom Footer (Screen Only) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs print:hidden shrink-0">
          <p className="text-slate-500">
            {isFr
              ? "Mise en page optimisée pour l'impression standard A4 Portrait."
              : "تم ضبط التنسيق ليلائم أوراق الطباعة القياسية A4 Portrait بدقة تامة."}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isFr ? "Fermer" : "إلغاء"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>{isFr ? "Lancer l'impression" : "بدء الطباعة الآن"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── CSS PRINT RULES: Clean Isolation of Print Zone ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm;
          }

          /* Force browser to print exact colors and backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide all surrounding screen elements */
          body * {
            visibility: hidden !important;
          }

          /* Make only the statement print zone visible */
          #statement-print-zone,
          #statement-print-zone * {
            visibility: visible !important;
          }

          #statement-print-zone {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }

          /* Ensure table headers repeat across pages */
          thead {
            display: table-header-group !important;
          }

          /* Prevent row splitting across pages */
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
