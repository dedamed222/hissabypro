import React, { useState } from "react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Customer, StoreInfo } from "@/types";
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
  // Printing options
  const [includeItemDetails, setIncludeItemDetails] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeSummaryCards, setIncludeSummaryCards] = useState<boolean>(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const statementRefNumber = `STMT-${new Date().getFullYear()}-${customer.id.slice(-6).toUpperCase()}`;

  const getBadgeTitle = (type: string, isArchive?: boolean) => {
    switch (type) {
      case 'invoice':
        return isArchive ? 'فاتورة أرشيف' : 'فاتورة مبيعات';
      case 'return':
        return isArchive ? 'مرتجع أرشيف' : 'مرتجع مبيعات';
      case 'creditor':
        return 'سداد / سند قبض';
      case 'debtor':
        return 'دين آجل (له)';
      default:
        return 'معاملة مالية';
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
              <h3 className="font-bold text-sm">معاينة وطباعة كشف الحساب المالي الرسمي</h3>
              <p className="text-xs text-slate-300">
                العميل: <strong className="text-white">{customer.name}</strong> ({transactions.length} حركة)
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
              <span>تفاصيل الأصناف للفواتير</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-200 hover:text-white">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
              <span>قسم التوقيعات والختم</span>
            </label>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>طباعة المستند</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق"
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
            style={{ direction: 'rtl' }}
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
                        {storeInfo?.name || 'مؤسسة حسابي برو التجارية'}
                      </h1>
                      <p className="text-xs text-slate-500 font-medium">
                        {storeInfo?.businessType || 'لتجارة الجملة والتجزئة والمبيعات'}
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
                        السجل التجاري: <span className="font-mono font-bold">{storeInfo.commercialRegister}</span>
                      </p>
                    )}
                    {storeInfo?.taxNumber && (
                      <p className="text-[10px] text-slate-500">
                        الرقم الضريبي: <span className="font-mono font-bold">{storeInfo.taxNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Left: Statement Document Meta */}
                <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[220px]">
                  <div className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-xs mb-1">
                    كشف حساب مالي تفصيلي
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                    رقم الكشف: {statementRefNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تاريخ الإصدار: <span className="font-sans font-medium text-slate-800">{todayStr}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    فترة الكشف:{" "}
                    <span className="font-sans font-bold text-slate-900">
                      {startDate ? startDate : 'بداية التعامل'} إلى {endDate ? endDate : 'تاريخه'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Customer Profile & Account Scope Box */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Customer Data */}
                <div className="space-y-1.5 border-l border-slate-200 pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">اسم العميل / المؤسسة:</span>
                    <strong className="text-sm font-black text-slate-900">{customer.name}</strong>
                  </div>
                  {customer.company && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">الشركة / النشاط:</span>
                      <span className="font-bold text-slate-800">{customer.company}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">رقم الهاتف / الجوال:</span>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">العنوان:</span>
                      <span className="text-slate-700 font-medium">{customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Account Summary Status */}
                <div className="space-y-1.5 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">الرصيد السابق (المنقول):</span>
                    <span className="font-sans font-bold text-slate-800">
                      {formatCurrency(Math.abs(totals.openingBalance))}
                      <span className="text-[10px] text-slate-400 mr-1">
                        {totals.openingBalance > 0 ? "(عليه)" : totals.openingBalance < 0 ? "(له)" : "(0)"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">إجمالي فواتير الفترة (مدين):</span>
                    <span className="font-sans font-bold text-rose-700">{formatCurrency(totals.totalDebit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">إجمالي السدادات والمرتجع (دائن):</span>
                    <span className="font-sans font-bold text-emerald-700">{formatCurrency(totals.totalCredit)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs">صافي الرصيد الختامي:</span>
                    <span className={`text-sm font-black font-sans ${
                      totals.finalBalance > 0 ? "text-rose-700" : totals.finalBalance < 0 ? "text-emerald-700" : "text-slate-800"
                    }`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                      <span className="text-[11px] mr-1 font-bold">
                        {totals.finalBalance > 0 ? " (مطلوب سداده منه)" : totals.finalBalance < 0 ? " (رصيد دائن له)" : " (خالص ومسدد)"}
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
                  <p className="text-[10px] font-bold text-slate-500">حركات الفترة</p>
                  <p className="text-sm font-black font-sans text-slate-800 mt-0.5">{transactions.length}</p>
                </div>
                <div className="border border-rose-200 rounded-lg p-2.5 bg-rose-50/40">
                  <p className="text-[10px] font-bold text-rose-700">إجمالي المدين (+)</p>
                  <p className="text-sm font-black font-sans text-rose-700 mt-0.5">{formatCurrency(totals.totalDebit)}</p>
                </div>
                <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/40">
                  <p className="text-[10px] font-bold text-emerald-700">إجمالي الدائن (-)</p>
                  <p className="text-sm font-black font-sans text-emerald-700 mt-0.5">{formatCurrency(totals.totalCredit)}</p>
                </div>
                <div className={`border rounded-lg p-2.5 ${
                  totals.finalBalance > 0 ? "border-rose-300 bg-rose-100/50" : "border-emerald-300 bg-emerald-100/50"
                }`}>
                  <p className="text-[10px] font-black text-slate-700">الرصيد المستحق</p>
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
              <table className="w-full text-right border-collapse text-[11px] statement-table border border-slate-300">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold border-b-2 border-slate-900">
                    <th className="py-2.5 px-2 text-center w-8 border-l border-slate-700">#</th>
                    <th className="py-2.5 px-2.5 w-20 border-l border-slate-700">التاريخ</th>
                    <th className="py-2.5 px-2.5 w-24 border-l border-slate-700">نوع المعاملة</th>
                    <th className="py-2.5 px-2.5 w-24 border-l border-slate-700">رقم الفاتورة/المستند</th>
                    <th className="py-2.5 px-3 border-l border-slate-700">البيان وتفاصيل العملية</th>
                    <th className="py-2.5 px-2 text-center w-12 border-l border-slate-700">الكمية</th>
                    <th className="py-2.5 px-2.5 text-center w-24 border-l border-slate-700 bg-rose-900/40">مدين (+)</th>
                    <th className="py-2.5 px-2.5 text-center w-24 border-l border-slate-700 bg-emerald-900/40">دائن (-)</th>
                    <th className="py-2.5 px-3 text-left w-28 bg-slate-900">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Opening Balance Row */}
                  {startDate && totals.openingBalance !== 0 && (
                    <tr className="bg-blue-50/70 font-bold border-b border-blue-200">
                      <td className="py-2 px-2 text-center text-slate-500 font-sans border-l border-slate-200">--</td>
                      <td className="py-2 px-2.5 text-slate-700 font-sans border-l border-slate-200">{startDate}</td>
                      <td className="py-2 px-2.5 border-l border-slate-200 text-blue-900">
                        رصيد سابق
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-400 border-l border-slate-200">---</td>
                      <td className="py-2 px-3 text-slate-900 border-l border-slate-200 font-bold" colSpan={2}>
                        رصيد افتتاحي سابق منقول حتى تاريخ {startDate}
                      </td>
                      <td className="py-2 px-2.5 text-center font-sans text-rose-700 border-l border-slate-200">
                        {totals.openingBalance > 0 ? formatCurrency(totals.openingBalance) : '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center font-sans text-emerald-700 border-l border-slate-200">
                        {totals.openingBalance < 0 ? formatCurrency(Math.abs(totals.openingBalance)) : '-'}
                      </td>
                      <td className="py-2 px-3 text-left font-black font-sans text-slate-900 bg-blue-100/40">
                        {formatCurrency(Math.abs(totals.openingBalance))}
                        <span className="text-[9px] text-slate-500 mr-1">
                          {totals.openingBalance > 0 ? "عليه" : "له"}
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
                          <td className="py-2 px-3 text-left font-black font-sans bg-slate-100/60">
                            <span className={currentBal > 0 ? "text-rose-700" : currentBal < 0 ? "text-emerald-700" : "text-slate-600"}>
                              {formatCurrency(Math.abs(currentBal))}
                            </span>
                            <span className="text-[9px] text-slate-400 mr-1 font-bold">
                              {currentBal > 0 ? "عليه" : currentBal < 0 ? "له" : "خالص"}
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
                                  <span>أصناف الفاتورة #{tx.invoiceNumber} ({tx.items?.length} صنف):</span>
                                </div>
                                <table className="w-full text-right border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                      <th className="p-1">اسم الصنف</th>
                                      <th className="p-1 w-24">كود الصنف</th>
                                      <th className="p-1 text-center w-16">الكمية</th>
                                      <th className="p-1 text-center w-24">سعر الوحدة</th>
                                      <th className="p-1 text-left w-24">الإجمالي</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-sans">
                                    {tx.items?.map((it, itemIdx) => (
                                      <tr key={itemIdx} className="hover:bg-slate-50">
                                        <td className="p-1 font-medium text-slate-800 font-arabic">{it.productName}</td>
                                        <td className="p-1 font-mono text-slate-500">{it.productCode || '-'}</td>
                                        <td className="p-1 text-center font-bold text-slate-700">{it.quantity}</td>
                                        <td className="p-1 text-center text-slate-600">{formatCurrency(it.price)}</td>
                                        <td className="p-1 text-left font-bold text-slate-900">{formatCurrency(it.total)}</td>
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
                      المجموع العام لحركات الفترة:
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
                    <td className="py-2.5 px-3 text-left font-black font-sans text-xs bg-slate-300/70">
                      <span className={totals.finalBalance > 0 ? "text-rose-800" : "text-emerald-800"}>
                        {formatCurrency(Math.abs(totals.finalBalance))}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 mr-1">
                        {totals.finalBalance > 0 ? "(عليه)" : totals.finalBalance < 0 ? "(له)" : "(خالص)"}
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
                  <span>الإقرار والاعتماد المحاسبي:</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500 font-medium">
                  {transactions.length} حركات مسجلة
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                نشهد بأن هذا الكشف يمثل الحساب الدقيق والمعتمد للعميل المحترم/{" "}
                <strong className="text-slate-900">{customer.name}</strong>، ويشمل جميع الفواتير والمبيعات السابقة المستخرجة والمطابقة من السجلات والأرشيف حتى تاريخه، والرصيد النهائي المعتمد هو{" "}
                <strong className={`font-sans text-xs ${totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatCurrency(Math.abs(totals.finalBalance))}
                </strong>{" "}
                ({totals.finalBalance > 0 ? "مطلوب سداده لصالح المؤسسة" : totals.finalBalance < 0 ? "رصيد دائن مستحق للعميل" : "الحساب مسدد بالكامل"}).
              </p>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                * ملاحظة قانونية: يعتبر هذا الكشف نهائياً وصحيحاً وموافقاً عليه من الطرفين في حال عدم ورود أي إخطار كتابي خلال 15 يوماً من تاريخ استلامه.
              </p>
            </div>

            {/* 6. Signatures & Stamp Zone */}
            {includeSignatures && (
              <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-center text-xs">
                {/* Accountant Signature */}
                <div className="space-y-6">
                  <p className="font-bold text-slate-700 text-[11px]">إعداد المحاسب المسؤول</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mx-4"></div>
                  <p className="text-[10px] text-slate-400">التوقيع والتاريخ</p>
                </div>

                {/* Management Stamp */}
                <div className="space-y-6 border-r border-l border-slate-200 px-2">
                  <p className="font-bold text-slate-700 text-[11px]">ختم واعتماد المؤسسة</p>
                  <div className="h-12 flex items-center justify-center">
                    <div className="w-16 h-12 border-2 border-blue-900/30 rounded-lg flex items-center justify-center text-[10px] font-bold text-blue-900/40 transform -rotate-6">
                      الختم الرسمي
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">الإدارة المالية</p>
                </div>

                {/* Customer Signature */}
                <div className="space-y-6">
                  <p className="font-bold text-slate-700 text-[11px]">توقيع واستلام العميل</p>
                  <div className="h-12 border-b border-dashed border-slate-300 mx-4"></div>
                  <p className="text-[10px] text-slate-400">الاسم والتوقيع</p>
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-sans">
              <span>نظام حسابي برو لإدارة الحسابات والمبيعات</span>
              <span>صفحة 1 من 1</span>
              <span>تاريخ الطباعة: {todayStr}</span>
            </div>

          </div>{/* End printable statement */}

        </div>{/* End scrollable container */}

        {/* Modal Bottom Footer (Screen Only) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs print:hidden shrink-0">
          <p className="text-slate-500">
            تم ضبط التنسيق ليلائم أوراق الطباعة القياسية <strong className="text-slate-800">A4 Portrait</strong> بدقة تامة.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>بدء الطباعة الآن</span>
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
