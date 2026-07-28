import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadStoreData } from "@/utils/localStorage";
import { formatCurrency } from "@/utils/formatters";
import { Customer, Invoice, Return, Creditor, Debtor, Product } from "@/types";
import { FileText, Search, TrendingUp, TrendingDown, DollarSign, Package, CheckCircle2 } from "lucide-react";
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

  const { t, locale, isRTL, formatDate } = useLocale();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [custs, invs, creds, debts, prods, rets] = await Promise.all([
        getCustomers(),
        getInvoices(),
        getCreditors(),
        getDebtors(),
        getProducts(),
        getReturns()
      ]);

      setCustomers(custs.map(c => ({
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

      // ⚡ Deduplicate arrivals by ID to prevent technical duplicates from DB
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
        products: [], // Required by interface
        paymentMethod: i.payment_method || "cash", // Required by interface
        createdAt: i.created_at || new Date().toISOString() // Required by interface
      })));

      setCreditors(uniqueCreds.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '', // Required by interface
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
        phone: d.phone || '', // Fix: ensure string
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
        const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        const productCodes = items.map((item: any) => {
          const product = products.find(p => p.id === item.product_id || p.id === item.productId);
          return product?.code || '';
        }).filter(code => code).join(', ');

        allTransactions.push({
          id: invoice.id,
          date: invoice.date || '',
          type: "invoice",
          description: t('invoiceNoDescription').replace('{number}', invoice.invoiceNumber),
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
        const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const productCodes = items.map((item: any) => {
          const product = products.find(p => p.id === (item.product_id || item.productId));
          return product?.code || '';
        }).filter(code => code).join(', ');

        allTransactions.push({
          id: returnItem.id,
          date: returnItem.date || '',
          type: "return",
          description: t('returnNoDescription').replace('{number}', returnItem.returnNumber),
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
          description: t('paymentReceivedDescription').replace('{product}', creditor.productName || t('product')),
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
          totalQuantity = products_list.reduce((sum, product) => sum + (product.quantity || 0), 0);
          productCodes = products_list.map(p => p.productCode || p.product_code).filter(code => code).join(', ');
        } else {
          totalQuantity = debtor.quantity || 0;
          productCodes = debtor.productCode || '';
        }

        allTransactions.push({
          id: debtor.id,
          date: debtor.date || '',
          type: "debtor",
          description: t('debtToPayDescription').replace('{product}', (debtor.products as any[])?.[0]?.productName || debtor.productName || t('product')),
          productCode: productCodes,
          debit: debtor.totalAmount || debtor.amount || 0,
          credit: 0,
          quantity: totalQuantity,
          status: debtor.status
        });
      });

    // --- Smart Deduplication ---
    // Remove transactions that represent the same conceptual event across different source tables.
    // 1. Group by ID first (Deduplicate by unique ID across ALL types)
    const uniqueById = new Map<string, AccountTransaction>();

    // We prioritize Invoices and Returns first
    allTransactions.forEach(t => {
      if (t.type === 'invoice' || t.type === 'return') {
        uniqueById.set(t.id, t);
      }
    });

    // 2. Logic-based deduplication for Debtors/Creditors vs Invoices/Returns
    allTransactions.forEach(t => {
      if (t.type === 'debtor' || t.type === 'creditor') {
        // Only consider if not already present by ID
        if (!uniqueById.has(t.id)) {
          // Additional logic check: Is there an invoice on the same date with the exact same amount?
          // This prevents "Double Counting" an invoice that was also recorded as a debt.
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

    // 3. Prevent duplicate Invoice Numbers on the same day for the same customer
    const uniqueByLogicKey = new Map<string, AccountTransaction>();
    const finalTransactions: AccountTransaction[] = [];

    Array.from(uniqueById.values()).forEach(t => {
      // Key: Type-Date-Amount-Description (to be very sure it's a duplicate)
      const logicKey = `${t.type}-${t.date}-${t.debit}-${t.credit}-${t.description}`;
      if (!uniqueByLogicKey.has(logicKey)) {
        uniqueByLogicKey.set(logicKey, t);
        finalTransactions.push(t);
      }
    });

    const dedupedTransactions = finalTransactions;

    // Sort by date
    dedupedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = dedupedTransactions.map(transaction => {
      runningBalance += transaction.debit - transaction.credit;
      return {
        ...transaction,
        balance: runningBalance
      };
    });

    setTransactions(transactionsWithBalance);

    // Apply filters: date range, transaction type and search text
    let filtered = transactionsWithBalance;

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }

    // Filter by transaction type
    if (transactionType !== "all") {
      filtered = filtered.filter(t => t.type === transactionType);
    }

    // Filter by search text (search in description and product code)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        (t.productCode && t.productCode.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTransactions(filtered);
  };

  const calculateTotals = () => {
    const totalQuantity = filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);

    // The final balance should be the balance of the last transaction in the filtered list
    // This ensures it matches the running balance shown in the table
    const finalBalance = filteredTransactions.length > 0
      ? filteredTransactions[filteredTransactions.length - 1].balance || 0
      : 0;

    // Calculate opening balance if there's a start date
    const openingBalance = filteredTransactions.length > 0
      ? (filteredTransactions[0].balance || 0) - filteredTransactions[0].debit + filteredTransactions[0].credit
      : 0;

    return { totalQuantity, totalDebit, totalCredit, finalBalance, openingBalance };
  };

  const { totalQuantity, totalDebit, totalCredit, finalBalance, openingBalance } = calculateTotals();

  const exportColumns = [
    { key: 'date', header: t('date'), render: (t: AccountTransaction) => formatDate(t.date) },
    { key: 'description', header: t('description') },
    { key: 'productCode', header: t('productCode'), render: (t: AccountTransaction) => t.productCode || '-' },
    { key: 'quantity', header: t('quantity'), render: (item: AccountTransaction) => item.quantity?.toString() || '0' },
    { key: 'debit', header: t('debit'), render: (item: AccountTransaction) => formatCurrency(item.debit) },
    { key: 'credit', header: t('credit'), render: (item: AccountTransaction) => formatCurrency(item.credit) },
    { key: 'balance', header: t('runningBalance'), render: (item: AccountTransaction) => formatCurrency(item.balance || 0) }
  ];

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  return (
    <div className={`space-y-6 ${locale === 'ar' ? 'font-arabic' : 'font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          {t('accountStatementTitle')}
        </h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('filterAccountStatement')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label id="select-customer-label" className="block mb-2 font-medium">{t('selectCustomer')}</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger aria-labelledby="select-customer-label">
                  <SelectValue placeholder={t('selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer: Customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label id="transaction-type-label" className="block mb-2 font-medium">{t('transactionType') || 'نوع المعاملة'}</label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger aria-labelledby="transaction-type-label">
                  <SelectValue placeholder={t('allTransactions')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTransactions')}</SelectItem>
                  <SelectItem value="invoice">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-600" />
                      <span>{t('invoices')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="return">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-blue-600" />
                      <span>{t('returns')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="creditor">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>{t('creditors')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debtor">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span>{t('debtors')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="start-date" className="block mb-2 font-medium">{t('fromDate')}</label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block mb-2 font-medium">{t('toDate')}</label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="search-description" className="block mb-2 font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t('searchDescriptionPlaceholder').split('...')[0]}
            </label>
            <Input
              id="search-description"
              type="text"
              placeholder={t('searchDescriptionPlaceholder')}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="max-w-xl"
            />
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && filteredTransactions.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('accountStatementTitle')} - {selectedCustomerData?.name}
              </CardTitle>
              <ExportActions
                data={filteredTransactions}
                filename={`${t('accountStatementTitle').toLowerCase().replace(/\s+/g, '-')}-${selectedCustomerData?.name}`}
                title={`${t('accountStatementTitle')} - ${selectedCustomerData?.name}`}
                columns={exportColumns}
                totals={{
                  totalQuantity,
                  totalDebit,
                  totalCredit,
                  finalBalance
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full arab-table">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-gray-800`}>{t('date')}</th>
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-gray-800`}>{t('description')}</th>
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-gray-800`}>{t('productCode')}</th>
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-gray-800`}>{t('quantity')}</th>
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-red-700 bg-red-50`}>{t('debit')}</th>
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-green-700 bg-green-50`}>{t('credit')}</th>
                    <th className={`text-${isRTL ? 'right' : 'left'} p-3 font-bold text-gray-800`}>{t('runningBalance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {startDate && filteredTransactions.length > 0 && openingBalance !== 0 && (
                    <tr className="border-b bg-blue-50/30">
                      <td className="p-3 text-gray-700 font-medium" colSpan={4}>{t('openingBalance') || 'الرصيد الافتتاحي'}</td>
                      <td className="p-3 font-bold text-red-700">{openingBalance > 0 ? formatCurrency(openingBalance) : '-'}</td>
                      <td className="p-3 font-bold text-green-700">{openingBalance < 0 ? formatCurrency(Math.abs(openingBalance)) : '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${openingBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                            {formatCurrency(Math.abs(openingBalance))}
                          </span>
                          <Badge
                            variant={openingBalance > 0 ? "destructive" : "default"}
                            className={openingBalance > 0 ? "" : "bg-green-600 hover:bg-green-700"}
                          >
                            {openingBalance > 0 ? t('debtorStatus') : t('creditorStatus')}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredTransactions.map((transaction, index) => {
                    const isDebitTransaction = transaction.debit > 0;

                    return (
                      <tr
                        key={transaction.id}
                        className={`border-b transition-colors ${isDebitTransaction
                            ? 'bg-red-50/50 hover:bg-red-50'
                            : 'bg-green-50/50 hover:bg-green-50'
                          }`}
                      >
                        <td className="p-3 text-gray-700">{formatDate(transaction.date)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {transaction.type === 'invoice' && <TrendingUp className="w-4 h-4 text-red-600" />}
                            {transaction.type === 'return' && <TrendingDown className="w-4 h-4 text-blue-600" />}
                            {transaction.type === 'creditor' && <DollarSign className="w-4 h-4 text-green-600" />}
                            {transaction.type === 'debtor' && <Package className="w-4 h-4 text-orange-600" />}
                            <span className="font-medium">{transaction.description}</span>
                            {isDebitTransaction && (
                              <Badge variant="destructive" className="text-xs mx-2">{t('debit')}</Badge>
                            )}
                            {!isDebitTransaction && transaction.credit > 0 && (
                              <Badge className="text-xs bg-green-600 hover:bg-green-700 mx-2">{t('credit')}</Badge>
                            )}
                            {transaction.status === 'paid' && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-5 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> تم التسديد
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-sm">
                          {transaction.productCode ? (
                            <Badge variant="outline" className="text-xs">
                              {transaction.productCode}
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center font-medium">{transaction.quantity || 0}</td>
                        <td className="p-3 font-bold text-red-700">
                          {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                        </td>
                        <td className="p-3 font-bold text-green-700">
                          {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${transaction.balance! > 0 ? "text-red-700" : "text-green-700"}`}>
                              {formatCurrency(Math.abs(transaction.balance!))}
                            </span>
                            <Badge
                              variant={transaction.balance! > 0 ? "destructive" : "default"}
                              className={transaction.balance! > 0 ? "" : "bg-green-600 hover:bg-green-700"}
                            >
                              {transaction.balance! > 0 ? t('debtorStatus') : t('creditorStatus')}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr className="border-t-2 border-gray-400">
                    <td className="p-4 font-bold text-lg" colSpan={3}>{t('total')}</td>
                    <td className="p-4 font-bold text-center text-blue-700 text-lg">{totalQuantity}</td>
                    <td className="p-4 font-bold text-red-700 text-lg bg-red-50">{formatCurrency(totalDebit)}</td>
                    <td className="p-4 font-bold text-green-700 text-lg bg-green-50">{formatCurrency(totalCredit)}</td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`font-bold text-xl ${finalBalance > 0 ? "text-red-700" : finalBalance < 0 ? "text-green-700" : "text-gray-700"}`}>
                          {formatCurrency(Math.abs(finalBalance))}
                        </span>
                        {finalBalance !== 0 && (
                          <Badge
                            variant={finalBalance > 0 ? "destructive" : "default"}
                            className={`text-sm px-3 ${finalBalance > 0
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                              }`}
                          >
                            {finalBalance > 0 ? t('debtorLabel') : t('creditorLabel')}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">{t('totalQuantity')}</p>
                      <p className="text-xl font-bold text-blue-700">{totalQuantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-600 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-gray-600">{t('totalAmount')}</p>
                        <Badge variant="destructive" className="text-xs">{t('debit')}</Badge>
                      </div>
                      <p className="text-xl font-bold text-red-700">{formatCurrency(totalDebit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <TrendingDown className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-gray-600">{t('totalAmount')}</p>
                        <Badge className="text-xs bg-green-600 hover:bg-green-700">{t('credit')}</Badge>
                      </div>
                      <p className="text-xl font-bold text-green-700">{formatCurrency(totalCredit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br shadow-lg ${finalBalance > 0
                  ? "from-red-50 to-red-100 border-red-300"
                  : "from-green-50 to-green-100 border-green-300"
                }`}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 pb-3 border-b-2 border-gray-300">
                      <DollarSign className={`w-6 h-6 ${finalBalance > 0 ? "text-red-600" : "text-green-600"}`} />
                      <h3 className="text-lg font-bold text-gray-800">{t('netClientBalance')}</h3>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">{t('balanceStatusLabel')}</p>
                      <div className="flex items-center justify-center gap-2">
                        <Badge
                          variant={finalBalance > 0 ? "destructive" : "default"}
                          className={`text-base px-4 py-2 ${finalBalance > 0
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                            }`}
                        >
                          {finalBalance > 0 ? t('clientIsDebtor') : t('clientIsCreditor')}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-center bg-white/70 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">{t('balanceValueLabel')}</p>
                      <p className={`text-3xl font-bold ${finalBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                        {formatCurrency(Math.abs(finalBalance))}
                      </p>
                    </div>

                    <div className="text-center pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        {finalBalance > 0
                          ? t('amountOwedByCustomer')
                          : t('amountOwedToCustomer')
                        }
                      </p>
                    </div>

                    <div className="text-center text-xs text-gray-500 bg-gray-50 rounded p-2">
                      <p className="font-mono">
                        {t('total')} = {formatCurrency(totalDebit)} - {formatCurrency(totalCredit)} = {formatCurrency(Math.abs(finalBalance))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCustomer && filteredTransactions.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('noTransactionsFound')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
