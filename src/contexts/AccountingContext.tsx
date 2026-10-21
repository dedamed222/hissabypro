/**
 * AccountingContext — Global state manager for the accounting module.
 *
 * Responsibilities:
 *  - Run one-time idempotent migration on mount (if accounting enabled)
 *  - Provide access to accounts, fiscal periods, mappings
 *  - Expose postEntry / reverseEntry / closePeriod actions
 *  - Manage sync status with Supabase in the background
 *  - Feature-flagged: if accountingModuleEnabled=false, context is a no-op shell
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Account,
  FiscalPeriod,
  JournalEntry,
  JournalLine,
  AccountMapping,
  OperationKey,
} from "@/types/accounting";
import {
  runAccountingMigration,
  getAccounts,
  getFiscalPeriods,
  getAccountMappings,
  getJournalEntries,
  getJournalLinesForEntry,
  postJournalEntry,
  reverseJournalEntry,
  closeFiscalPeriod,
  upsertAccount,
  upsertFiscalPeriod,
  getMappedAccount,
  updateAccountMapping,
  getActivePeriodForDate,
} from "@/lib/accountingDatabase";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountingContextType {
  isEnabled: boolean;
  isLoading: boolean;
  migrationError: string | null;
  accounts: Account[];
  fiscalPeriods: FiscalPeriod[];
  accountMappings: AccountMapping[];
  recentEntries: JournalEntry[];
  refreshAccounts: () => void;
  refreshPeriods: () => void;
  refreshEntries: () => void;
  getMappedAccountFn: (key: OperationKey) => Account | null;
  postEntry: (
    entryData: Omit<JournalEntry, "id" | "entryNumber" | "totalDebit" | "totalCredit" | "createdAt" | "updatedAt" | "syncStatus" | "isDeleted">,
    lines: Omit<JournalLine, "id" | "entryId" | "createdAt" | "updatedAt" | "syncStatus" | "isDeleted">[]
  ) => JournalEntry;
  reverseEntry: (entryId: string, reason: string) => JournalEntry;
  closeperiod: (periodId: string) => boolean;
  addAccount: (account: Account) => Account;
  addFiscalPeriod: (period: FiscalPeriod) => FiscalPeriod;
  setAccountMapping: (key: OperationKey, accountId: string) => void;
  getActivePeriod: (date?: string) => FiscalPeriod | null;
}

// ─── Default (disabled) context ───────────────────────────────────────────────

const noop = () => { throw new Error("Accounting module is disabled"); };

const AccountingContext = createContext<AccountingContextType>({
  isEnabled: false,
  isLoading: false,
  migrationError: null,
  accounts: [],
  fiscalPeriods: [],
  accountMappings: [],
  recentEntries: [],
  refreshAccounts: () => {},
  refreshPeriods: () => {},
  refreshEntries: () => {},
  getMappedAccountFn: () => null,
  postEntry: noop,
  reverseEntry: noop,
  closeperiod: () => false,
  addAccount: noop,
  addFiscalPeriod: noop,
  setAccountMapping: () => {},
  getActivePeriod: () => null,
});

export const useAccounting = () => useContext(AccountingContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AccountingProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const { ...settings } = useSettings();

  // Feature flag — read from stored settings
  const isEnabled = !!(settings as any).accountingModuleEnabled;

  const [isLoading, setIsLoading] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalPeriods, setFiscalPeriods] = useState<FiscalPeriod[]>([]);
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [migrationDone, setMigrationDone] = useState(false);

  // ── Refresh helpers ──────────────────────────────────────────────────────

  const refreshAccounts = useCallback(() => {
    setAccounts(getAccounts());
  }, []);

  const refreshPeriods = useCallback(() => {
    setFiscalPeriods(getFiscalPeriods());
  }, []);

  const refreshEntries = useCallback(() => {
    setRecentEntries(getJournalEntries({ limit: 200 }));
  }, []);

  const refreshAll = useCallback(() => {
    refreshAccounts();
    refreshPeriods();
    refreshEntries();
    setAccountMappings(getAccountMappings());
  }, [refreshAccounts, refreshPeriods, refreshEntries]);

  // ── One-time migration on mount ─────────────────────────────────────────

  useEffect(() => {
    if (!isEnabled || migrationDone) return;

    setIsLoading(true);
    runAccountingMigration()
      .then((result) => {
        if (result.success) {
          setMigrationDone(true);
          refreshAll();
        } else {
          setMigrationError(result.message);
          console.error("[AccountingContext] Migration failed:", result.message);
        }
      })
      .catch((e) => setMigrationError(String(e)))
      .finally(() => setIsLoading(false));
  }, [isEnabled, migrationDone, refreshAll]);

  // ── Sync after migration when authenticated ─────────────────────────────

  useEffect(() => {
    if (!isEnabled || !isAuthenticated || !migrationDone) return;

    // Background cloud push — never blocks UI
    const pushAsync = async () => {
      try {
        const { pushAccountingToCloud } = await import("@/lib/accountingSupabase");
        const store = loadStoreData() as any;
        const result = await pushAccountingToCloud(store);
        if (result.pushed > 0) {
          saveStoreData(store);
          console.log(`[AccountingSync] Pushed ${result.pushed} records`);
        }
        if (result.errors.length > 0) {
          console.warn("[AccountingSync] Errors:", result.errors);
        }
      } catch (e) {
        console.warn("[AccountingSync] Push failed silently:", e);
      }
    };

    const timer = setTimeout(pushAsync, 4000);
    return () => clearTimeout(timer);
  }, [isEnabled, isAuthenticated, migrationDone]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const postEntry = useCallback(
    (entryData: any, lines: any[]): JournalEntry => {
      const result = postJournalEntry(entryData, lines);
      refreshEntries();
      return result;
    },
    [refreshEntries]
  );

  const reverseEntry = useCallback(
    (entryId: string, reason: string): JournalEntry => {
      const result = reverseJournalEntry(entryId, reason);
      refreshEntries();
      return result;
    },
    [refreshEntries]
  );

  const closeperiod = useCallback(
    (periodId: string): boolean => {
      const result = closeFiscalPeriod(periodId);
      refreshPeriods();
      return result;
    },
    [refreshPeriods]
  );

  const addAccount = useCallback(
    (account: Account): Account => {
      const result = upsertAccount(account);
      refreshAccounts();
      return result;
    },
    [refreshAccounts]
  );

  const addFiscalPeriod = useCallback(
    (period: FiscalPeriod): FiscalPeriod => {
      const result = upsertFiscalPeriod(period);
      refreshPeriods();
      return result;
    },
    [refreshPeriods]
  );

  const setAccountMapping = useCallback(
    (key: OperationKey, accountId: string) => {
      updateAccountMapping(key, accountId);
      setAccountMappings(getAccountMappings());
    },
    []
  );

  const getMappedAccountFn = useCallback(
    (key: OperationKey): Account | null => getMappedAccount(key),
    []
  );

  const getActivePeriod = useCallback(
    (date?: string): FiscalPeriod | null =>
      getActivePeriodForDate(date || new Date().toISOString().split("T")[0]),
    []
  );

  // ── Context value ────────────────────────────────────────────────────────

  return (
    <AccountingContext.Provider
      value={{
        isEnabled,
        isLoading,
        migrationError,
        accounts,
        fiscalPeriods,
        accountMappings,
        recentEntries,
        refreshAccounts,
        refreshPeriods,
        refreshEntries,
        getMappedAccountFn,
        postEntry,
        reverseEntry,
        closeperiod,
        addAccount,
        addFiscalPeriod,
        setAccountMapping,
        getActivePeriod,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};
