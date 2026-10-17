
import { StoreData, ClientNote, PriceChangeHistory, CustomerFile } from "@/types";
import * as CryptoJS from "crypto-js";

const STORE_KEY = "arab-business-hub";

// Generate (or retrieve) a per-device encryption key stored in localStorage.
// This key is never shipped in source code — each device creates its own.
const getEncryptionKey = (): string => {
  const KEY_ITEM = "arab-hub-device-key";
  let key = localStorage.getItem(KEY_ITEM);
  if (!key) {
    // Generate a cryptographically random 32-byte hex key for this device
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    key = Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(KEY_ITEM, key);
  }
  return key;
};

// تشفير كلمة المرور باستخدام طريقة آمنة
export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password + getEncryptionKey()).toString();
};


// Initial data structure for the application
const initialStoreData: StoreData = {
  users: [],
  products: [],
  customers: [],
  invoices: [],
  returns: [],
  expenses: [],
  suppliers: [],
  creditors: [],
  mostRecentProducts: [],
  dailySales: [],
  debtors: [],
  warehouses: [
    {
      id: "WH-MAIN",
      name: "المخزن الرئيسي",
      location: "الموقع الرئيسي",
      description: "المخزن الرئيسي للمنتجات",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  clientNotes: [],
  priceChangeHistories: [],
  customerFiles: [],
  productMovements: [],
  storeInfo: {
    name: "",
    phone: "",
    email: "",
    photoUrl: "",
  },
};

// Load data from localStorage with decryption
export const loadStoreData = (): StoreData => {
  try {
    const rawData = localStorage.getItem(STORE_KEY);
    if (rawData) {
      let parsed: any = null;
      try {
        const decryptedData = CryptoJS.AES.decrypt(rawData, getEncryptionKey()).toString(CryptoJS.enc.Utf8);
        if (decryptedData) {
          parsed = JSON.parse(decryptedData);
        }
      } catch (decryptErr) {
        console.warn("Could not decrypt data with device key, attempting plain JSON parse:", decryptErr);
      }

      // If AES decryption didn't produce an object, fallback to checking if it was stored unencrypted
      if (!parsed) {
        try {
          parsed = JSON.parse(rawData);
        } catch (jsonErr) {
          console.warn("Data in localStorage is neither valid encrypted text nor valid JSON:", jsonErr);
        }
      }

      if (parsed && typeof parsed === "object") {
        // Ensure new arrays exist for backward compatibility
        if (!parsed.clientNotes) parsed.clientNotes = [];
        if (!parsed.priceChangeHistories) parsed.priceChangeHistories = [];
        if (!parsed.customerFiles) parsed.customerFiles = [];
        if (!parsed.productMovements) parsed.productMovements = [];
        if (!parsed.invoices) parsed.invoices = [];
        if (!parsed.dailySales) parsed.dailySales = [];

        // Automatic Synchronization: Convert DailySales into official Invoices if not already present
        let storeNeedsSave = false;
        if (parsed.dailySales && parsed.dailySales.length > 0) {
          const processedSaleIds = new Set(
            parsed.invoices.map((inv: any) => inv.id)
          );

          for (const sale of parsed.dailySales) {
            const saleInvoiceId = sale.id || `sale_${sale.date}_${sale.productId}`;
            const saleInvoiceNumber = `INV-SALE-${(sale.id || '').slice(0, 8).toUpperCase() || 'DAILY'}`;

            // Check if already represented in invoices
            const alreadyExists = parsed.invoices.some(
              (inv: any) =>
                inv.id === saleInvoiceId ||
                inv.invoiceNumber === saleInvoiceNumber ||
                (inv.notes && inv.notes.includes(sale.id))
            );

            if (!alreadyExists) {
              const saleDate = sale.date || sale.createdAt || new Date().toISOString();
              const saleQty = Number(sale.quantity) || 1;
              const saleUnitPrice = Number(sale.unitPrice) || Number(sale.total) || 0;
              const saleTotal = Number(sale.total) || (saleQty * saleUnitPrice);

              const newInvoice = {
                id: saleInvoiceId,
                invoiceNumber: saleInvoiceNumber,
                customerId: undefined,
                customerName: sale.customerName || "مبيعات يومية مباشرة",
                total: saleTotal,
                subtotal: saleTotal,
                discount: 0,
                tax: 0,
                paymentMethod: sale.paymentMethod || "cash",
                status: "paid" as const,
                type: "sales" as const,
                notes: `مبيعات يومية - معرّف: ${sale.id || ''}`,
                date: saleDate.split("T")[0],
                createdAt: sale.createdAt || (saleDate.includes("T") ? saleDate : `${saleDate}T12:00:00.000Z`),
                updatedAt: new Date().toISOString(),
                items: [
                  {
                    productId: sale.productId || "",
                    productName: sale.productName || "منتج",
                    productCode: sale.productCode || "",
                    quantity: saleQty,
                    price: saleUnitPrice,
                    total: saleTotal,
                  }
                ],
                products: [
                  {
                    productId: sale.productId || "",
                    quantity: saleQty,
                    price: saleUnitPrice,
                    name: sale.productName || "منتج",
                  }
                ]
              };

              parsed.invoices.unshift(newInvoice);
              storeNeedsSave = true;

              // Ensure stock is deducted if it hasn't been accounted for yet
              if (sale.productId && !sale.stockDeducted) {
                const prodIndex = parsed.products.findIndex((p: any) => p.id === sale.productId || p.code === sale.productCode);
                if (prodIndex !== -1) {
                  // Only deduct if not already reduced
                  if (typeof sale.remainingQuantity === "undefined") {
                    parsed.products[prodIndex].quantity = Math.max(0, (parsed.products[prodIndex].quantity || 0) - saleQty);
                    parsed.products[prodIndex].sold = (parsed.products[prodIndex].sold || 0) + saleQty;
                    parsed.products[prodIndex].updatedAt = new Date().toISOString();
                  }
                }
                sale.stockDeducted = true;
              }
            }
          }
        }

        if (storeNeedsSave) {
          saveStoreData(parsed);
        }

        return parsed;
      }
    }
    // If no data, initialize and save the default data
    saveStoreData(initialStoreData);
    return initialStoreData;
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
    return initialStoreData;
  }
};

// Save data to localStorage with encryption and auto backup
export const saveStoreData = (data: StoreData): void => {
  try {
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), getEncryptionKey()).toString();
    localStorage.setItem(STORE_KEY, encryptedData);
    
    // تشغيل النسخ الاحتياطي التلقائي بعد الحفظ
    setTimeout(() => {
      import('./backupManager').then(({ autoBackup }) => {
        autoBackup();
      });
    }, 100);
    
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
  }
};

// التحقق من كلمة المرور المشفرة
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  return hashPassword(password) === hashedPassword;
};

// Helper to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// Helper to generate invoice or return numbers with prefixes
export const generateInvoiceNumber = (prefix: string = "INV"): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
};

// Update most recently used products
export const updateMostRecentProducts = (productId: string): void => {
  const data = loadStoreData();
  
  // Remove the product ID if it already exists
  const filteredProducts = data.mostRecentProducts.filter(
    (id) => id !== productId
  );
  
  // Add the product ID to the front of the array
  const updatedProducts = [productId, ...filteredProducts].slice(0, 10); // Keep only the 10 most recent
  
  data.mostRecentProducts = updatedProducts;
  saveStoreData(data);
};

// Update inventory after a sale
export const updateInventoryForSale = (productId: string, quantitySold: number, isAdding: boolean = false): boolean => {
  const data = loadStoreData();
  const productIndex = data.products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return false;
  }
  
  const product = data.products[productIndex];
  
  if (isAdding) {
    // Restore inventory (for cancellation or modification)
    product.quantity += quantitySold;
    // Decrease the sold count if we're adding back to inventory
    product.sold = (product.sold || 0) - quantitySold;
    if (product.sold < 0) product.sold = 0;
  } else {
    // Check if we have enough stock
    if (product.quantity < quantitySold) {
      return false;
    }
    // Deduct from stock for a sale
    product.quantity -= quantitySold;
    // Increment the sold count
    product.sold = (product.sold || 0) + quantitySold;
  }
  
  product.updatedAt = new Date().toISOString();
  data.products[productIndex] = product;
  saveStoreData(data);
  return true;
};

// Get statistics
export const getTodaySales = (): number => {
  const data = loadStoreData();
  const today = new Date().toISOString().split('T')[0];
  
  return data.invoices
    .filter((invoice) => invoice.status === "paid" && invoice.createdAt.startsWith(today))
    .reduce((acc, invoice) => acc + invoice.total, 0);
};

export const getYesterdaySales = (): number => {
  const data = loadStoreData();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  return data.invoices
    .filter((invoice) => invoice.status === "paid" && invoice.createdAt.startsWith(yesterdayStr))
    .reduce((acc, invoice) => acc + invoice.total, 0);
};

export const getTodayExpenses = (): number => {
  const data = loadStoreData();
  const today = new Date().toISOString().split('T')[0];
  
  return data.expenses
    .filter((expense) => expense.date.startsWith(today))
    .reduce((acc, expense) => acc + expense.amount, 0);
};

export const getYesterdayExpenses = (): number => {
  const data = loadStoreData();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  return data.expenses
    .filter((expense) => expense.date.startsWith(yesterdayStr))
    .reduce((acc, expense) => acc + expense.amount, 0);
};

export const getLowStockProducts = (): number => {
  const data = loadStoreData();
  return data.products.filter((product) => product.quantity <= product.lowStockThreshold).length;
};

export const getMostRecentProductsList = (): string[] => {
  const data = loadStoreData();
  return data.mostRecentProducts;
};

// ─── CLIENT NOTES HELPERS ──────────────────────────────────────────────────
export const getClientNotes = (): ClientNote[] => {
  const data = loadStoreData();
  return data.clientNotes || [];
};

export const saveClientNote = (note: ClientNote): ClientNote => {
  const data = loadStoreData();
  if (!data.clientNotes) data.clientNotes = [];
  const index = data.clientNotes.findIndex((n) => n.id === note.id);
  if (index >= 0) {
    data.clientNotes[index] = { ...note, updatedAt: new Date().toISOString() };
  } else {
    data.clientNotes.unshift({
      ...note,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  saveStoreData(data);
  return note;
};

export const deleteClientNote = (id: string): void => {
  const data = loadStoreData();
  if (!data.clientNotes) return;
  data.clientNotes = data.clientNotes.filter((n) => n.id !== id);
  saveStoreData(data);
};

export const markNotesAsConverted = (noteIds: string[], invoiceId: string): void => {
  const data = loadStoreData();
  if (!data.clientNotes) return;
  data.clientNotes = data.clientNotes.map((note) => {
    if (noteIds.includes(note.id)) {
      const existingInvoices = note.invoiceIds || [];
      return {
        ...note,
        status: "converted" as const,
        convertedAt: new Date().toISOString(),
        invoiceIds: Array.from(new Set([...existingInvoices, invoiceId])),
        updatedAt: new Date().toISOString(),
      };
    }
    return note;
  });
  saveStoreData(data);
};

export const revertInvoiceNotesToOpen = (invoiceId: string): void => {
  const data = loadStoreData();
  if (!data.clientNotes) return;
  data.clientNotes = data.clientNotes.map((note) => {
    if (note.invoiceIds && note.invoiceIds.includes(invoiceId)) {
      const remainingInvoices = note.invoiceIds.filter((id) => id !== invoiceId);
      return {
        ...note,
        status: remainingInvoices.length === 0 ? ("open" as const) : note.status,
        invoiceIds: remainingInvoices,
        updatedAt: new Date().toISOString(),
      };
    }
    return note;
  });
  saveStoreData(data);
};

// ─── PRICE CHANGE HISTORY HELPERS ──────────────────────────────────────────
export const logPriceChange = (change: Omit<PriceChangeHistory, "id">): PriceChangeHistory => {
  const data = loadStoreData();
  if (!data.priceChangeHistories) data.priceChangeHistories = [];
  const entry: PriceChangeHistory = {
    ...change,
    id: generateId(),
  };
  data.priceChangeHistories.unshift(entry);
  saveStoreData(data);
  return entry;
};

export const getPriceChangeHistory = (productId?: string): PriceChangeHistory[] => {
  const data = loadStoreData();
  const list = data.priceChangeHistories || [];
  if (productId) {
    return list.filter((p) => p.productId === productId);
  }
  return list;
};

// ─── CUSTOMER FILES HELPERS ────────────────────────────────────────────────
export const saveCustomerFile = (file: Omit<CustomerFile, "id" | "createdAt">): CustomerFile => {
  const data = loadStoreData();
  if (!data.customerFiles) data.customerFiles = [];
  const newFile: CustomerFile = {
    ...file,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  data.customerFiles.unshift(newFile);
  saveStoreData(data);
  return newFile;
};

export const getCustomerFiles = (customerId: string): CustomerFile[] => {
  const data = loadStoreData();
  return (data.customerFiles || []).filter((f) => f.customerId === customerId);
};

