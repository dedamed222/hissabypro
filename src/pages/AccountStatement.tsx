import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCurrency, formatDate, normalizeArabic } from "@/utils/formatters";
import { loadStoreData } from "@/utils/localStorage";
import { Customer, Invoice, Return, Creditor, Debtor, Product, StoreInfo, ProductMovement, Supplier } from "@/types";
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
  ChevronUp,
  ShieldCheck,
  FileSpreadsheet,
  Receipt,
  Layers,
  History,
  Loader2,
  Sparkles,
  Truck,
  ArrowRightLeft
} from "lucide-react";
import ExportActions from "@/components/shared/ExportActions";
import { useLocale } from "@/hooks/useLocale";
import ProfessionalStatementPrint, { UnifiedStatementParty } from "@/components/accountStatement/ProfessionalStatementPrint";
import {
  getCustomers,
  getInvoices,
  getCreditors,
  getDebtors,
  getProducts,
  getReturns,
  getProductMovementsDB,
  getSuppliers
} from "@/lib/database";

export interface UnifiedParty {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
  notes?: string;
  partyType: "customer" | "supplier" | "dual";
  customerId?: string;
  supplierId?: string;
}

interface AccountTransaction {
  id: string;
  date: string;
  type: "invoice" | "return" | "creditor" | "debtor" | "supply";
  description: string;
  productCode?: string;
  debit: number;
  credit: number;
  quantity?: number;
  balance?: number;
  status?: 'pending' | 'paid';
  invoiceNumber?: string;
  isArchive?: boolean;
  items?: Array<{
    productName: string;
    productCode?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export default function AccountStatement() {
  const { t, locale, isRTL, formatDate } = useLocale();
  const isFr = locale === 'fr';
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters & Selected State
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [partySearchInput, setPartySearchInput] = useState<string>("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<"all" | "customer" | "supplier" | "dual">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Raw Data Repositories
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parties, setParties] = useState<UnifiedParty[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productMovements, setProductMovements] = useState<ProductMovement[]>([]);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived Account Ledger State
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<AccountTransaction[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const storeData = loadStoreData();
      setStoreInfo(storeData.storeInfo || null);

      // 1. Fetch Supabase Data safely
      let dbCusts: any[] = [];
      let dbSups: any[] = [];
      let dbInvs: any[] = [];
      let dbCreds: any[] = [];
      let dbDebts: any[] = [];
      let dbProds: any[] = [];
      let dbRets: any[] = [];
      let dbMovements: any[] = [];

      try {
        [dbCusts, dbSups, dbInvs, dbCreds, dbDebts, dbProds, dbRets, dbMovements] = await Promise.all([
          getCustomers(),
          getSuppliers(),
          getInvoices(),
          getCreditors(),
          getDebtors(),
          getProducts(),
          getReturns(),
          getProductMovementsDB()
        ]);
      } catch (err) {
        console.warn("DB fetch failed, relying on local archive:", err);
      }

      // 2. Build Invoices List: DB + Local + Daily Sales
      const invMap = new Map<string, Invoice>();

      // From DB
      dbInvs.forEach((i: any) => {
        invMap.set(i.id, {
          id: i.id,
          invoiceNumber: i.invoice_number,
          customerId: i.customer_id,
          customerName: i.customer_name,
          date: i.date || (i.created_at ? i.created_at.split('T')[0] : ''),
          total: Number(i.total) || 0,
          status: i.status || "paid",
          type: i.type || "sales",
          items: (i.invoice_items || []).map((it: any) => ({
            productId: it.product_id,
            productName: it.product_name,
            productCode: "",
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || 0
          })),
          products: [],
          paymentMethod: i.payment_method || "cash",
          createdAt: i.created_at || new Date().toISOString()
        });
      });

      // From Local Invoices
      (storeData.invoices || []).forEach((i: any) => {
        if (!invMap.has(i.id)) {
          invMap.set(i.id, {
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            customerId: i.customerId,
            customerName: i.customerName,
            date: i.date || (i.createdAt ? i.createdAt.split('T')[0] : ''),
            total: Number(i.total) || 0,
            status: i.status || "paid",
            type: i.type || "sales",
            items: (i.items || []).map((it: any) => ({
              productId: it.productId,
              productName: it.productName,
              productCode: it.productCode || "",
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
              total: Number(it.total) || 0
            })),
            products: [],
            paymentMethod: i.paymentMethod || "cash",
            createdAt: i.createdAt || new Date().toISOString()
          });
        }
      });

      // From Daily Sales Archive
      (storeData.dailySales || []).forEach((ds: any) => {
        const saleInvoiceId = ds.id || `sale_${ds.date}_${ds.productId}`;
        const saleInvoiceNumber = `INV-SALE-${(ds.id || '').slice(0, 8).toUpperCase() || 'DAILY'}`;
        if (!invMap.has(saleInvoiceId)) {
          const sTotal = Number(ds.total) || (Number(ds.quantity || 1) * Number(ds.unitPrice || 0));
          invMap.set(saleInvoiceId, {
            id: saleInvoiceId,
            invoiceNumber: saleInvoiceNumber,
            customerId: ds.customerId,
            customerName: ds.customerName || "عميل عام",
            date: ds.date ? ds.date.split('T')[0] : new Date().toISOString().split('T')[0],
            total: sTotal,
            status: "paid",
            type: "sales",
            items: [
              {
                productId: ds.productId || "",
                productName: ds.productName || "صنف",
                productCode: ds.productCode || "",
                quantity: Number(ds.quantity) || 1,
                price: Number(ds.unitPrice) || sTotal,
                total: sTotal
              }
            ],
            products: [],
            paymentMethod: ds.paymentMethod || "cash",
            createdAt: ds.createdAt || ds.date || new Date().toISOString()
          });
        }
      });

      setInvoices(Array.from(invMap.values()));

      // 3. Creditors (Payments received)
      const credMap = new Map<string, Creditor>();
      (storeData.creditors || []).forEach((c: any) => credMap.set(c.id, c));
      dbCreds.forEach((c: any) => {
        credMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          amount: Number(c.amount) || 0,
          date: c.date,
          productName: c.product_name,
          productCode: c.product_code,
          quantity: c.quantity,
          price: c.price,
          total: c.total,
          status: c.status || 'pending',
          createdAt: c.created_at || new Date().toISOString()
        });
      });
      setCreditors(Array.from(credMap.values()));

      // 4. Debtors (Debts)
      const debtMap = new Map<string, Debtor>();
      (storeData.debtors || []).forEach((d: any) => debtMap.set(d.id, d));
      dbDebts.forEach((d: any) => {
        debtMap.set(d.id, {
          id: d.id,
          name: d.name,
          debtorName: d.debtor_name || d.name,
          phone: d.phone || '',
          totalAmount: Number(d.total_amount) || Number(d.amount) || 0,
          amount: Number(d.amount) || 0,
          date: d.date || '',
          status: d.status || 'pending',
          products: d.products || []
        });
      });
      setDebtors(Array.from(debtMap.values()));

      // 5. Returns
      const retMap = new Map<string, Return>();
      (storeData.returns || []).forEach((r: any) => retMap.set(r.id, r));
      dbRets.forEach((r: any) => {
        retMap.set(r.id, {
          id: r.id,
          returnNumber: r.return_number,
          invoiceId: r.invoice_id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          date: r.date,
          total: Number(r.total) || 0,
          products: r.return_items || [],
          createdAt: r.created_at || new Date().toISOString()
        });
      });
      setReturns(Array.from(retMap.values()));

      // 6. Products
      const prodMap = new Map<string, Product>();
      (storeData.products || []).forEach((p: any) => prodMap.set(p.id, p));
      dbProds.forEach((p: any) => {
        prodMap.set(p.id, {
          id: p.id,
          code: p.code,
          name: p.name,
          price: p.price,
          cost: p.cost || 0,
          quantity: p.quantity || 0,
          lowStockThreshold: p.low_stock_threshold || 5,
          createdAt: p.created_at || new Date().toISOString()
        });
      });
      setProducts(Array.from(prodMap.values()));

      // 7. Product Movements (Archive transactions)
      const movMap = new Map<string, ProductMovement>();
      (storeData.productMovements || []).forEach((m: any) => {
        if (!m.isDeleted) {
          movMap.set(m.id, {
            id: m.id,
            productId: m.productId || m.product_id,
            productName: m.productName || m.product_name || '',
            productCode: m.productCode || m.product_code || '',
            customerId: m.customerId || m.customer_id,
            customerName: m.customerName || m.customer_name || '',
            invoiceId: m.invoiceId || m.invoice_id,
            invoiceNumber: m.invoiceNumber || m.invoice_number || '',
            date: m.date || '',
            quantity: Number(m.quantity) || 0,
            unitPrice: Number(m.unitPrice || m.unit_price) || 0,
            total: Number(m.total) || 0,
            costPrice: Number(m.costPrice || m.cost_price) || 0,
            type: m.type || 'sale',
            isManualItem: m.isManualItem || m.is_manual_item || false,
            notes: m.notes || '',
            createdAt: m.createdAt || m.created_at || new Date().toISOString(),
            updatedAt: m.updatedAt || m.updated_at || new Date().toISOString(),
            isDeleted: false
          });
        }
      });

      dbMovements.forEach((m: any) => {
        if (!m.is_deleted) {
          movMap.set(m.id, {
            id: m.id,
            productId: m.product_id,
            productName: m.product_name || '',
            productCode: m.product_code || '',
            customerId: m.customer_id,
            customerName: m.customer_name || '',
            invoiceId: m.invoice_id,
            invoiceNumber: m.invoice_number || '',
            date: m.date || '',
            quantity: Number(m.quantity) || 0,
            unitPrice: Number(m.unit_price) || 0,
            total: Number(m.total) || 0,
            costPrice: Number(m.cost_price) || 0,
            type: m.type || 'sale',
            isManualItem: m.is_manual_item || false,
            notes: m.notes || '',
            createdAt: m.created_at || new Date().toISOString(),
            updatedAt: m.updated_at || new Date().toISOString(),
            isDeleted: false
          });
        }
      });

      const allMovements = Array.from(movMap.values());
      setProductMovements(allMovements);

      // 8. SUPPLIERS: Ingest from Supabase and Local
      const supMap = new Map<string, Supplier>();
      (storeData.suppliers || []).forEach((s: any) => {
        if (s.id && s.name) {
          supMap.set(s.id, {
            id: s.id,
            name: s.name.trim(),
            phone: s.phone || '',
            email: s.email,
            address: s.address,
            photoUrl: s.photoUrl,
            notes: s.notes,
            createdAt: s.createdAt || s.created_at || new Date().toISOString(),
            updatedAt: s.updatedAt || s.updated_at || new Date().toISOString()
          });
        }
      });

      dbSups.forEach((s: any) => {
        if (s.id && s.name) {
          supMap.set(s.id, {
            id: s.id,
            name: s.name.trim(),
            phone: s.phone || '',
            email: s.email,
            address: s.address,
            photoUrl: s.photo_url || s.photoUrl,
            notes: s.notes,
            createdAt: s.created_at || new Date().toISOString(),
            updatedAt: s.updated_at || new Date().toISOString()
          });
        }
      });

      const allSuppliers = Array.from(supMap.values());
      setSuppliers(allSuppliers);

      // 9. CUSTOMERS: Comprehensive aggregation from ALL sources including Archive
      const custMap = new Map<string, Customer>();

      // From customer registers
      (storeData.customers || []).forEach((c: any) => {
        if (c.id && c.name) {
          custMap.set(c.id, {
            id: c.id,
            name: c.name.trim(),
            phone: c.phone || '',
            email: c.email,
            address: c.address,
            company: c.company,
            notes: c.notes,
            createdAt: c.createdAt || c.created_at,
            updatedAt: c.updatedAt || c.updated_at
          });
        }
      });

      dbCusts.forEach((c: any) => {
        if (c.id && c.name) {
          custMap.set(c.id, {
            id: c.id,
            name: c.name.trim(),
            phone: c.phone || '',
            email: c.email,
            address: c.address,
            company: c.company,
            notes: c.notes,
            createdAt: c.created_at,
            updatedAt: c.updated_at
          });
        }
      });

      // Helper to add customer if missing by normalized name
      const addCustomerIfMissing = (cId?: string, cName?: string, phone?: string, company?: string) => {
        const cleanName = (cName || '').trim();
        if (!cleanName || cleanName === "عميل نقدي" || cleanName === "مبيعات يومية مباشرة" || cleanName === "عميل عام") return;

        const normClean = normalizeArabic(cleanName);
        const matchExisting = Array.from(custMap.values()).find(
          c => (cId && c.id === cId) || normalizeArabic(c.name) === normClean
        );

        if (!matchExisting) {
          const tempId = cId || `cust_${cleanName.replace(/\s+/g, '_')}`;
          custMap.set(tempId, {
            id: tempId,
            name: cleanName,
            phone: phone || '',
            company: company,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      };

      // Ingest from Invoices & Daily Sales
      invMap.forEach(inv => addCustomerIfMissing(inv.customerId, inv.customerName));
      (storeData.dailySales || []).forEach((ds: any) => addCustomerIfMissing(ds.customerId, ds.customerName));

      // Ingest from Archive Product Movements (CRUCIAL for archived transactions)
      allMovements.forEach(m => addCustomerIfMissing(m.customerId, m.customerName));

      // Ingest from Creditors & Debtors
      credMap.forEach(cred => addCustomerIfMissing((cred as any).customer_id || (cred as any).customerId, cred.name, cred.phone));
      debtMap.forEach(debt => addCustomerIfMissing((debt as any).customer_id || (debt as any).customerId, debt.name || debt.debtorName, debt.phone));

      // Ingest from Returns
      retMap.forEach(ret => addCustomerIfMissing(ret.customerId, ret.customerName));

      // Sort customers alphabetically
      const sortedCustomers = Array.from(custMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'ar')
      );
      setCustomers(sortedCustomers);

      // 10. UNIFIED PARTIES (Customers + Suppliers + Dual Parties)
      const partyList: UnifiedParty[] = [];
      const matchedSupplierIds = new Set<string>();

      // First pass: Process all customers and check if matching supplier exists
      sortedCustomers.forEach(cust => {
        const cNorm = normalizeArabic(cust.name);
        const cPhone = (cust.phone || '').trim().replace(/\s+/g, '');

        const matchedSup = allSuppliers.find(sup => {
          const sNorm = normalizeArabic(sup.name);
          const sPhone = (sup.phone || '').trim().replace(/\s+/g, '');
          if (sNorm && cNorm && sNorm === cNorm) return true;
          if (sPhone && cPhone && sPhone.length >= 7 && sPhone === cPhone) return true;
          return false;
        });

        if (matchedSup) {
          matchedSupplierIds.add(matchedSup.id);
          partyList.push({
            id: cust.id,
            name: cust.name,
            phone: cust.phone || matchedSup.phone,
            email: cust.email || matchedSup.email,
            address: cust.address || matchedSup.address,
            company: cust.company,
            notes: cust.notes || matchedSup.notes,
            partyType: "dual",
            customerId: cust.id,
            supplierId: matchedSup.id
          });
        } else {
          partyList.push({
            id: cust.id,
            name: cust.name,
            phone: cust.phone,
            email: cust.email,
            address: cust.address,
            company: cust.company,
            notes: cust.notes,
            partyType: "customer",
            customerId: cust.id
          });
        }
      });

      // Second pass: Add remaining suppliers who are not matched with a customer
      allSuppliers.forEach(sup => {
        if (!matchedSupplierIds.has(sup.id)) {
          partyList.push({
            id: sup.id,
            name: sup.name,
            phone: sup.phone,
            email: sup.email,
            address: sup.address,
            notes: sup.notes,
            partyType: "supplier",
            supplierId: sup.id
          });
        }
      });

      partyList.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      setParties(partyList);

      // Check query params (?partyId= or ?customerId= or ?supplierId=)
      const urlPartyId = searchParams.get("partyId") || searchParams.get("customerId") || searchParams.get("supplierId");
      if (urlPartyId) {
        const found = partyList.find(p => p.id === urlPartyId || p.customerId === urlPartyId || p.supplierId === urlPartyId);
        if (found) {
          setSelectedPartyId(found.id);
        }
      }

    } catch (err) {
      console.error("Error loading statement data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Build the complete transaction ledger for the selected party (Customer, Supplier, or Dual)
  useEffect(() => {
    if (!selectedPartyId) {
      setTransactions([]);
      setFilteredTransactions([]);
      return;
    }

    const party = parties.find(p => p.id === selectedPartyId);
    if (!party) return;

    // Normalizing party name for robust cross-source matching
    const targetNorm = normalizeArabic(party.name);
    const targetPhone = (party.phone || '').trim().replace(/\s+/g, '');

    const matchesParty = (itemCustomerId?: string, itemCustomerName?: string, itemPhone?: string) => {
      // 1. Direct ID match
      if (itemCustomerId && (
        itemCustomerId === party.id ||
        (party.customerId && itemCustomerId === party.customerId) ||
        (party.supplierId && itemCustomerId === party.supplierId)
      )) return true;

      // 2. Phone match
      if (itemPhone && targetPhone && targetPhone.length >= 7) {
        const cleanItemPhone = itemPhone.trim().replace(/\s+/g, '');
        if (cleanItemPhone === targetPhone) return true;
      }

      // 3. Name match
      if (!itemCustomerName) return false;
      const itemNorm = normalizeArabic(itemCustomerName);
      if (itemNorm && targetNorm) {
        if (itemNorm === targetNorm) return true;
        // Check partial match for company/customer title variations (if long enough)
        if (targetNorm.length >= 4 && itemNorm.length >= 4) {
          if (itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm)) return true;
        }
      }
      return false;
    };

    const allTransactions: AccountTransaction[] = [];

    // 1. INVOICES (Sales invoices: Party is buying as a customer -> Debit: owes us money)
    invoices
      .filter((inv) => matchesParty(inv.customerId, inv.customerName))
      .forEach((inv) => {
        const items = inv.items || [];
        const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        const productCodes = items
          .map(it => it.productCode || products.find(p => p.id === it.productId)?.code || '')
          .filter(Boolean)
          .join(', ');

        allTransactions.push({
          id: inv.id,
          date: inv.date ? inv.date.split('T')[0] : (inv.createdAt ? inv.createdAt.split('T')[0] : ''),
          type: "invoice",
          invoiceNumber: inv.invoiceNumber,
          description: isFr
            ? `Facture de vente #${inv.invoiceNumber || inv.id} (${items.length} articles)`
            : `فاتورة بيع رقم #${inv.invoiceNumber} (${items.length} أصناف)`,
          productCode: productCodes,
          debit: Number(inv.total) || 0,
          credit: 0,
          quantity: totalQuantity,
          isArchive: false,
          items: items.map(it => ({
            productName: it.productName || (isFr ? 'Article' : 'صنف'),
            productCode: it.productCode,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.price) || 0))
          }))
        });
      });

    // 2. RETURNS (Return on sales: Party returns goods -> Credit: reduces their debt / in their favor)
    returns
      .filter((ret) => matchesParty(ret.customerId, ret.customerName))
      .forEach((ret) => {
        const items = (ret.products as any[]) || [];
        const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

        allTransactions.push({
          id: ret.id,
          date: ret.date ? ret.date.split('T')[0] : (ret.createdAt ? ret.createdAt.split('T')[0] : ''),
          type: "return",
          invoiceNumber: ret.returnNumber,
          description: isFr
            ? `Retour sur vente #${ret.returnNumber}`
            : `مرتجع مبيعات رقم #${ret.returnNumber}`,
          productCode: '',
          debit: 0,
          credit: Number(ret.total) || 0,
          quantity: totalQuantity,
          isArchive: false,
          items: items.map((it: any) => ({
            productName: it.name || it.productName || (isFr ? 'Article retourné' : 'صنف مرتجع'),
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
            total: Number(it.total) || ((Number(it.quantity) || 1) * (Number(it.price) || 0))
          }))
        });
      });

    // 3. CREDITORS (Creditor / Payables: Amounts we owe him as a supplier, or credit balance / payments received)
    // Credit: In party's favor (له)
    creditors
      .filter((cred) => matchesParty((cred as any).customer_id || (cred as any).customerId, cred.name, cred.phone))
      .forEach((cred) => {
        const isSupplierEntity = party.partyType === "supplier" || (party.partyType === "dual" && cred.productName);
        const desc = cred.productName
          ? (isFr
              ? `Marchandise / Facture fournisseur - ${cred.productName} (En sa faveur)`
              : `بضاعة / مستحقات توريد مورد - ${cred.productName} (مستحق له)`)
          : (isFr
              ? `Règlement espèces / Reçu (En sa faveur)`
              : `دفعة نقدية / سند قبض (رصيد له)`);

        allTransactions.push({
          id: cred.id,
          date: cred.date ? cred.date.split('T')[0] : (cred.createdAt ? cred.createdAt.split('T')[0] : ''),
          type: isSupplierEntity ? "supply" : "creditor",
          description: desc,
          productCode: cred.productCode || '',
          debit: 0,
          credit: Number(cred.amount) || Number(cred.total) || 0,
          quantity: Number(cred.quantity) || 0,
          status: cred.status,
          isArchive: false
        });
      });

    // 4. DEBTORS (Debtor / Receivables: Party owes us money / purchases on credit)
    // Debit: Party owes us (عليه)
    debtors
      .filter((debt) => matchesParty((debt as any).customer_id || (debt as any).customerId, debt.name || debt.debtorName, debt.phone))
      .forEach((debt) => {
        const pList = (debt.products as any[]) || [];
        const totalQty = pList.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
        const pCodes = pList.map(p => p.productCode || p.product_code).filter(Boolean).join(', ');
        const debtAmount = Number(debt.totalAmount) || Number(debt.amount) || 0;

        allTransactions.push({
          id: debt.id,
          date: debt.date ? debt.date.split('T')[0] : '',
          type: "debtor",
          description: isFr
            ? `Dette à terme - Créance client (Dû par lui) - ${pList[0]?.productName || debt.productName || 'Marchandise'}`
            : `دين آجل - ذمة عميل (مطلوب منه) - ${pList[0]?.productName || debt.productName || 'بضاعة آجلة'}`,
          productCode: pCodes,
          debit: debtAmount,
          credit: 0,
          quantity: totalQty,
          status: debt.status,
          isArchive: false,
          items: pList.map((p: any) => ({
            productName: p.productName || p.name || (isFr ? 'Article' : 'صنف'),
            productCode: p.productCode,
            quantity: Number(p.quantity) || 1,
            price: Number(p.price) || 0,
            total: Number(p.total) || ((Number(p.quantity) || 1) * (Number(p.price) || 0))
          }))
        });
      });

    // 5. PRODUCT MOVEMENTS (Archive - key source for old/archived sales transactions)
    const existingInvoiceNumbers = new Set(
      allTransactions
        .filter(t => t.type === 'invoice' && t.invoiceNumber)
        .map(t => t.invoiceNumber!)
    );
    const existingInvoiceIds = new Set(
      allTransactions
        .filter(t => t.type === 'invoice')
        .map(t => t.id)
    );

    const customerMovements = productMovements.filter(m => {
      if (m.isDeleted) return false;
      if (!matchesParty(m.customerId || undefined, m.customerName)) return false;
      if (m.type !== 'sale') return false;
      if (m.invoiceNumber && existingInvoiceNumbers.has(m.invoiceNumber)) return false;
      if (m.invoiceId && existingInvoiceIds.has(m.invoiceId)) return false;
      return true;
    });

    const movByInvoice = new Map<string, ProductMovement[]>();
    customerMovements.forEach(m => {
      const key = m.invoiceNumber || m.invoiceId || m.id;
      if (!movByInvoice.has(key)) movByInvoice.set(key, []);
      movByInvoice.get(key)!.push(m);
    });

    movByInvoice.forEach((movs, invKey) => {
      const firstMov = movs[0];
      const invoiceTotal = movs.reduce((sum, m) => sum + (Number(m.total) || 0), 0);
      const totalQty = movs.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      const movDate = firstMov.date ? firstMov.date.split('T')[0] : '';
      const invNum = firstMov.invoiceNumber || invKey;
      const archiveId = `archive_${firstMov.invoiceId || invKey}`;

      allTransactions.push({
        id: archiveId,
        date: movDate,
        type: "invoice",
        invoiceNumber: invNum,
        description: isFr
          ? `Facture archive #${invNum} (${movs.length} articles)`
          : `فاتورة أرشيف #${invNum} (${movs.length} أصناف)`,
        productCode: movs.map(m => m.productCode).filter(Boolean).join(', '),
        debit: invoiceTotal,
        credit: 0,
        quantity: totalQty,
        isArchive: true,
        items: movs.map(m => ({
          productName: m.productName || (isFr ? 'Article' : 'صنف'),
          productCode: m.productCode || '',
          quantity: Number(m.quantity) || 1,
          price: Number(m.unitPrice) || 0,
          total: Number(m.total) || 0
        }))
      });
    });

    // 6. Return movements from productMovements (Archive returns)
    const existingReturnNumbers = new Set(
      returns
        .filter(r => matchesParty(r.customerId, r.customerName))
        .map(r => r.returnNumber)
    );

    const customerReturnMovements = productMovements.filter(m => {
      if (m.isDeleted) return false;
      if (!matchesParty(m.customerId || undefined, m.customerName)) return false;
      if (m.type !== 'return') return false;
      if (m.invoiceNumber && existingReturnNumbers.has(m.invoiceNumber)) return false;
      return true;
    });

    const retMovByInvoice = new Map<string, ProductMovement[]>();
    customerReturnMovements.forEach(m => {
      const key = m.invoiceNumber || m.invoiceId || m.id;
      if (!retMovByInvoice.has(key)) retMovByInvoice.set(key, []);
      retMovByInvoice.get(key)!.push(m);
    });

    retMovByInvoice.forEach((movs, retKey) => {
      const firstMov = movs[0];
      const retTotal = movs.reduce((sum, m) => sum + (Number(m.total) || 0), 0);
      const totalQty = movs.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      const movDate = firstMov.date ? firstMov.date.split('T')[0] : '';

      allTransactions.push({
        id: `ret_mov_${retKey}`,
        date: movDate,
        type: "return",
        invoiceNumber: retKey,
        description: isFr
          ? `Retour archive #${retKey} (${movs.length} articles)`
          : `مرتجع أرشيف #${retKey} (${movs.length} أصناف)`,
        productCode: movs.map(m => m.productCode).filter(Boolean).join(', '),
        debit: 0,
        credit: retTotal,
        quantity: totalQty,
        isArchive: true,
        items: movs.map(m => ({
          productName: m.productName || (isFr ? 'Article retourné' : 'صنف مرتجع'),
          productCode: m.productCode || '',
          quantity: Number(m.quantity) || 1,
          price: Number(m.unitPrice) || 0,
          total: Number(m.total) || 0
        }))
      });
    });

    // 7. Deduplication
    const uniqueById = new Map<string, AccountTransaction>();
    const seenInvoiceNumbers = new Map<string, string>();

    allTransactions.forEach(t => {
      if (t.type === 'invoice' || t.type === 'return') {
        if (t.invoiceNumber && seenInvoiceNumbers.has(t.invoiceNumber)) {
          if (!t.isArchive) {
            const oldId = seenInvoiceNumbers.get(t.invoiceNumber)!;
            uniqueById.delete(oldId);
            uniqueById.set(t.id, t);
            seenInvoiceNumbers.set(t.invoiceNumber, t.id);
          }
        } else {
          uniqueById.set(t.id, t);
          if (t.invoiceNumber) seenInvoiceNumbers.set(t.invoiceNumber, t.id);
        }
      } else {
        uniqueById.set(t.id, t);
      }
    });

    const finalTransactions = Array.from(uniqueById.values());

    // Sort chronologically ascending
    finalTransactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    // Calculate rolling running balance across all transactions:
    // Balance = Debit (what he owes us) - Credit (what is in his favor)
    // If balance > 0 => He is Debtor (عليه)
    // If balance < 0 => He is Creditor (له)
    let rollingBalance = 0;
    const transactionsWithBalance = finalTransactions.map(transaction => {
      rollingBalance += transaction.debit - transaction.credit;
      return {
        ...transaction,
        balance: rollingBalance
      };
    });

    setTransactions(transactionsWithBalance);

    // Apply user filters
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
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchLower)) ||
        (t.productCode && t.productCode.toLowerCase().includes(searchLower)) ||
        (t.items && t.items.some(it => it.productName.toLowerCase().includes(searchLower)))
      );
    }

    setFilteredTransactions(filtered);
  }, [selectedPartyId, startDate, endDate, transactionType, searchText, invoices, creditors, debtors, returns, parties, products, productMovements, locale]);

  // Accurate Financial Totals
  const totals = useMemo(() => {
    const totalQuantity = filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalDebit = filteredTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = filteredTransactions.reduce((sum, t) => sum + t.credit, 0);

    // Opening Balance: Exact sum of all prior transactions strictly before startDate
    const openingBalance = startDate
      ? transactions
          .filter(t => t.date < startDate)
          .reduce((sum, t) => sum + (t.debit - t.credit), 0)
      : 0;

    // Final balance at the end of the filtered period
    const finalBalance = openingBalance + totalDebit - totalCredit;

    // Overall party balance across all history
    const allTimeBalance = transactions.length > 0
      ? transactions[transactions.length - 1].balance || 0
      : 0;

    return { totalQuantity, totalDebit, totalCredit, finalBalance, openingBalance, allTimeBalance };
  }, [filteredTransactions, transactions, startDate]);

  const selectedPartyData = parties.find(p => p.id === selectedPartyId);

  // Filtered party list for search & type selection
  const searchableParties = useMemo(() => {
    let result = parties;
    if (partyTypeFilter !== "all") {
      result = result.filter(p => p.partyType === partyTypeFilter);
    }
    if (!partySearchInput.trim()) return result;

    const normSearch = normalizeArabic(partySearchInput);
    return result.filter(p =>
      normalizeArabic(p.name).includes(normSearch) ||
      (p.phone && p.phone.includes(partySearchInput)) ||
      (p.company && normalizeArabic(p.company).includes(normSearch))
    );
  }, [parties, partySearchInput, partyTypeFilter]);

  const exportColumns = [
    { key: 'date', header: t('date') || (isFr ? 'Date' : 'التاريخ'), render: (t: AccountTransaction) => formatDate(t.date) },
    { key: 'invoiceNumber', header: isFr ? 'N° Réf / Facture' : 'رقم الفاتورة/المستند', render: (t: AccountTransaction) => t.invoiceNumber || '-' },
    { key: 'description', header: isFr ? 'Libellé & Détails' : 'البيان والتفاصيل' },
    { key: 'quantity', header: t('quantity') || (isFr ? 'Quantité' : 'الكمية'), render: (item: AccountTransaction) => item.quantity?.toString() || '0' },
    { key: 'debit', header: isFr ? 'Débit (Dû par le client)' : 'مدين (المطلوب منه)', render: (item: AccountTransaction) => formatCurrency(item.debit) },
    { key: 'credit', header: isFr ? 'Crédit (En sa faveur)' : 'دائن (المستحق له)', render: (item: AccountTransaction) => formatCurrency(item.credit) },
    { key: 'balance', header: isFr ? 'Solde Cumulé' : 'الرصيد التراكمي', render: (item: AccountTransaction) => formatCurrency(item.balance || 0) }
  ];

  const handlePrintStatement = () => {
    setIsPrintModalOpen(true);
  };

  const toggleInvoiceExpand = (id: string) => {
    setExpandedInvoiceId(prev => prev === id ? null : id);
  };

  const getTransactionTypeBadge = (type: string, isArchive?: boolean) => {
    switch (type) {
      case 'invoice':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
            isArchive
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
              : 'bg-blue-50 text-blue-700 border border-blue-200/60'
          }`}>
            {isArchive ? <History size={11} /> : <FileText size={11} />}
            {isArchive ? (isFr ? 'Facture Archive' : 'فاتورة أرشيف') : (isFr ? 'Facture Vente' : 'فاتورة بيع')}
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
            <TrendingDown size={11} />
            {isArchive ? (isFr ? 'Retour Archive' : 'مرتجع أرشيف') : (isFr ? 'Retour' : 'مرتجع')}
          </span>
        );
      case 'creditor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 size={11} />
            {isFr ? 'Règlement / Acompte' : 'سداد / سند قبض'}
          </span>
        );
      case 'debtor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200/60">
            <Clock size={11} />
            {isFr ? 'Créance à terme (Dû)' : 'دين آجل (مطلوب منه)'}
          </span>
        );
      case 'supply':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            <Truck size={11} />
            {isFr ? 'Approvisionnement (Lui)' : 'فاتورة توريد (له)'}
          </span>
        );
      default:
        return null;
    }
  };

  const getPartyTypeBadge = (partyType: "customer" | "supplier" | "dual") => {
    switch (partyType) {
      case "dual":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
            <ArrowRightLeft size={11} />
            <span>{isFr ? "Client & Fournisseur (Compensé)" : "عميل ومورد (مقاصة موحدة)"}</span>
          </span>
        );
      case "supplier":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Truck size={11} />
            <span>{isFr ? "Fournisseur" : "مورد"}</span>
          </span>
        );
      case "customer":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
            <User size={11} />
            <span>{isFr ? "Client" : "عميل"}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Banner (Hidden on Print) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{isFr ? "Grand Livre & Relevé de Compte Unifié" : "كشف الحساب المالي الموحد"}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {isFr ? "Clients & Fournisseurs" : "عملاء وموردين ومقاصة"}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              {isFr
                ? "Le référentiel unique pour connaître la situation financière exacte de tout tiers (client, fournisseur ou compte mixte) avec calcul automatique du solde et compensation"
                : "المرجع الشامل لمعرفة الموقف المالي الحقيقي لأي طرف (عميل، مورد، أو طرف مشترك) مع احتساب الفواتير والديون والمقاصة وتحديد الصافي بدقة"}
            </p>
          </div>
        </div>

        {selectedPartyData && (
          <div className="flex items-center gap-2">
            <ExportActions
              data={filteredTransactions}
              filename={`statement_${selectedPartyData?.name || 'party'}`}
              title={isFr ? `Relevé de compte - ${selectedPartyData?.name || ''}` : `كشف حساب - ${selectedPartyData?.name || ''}`}
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>{isFr ? "Aperçu & Impression du relevé" : "معاينة وطباعة كشف الحساب"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Loading Skeleton / Indicator ── */}
      {isLoading ? (
        <div className="gsc-card p-12 text-center print:hidden">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-3 animate-pulse">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {isFr ? "Chargement et synchronisation des comptes et de l'archive..." : "جاري تحميل واستجلاب بيانات الحسابات والأرشيف..."}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isFr ? "Consolidation des factures, mouvements fournisseurs, dettes et règlements" : "يتم دمج الفواتير السابقة وحركات الأرشيف والتوريدات والديون والمدفوعات"}
          </p>
        </div>
      ) : (
        <>
          {/* ── Step 1: Party Selection & Filter Bar ── */}
          <div className="gsc-card p-5 print:hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-blue-600" />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  {isFr
                    ? `Recherche et sélection du tiers (${parties.length} comptes enregistrés)`
                    : `البحث وتحديد الطرف المالي (${parties.length} حساب مسجل)`}
                </h3>
              </div>
              {selectedPartyData && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {getPartyTypeBadge(selectedPartyData.partyType)}
                  <span className="font-bold text-slate-900 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                    {selectedPartyData.name}
                  </span>
                  {selectedPartyData.phone && (
                    <span className="text-slate-500 flex items-center gap-1 font-sans">
                      <Phone size={12} className="text-slate-400" />
                      {selectedPartyData.phone}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Party Type Filter (Tabs) */}
              <div className="md:col-span-12 flex items-center gap-2 pb-1 border-b border-slate-100/60 overflow-x-auto text-xs">
                <span className="text-slate-500 font-bold whitespace-nowrap">
                  {isFr ? "Filtrer par rôle :" : "تصنيف الأطراف:"}
                </span>
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("all")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    partyTypeFilter === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {isFr ? `Tous (${parties.length})` : `الكل (${parties.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("customer")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    partyTypeFilter === "customer"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <User size={12} />
                  <span>{isFr ? "Clients uniquement" : "عملاء فقط"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("supplier")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    partyTypeFilter === "supplier"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  <Truck size={12} />
                  <span>{isFr ? "Fournisseurs uniquement" : "موردون فقط"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyTypeFilter("dual")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    partyTypeFilter === "dual"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  <ArrowRightLeft size={12} />
                  <span>{isFr ? "Clients & Fournisseurs (Mixtes)" : "عملاء وموردون معاً"}</span>
                </button>
              </div>

              {/* Party Selector with Quick Search Input */}
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <span>{isFr ? "Sélectionner le tiers (Client / Fournisseur) *" : "اختر الطرف (عميل / مورد) *"}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {searchableParties.length} {isFr ? "disponibles" : "متاح"}
                  </span>
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-bold transition-all"
                    >
                      <option value="">
                        {isFr
                          ? `-- Cliquez pour choisir (${searchableParties.length}) --`
                          : `-- اضغط لاختيار الطرف من القائمة (${searchableParties.length}) --`}
                      </option>
                      {searchableParties.map((p) => {
                        const typeTag = p.partyType === "dual" ? "[عميل ومورد]" : p.partyType === "supplier" ? "[مورد]" : "[عميل]";
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} {typeTag} {p.company ? `(${p.company})` : ''} {p.phone ? `- ${p.phone}` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown size={15} className={`absolute ${isRTL ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`} />
                  </div>

                  {/* Party Quick Search input */}
                  <div className="relative">
                    <Search size={13} className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} />
                    <input
                      type="text"
                      placeholder={isFr ? "Filtrer par nom, téléphone ou société..." : "بحث سريع بالاسم، رقم الهاتف، أو اسم الشركة..."}
                      value={partySearchInput}
                      onChange={(e) => setPartySearchInput(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 text-xs bg-white text-slate-700 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                  </div>
                </div>
              </div>

              {/* Transaction Type Filter */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ArrowUpDown size={13} className="text-slate-400" />
                  <span>{isFr ? "Type d'opération" : "نوع المعاملات"}</span>
                </label>
                <div className="relative">
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none font-medium transition-all"
                  >
                    <option value="all">{isFr ? "Toutes les opérations financières" : "جميع العمليات المالية والفواتير"}</option>
                    <option value="invoice">{isFr ? "Factures de vente et archives" : "فواتير المبيعات والأرشيف"}</option>
                    <option value="supply">{isFr ? "Approvisionnements et livraisons (Fournisseur)" : "فواتير التوريد وبضائع المورد"}</option>
                    <option value="debtor">{isFr ? "Créances clients (Dû par lui)" : "ديون العملاء (مطلوب منه)"}</option>
                    <option value="creditor">{isFr ? "Règlements et encaissements" : "الدفعات والسدادات"}</option>
                    <option value="return">{isFr ? "Retours marchandises" : "المرتجعات"}</option>
                  </select>
                  <ChevronDown size={15} className={`absolute ${isRTL ? 'left-3.5' : 'right-3.5'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`} />
                </div>
              </div>

              {/* Start Date */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{isFr ? "Du" : "من تاريخ"}</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
                />
              </div>

              {/* End Date */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{isFr ? "Au" : "إلى تاريخ"}</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans font-medium transition-all"
                />
              </div>
            </div>

            {/* Quick Search in transactions */}
            {selectedPartyId && (
              <div className="pt-2 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-slate-400`} />
                  <input
                    type="text"
                    placeholder={isFr ? "Recherche rapide par n° facture, désignation ou libellé..." : "بحث سريع برقم الفاتورة، اسم الصنف، أو البيان..."}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-9 pl-3.5' : 'pl-9 pr-3.5'} py-2 text-xs bg-white text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium`}
                  />
                </div>
                {(startDate || endDate || transactionType !== 'all' || searchText) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setTransactionType('all');
                      setSearchText('');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    {isFr ? "Réinitialiser les filtres" : "إعادة تعيين الفلاتر"}
                  </button>
                )}
              </div>
            )}
          </div>

          {!selectedPartyId ? (
            <div className="gsc-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {isFr ? "Veuillez sélectionner un compte pour afficher son relevé" : "يرجى اختيار الحساب لعرض كشف حسابه وموقفه المالي"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isFr
                  ? "Choisissez un client ou un fournisseur dans la liste ci-dessus pour extraire toutes ses factures, mouvements de stock, dettes et règlements avec le calcul automatique de compensation."
                  : "اختر العميل أو المورد من القائمة المنسدلة بالأعلى لاستخراج كافة فواتيره وحركاته المالية والتوريدات والديون مع إجراء المقاصة وتحديد هل هو مدين أم دائن بدقة."}
              </p>
            </div>
          ) : (
            <>
              {/* ── Summary Metrics Cards (Hidden on Print) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
                {/* Debit */}
                <div className="gsc-card p-4 flex items-center gap-3.5 border-rose-100">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {isFr ? "Total Débit (Dû / عليه)" : "إجمالي المدين (عليه)"}
                    </p>
                    <h3 className="text-xl font-black text-rose-600 mt-0.5 font-sans">{formatCurrency(totals.totalDebit)}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {isFr ? "Factures d'achats et dettes" : "فواتير مبيعات وديون مطلوبة منه"}
                    </p>
                  </div>
                </div>

                {/* Credit */}
                <div className="gsc-card p-4 flex items-center gap-3.5 border-emerald-100">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingDown size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {isFr ? "Total Crédit (En sa faveur / له)" : "إجمالي الدائن (له)"}
                    </p>
                    <h3 className="text-xl font-black text-emerald-600 mt-0.5 font-sans">{formatCurrency(totals.totalCredit)}</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {isFr ? "Règlements et approvisionnements" : "مدفوعات ومستحقات توريد له"}
                    </p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="gsc-card p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Package size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500 truncate">
                      {isFr ? "Total des pièces" : "مجموع الكميات"}
                    </p>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{totals.totalQuantity}</h3>
                    <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                      {isFr ? "unités enregistrées" : "قطعة مسجلة بالفترة"}
                    </p>
                  </div>
                </div>

                {/* Net Final Balance with Explicit Clear Position */}
                <div className={`gsc-card p-4 flex items-center gap-3.5 border-2 ${
                  totals.finalBalance > 0
                    ? "border-rose-400 bg-rose-50/40"
                    : totals.finalBalance < 0
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-200"
                }`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    totals.finalBalance > 0 ? "bg-rose-600 text-white" : totals.finalBalance < 0 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    <DollarSign size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {totals.finalBalance > 0
                        ? (isFr ? "Position : DÉBITEUR (Dû par lui)" : "الموقف المالي: مَدين (مطلوب منه)")
                        : totals.finalBalance < 0
                        ? (isFr ? "Position : CRÉDITEUR (En sa faveur)" : "الموقف المالي: دَائن (مستحق له)")
                        : (isFr ? "Compte soldé et équilibré" : "الحساب خالص ومتزن")}
                    </p>
                    <h3 className={`text-xl font-black mt-0.5 font-sans ${
                      totals.finalBalance > 0 ? "text-rose-700" : totals.finalBalance < 0 ? "text-emerald-700" : "text-slate-800"
                    }`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                    </h3>
                    <p className="text-[11px] font-bold mt-0.5">
                      {totals.finalBalance > 0 ? (
                        <span className="text-rose-700 font-extrabold flex items-center gap-1">
                          <span>{isFr ? "🔴 Le tiers nous doit ce montant" : "🔴 مطلوب سداده من الطرف لصالحنا"}</span>
                        </span>
                      ) : totals.finalBalance < 0 ? (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                          <span>{isFr ? "🟢 Nous lui devons ce montant (Excédent)" : "🟢 مستحق للطرف في ذمتنا (فائض له)"}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {isFr ? "⚪ Aucun solde en suspens" : "⚪ الحساب متزن تماماً (0)"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Official Print Header (Only visible on print) ── */}
              <div className="hidden print:block p-4 border-b-2 border-slate-900 mb-6 font-sans">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">{storeInfo?.name || (isFr ? 'Hissaby Pro SARL' : 'مؤسسة حسابي برو التجارية')}</h1>
                    <p className="text-xs text-slate-600 mt-1">{storeInfo?.address || (isFr ? 'Siège Principal' : 'العنوان الرئيسي')}</p>
                    <p className="text-xs text-slate-600">{isFr ? 'Tél : ' : 'الهاتف: '}{storeInfo?.phone || '---'}</p>
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-black text-blue-700 uppercase">
                      {isFr ? "Relevé de Compte Officiel Détaillé" : "كشف حساب مالي تفصيلي رسمي"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {isFr ? "Date d'impression : " : "تاريخ الطباعة: "}
                      {new Date().toLocaleDateString(isFr ? 'fr-FR' : 'ar-EG')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isFr ? "Période : " : "الفترة: "}
                      {startDate || (isFr ? 'Début' : 'البداية')} {isFr ? 'au' : 'إلى'} {endDate || (isFr ? 'Présent' : 'الآن')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-100 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500">{isFr ? "Tiers : " : "اسم الطرف: "}</span>
                    <strong className="text-slate-900 text-sm">{selectedPartyData?.name}</strong>{" "}
                    <span className="text-[11px] font-bold text-blue-700">
                      ({selectedPartyData?.partyType === "dual" ? (isFr ? "Client & Fournisseur" : "عميل ومورد") : selectedPartyData?.partyType === "supplier" ? (isFr ? "Fournisseur" : "مورد") : (isFr ? "Client" : "عميل")})
                    </span>
                  </div>
                  {selectedPartyData?.phone && (
                    <div>
                      <span className="text-slate-500">{isFr ? "Téléphone : " : "رقم الهاتف: "}</span>
                      <strong className="text-slate-900">{selectedPartyData.phone}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">{isFr ? "Situation finale : " : "الموقف المالي النهائي: "}</span>{" "}
                    <strong className={`text-sm ${totals.finalBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatCurrency(Math.abs(totals.finalBalance))} ({totals.finalBalance > 0 ? (isFr ? "Débiteur (Dû par lui)" : "مَدين (مطلوب منه)") : totals.finalBalance < 0 ? (isFr ? "Créditeur (En sa faveur)" : "دَائن (مستحق له)") : (isFr ? "Équilibré" : "متزن")})
                    </strong>
                  </div>
                </div>
              </div>

              {/* ── Main Ledger Table ── */}
              <div className="gsc-card overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-blue-600" />
                    <span>
                      {isFr
                        ? `Grand livre des opérations (${filteredTransactions.length} mouvements)`
                        : `دفتر حركات ومعاملات الطرف (${filteredTransactions.length} حركة مسجلة)`}
                    </span>
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    {isFr
                      ? "Cliquez sur une facture pour afficher le détail complet de ses articles"
                      : "انقر على أي فاتورة لاستعراض أصنافها وتفاصيلها الكاملة"}
                  </span>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-xs font-bold text-slate-700 mb-1">
                      {isFr
                        ? "Aucun mouvement enregistré pour ce compte dans la période sélectionnée"
                        : "لا توجد حركات مسجلة لهذا الحساب في النطاق المحدد"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isFr
                        ? "Essayez d'élargir la plage de dates ou de réinitialiser les filtres"
                        : "جرب توسيع نطاق التاريخ أو إعادة تعيين الفلاتر"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse text-xs`}>
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <th className="py-3 px-3.5">{isFr ? "Date" : "التاريخ"}</th>
                          <th className="py-3 px-3.5">{isFr ? "Type" : "نوع المعاملة"}</th>
                          <th className="py-3 px-3.5">{isFr ? "N° Réf / Facture" : "رقم المستند / الفاتورة"}</th>
                          <th className="py-3 px-3.5">{isFr ? "Libellé & Articles" : "البيان والأصناف"}</th>
                          <th className="py-3 px-3.5 text-center">{isFr ? "Qté" : "الكمية"}</th>
                          <th className="py-3 px-3.5 text-center bg-rose-50/50 text-rose-700">
                            {isFr ? "Débit (+ عليه)" : "مدين (عليه) +"}
                          </th>
                          <th className="py-3 px-3.5 text-center bg-emerald-50/50 text-emerald-700">
                            {isFr ? "Crédit (- له)" : "دائن (له) -"}
                          </th>
                          <th className={`py-3 px-3.5 ${isRTL ? 'text-left' : 'text-right'} bg-slate-100/60 font-black`}>
                            {isFr ? "Solde Cumulé" : "الرصيد التراكمي"}
                          </th>
                          <th className="py-3 px-2 text-center print:hidden">{isFr ? "Détails" : "تفاصيل"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {/* Opening Balance Row */}
                        {startDate && totals.openingBalance !== 0 && (
                          <tr className="bg-blue-50/40 font-bold border-b border-blue-100">
                            <td className="py-2.5 px-3.5 text-xs text-slate-500 font-sans">{startDate}</td>
                            <td className="py-2.5 px-3.5">
                              <span className="px-2 py-0.5 rounded text-[11px] bg-blue-100 text-blue-800 font-bold">
                                {isFr ? "Solde Antérieur" : "رصيد سابق"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-xs text-slate-500">---</td>
                            <td className="py-2.5 px-3.5 text-slate-800 font-semibold" colSpan={2}>
                              {isFr
                                ? `Solde d'ouverture reporté jusqu'au ${startDate}`
                                : `الرصيد الافتتاحي المنقول السابق حتى تاريخ ${startDate}`}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-sans text-rose-700">
                              {totals.openingBalance > 0 ? formatCurrency(totals.openingBalance) : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-sans text-emerald-700">
                              {totals.openingBalance < 0 ? formatCurrency(Math.abs(totals.openingBalance)) : '-'}
                            </td>
                            <td className={`py-2.5 px-3.5 ${isRTL ? 'text-left' : 'text-right'} font-sans font-black text-slate-900`}>
                              {formatCurrency(Math.abs(totals.openingBalance))}
                              <span className="text-[10px] text-slate-500 mr-1 ml-1">
                                {totals.openingBalance > 0 ? (isFr ? "(Dû/عليه)" : "(عليه)") : (isFr ? "(Crédit/له)" : "(له)")}
                              </span>
                            </td>
                            <td className="print:hidden"></td>
                          </tr>
                        )}

                        {filteredTransactions.map((tx) => {
                          const currentBal = tx.balance || 0;
                          const isExpanded = expandedInvoiceId === tx.id;
                          const hasItems = tx.items && tx.items.length > 0;

                          return (
                            <React.Fragment key={tx.id}>
                              <tr
                                onClick={() => hasItems && toggleInvoiceExpand(tx.id)}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  hasItems ? "cursor-pointer" : ""
                                } ${isExpanded ? "bg-blue-50/30" : ""}`}
                              >
                                <td className="py-3 px-3.5 text-xs font-medium text-slate-600 font-sans whitespace-nowrap">
                                  {tx.date}
                                </td>

                                <td className="py-3 px-3.5">
                                  {getTransactionTypeBadge(tx.type, tx.isArchive)}
                                </td>

                                <td className="py-3 px-3.5 font-mono font-bold text-xs text-slate-800">
                                  {tx.invoiceNumber ? (
                                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      {tx.invoiceNumber}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">---</span>
                                  )}
                                </td>

                                <td className="py-3 px-3.5">
                                  <div>
                                    <span className="font-bold text-slate-900 block">{tx.description}</span>
                                    {hasItems && !isExpanded && (
                                      <span className="text-[11px] text-blue-600 font-medium block truncate max-w-xs mt-0.5 print:hidden">
                                        {isFr ? "Articles : " : "الأصناف: "}
                                        {tx.items?.map(it => `${it.productName} (${it.quantity})`).join('، ')}
                                      </span>
                                    )}
                                  </div>
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
                                <td className={`py-3 px-3.5 ${isRTL ? 'text-left' : 'text-right'} font-black font-sans bg-slate-50/40`}>
                                  <div className="flex flex-col items-start">
                                    <span className={`text-sm ${
                                      currentBal > 0 ? "text-rose-700" : currentBal < 0 ? "text-emerald-700" : "text-slate-600"
                                    }`}>
                                      {formatCurrency(Math.abs(currentBal))}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {currentBal > 0 ? (isFr ? "Dû" : "عليه") : currentBal < 0 ? (isFr ? "Crédit" : "له") : (isFr ? "Soldé" : "خالص")}
                                    </span>
                                  </div>
                                </td>

                                {/* Expand toggle icon */}
                                <td className="py-3 px-2 text-center print:hidden">
                                  {hasItems ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleInvoiceExpand(tx.id);
                                      }}
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      title={isFr ? "Afficher le détail de la facture" : "عرض تفاصيل الفاتورة"}
                                    >
                                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  ) : null}
                                </td>
                              </tr>

                              {/* Expanded Invoice Items Row */}
                              {hasItems && (
                                <tr className={`bg-slate-50/90 border-b border-slate-200 ${isExpanded ? "" : "hidden print:table-row"}`}>
                                  <td colSpan={9} className="p-3">
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                                      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100">
                                        <Receipt size={14} className="text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800">
                                          {isFr
                                            ? `Détail des articles de la facture #${tx.invoiceNumber}`
                                            : `تفاصيل أصناف الفاتورة #${tx.invoiceNumber}`}
                                        </span>
                                      </div>
                                      <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} text-xs`}>
                                        <thead className="bg-slate-50 text-slate-500 font-bold">
                                          <tr>
                                            <th className="p-2">{isFr ? "Désignation" : "اسم الصنف"}</th>
                                            <th className="p-2 text-center">{isFr ? "Quantité" : "الكمية"}</th>
                                            <th className="p-2 text-center">{isFr ? "Prix Unitaire" : "سعر الوحدة"}</th>
                                            <th className={`p-2 ${isRTL ? 'text-left' : 'text-right'}`}>{isFr ? "Total" : "الإجمالي"}</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-sans">
                                          {tx.items?.map((it, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="p-2 font-medium text-slate-800">{it.productName}</td>
                                              <td className="p-2 text-center font-bold">{it.quantity}</td>
                                              <td className="p-2 text-center text-slate-600">{formatCurrency(it.price)}</td>
                                              <td className={`p-2 ${isRTL ? 'text-left' : 'text-right'} font-bold text-slate-900`}>{formatCurrency(it.total)}</td>
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
                      <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold">
                        <tr>
                          <td colSpan={4} className="py-3.5 px-3.5 text-slate-800 text-sm">
                            {isFr ? "Totaux généraux de toutes les opérations :" : "المجاميع الكلية لكافة الحركات:"}
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
                          <td className={`py-3.5 px-3.5 ${isRTL ? 'text-left' : 'text-right'} font-black font-sans text-base bg-slate-200/60`} colSpan={2}>
                            <span className={totals.finalBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                              {formatCurrency(Math.abs(totals.finalBalance))}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 mr-1.5 ml-1.5">
                              {totals.finalBalance > 0
                                ? (isFr ? "(Dû / عليه)" : "(مطلوب منه)")
                                : totals.finalBalance < 0
                                ? (isFr ? "(En sa faveur / له)" : "(مستحق له)")
                                : (isFr ? "(Soldé)" : "(خالص)")}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Statement Detailed Summary Box ── */}
              <div className="gsc-card p-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/70 print:border print:border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-600" />
                      <span>{isFr ? "Synthèse comptable certifiée du relevé de compte" : "الخلاصة المحاسبية المعتمدة لكشف الحساب"}</span>
                    </h4>
                    <p className="text-xs text-slate-600">
                      {isFr
                        ? `Toutes les opérations ont été consolidées et vérifiées à partir des factures de vente, des réceptions fournisseurs, de l'archive et des dettes (${formatCurrency(totals.totalDebit)}) sous déduction des règlements et avoirs (${formatCurrency(totals.totalCredit)}).`
                        : `تم استجلاب وتدقيق جميع المعاملات من فواتير البيع ومستحقات التوريد والأرشيف والديون (${formatCurrency(totals.totalDebit)}) مع خصم السدادات والمرتجعات (${formatCurrency(totals.totalCredit)}).`}
                    </p>
                    {totals.allTimeBalance !== totals.finalBalance && (
                      <p className="text-[11px] text-blue-700 font-bold mt-1">
                        {isFr
                          ? `* Solde historique global du compte : ${formatCurrency(Math.abs(totals.allTimeBalance))} (${totals.allTimeBalance > 0 ? "Dû (عليه)" : totals.allTimeBalance < 0 ? "Crédit (له)" : "Soldé"})`
                          : `* إجمالي رصيد الحساب عبر كل الأوقات: ${formatCurrency(Math.abs(totals.allTimeBalance))} (${totals.allTimeBalance > 0 ? "عليه" : totals.allTimeBalance < 0 ? "له" : "خالص"})`}
                      </p>
                    )}
                  </div>

                  <div className="bg-white px-5 py-3 rounded-xl border border-blue-200 text-center shadow-xs">
                    <p className="text-[11px] font-bold text-slate-500 mb-0.5">
                      {isFr ? "État final du compte" : "الموقف المالي النهائي"}
                    </p>
                    <div className={`text-xl font-black font-sans ${totals.finalBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatCurrency(Math.abs(totals.finalBalance))}
                    </div>
                    <span className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                      totals.finalBalance > 0 ? "bg-rose-100 text-rose-800" : totals.finalBalance < 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                    }`}>
                      {totals.finalBalance > 0
                        ? (isFr ? "Montant dû par le tiers (مطلوب منه)" : "مطلوب سداده من الطرف (مدين)")
                        : totals.finalBalance < 0
                        ? (isFr ? "Solde créditeur en sa faveur (مستحق له)" : "رصيد مستحق للطرف (دائن)")
                        : (isFr ? "Compte entièrement soldé" : "الحساب مسدد بالكامل (متزن)")}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Official Professional Statement Print & Preview Modal ── */}
      {selectedPartyData && (
        <ProfessionalStatementPrint
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          customer={selectedPartyData}
          transactions={filteredTransactions}
          totals={totals}
          storeInfo={storeInfo}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}
