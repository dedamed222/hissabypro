/**
 * Accounting Local Database Layer
 * Manages accounts, journal entries, lines, fiscal periods, and mappings
 * in localStorage (same pattern as existing app) with full transaction support.
 *
 * All writes are wrapped in a functional transaction pattern:
 *   loadStore → mutate → verify → saveStore (or rollback on error)
 */

import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { createPreMigrationBackup, verifyStoreIntegrity } from "@/utils/migrationBackup";
import {
  Account,
  FiscalPeriod,
  JournalEntry,
  JournalLine,
  AccountMapping,
  OperationKey,
} from "@/types/accounting";
import { DEFAULT_ACCOUNTS, DEFAULT_ACCOUNT_MAPPINGS } from "@/data/defaultChartOfAccounts";

// ─── Type augmentation helpers ─────────────────────────────────────────────────

function getAccountingStore(): any {
  const store = loadStoreData() as any;
  return store;
}

function saveAccountingStore(store: any): void {
  saveStoreData(store);
}

// ─── Generate UUID compatible with Supabase ────────────────────────────────────

export function generateAccountingUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback polyfill
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Sequential Journal Entry Number Generator ────────────────────────────────

export function generateEntryNumber(): string {
  const store = getAccountingStore();
  const entries: JournalEntry[] = store.journalEntries || [];
  const year = new Date().getFullYear();
  const prefix = `JRN-${year}-`;
  const existingNums = entries
    .filter((e) => e.entryNumber.startsWith(prefix))
    .map((e) => parseInt(e.entryNumber.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));
  const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

// ─── MIGRATION: Initialize accounting tables ──────────────────────────────────

/**
 * Phase 1 migration — runs idempotently: initializes accounting arrays
 * in the existing StoreData if they don't already exist.
 * Creates backup first, verifies integrity, and rolls back on failure.
 */
export async function runAccountingMigration(): Promise<{
  success: boolean;
  message: string;
  backupId?: string;
}> {
  let backupId: string | undefined;

  try {
    // Step 1: Backup
    const backup = createPreMigrationBackup("accounting-v1");
    backupId = backup.backupId;

    // Step 2: Load current store
    const store = getAccountingStore();

    // Step 3: Idempotent initialization — only add arrays that don't exist
    let mutated = false;

    if (!Array.isArray(store.accounts)) {
      store.accounts = DEFAULT_ACCOUNTS.map((a) => ({ ...a }));
      mutated = true;
    }

    if (!Array.isArray(store.fiscalPeriods)) {
      // Auto-create current fiscal year period
      const now = new Date();
      const year = now.getFullYear();
      const defaultPeriod: FiscalPeriod = {
        id: generateAccountingUUID(),
        code: `FY${year}`,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        isClosed: false,
        closedAt: null,
        closedBy: null,
        syncStatus: "pending",
        isDeleted: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      store.fiscalPeriods = [defaultPeriod];
      mutated = true;
    }

    if (!Array.isArray(store.journalEntries)) {
      store.journalEntries = [];
      mutated = true;
    }

    if (!Array.isArray(store.journalLines)) {
      store.journalLines = [];
      mutated = true;
    }

    if (!Array.isArray(store.accountMappings)) {
      store.accountMappings = DEFAULT_ACCOUNT_MAPPINGS.map((m) => ({ ...m }));
      mutated = true;
    }

    // Feature flag — default OFF
    if (store.settings === undefined) store.settings = {};
    if (store.settings.accountingModuleEnabled === undefined) {
      store.settings.accountingModuleEnabled = false;
      mutated = true;
    }

    if (mutated) {
      // Step 4: Verify integrity before saving
      const check = verifyStoreIntegrity(store);
      if (!check.valid) {
        throw new Error(`Post-migration integrity check failed: ${check.errors.join("; ")}`);
      }

      // Step 5: Save (the "commit")
      saveAccountingStore(store);
      console.log(`[Migration] accounting-v1 applied successfully (backup: ${backupId})`);
    } else {
      console.log("[Migration] accounting-v1 already applied, skipped.");
    }

    return { success: true, message: "Migration accounting-v1 OK", backupId };
  } catch (err: any) {
    console.error("[Migration] Error, state not changed:", err);
    // No partial state was written because we only call saveAccountingStore after verification
    return {
      success: false,
      message: `Migration failed: ${err?.message || String(err)}. Backup ID: ${backupId || "none"}`,
      backupId,
    };
  }
}

// ─── ACCOUNTS CRUD ────────────────────────────────────────────────────────────

export function getAccounts(): Account[] {
  const store = getAccountingStore();
  const accounts: Account[] = store.accounts || [];
  return accounts.filter((a) => !a.isDeleted);
}

export function getAccountByCode(code: string): Account | undefined {
  return getAccounts().find((a) => a.code === code);
}

export function upsertAccount(account: Account): Account {
  const store = getAccountingStore();
  if (!Array.isArray(store.accounts)) store.accounts = [];
  const idx = store.accounts.findIndex((a: Account) => a.id === account.id);
  const now = new Date().toISOString();
  const record: Account = { ...account, updatedAt: now, syncStatus: "pending" };
  if (idx >= 0) {
    store.accounts[idx] = record;
  } else {
    record.createdAt = record.createdAt || now;
    store.accounts.push(record);
  }
  saveAccountingStore(store);
  return record;
}

// ─── FISCAL PERIODS CRUD ──────────────────────────────────────────────────────

export function getFiscalPeriods(): FiscalPeriod[] {
  const store = getAccountingStore();
  const periods: FiscalPeriod[] = store.fiscalPeriods || [];
  return periods.filter((p) => !p.isDeleted);
}

export function getActivePeriodForDate(dateStr: string): FiscalPeriod | null {
  const periods = getFiscalPeriods();
  return (
    periods.find(
      (p) =>
        !p.isClosed && dateStr >= p.startDate && dateStr <= p.endDate
    ) || null
  );
}

export function closeFiscalPeriod(periodId: string, closedBy?: string): boolean {
  const store = getAccountingStore();
  const periods: FiscalPeriod[] = store.fiscalPeriods || [];
  const idx = periods.findIndex((p) => p.id === periodId);
  if (idx < 0) return false;
  periods[idx].isClosed = true;
  periods[idx].closedAt = new Date().toISOString();
  periods[idx].closedBy = closedBy || null;
  periods[idx].updatedAt = new Date().toISOString();
  periods[idx].syncStatus = "pending";
  store.fiscalPeriods = periods;
  saveAccountingStore(store);
  return true;
}

export function upsertFiscalPeriod(period: FiscalPeriod): FiscalPeriod {
  const store = getAccountingStore();
  if (!Array.isArray(store.fiscalPeriods)) store.fiscalPeriods = [];
  const idx = store.fiscalPeriods.findIndex((p: FiscalPeriod) => p.id === period.id);
  const now = new Date().toISOString();
  const record: FiscalPeriod = { ...period, updatedAt: now, syncStatus: "pending" };
  if (idx >= 0) {
    store.fiscalPeriods[idx] = record;
  } else {
    record.createdAt = record.createdAt || now;
    store.fiscalPeriods.push(record);
  }
  saveAccountingStore(store);
  return record;
}

// ─── ACCOUNT MAPPINGS ─────────────────────────────────────────────────────────

export function getAccountMappings(): AccountMapping[] {
  const store = getAccountingStore();
  return (store.accountMappings || []).filter((m: AccountMapping) => !m.isDeleted);
}

export function getMappedAccount(key: OperationKey): Account | null {
  const mappings = getAccountMappings();
  const mapping = mappings.find((m) => m.operationKey === key);
  if (!mapping) return null;
  const accounts = getAccounts();
  return accounts.find((a) => a.id === mapping.accountId) || null;
}

export function updateAccountMapping(operationKey: OperationKey, accountId: string): void {
  const store = getAccountingStore();
  const mappings: AccountMapping[] = store.accountMappings || [];
  const idx = mappings.findIndex((m) => m.operationKey === operationKey);
  const now = new Date().toISOString();
  if (idx >= 0) {
    mappings[idx].accountId = accountId;
    mappings[idx].updatedAt = now;
    mappings[idx].syncStatus = "pending";
  } else {
    mappings.push({
      id: generateAccountingUUID(),
      operationKey,
      accountId,
      syncStatus: "pending",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  }
  store.accountMappings = mappings;
  saveAccountingStore(store);
}

// ─── JOURNAL ENTRIES CRUD ─────────────────────────────────────────────────────

export function getJournalEntries(opts?: {
  fromDate?: string;
  toDate?: string;
  status?: string;
  sourceType?: string;
  limit?: number;
}): JournalEntry[] {
  const store = getAccountingStore();
  let entries: JournalEntry[] = (store.journalEntries || []).filter(
    (e: JournalEntry) => !e.isDeleted
  );
  if (opts?.status) entries = entries.filter((e) => e.status === opts.status);
  if (opts?.sourceType) entries = entries.filter((e) => e.sourceDocumentType === opts.sourceType);
  if (opts?.fromDate) entries = entries.filter((e) => e.entryDate >= opts.fromDate!);
  if (opts?.toDate) entries = entries.filter((e) => e.entryDate <= opts.toDate!);
  entries.sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1));
  if (opts?.limit) entries = entries.slice(0, opts.limit);
  return entries;
}

export function getJournalLinesForEntry(entryId: string): JournalLine[] {
  const store = getAccountingStore();
  return (store.journalLines || []).filter(
    (l: JournalLine) => l.entryId === entryId && !l.isDeleted
  );
}

/**
 * Core double-entry write — saves entry + lines atomically.
 * Validates:
 *   1. Entry has at least 2 lines
 *   2. Total debit === total credit (double-entry equilibrium)
 *   3. Target period is not closed
 *   4. No line has both debit AND credit > 0
 */
export function postJournalEntry(
  entryData: Omit<JournalEntry, "id" | "entryNumber" | "totalDebit" | "totalCredit" | "createdAt" | "updatedAt" | "syncStatus" | "isDeleted">,
  lines: Omit<JournalLine, "id" | "entryId" | "createdAt" | "updatedAt" | "syncStatus" | "isDeleted">[]
): JournalEntry {
  if (lines.length < 2) {
    throw new Error("Un écriture comptable doit avoir au moins 2 lignes / القيد المحاسبي يجب أن يحتوي على سطرين على الأقل");
  }

  // Validate no line has both debit and credit
  for (const line of lines) {
    if (line.debit > 0 && line.credit > 0) {
      throw new Error(`الحساب ${line.accountCode || line.accountId} يحتوي على مدين ودائن في نفس الوقت — غير مسموح`);
    }
    if (line.debit < 0 || line.credit < 0) {
      throw new Error(`لا يسمح بالأرصدة السالبة في سطور القيد`);
    }
  }

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);

  // Floating-point safe comparison (max 2 decimal places)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `القيد غير متوازن: إجمالي المدين (${totalDebit.toFixed(2)}) ≠ إجمالي الدائن (${totalCredit.toFixed(2)})`
    );
  }

  // Verify fiscal period not closed
  const period = getFiscalPeriods().find((p) => p.id === entryData.periodId);
  if (!period) {
    throw new Error("الفترة المحاسبية المحددة غير موجودة");
  }
  if (period.isClosed) {
    throw new Error(`الفترة المحاسبية "${period.code}" مغلقة. لا يمكن التسجيل فيها.`);
  }

  const now = new Date().toISOString();
  const entryId = generateAccountingUUID();
  const entryNumber = generateEntryNumber();

  const entry: JournalEntry = {
    ...entryData,
    id: entryId,
    entryNumber,
    totalDebit: parseFloat(totalDebit.toFixed(2)),
    totalCredit: parseFloat(totalCredit.toFixed(2)),
    status: "posted",
    syncStatus: "pending",
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const journalLines: JournalLine[] = lines.map((l) => ({
    ...l,
    id: generateAccountingUUID(),
    entryId,
    debit: parseFloat((l.debit || 0).toFixed(2)),
    credit: parseFloat((l.credit || 0).toFixed(2)),
    syncStatus: "pending" as const,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }));

  // Atomic save (no partial state)
  const store = getAccountingStore();
  if (!Array.isArray(store.journalEntries)) store.journalEntries = [];
  if (!Array.isArray(store.journalLines)) store.journalLines = [];

  store.journalEntries.unshift(entry);
  store.journalLines.unshift(...journalLines);

  saveAccountingStore(store);
  console.log(`[Accounting] Posted entry ${entryNumber} (D:${totalDebit}, C:${totalCredit})`);
  return entry;
}

/**
 * Reversal: creates a counter-entry (contre-passation) for a posted entry.
 * The original entry is marked as "reversed". No deletion ever occurs.
 */
export function reverseJournalEntry(entryId: string, reason: string): JournalEntry {
  const store = getAccountingStore();
  const entries: JournalEntry[] = store.journalEntries || [];
  const lines: JournalLine[] = store.journalLines || [];

  const original = entries.find((e) => e.id === entryId && !e.isDeleted);
  if (!original) throw new Error("القيد الأصلي غير موجود");
  if (original.status === "reversed") throw new Error("القيد مرحَّل بالفعل — لا يمكن عكسه مرتين");
  if (original.status !== "posted") throw new Error("لا يمكن عكس قيد غير مرحَّل");

  const originalLines = lines.filter((l) => l.entryId === entryId && !l.isDeleted);
  if (originalLines.length === 0) throw new Error("لا توجد أسطر للقيد الأصلي");

  // Swapped lines (debit ↔ credit)
  const reversalLines = originalLines.map((l) => ({
    accountId: l.accountId,
    accountCode: l.accountCode,
    accountNameAr: l.accountNameAr,
    accountNameFr: l.accountNameFr,
    thirdPartyId: l.thirdPartyId,
    thirdPartyName: l.thirdPartyName,
    thirdPartyType: l.thirdPartyType,
    debit: l.credit,   // swapped
    credit: l.debit,   // swapped
    description: `عكس: ${l.description || ""}`,
  }));

  const now = new Date().toISOString();
  const todayDate = now.split("T")[0];
  const period = getActivePeriodForDate(todayDate);
  if (!period) throw new Error("لا توجد فترة محاسبية مفتوحة لتاريخ اليوم");

  const reversalEntry = postJournalEntry(
    {
      entryDate: todayDate,
      periodId: period.id,
      sourceDocumentType: "reversal",
      sourceDocumentId: entryId,
      sourceDocumentRef: original.entryNumber,
      description: `عكس القيد ${original.entryNumber} — ${reason}`,
      status: "posted",
    },
    reversalLines
  );

  // Mark original as reversed
  const idx = entries.findIndex((e) => e.id === entryId);
  entries[idx].status = "reversed";
  entries[idx].reversedById = reversalEntry.id;
  entries[idx].updatedAt = now;
  entries[idx].syncStatus = "pending";
  store.journalEntries = entries;
  saveAccountingStore(store);

  return reversalEntry;
}

// ─── REPORTING HELPERS ────────────────────────────────────────────────────────

/**
 * Compute running balance for an account (debit-normal or credit-normal).
 * Returns array of line items with running balance.
 */
export function getGeneralLedgerForAccount(
  accountId: string,
  opts?: { fromDate?: string; toDate?: string }
): Array<JournalLine & { entryDate: string; entryNumber: string; runningBalance: number }> {
  const store = getAccountingStore();
  const entries: JournalEntry[] = (store.journalEntries || []).filter(
    (e: JournalEntry) => !e.isDeleted && e.status === "posted"
  );
  const lines: JournalLine[] = (store.journalLines || []).filter(
    (l: JournalLine) => l.accountId === accountId && !l.isDeleted
  );

  const enriched = lines
    .map((l) => {
      const entry = entries.find((e) => e.id === l.entryId);
      if (!entry) return null;
      return { ...l, entryDate: entry.entryDate, entryNumber: entry.entryNumber, runningBalance: 0 };
    })
    .filter(Boolean) as any[];

  let filtered = enriched;
  if (opts?.fromDate) {
    filtered = filtered.filter((r) => r.entryDate >= opts.fromDate!);
  }
  if (opts?.toDate) {
    filtered = filtered.filter((r) => r.entryDate <= opts.toDate!);
  }
  return computeRunningBalances(filtered);
}

function computeRunningBalances(rows: any[]): any[] {
  let balance = 0;
  return rows.map((r) => {
    balance += (r.debit || 0) - (r.credit || 0);
    return { ...r, runningBalance: parseFloat(balance.toFixed(2)) };
  });
}

/**
 * Trial balance: sum of debits, credits, and net for each account.
 */
export function getTrialBalance(opts?: { fromDate?: string; toDate?: string }): Array<{
  account: Account;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}> {
  const accounts = getAccounts();
  const store = getAccountingStore();
  let entries: JournalEntry[] = (store.journalEntries || []).filter(
    (e: JournalEntry) => !e.isDeleted && e.status === "posted"
  );
  if (opts?.fromDate) entries = entries.filter((e) => e.entryDate >= opts.fromDate!);
  if (opts?.toDate) entries = entries.filter((e) => e.entryDate <= opts.toDate!);
  const entryIds = new Set(entries.map((e) => e.id));

  const lines: JournalLine[] = (store.journalLines || []).filter(
    (l: JournalLine) => !l.isDeleted && entryIds.has(l.entryId)
  );

  return accounts.map((account) => {
    const accountLines = lines.filter((l) => l.accountId === account.id);
    const totalDebit = parseFloat(accountLines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2));
    const totalCredit = parseFloat(accountLines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2));
    return {
      account,
      totalDebit,
      totalCredit,
      netBalance: parseFloat((totalDebit - totalCredit).toFixed(2)),
    };
  }).filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0);
}

/**
 * Third-party account balance (customer or supplier).
 * Net = total debits - total credits on account 411 (customer) or 401 (supplier).
 */
export function getThirdPartyBalance(thirdPartyId: string): {
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
} {
  const store = getAccountingStore();
  const lines: JournalLine[] = (store.journalLines || []).filter(
    (l: JournalLine) => !l.isDeleted && l.thirdPartyId === thirdPartyId
  );
  const totalDebit = parseFloat(lines.reduce((s, l) => s + (l.debit || 0), 0).toFixed(2));
  const totalCredit = parseFloat(lines.reduce((s, l) => s + (l.credit || 0), 0).toFixed(2));
  return {
    totalDebit,
    totalCredit,
    netBalance: parseFloat((totalDebit - totalCredit).toFixed(2)),
  };
}
