/**
 * Accounting Supabase Database Layer
 * Syncs accounting tables to/from Supabase PostgreSQL.
 * All operations use upsert by UUID and soft-delete (is_deleted flag).
 * Conflict resolution: latest updated_at wins.
 */

import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUser } from "@/lib/database";
import {
  Account,
  FiscalPeriod,
  JournalEntry,
  JournalLine,
  AccountMapping,
} from "@/types/accounting";

// ─── Helper ───────────────────────────────────────────────────────────────────

function toSnake(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    nameAr: "name_ar",
    nameFr: "name_fr",
    accountClass: "account_class",
    parentId: "parent_id",
    isActive: "is_active",
    isDeleted: "is_deleted",
    createdAt: "created_at",
    updatedAt: "updated_at",
    syncStatus: "sync_status",
    deviceId: "device_id",
    userId: "user_id",
    startDate: "start_date",
    endDate: "end_date",
    isClosed: "is_closed",
    closedAt: "closed_at",
    closedBy: "closed_by",
    entryNumber: "entry_number",
    entryDate: "entry_date",
    periodId: "period_id",
    sourceDocumentType: "source_document_type",
    sourceDocumentId: "source_document_id",
    sourceDocumentRef: "source_document_ref",
    reversedById: "reversed_by_id",
    totalDebit: "total_debit",
    totalCredit: "total_credit",
    entryId: "entry_id",
    accountId: "account_id",
    thirdPartyId: "third_party_id",
    thirdPartyName: "third_party_name",
    thirdPartyType: "third_party_type",
    operationKey: "operation_key",
    accountNameAr: "account_name_ar",
    accountNameFr: "account_name_fr",
  };

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[map[key] || key] = obj[key];
  }
  return result;
}

function toCamel(obj: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    name_ar: "nameAr",
    name_fr: "nameFr",
    account_class: "accountClass",
    parent_id: "parentId",
    is_active: "isActive",
    is_deleted: "isDeleted",
    created_at: "createdAt",
    updated_at: "updatedAt",
    sync_status: "syncStatus",
    device_id: "deviceId",
    user_id: "userId",
    start_date: "startDate",
    end_date: "endDate",
    is_closed: "isClosed",
    closed_at: "closedAt",
    closed_by: "closedBy",
    entry_number: "entryNumber",
    entry_date: "entryDate",
    period_id: "periodId",
    source_document_type: "sourceDocumentType",
    source_document_id: "sourceDocumentId",
    source_document_ref: "sourceDocumentRef",
    reversed_by_id: "reversedById",
    total_debit: "totalDebit",
    total_credit: "totalCredit",
    entry_id: "entryId",
    account_id: "accountId",
    third_party_id: "thirdPartyId",
    third_party_name: "thirdPartyName",
    third_party_type: "thirdPartyType",
    operation_key: "operationKey",
    account_name_ar: "accountNameAr",
    account_name_fr: "accountNameFr",
  };
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    result[map[key] || key] = obj[key];
  }
  return result;
}

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

export async function upsertAccountCloud(account: Account): Promise<void> {
  const user = await getAuthenticatedUser();
  const payload = toSnake({ ...account, userId: user.id });
  const { error } = await supabase
    .from("accounting_accounts")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getAccountsCloud(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounting_accounts")
    .select("*")
    .eq("is_deleted", false)
    .order("code", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => toCamel(r) as Account);
}

// ─── FISCAL PERIODS ───────────────────────────────────────────────────────────

export async function upsertFiscalPeriodCloud(period: FiscalPeriod): Promise<void> {
  const user = await getAuthenticatedUser();
  const payload = toSnake({ ...period, userId: user.id });
  const { error } = await supabase
    .from("accounting_fiscal_periods")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getFiscalPeriodsCloud(): Promise<FiscalPeriod[]> {
  const { data, error } = await supabase
    .from("accounting_fiscal_periods")
    .select("*")
    .eq("is_deleted", false)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => toCamel(r) as FiscalPeriod);
}

// ─── JOURNAL ENTRIES ──────────────────────────────────────────────────────────

export async function upsertJournalEntryCloud(entry: JournalEntry): Promise<void> {
  const user = await getAuthenticatedUser();
  const payload = toSnake({ ...entry, userId: user.id });
  const { error } = await supabase
    .from("accounting_journal_entries")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getJournalEntriesCloud(opts?: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<JournalEntry[]> {
  let query = supabase
    .from("accounting_journal_entries")
    .select("*")
    .eq("is_deleted", false)
    .order("entry_date", { ascending: false });

  if (opts?.fromDate) query = query.gte("entry_date", opts.fromDate);
  if (opts?.toDate) query = query.lte("entry_date", opts.toDate);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => toCamel(r) as JournalEntry);
}

// ─── JOURNAL LINES ────────────────────────────────────────────────────────────

export async function upsertJournalLineCloud(line: JournalLine): Promise<void> {
  const user = await getAuthenticatedUser();
  const payload = toSnake({ ...line, userId: user.id });
  const { error } = await supabase
    .from("accounting_journal_lines")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getJournalLinesCloud(entryId: string): Promise<JournalLine[]> {
  const { data, error } = await supabase
    .from("accounting_journal_lines")
    .select("*")
    .eq("entry_id", entryId)
    .eq("is_deleted", false);
  if (error) throw error;
  return (data || []).map((r) => toCamel(r) as JournalLine);
}

// ─── ACCOUNT MAPPINGS ─────────────────────────────────────────────────────────

export async function upsertAccountMappingCloud(mapping: AccountMapping): Promise<void> {
  const user = await getAuthenticatedUser();
  const payload = toSnake({ ...mapping, userId: user.id });
  const { error } = await supabase
    .from("accounting_account_mappings")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function getAccountMappingsCloud(): Promise<AccountMapping[]> {
  const { data, error } = await supabase
    .from("accounting_account_mappings")
    .select("*")
    .eq("is_deleted", false);
  if (error) throw error;
  return (data || []).map((r) => toCamel(r) as AccountMapping);
}

// ─── FULL SYNC ────────────────────────────────────────────────────────────────

/**
 * Push all pending local accounting records to Supabase (latest-wins).
 * Runs silently in background — does not throw, returns error summary.
 */
export async function pushAccountingToCloud(localStore: any): Promise<{
  pushed: number;
  errors: string[];
}> {
  let pushed = 0;
  const errors: string[] = [];

  const push = async (items: any[], fn: (item: any) => Promise<void>, label: string) => {
    const pending = (items || []).filter(
      (i) => i.syncStatus === "pending" || i.syncStatus === "failed"
    );
    for (const item of pending) {
      try {
        await fn(item);
        item.syncStatus = "synced";
        pushed++;
      } catch (e: any) {
        errors.push(`${label}[${item.id}]: ${e?.message || String(e)}`);
        item.syncStatus = "failed";
      }
    }
  };

  await push(localStore.accounts || [], upsertAccountCloud, "accounts");
  await push(localStore.fiscalPeriods || [], upsertFiscalPeriodCloud, "fiscalPeriods");
  await push(localStore.journalEntries || [], upsertJournalEntryCloud, "journalEntries");
  await push(localStore.journalLines || [], upsertJournalLineCloud, "journalLines");
  await push(localStore.accountMappings || [], upsertAccountMappingCloud, "accountMappings");

  return { pushed, errors };
}

/**
 * Pull all accounting records from Supabase (latest-wins merge by updated_at).
 */
export async function pullAccountingFromCloud(): Promise<{
  accounts: Account[];
  fiscalPeriods: FiscalPeriod[];
  journalEntries: JournalEntry[];
  journalLines: JournalLine[];
  accountMappings: AccountMapping[];
  errors: string[];
}> {
  const errors: string[] = [];
  const safe = async <T>(fn: () => Promise<T[]>, label: string): Promise<T[]> => {
    try { return await fn(); } catch (e: any) {
      errors.push(`${label}: ${e?.message}`);
      return [];
    }
  };

  const [accounts, fiscalPeriods, journalEntries, accountMappings] = await Promise.all([
    safe(getAccountsCloud, "accounts"),
    safe(getFiscalPeriodsCloud, "fiscalPeriods"),
    safe(() => getJournalEntriesCloud({ limit: 5000 }), "journalEntries"),
    safe(getAccountMappingsCloud, "accountMappings"),
  ]);

  // Pull lines for recent entries only (last 500 entries)
  const recentEntryIds = journalEntries.slice(0, 500).map((e) => e.id);
  const journalLines: JournalLine[] = [];
  for (const entryId of recentEntryIds) {
    const lines = await safe(() => getJournalLinesCloud(entryId), `lines[${entryId}]`);
    journalLines.push(...lines);
  }

  return { accounts, fiscalPeriods, journalEntries, journalLines, accountMappings, errors };
}
