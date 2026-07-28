
import { StoreData } from "@/types";
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
    const encryptedData = localStorage.getItem(STORE_KEY);
    if (encryptedData) {
      const decryptedData = CryptoJS.AES.decrypt(encryptedData, getEncryptionKey()).toString(CryptoJS.enc.Utf8);
      if (decryptedData) {
        return JSON.parse(decryptedData);
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
