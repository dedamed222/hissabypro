import { useState, useEffect, useMemo, useRef } from "react";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { loadStoreData } from "@/utils/localStorage";
import { Customer, Invoice, Return, Creditor, Debtor, Product, StoreInfo } from "@/types";
import {
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  CheckCircle2,
  Calendar,
  Printer,
  User,
  Phone,
  ArrowUpDown,
  Building,
  HelpCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ShieldCheck,
  FileSpreadsheet
} from "lucide-react";
import ExportActions from "@/components/shared/ExportActions";
import { useLocale } from "@/hooks/useLocale";
import {
  getCustomers,
  getInvoices,
  getCreditors,
  getDebtors,
  getProducts,
  getReturns
} from "@/lib/database";

interface AccountTransaction {
  id: string;
  date: string;
  type: "invoice" | "return" | "creditor" | "debtor";
  description: string;
  productCode?: string;
  debit: number;
  credit: number;
  quantity?: number;
  balance?: number;
  status?: 'pending' | 'paid';
}

export default function AccountStatement() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<AccountTransaction[]>([]);

  const { t, locale, isRTL } = useLocale();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const storeData = loadStoreData();
      setStoreInfo(storeData.storeInfo || null);

      const [custs, invs, creds, debts, prods, rets] = await Promise.all([
        getCustomers(),
        getInvoices(),
        getCreditors(),
        getDebtors(),
        getProducts(),
        getReturns()
      ]);

      setCustomers(custs.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email,
        address: c.address,
        company: c.company,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })));

      const uniqueInvs = Array.from(new Map(invs.map((i: any) => [i.id, i])).values());
      const uniqueDebts = Array.from(new Map(debts.map((d: any) => [d.id, d])).values());
      const uniqueCreds = Array.from(new Map(creds.map((c: any) => [c.id, c])).values());
      const uniqueRets = Array.from(new Map(rets.map((r: any) => [r.id, r])).values());

      setInvoices(uniqueInvs.map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        customerId: i.customer_id,
        customerName: i.customer_name,
        date: i.date,
        total: i.total,
        status: i.status || "paid",
        type: i.type || "sales",
        items: i.invoice_items || [],
        products: [],
        paymentMethod: i.payment_method || "cash",
        createdAt: i.created_at || new Date().toISOString()
      })));

      setCreditors(uniqueCreds.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        amount: c.amount,
        date: c.date,
        productName: c.product_name,
        productCode: c.product_code,
        quantity: c.quantity,
        price: c.price,
        total: c.total,
        status: c.status || 'pending',
        createdAt: c.created_at || new Date().toISOString()
      })));

      setReturns(uniqueRets.map((r: any) => ({
        id: r.id,
        returnNumber: r.return_number,
        invoiceId: r.invoice_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        date: r.date,
        total: r.total,
        products: r.return_items || [],
        createdAt: r.created_at || new Date().toISOString()
      })));

      setDebtors(uniqueDebts.map((d: any) => ({
        id: d.id,
        name: d.name,
        debtorName: d.debtor_name || d.name,
        phone: d.phone || '',
        totalAmount: d.total_amount || 0,
        amount: d.amount || 0,
        date: d.date || '',
        status: d.status || 'pending',
        products: d.products || []
      })));

      setProducts(prods.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        cost: p.cost || 0,
        quantity: p.quantity || 0,
        lowStockThreshold: p.low_stock_threshold || 5,
        createdAt: p.created_at || new Date().toISOString()
      })));

    } catch (err) {
      console.error("Error loading statement data from Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      generateAccountStatement();
    }
  }, [selectedCustomer, startDate, endDate, transactionType, searchText, invoices, creditors, debtors, returns]);

  const generateAccountStatement = () => {
    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const allTransactions: AccountTransaction[] = [];

    // Add invoices (Customer owes us - Debit)
    invoices
      .filter((invoice: Invoice) => invoice.customerId === selectedCustomer)
      .forEach((invoice: Invoice) => {
        const items = invoice.items || [];
        const totalQuantity = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        const productCodes = items.map((item: any) => {
          const product = products.find(p => p.id === item.product_id || p.id === item.productId);
          return product?.code || '';
        }).filter(code => code).join(', ');

        allTransactions.push({
          id: invoice.id,
          date: invoice.date || '',
          type: "invoice",
          description: `فاتورة بيع رقم #${invoice.invoiceNumber}`,
          productCode: productCodes,
          debit: invoice.total,
          credit: 0,
          quantity: totalQuantity
        });
      });

    // Add returns (We owe customer - Credit)
    returns
      .filter((returnItem: Return) => returnItem.customerId === selectedCustomer)
      .forEach((returnItem: Return) => {
        const items = returnItem.products || [];
        const totalQuantity = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        const productCodes = items.map((item: any) => {
          const product = products.find(p => p.id === (item.product_id || item.productId));
          return product?.code || '';
        }).filter(code => code).join(', ');

        allTransactions.push({
          id: returnItem.id,
          date: returnItem.date || '',
          type: "return",
          description: `مرتجع بضاعة رقم #${returnItem.returnNumber}`,
          productCode: productCodes,
          debit: 0,
          credit: returnItem.total,
          quantity: totalQuantity
        });
      });

    // Add creditors (Customer paid us / We owe customer - Credit)
    creditors
      .filter((creditor: Creditor) =>
        (creditor.customer_id === selectedCustomer || (!creditor.customer_id && creditor.name === customer.name))
      )
      .forEach((creditor: Creditor) => {
        allTransactions.push({
          id: creditor.id,
          date: creditor.date || creditor.createdAt || '',
          type: "creditor",
          description: `دفعة سداد / استلام نقدي - ${creditor.productName || 'تسديد حساب'}`,
          productCode: creditor.productCode || '',
          debit: 0,
          credit: creditor.amount,
          quantity: creditor.quantity || 0,
          status: creditor.status
        });
      });

    // Add debtors (Customer owes us - Debit)
    debtors
      .filter((debtor: Debtor) =>
        (debtor.customer_id === selectedCustomer || (!debtor.customer_id && (debtor.name === customer.name || debtor.debtorName === customer.name)))
      )
      .forEach((debtor: Debtor) => {
        let totalQuantity = 0;
        let productCodes = '';

        const products_list = (debtor.products as any[]) || [];
        if (products_list.length > 0) {
          totalQuantity = products_list.reduce((sum, product) => sum + (Number(product.quantity) || 0), 0);
          productCodes = products_list.map(p => p.productCode || p.product_code).filter(code => code).join(', ');
        } else {
          totalQuantity = debtor.quantity || 0;
          productCodes = debtor.productCode || '';
        }

        allTransactions.push({
          id: debtor.id,
          date: debtor.date || '',
          type: "debtor",
          description: `قيد دين / شراء آجل - ${(debtor.products as any[])?.[0]?.productName || debtor.productName || 'مشتريات آجلة'}`,
          productCode: productCodes,
          debit: debtor.totalAmount || debtor.amount || 0,
          credit: 0,
          quantity: totalQuantity,
          status: debtor.status
        });
      });

    // Smart Deduplication
    const uniqueById = new Map<string, AccountTransaction>();

    allTransactions.forEach(t => {
      if (t.type === 'invoice' || t.type === 'return') {
        uniqueById.set(t.id, t);
      }
    });

    allTransactions.forEach(t => {
      if (t.type === 'debtor' || t.type === 'creditor') {
        if (!uniqueById.has(t.id)) {
          const isDuplicateOfInvoice = Array.from(uniqueById.values()).some(existing =>
            (existing.type === 'invoice' || existing.type === 'return') &&
            existing.date === t.date &&
            Math.abs(existing.debit - t.debit) < 0.01 &&
            Math.abs(existing.credit - t.credit) < 0.01
          );

          if (!isDuplicateOfInvoice) {
            uniqueById.set(t.id, t);
          }
        }
      }
    });

    const uniqueByLogicKey = new Map<string, AccountTransaction>();
    const finalTransactions: AccountTransaction[] = [];

    Array.from(uniqueById.values()).forEach(t => {
      const logicKey = `${t.type}-${t.date}-${t.debit}-${t.credit}-${t.description}`;
      if (!uniqueByLogicKey.has(logicKey)) {
        uniqueByLogicKey.set(logicKey, t);
        finalTransactions.push(t);
      }
    });

    // Sort chronologically
    finalTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let runningBalance = 0;
    const transactionsWithBalance = finalTransactions.map(transaction => {
      runningBalance += transaction.debit - transaction.credit;
      return {
        ...transaction,
        balance: runningBalance
      };
    });

    setTransactions(transactionsWithBalance);

    // Filter
    let filtered = transactionsWithBalance;

    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }
    if (transactionType !== "all") {
      filtered = filtered.filter(t => t.type === transactionType);
    }
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        (t.productCode && t.productCode.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTransactions(filtered);
  };

  const totals = useMemo(() => {
    const totalQuantity = filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);

    const finalBalance = filteredTransactions.length > 0
      ? filteredTransactions[filteredTransactions.length - 1].balance || 0
      : 0;

    const openingBalance = filteredTransactions.length > 0
      ? (filteredTransactions[0].balance || 0) - filteredTransactions[0].debit + filteredTransactions[0].credit
      : 0;

    return { totalQuantity, totalDebit, totalCredit, finalBalance, openingBalance };
  }, [filteredTransactions]);

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  const exportColumns = [
    { key: 'date', header: t('date'), render: (t: AccountTransaction) => formatDate(t.date) },
    { key: 'description', header: 'البيان والتفاصيل' },
    { key: 'productCode', header: t('productCode'), render: (t: AccountTransaction) => t.productCode || '-' },
    { key: 'quantity', header: t('quantity'), render: (item: AccountTransaction) => item.quantity?.toString() || '0' },
    { key: 'debit', header: 'مدين (المطلوب منه)', render: (item: AccountTransaction) => formatCurrency(item.debit) },
    { key: 'credit', header: 'دائن (المدفوع منه)', render: (item: AccountTransaction) => formatCurrency(item.credit) },
    { key: 'balance', header: 'الرصيد التراكمي', render: (item: AccountTransaction) => formatCurrency(item.balance || 0) }
  ];

  const handlePrintStatement = () => {
    window.print();
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'invoice':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
            <FileText size={11} />
            فاتورة بيع
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
            <TrendingDown size={11} />
            مرتجع
          </span>
        );
      case 'creditor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 size={11} />
            سداد / قبض
          </span>
        );
      case 'debtor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            <Clock size={11} />
            دين آجل
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Banner (Hidden on Print) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">كشف حساب العميل الشامل</h1>
            <p className="text-xs text-slate-500">
              تقرير مالي دقيق لجميع التعاملات، الفواتير، الديون، السدادات، والرصيد النهائي المستحق
            </p>
          </div>
        </div>

        {selectedCustomer && (
          <div className="flex items-center gap-2">
            <ExportActions
              data={filteredTransactions}
              filename={`statement_${selectedCustomerData?.name || 'customer'}`}
              title={`كشف حساب - ${selectedCustomerData?.name || ''}`}
              columns={exportColumns}
              totals={{
                totalQuantity: totals.totalQuantity,
                totalDebit: totals.totalDebit,
                totalCredit: totals.totalCredit,
                finalBalance: totals.finalBalance
              }}
            />
            <button
              onClick={handlePrintStatement}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all"
            >
              <Printer size={15} />
              <span>طباعة كشف الحساب</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Step 1: Customer Selection & Filter Bar ── */}
      <div className="gsc-card p-5 print:hidden space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-blue-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              تحديد العميل وفلترة كشف الحساب
            </h3>
          </div>
          {selectedCustomerData && (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-900">{selectedCustomerData.name}</span>
              {selectedCustomerData.phone && (
                <span className="text-slate-500 flex items-center gap-1 font-sans">
                  <Phone size={12} className="text-slate-400" />
                  {selectedCustomerData.phone}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Customer Dropdown */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              <span>اختر العميل *</span>
            </label>
            <div className="relative">
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-bold transition-all"
              >
                <option value="">-- اضغط لاختيار العميل من القائمة --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* Transaction Type Filter */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <ArrowUpDown size={13} className="text-slate-400" />
              <span>نوع المعاملات</span>
            </label>
            <div className="relative">
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all"
              >
                <option value="all">جميع العمليات المالية</option>
                <option value="invoice">فواتير البيع فقط</option>
                <option value="debtor">الديون الآجلة فقط</option>
                <option value="creditor">الدفعات والسدادات فقط</option>
                <option value="return">المرتجعات فقط</option>
              </select>
              <ChevronDown size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* Start Date */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <span>من تاريخ</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
            />
          </div>

          {/* End Date */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <span>إلى تاريخ</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
            />
          </div>
        </div>

        {/* Quick Search inside statement */}
        {selectedCustomer && (
          <div className="pt-2">
            <div className="relative">
              <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="البحث برقم الفاتورة، اسم المنتج، كود الصنف، أو البيان..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {!selectedCustomer ? (
        /* Empty State prompt */
        <div className="gsc-card p-12 text-center print:hidden">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <User size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">يرجى تحديد العميل لعرض كشف الحساب</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            اختر أحد العملاء المسجلين من القائمة المنسدلة في الأعلى لاستخراج حسابه المفصل وميزانه المالي
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI Summary Cards (The Statement Result Dashboard) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
            {/* Debit: Total Amount Customer Owes Us */}
            <div className="gsc-card p-4 flex items-center gap-3.5 border-rose-100">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrendingUp size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">إجمالي المدين (عليه)</p>
                <h3 className="text-xl font-black text-rose-600 mt-0.5 font-sans">{formatCurrency(totals.totalDebit)}</h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">مشتريات وفواتير</p>
              </div>
            </div>

            {/* Credit: Total Customer Paid Us */}
            <div className="gsc-card p-4 flex items-center gap-3.5 border-emerald-100">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingDown size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">إجمالي الدائن (له / سداداته)</p>
                <h3 className="text-xl font-black text-emerald-600 mt-0.5 font-sans">{formatCurrency(totals.totalCredit)}</h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">مدفوعات ومرتجعات</p>
              </div>
            </div>

            {/* Total Items Quantity */}
            <div className="gsc-card p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Package size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 truncate">مجموع الكميات</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{totals.totalQuantity}</h3>
                <p className="text-[11px] font-bold text-blue-600 mt-0.5">قطعة مستلمة ومباعة</p>
              </div>
            </div>

            {/* Net Final Balance Result */}
            <div className={`gsc-card p-4 flex items-center gap-3.5 border-2 ${
              totals.finalBalance > 0
                ? "border-rose-300 bg-rose-50/30"
                : totals.finalBalance < 0
                ? "border-emerald-300 bg-emerald-50/30"
                : "border-slate-200"
            }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                totals.finalBalance > 0 ? "bg-rose-600 text-white" : totals.finalBalance < 0 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                <DollarSign size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700 truncate">
                  {totals.finalBalance > 0 ? "صافي الرصيد (مطلوب منه)" : totals.finalBalance < 0 ? "صافي الرصيد (فائض له)" : "الحساب خالص ومتزن"}
                </p>
                <h3 className={`text-xl font-black mt-0.5 font-sans ${
                  totals.finalBalance > 0 ? "text-rose-700" : totals.finalBalance < 0 ? "text-emerald-700" : "text-slate-800"
                }`}>
                  {formatCurrency(Math.abs(totals.finalBalance))}
                </h3>
                <p className="text-[11px] font-bold mt-0.5">
                  {totals.finalBalance > 0 ? (
                    <span className="text-rose-600 font-extrabold">العميل مَدين بالمبلغ</span>
                  ) : totals.finalBalance < 0 ? (
                    <span className="text-emerald-600 font-extrabold">العميل دَائن بالمبلغ</span>
                  ) : (
                    <span className="text-slate-500">لا توجد مبالغ معلقة</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* ── Official Print Header (Only appears when printing) ── */}
          <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-6 font-sans">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900">{storeInfo?.name || 'مؤسسة حسابي برو التجارية'}</h1>
                <p className="text-xs text-slate-600 mt-1">{storeInfo?.address || 'العنوان الرئيسي'}</p>
                <p className="text-xs text-slate-600">الهاتف: {storeInfo?.phone || '---'}</p>
              </div>
              <div className="text-left">
                <h2 className="text-xl font-black text-blue-700 uppercase">كشف حساب رسمي</h2>
                <p className="text-xs text-slate-500 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                <p className="text-xs text-slate-500">الفترة: {startDate || 'البداية'} إلى {endDate || 'الآن'}</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-100 rounded-lg flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">اسم العميل:</span> <strong className="text-slate-900 text-sm">{selectedCustomerData?.name}</strong>
              </div>
              {selectedCustomerData?.phone && (
                <div>
                  <span className="text-slate-500">رقم الهاتف:</span> <strong className="text-slate-900">{selectedCustomerData.phone}</strong>
                </div>
              )}
              <div>
                <span className="text-slate-500">الرصيد النهائي:</span>{" "}
                <strong className={`text-sm ${totals.finalBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatCurrency(Math.abs(totals.finalBalance))} ({totals.finalBalance > 0 ? "مطلوب منه" : "دائن"})
                </strong>
              </div>
            </div>
          </div>

          {/* ── Main Ledger Table ── */}
          <div className="gsc-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-blue-600" />
                <span>حركات دفتر الأستاذ للعميل ({filteredTransactions.length} معاملة)</span>
              </h3>
              <span className="text-xs font-medium text-slate-500">
                الرصيد المحسوب: <strong className="text-slate-800 font-sans">{formatCurrency(Math.abs(totals.finalBalance))}</strong>
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-xs font-bold text-slate-700 mb-1">لا توجد حركات مسجلة لهذا العميل في النطاق المحدد</p>
                <p className="text-[11px] text-slate-400">جرب توسيع نطاق التاريخ أو تغيير نوع المعاملة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3.5">التاريخ</th>
                      <th className="py-3 px-3.5">نوع الحركة</th>
                      <th className="py-3 px-3.5">البيان والتفاصيل</th>
                      <th className="py-3 px-3.5 text-center">الكمية</th>
                      <th className="py-3 px-3.5 text-center bg-rose-50/50 text-rose-700">مدين (عليه) +</th>
                      <th className="py-3 px-3.5 text-center bg-emerald-50/50 text-emerald-700">دائن (له / سداد) -</th>
                      <th className="py-3 px-3.5 text-left bg-slate-100/60 font-black">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {/* Opening balance row if filtered by date */}
                    {startDate && totals.openingBalance !== 0 && (
                      <tr className="bg-blue-50/40 font-bold border-b border-blue-100">
                        <td className="py-2.5 px-3.5 text-xs text-slate-500">{startDate}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800 font-bold">
                            افتتاحي
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-800 font-semibold" colSpan={2}>
                          الرصيد الافتتاحي السابق حتى تاريخ {startDate}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans text-rose-700">
                          {totals.openingBalance > 0 ? formatCurrency(totals.openingBalance) : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans text-emerald-700">
                          {totals.openingBalance < 0 ? formatCurrency(Math.abs(totals.openingBalance)) : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-left font-sans font-black text-slate-900">
                          {formatCurrency(Math.abs(totals.openingBalance))}
                          <span className="text-[10px] text-slate-500 mr-1">
                            {totals.openingBalance > 0 ? "(عليه)" : "(له)"}
                          </span>
                        </td>
                      </tr>
                    )}

                    {filteredTransactions.map((tx) => {
                      const isDebit = tx.debit > 0;
                      const currentBal = tx.balance || 0;

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-xs font-medium text-slate-600 font-sans">
                            {tx.date}
                          </td>

                          <td className="py-3 px-3.5">
                            {getTransactionTypeBadge(tx.type)}
                          </td>

                          <td className="py-3 px-3.5">
                            <span className="font-bold text-slate-900 block">{tx.description}</span>
                            {tx.productCode && (
                              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                كود: {tx.productCode}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center font-bold font-sans text-slate-700">
                            {tx.quantity || '-'}
                          </td>

                          {/* Debit */}
                          <td className="py-3 px-3.5 text-center font-bold font-sans text-rose-600 bg-rose-50/20">
                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                          </td>

                          {/* Credit */}
                          <td className="py-3 px-3.5 text-center font-bold font-sans text-emerald-600 bg-emerald-50/20">
                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                          </td>

                          {/* Running Balance */}
                          <td className="py-3 px-3.5 text-left font-black font-sans bg-slate-50/40">
                            <div className="flex flex-col items-start">
                              <span className={`text-sm ${
                                currentBal > 0 ? "text-rose-700" : currentBal < 0 ? "text-emerald-700" : "text-slate-600"
                              }`}>
                                {formatCurrency(Math.abs(currentBal))}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {currentBal > 0 ? "عليه" : currentBal < 0 ? "له" : "خالص"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100/80 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-3.5 text-slate-800 text-sm">
                        المجاميع الكلية:
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-sans text-slate-800">
                        {totals.totalQuantity}
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-black font-sans text-rose-700 text-sm bg-rose-100/50">
                        {formatCurrency(totals.totalDebit)}
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-black font-sans text-emerald-700 text-sm bg-emerald-100/50">
                        {formatCurrency(totals.totalCredit)}
                      </td>
                      <td className="py-3.5 px-3.5 text-left font-black font-sans text-base bg-slate-200/60">
                        <span className={totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                          {formatCurrency(Math.abs(totals.finalBalance))}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Statement Detailed Explanation Box ── */}
          <div className="gsc-card p-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/70 print:border print:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" />
                  <span>الخلاصة المحاسبية لكشف الحساب</span>
                </h4>
                <p className="text-xs text-slate-600">
                  مجموع ما اشتراه العميل ({formatCurrency(totals.totalDebit)}) ناقص ما قام بسداده ({formatCurrency(totals.totalCredit)}).
                </p>
              </div>

              <div className="bg-white px-5 py-3 rounded-xl border border-blue-200 text-center shadow-xs">
                <p className="text-[11px] font-bold text-slate-500 mb-0.5">الحالة الختامية للحساب</p>
                <div className={`text-xl font-black font-sans ${totals.finalBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatCurrency(Math.abs(totals.finalBalance))}
                </div>
                <span className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                  totals.finalBalance > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {totals.finalBalance > 0 ? "مطلوب سداده من العميل" : totals.finalBalance < 0 ? "رصيد دائن للعميل" : "الحساب مسدد بالكامل"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
