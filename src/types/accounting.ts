export type AccountClass = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface Account {
  id: string; // UUID
  userId?: string;
  code: string; // e.g. "411", "531", "701"
  nameAr: string;
  nameFr: string;
  accountClass: AccountClass;
  type: AccountType;
  parentId?: string | null;
  isActive: boolean;
  deviceId?: string;
  syncStatus?: "synced" | "pending" | "failed";
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FiscalPeriod {
  id: string; // UUID
  userId?: string;
  code: string; // e.g. "2026-M01", "FY2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isClosed: boolean;
  closedAt?: string | null;
  closedBy?: string | null;
  deviceId?: string;
  syncStatus?: "synced" | "pending" | "failed";
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JournalEntryType =
  | "sales_invoice"
  | "purchase_invoice"
  | "payment"
  | "receipt"
  | "expense"
  | "return"
  | "cogs"
  | "manual"
  | "reversal"
  | "closing";

export type JournalEntryStatus = "draft" | "posted" | "reversed";

export interface JournalEntry {
  id: string; // UUID
  userId?: string;
  entryNumber: string; // Sequential identifier (e.g., "JRN-2026-00001")
  entryDate: string; // YYYY-MM-DD
  periodId: string; // UUID of FiscalPeriod
  sourceDocumentType: JournalEntryType;
  sourceDocumentId?: string | null;
  sourceDocumentRef?: string | null; // e.g. Invoice Number "INV-001"
  description: string;
  status: JournalEntryStatus;
  reversedById?: string | null; // UUID of reversing entry if reversed
  totalDebit: number;
  totalCredit: number;
  deviceId?: string;
  syncStatus?: "synced" | "pending" | "failed";
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: string; // UUID
  userId?: string;
  entryId: string; // UUID of JournalEntry
  accountId: string; // UUID of Account
  accountCode?: string;
  accountNameAr?: string;
  accountNameFr?: string;
  thirdPartyId?: string | null; // Unified party ID (customer or supplier)
  thirdPartyName?: string | null;
  thirdPartyType?: "customer" | "supplier" | "dual" | null;
  debit: number; // >= 0
  credit: number; // >= 0
  description?: string;
  deviceId?: string;
  syncStatus?: "synced" | "pending" | "failed";
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OperationKey =
  | "sales_revenue"
  | "sales_tax"
  | "cash_account"
  | "bank_account"
  | "ar_customers"
  | "ap_suppliers"
  | "inventory_asset"
  | "cogs_expense"
  | "purchase_expense"
  | "general_expense";

export interface AccountMapping {
  id: string; // UUID
  userId?: string;
  operationKey: OperationKey;
  accountId: string; // UUID of Account
  accountCode?: string;
  description?: string;
  deviceId?: string;
  syncStatus?: "synced" | "pending" | "failed";
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingBackupMeta {
  backupId: string;
  timestamp: string;
  source: "local_store" | "sqlite" | "supabase";
  recordsCount: {
    accounts: number;
    journalEntries: number;
    journalLines: number;
    fiscalPeriods: number;
    accountMappings: number;
    invoices: number;
    customers: number;
    suppliers: number;
    products: number;
  };
  checksum: string;
  integrityPassed: boolean;
}
