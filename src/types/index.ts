
export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: "admin" | "user";
  email?: string; // Add email property for Register.tsx
  createdAt: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  quantity: number;
  lowStockThreshold: number;
  category?: string;
  supplierId?: string;
  photoUrl?: string;
  barcode?: string;
  sold?: number;
  createdAt: string;
  updatedAt?: string;
  code: string;
  warehouseId?: string; // Link to warehouse
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  company?: string; // Add company property
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  products: { productId: string; quantity: number; price: number; name: string }[];
  items: InvoiceItem[]; 
  total: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  shippingCost?: number;
  paymentMethod: string; // Accepting any string for payment method
  status: "pending" | "paid" | "cancelled" | "partial";
  type?: "sales" | "quotation" | "debt";
  dueDate?: string;
  debtType?: "debtor" | "creditor";
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Return {
  id: string;
  returnNumber: string;
  invoiceId?: string;
  customerId?: string;
  customerName: string;
  products: { productId: string; quantity: number; price: number; name: string }[];
  items?: { productId: string; quantity: number; price: number; productName: string }[]; 
  total: number;
  reason?: string;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  invoiceNumber?: string;
  status?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string; // Changed to string to accept any payment method
  reference?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Creditor {
  id: string;
  name: string;
  phone: string;
  customer_id?: string; // New: link to customer
  email?: string;
  address?: string;
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  productCode?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  total?: number;
  date?: string;
  status?: 'pending' | 'paid';
}

export interface Debtor {
  id: string;
  name: string;
  customer_id?: string; // New: link to customer
  debtorName?: string; // For backward compatibility
  phone: string;
  products?: DebtorProductItem[]; // New products array
  totalAmount: number;
  amount?: number; // For backward compatibility
  notes?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'pending' | 'paid';
  // Legacy fields for backward compatibility
  productCode?: string;
  productName?: string;
  quantity?: number;
  productPrice?: number;
}

export interface DebtorProductItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface DailySales {
  date: string;
  totalSales: number;
  id?: string;
  productId?: string;
  productName?: string;
  productCode?: string;
  quantity?: number;
  total?: number;
  unitPrice?: number;
  paymentMethod?: string; // Changed to string to accommodate custom payment methods
  remainingQuantity?: number;
  createdAt?: string; // Add createdAt property for useSalesForm.ts
}

// Alias for consistency in component usage
export type DailySale = DailySales;

export interface StoreInfo {
  name: string;
  phone: string;
  email: string;
  photoUrl: string;
  address?: string;
  commercialRegister?: string;
}

// New interfaces for custom currencies and payment methods
export interface Currency {
  code: string;
  name: string;
  symbol?: string;
  isCustom?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  isCustom?: boolean;
}

export interface StoreData {
  users: User[];
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  returns: Return[];
  expenses: Expense[];
  suppliers: Supplier[];
  creditors: Creditor[];
  mostRecentProducts: string[];
  dailySales: DailySales[];
  debtors: Debtor[];
  storeInfo: StoreInfo;
  warehouses?: Warehouse[]; // Add warehouses
  settings?: {
    currency: string;
    locale: "ar" | "fr";
    previewSettings?: any;
    customCurrencies?: Currency[];
    customPaymentMethods?: PaymentMethod[];
  };
}

export type Languages = "ar" | "fr";

export interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

// Add missing interface for FormattedStat
export interface FormattedStat {
  value: string;
  change: number;
  isPositive: boolean;
  label: string;
}

// Moved up

// Add missing interface for AuthState
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}
