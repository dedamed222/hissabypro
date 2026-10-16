import { Invoice, Product, ProductMovement, StoreData } from "@/types";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { upsertProductMovementDB, deleteProductMovementsByInvoiceDB } from "@/lib/database";

/**
 * Generate a unique ID for a product movement
 */
export const generateMovementId = (): string => {
  return `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Record movements for all items in an invoice (including manual items)
 */
export const recordInvoiceMovements = (
  invoice: Invoice,
  movementType: "sale" | "return" | "manual_adjustment" = "sale"
): ProductMovement[] => {
  if (!invoice) return [];
  const items = invoice.items || (invoice.products as any[]) || [];
  if (items.length === 0) return [];

  const store = loadStoreData();
  if (!store.productMovements) store.productMovements = [];

  const invoiceDate = invoice.date || invoice.createdAt || new Date().toISOString();
  const createdMovements: ProductMovement[] = [];

  for (const item of items) {
    const rawName = item.productName || (item as any).name || "";
    if (!rawName.trim()) continue;

    // Check if movement already exists for this exact invoice and item to prevent duplicate entries
    const existingMovement = store.productMovements.find(
      (m) =>
        (m.invoiceId === invoice.id || m.invoiceNumber === invoice.invoiceNumber) &&
        (m.productId === item.productId || m.productName.trim().toLowerCase() === rawName.trim().toLowerCase()) &&
        m.quantity === item.quantity &&
        m.unitPrice === item.price &&
        !m.isDeleted
    );
    if (existingMovement) continue;

    // Find if the product exists in local inventory
    const matchedProduct = store.products?.find(
      (p) =>
        (item.productId && p.id === item.productId) ||
        (p.name.trim().toLowerCase() === rawName.trim().toLowerCase())
    );

    const isManual = !matchedProduct || !item.productId || item.productId.startsWith("manual-");

    const newMovement: ProductMovement = {
      id: generateMovementId(),
      productId: matchedProduct ? matchedProduct.id : (item.productId || null),
      productName: matchedProduct ? matchedProduct.name : rawName,
      productCode: matchedProduct?.code || item.productCode || "",
      customerId: invoice.customerId || null,
      customerName: invoice.customerName || "عميل عام",
      invoiceId: invoice.id || null,
      invoiceNumber: invoice.invoiceNumber || "",
      date: invoiceDate,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.price) || 0,
      total: Number(item.total) || ((Number(item.quantity) || 1) * (Number(item.price) || 0)),
      costPrice: matchedProduct?.cost || 0,
      type: movementType,
      isManualItem: isManual,
      notes: invoice.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    store.productMovements.unshift(newMovement);
    createdMovements.push(newMovement);

    // Sync to Supabase in background (safe, non-blocking)
    if (navigator.onLine) {
      upsertProductMovementDB({
        id: newMovement.id,
        product_id: newMovement.productId,
        product_name: newMovement.productName,
        product_code: newMovement.productCode,
        customer_id: newMovement.customerId,
        customer_name: newMovement.customerName,
        invoice_id: newMovement.invoiceId,
        invoice_number: newMovement.invoiceNumber,
        date: newMovement.date,
        quantity: newMovement.quantity,
        unit_price: newMovement.unitPrice,
        total: newMovement.total,
        cost_price: newMovement.costPrice,
        type: newMovement.type,
        is_manual_item: newMovement.isManualItem,
        notes: newMovement.notes,
      }).catch((err) => {
        console.warn("Background movement cloud sync failed:", err);
      });
    }
  }

  if (createdMovements.length > 0) {
    saveStoreData(store);
  }

  return createdMovements;
};

/**
 * Revert / Cancel movements associated with an invoice (e.g. when invoice is deleted or cancelled)
 */
export const revertInvoiceMovements = (invoiceId?: string, invoiceNumber?: string) => {
  if (!invoiceId && !invoiceNumber) return;

  const store = loadStoreData();
  if (!store.productMovements) return;

  let changed = false;
  store.productMovements = store.productMovements.map((m) => {
    if (
      (invoiceId && m.invoiceId === invoiceId) ||
      (invoiceNumber && m.invoiceNumber === invoiceNumber)
    ) {
      changed = true;
      return {
        ...m,
        isDeleted: true,
        type: "cancellation" as const,
        updatedAt: new Date().toISOString(),
      };
    }
    return m;
  });

  if (changed) {
    saveStoreData(store);
    if (navigator.onLine) {
      deleteProductMovementsByInvoiceDB(invoiceId, invoiceNumber).catch(() => {});
    }
  }
};

/**
 * Update movements when an invoice is edited
 */
export const updateInvoiceMovements = (updatedInvoice: Invoice) => {
  if (!updatedInvoice) return;

  const store = loadStoreData();
  if (!store.productMovements) store.productMovements = [];

  // Remove previous movements for this invoice to replace with new ones cleanly
  store.productMovements = store.productMovements.filter(
    (m) =>
      !(
        (updatedInvoice.id && m.invoiceId === updatedInvoice.id) ||
        (updatedInvoice.invoiceNumber && m.invoiceNumber === updatedInvoice.invoiceNumber)
      )
  );
  saveStoreData(store);

  // Record fresh movements for the updated invoice
  return recordInvoiceMovements(updatedInvoice);
};

/**
 * Migrate / backfill historical invoices into the movement log safely (no duplicates)
 */
export const migrateHistoricalInvoicesToMovements = (): { migratedInvoices: number; createdMovements: number } => {
  const store = loadStoreData();
  const invoices = store.invoices || [];
  if (!store.productMovements) store.productMovements = [];

  let migratedInvoices = 0;
  let totalCreated = 0;

  for (const inv of invoices) {
    // Only process sales, debt, or normal invoices (exclude cancelled unless desired)
    if (inv.status === "cancelled") continue;

    // Check if this invoice already has recorded movements
    const alreadyRecorded = store.productMovements.some(
      (m) => (inv.id && m.invoiceId === inv.id) || (inv.invoiceNumber && m.invoiceNumber === inv.invoiceNumber)
    );

    if (!alreadyRecorded && (inv.items?.length || inv.products?.length)) {
      const created = recordInvoiceMovements(inv);
      if (created.length > 0) {
        migratedInvoices++;
        totalCreated += created.length;
      }
    }
  }

  return { migratedInvoices, createdMovements: totalCreated };
};

/**
 * Compute detailed analytics for a single product
 */
export const getProductMovementStats = (
  productId: string,
  productName?: string,
  movements: ProductMovement[] = []
) => {
  const active = movements.filter((m) => {
    if (m.isDeleted || m.type === "cancellation") return false;
    if (productId && m.productId === productId) return true;
    if (productName && m.productName.trim().toLowerCase() === productName.trim().toLowerCase()) return true;
    return false;
  });

  const saleMovements = active.filter((m) => m.type === "sale");
  const returnMovements = active.filter((m) => m.type === "return");

  const totalQuantitySold = saleMovements.reduce((acc, m) => acc + (m.quantity || 0), 0) -
    returnMovements.reduce((acc, m) => acc + (m.quantity || 0), 0);

  const totalRevenue = saleMovements.reduce((acc, m) => acc + (m.total || 0), 0) -
    returnMovements.reduce((acc, m) => acc + (m.total || 0), 0);

  const uniqueCustomers = new Set(
    active.map((m) => m.customerName?.trim().toLowerCase()).filter(Boolean)
  );

  const prices = saleMovements.map((m) => m.unitPrice).filter((p) => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Sort by date ascending to get first sale, descending for last sale
  const sortedByDate = [...active].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstSale = sortedByDate[0] || null;
  const lastSale = sortedByDate[sortedByDate.length - 1] || null;

  return {
    totalQuantitySold: Math.max(0, totalQuantitySold),
    totalRevenue,
    uniqueCustomersCount: uniqueCustomers.size,
    firstSaleDate: firstSale ? firstSale.date : null,
    lastSaleDate: lastSale ? lastSale.date : null,
    avgPrice,
    minPrice,
    maxPrice,
    movementCount: active.length,
    activeMovements: active,
  };
};

/**
 * Get the last sale details for a specific customer and product (used for price hint in invoice)
 */
export const getLastSaleToCustomer = (
  customerId?: string | null,
  customerName?: string,
  productId?: string | null,
  productName?: string,
  movements: ProductMovement[] = []
): { date: string; unitPrice: number; quantity: number; invoiceNumber: string } | null => {
  if (!customerId && !customerName) return null;
  if (!productId && !productName) return null;

  const matches = movements
    .filter((m) => {
      if (m.isDeleted || m.type === "cancellation") return false;

      // Customer match
      const custMatch =
        (customerId && m.customerId === customerId) ||
        (customerName && m.customerName?.trim().toLowerCase() === customerName.trim().toLowerCase());
      if (!custMatch) return false;

      // Product match
      const prodMatch =
        (productId && m.productId === productId) ||
        (productName && m.productName?.trim().toLowerCase() === productName.trim().toLowerCase());
      return prodMatch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (matches.length === 0) return null;

  const latest = matches[0];
  return {
    date: latest.date,
    unitPrice: latest.unitPrice,
    quantity: latest.quantity,
    invoiceNumber: latest.invoiceNumber,
  };
};

/**
 * Get all products purchased by a specific customer with summary metrics
 */
export const getCustomerPurchasedProducts = (
  customerId?: string | null,
  customerName?: string,
  movements: ProductMovement[] = []
) => {
  const custMovements = movements.filter((m) => {
    if (m.isDeleted || m.type === "cancellation") return false;
    if (customerId && m.customerId === customerId) return true;
    if (customerName && m.customerName?.trim().toLowerCase() === customerName.trim().toLowerCase()) return true;
    return false;
  });

  // Group by product
  const productMap: {
    [key: string]: {
      productId?: string | null;
      productName: string;
      productCode?: string;
      isManualItem: boolean;
      totalQuantity: number;
      totalAmount: number;
      lastPurchaseDate: string;
      lastUnitPrice: number;
      purchases: ProductMovement[];
    };
  } = {};

  for (const m of custMovements) {
    const key = m.productId || m.productName.trim().toLowerCase();
    if (!productMap[key]) {
      productMap[key] = {
        productId: m.productId,
        productName: m.productName,
        productCode: m.productCode,
        isManualItem: m.isManualItem,
        totalQuantity: 0,
        totalAmount: 0,
        lastPurchaseDate: m.date,
        lastUnitPrice: m.unitPrice,
        purchases: [],
      };
    }

    productMap[key].purchases.push(m);
    productMap[key].totalQuantity += m.quantity;
    productMap[key].totalAmount += m.total;

    // Update latest date & price if more recent
    if (new Date(m.date).getTime() >= new Date(productMap[key].lastPurchaseDate).getTime()) {
      productMap[key].lastPurchaseDate = m.date;
      productMap[key].lastUnitPrice = m.unitPrice;
    }
  }

  return Object.values(productMap).sort(
    (a, b) => new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime()
  );
};

/**
 * Identify stagnant products that have not been sold within the specified number of days
 */
export const getStagnantProducts = (
  products: Product[] = [],
  movements: ProductMovement[] = [],
  daysThreshold: number = 30
) => {
  const now = new Date().getTime();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;

  return products
    .map((prod) => {
      const prodMovements = movements
        .filter((m) => m.productId === prod.id && !m.isDeleted && m.type === "sale")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastMovement = prodMovements[0] || null;
      const lastSaleDate = lastMovement ? new Date(lastMovement.date).getTime() : null;
      const daysSinceLastSale = lastSaleDate
        ? Math.floor((now - lastSaleDate) / (1000 * 60 * 60 * 24))
        : null;

      const isStagnant = lastSaleDate === null || now - lastSaleDate >= thresholdMs;

      return {
        product: prod,
        lastSaleDate: lastMovement ? lastMovement.date : null,
        daysSinceLastSale,
        neverSold: lastSaleDate === null,
        isStagnant,
      };
    })
    .filter((item) => item.isStagnant)
    .sort((a, b) => {
      if (a.neverSold && !b.neverSold) return -1;
      if (!a.neverSold && b.neverSold) return 1;
      return (b.daysSinceLastSale || 0) - (a.daysSinceLastSale || 0);
    });
};

/**
 * Product sales ranked by best/least sold within optional date filter
 */
export const getProductSalesRanking = (
  movements: ProductMovement[] = [],
  dateFrom?: string,
  dateTo?: string
) => {
  const filtered = movements.filter((m) => {
    if (m.isDeleted || m.type === "cancellation") return false;
    if (dateFrom && m.date < dateFrom) return false;
    if (dateTo && m.date > dateTo) return false;
    return true;
  });

  const map: {
    [key: string]: {
      productId?: string | null;
      productName: string;
      productCode?: string;
      isManualItem: boolean;
      totalQuantity: number;
      totalRevenue: number;
      ordersCount: number;
      customersCount: number;
      customers: Set<string>;
    };
  } = {};

  for (const m of filtered) {
    const key = m.productId || m.productName.trim().toLowerCase();
    if (!map[key]) {
      map[key] = {
        productId: m.productId,
        productName: m.productName,
        productCode: m.productCode,
        isManualItem: m.isManualItem,
        totalQuantity: 0,
        totalRevenue: 0,
        ordersCount: 0,
        customersCount: 0,
        customers: new Set(),
      };
    }

    const factor = m.type === "return" ? -1 : 1;
    map[key].totalQuantity += factor * m.quantity;
    map[key].totalRevenue += factor * m.total;
    map[key].ordersCount += 1;
    if (m.customerName) {
      map[key].customers.add(m.customerName.trim().toLowerCase());
    }
  }

  const results = Object.values(map).map((item) => ({
    ...item,
    customersCount: item.customers.size,
  }));

  // Best selling (highest quantity)
  const bestSelling = [...results].sort((a, b) => b.totalQuantity - a.totalQuantity);
  // Least selling
  const leastSelling = [...results].sort((a, b) => a.totalQuantity - b.totalQuantity);

  return { bestSelling, leastSelling, all: results };
};
