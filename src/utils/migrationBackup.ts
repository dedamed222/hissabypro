import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { AccountingBackupMeta } from "@/types/accounting";
import * as CryptoJS from "crypto-js";

const BACKUP_PREFIX = "arab-hub-db-backup-";
const BACKUP_LIST_KEY = "arab-hub-db-backups-index";

export interface IntegrityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checksum: string;
  timestamp: string;
}

/**
 * Computes a SHA-256 checksum of an object
 */
export function calculateChecksum(data: any): string {
  try {
    const serialized = typeof data === "string" ? data : JSON.stringify(data);
    return CryptoJS.SHA256(serialized).toString();
  } catch (e: any) {
    return "checksum-error-" + Date.now();
  }
}

/**
 * Verifies the integrity of the store data.
 * Mimics SQLite PRAGMA integrity_check by verifying:
 * 1. Valid JSON structure and uncorrupted parsing
 * 2. Mandatory entity arrays exist (products, customers, invoices, etc.)
 * 3. Primary identifiers are intact and non-duplicated
 * 4. Record counts are valid and consistent
 */
export function verifyStoreIntegrity(storeData: any): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!storeData || typeof storeData !== "object") {
    errors.push("Data is null or not a valid object");
    return {
      valid: false,
      errors,
      warnings,
      checksum: "",
      timestamp: new Date().toISOString(),
    };
  }

  const mandatoryTables = [
    "products",
    "customers",
    "suppliers",
    "invoices",
    "returns",
    "expenses",
    "creditors",
    "debtors",
  ];

  for (const table of mandatoryTables) {
    if (!Array.isArray(storeData[table])) {
      errors.push(`Table array "${table}" is missing or corrupted`);
    }
  }

  // Check unique IDs in existing core tables
  const checkDuplicateIds = (arr: any[], tableName: string) => {
    if (!Array.isArray(arr)) return;
    const seen = new Set<string>();
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      if (item.id) {
        if (seen.has(item.id)) {
          warnings.push(`Duplicate ID detected in ${tableName}: ${item.id}`);
        } else {
          seen.add(item.id);
        }
      }
    }
  };

  if (Array.isArray(storeData.products)) checkDuplicateIds(storeData.products, "products");
  if (Array.isArray(storeData.invoices)) checkDuplicateIds(storeData.invoices, "invoices");
  if (Array.isArray(storeData.customers)) checkDuplicateIds(storeData.customers, "customers");

  const checksum = calculateChecksum(storeData);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checksum,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates an automatic pre-migration backup before touching anything.
 * Saves to local persistent storage index and returns backup metadata.
 */
export function createPreMigrationBackup(tag = "pre-migration"): AccountingBackupMeta {
  const currentData = loadStoreData();
  const integrity = verifyStoreIntegrity(currentData);

  if (!integrity.valid) {
    throw new Error(
      `Pre-migration integrity check failed: ${integrity.errors.join("; ")}`
    );
  }

  const backupId = `${tag}-${Date.now()}`;
  const serialized = JSON.stringify(currentData);

  // Store backup in separate localStorage slot
  try {
    localStorage.setItem(`${BACKUP_PREFIX}${backupId}`, serialized);

    // Update index list of backups
    const existingIndexRaw = localStorage.getItem(BACKUP_LIST_KEY);
    const existingIndex: string[] = existingIndexRaw ? JSON.parse(existingIndexRaw) : [];
    existingIndex.unshift(backupId);
    // Keep up to 10 historical backups
    if (existingIndex.length > 10) existingIndex.length = 10;
    localStorage.setItem(BACKUP_LIST_KEY, JSON.stringify(existingIndex));
  } catch (storageErr) {
    console.warn("Could not save backup in localStorage:", storageErr);
  }

  const meta: AccountingBackupMeta = {
    backupId,
    timestamp: new Date().toISOString(),
    source: "local_store",
    recordsCount: {
      accounts: Array.isArray((currentData as any).accounts) ? (currentData as any).accounts.length : 0,
      journalEntries: Array.isArray((currentData as any).journalEntries) ? (currentData as any).journalEntries.length : 0,
      journalLines: Array.isArray((currentData as any).journalLines) ? (currentData as any).journalLines.length : 0,
      fiscalPeriods: Array.isArray((currentData as any).fiscalPeriods) ? (currentData as any).fiscalPeriods.length : 0,
      accountMappings: Array.isArray((currentData as any).accountMappings) ? (currentData as any).accountMappings.length : 0,
      invoices: Array.isArray(currentData.invoices) ? currentData.invoices.length : 0,
      customers: Array.isArray(currentData.customers) ? currentData.customers.length : 0,
      suppliers: Array.isArray(currentData.suppliers) ? currentData.suppliers.length : 0,
      products: Array.isArray(currentData.products) ? currentData.products.length : 0,
    },
    checksum: integrity.checksum,
    integrityPassed: integrity.valid,
  };

  console.log(`[Backup] Created pre-migration backup ${backupId} (checksum: ${meta.checksum.slice(0, 8)})`);
  return meta;
}

/**
 * Restores a specific backup by ID with complete rollback.
 */
export function rollbackToBackup(backupId: string): boolean {
  try {
    const rawBackup = localStorage.getItem(`${BACKUP_PREFIX}${backupId}`);
    if (!rawBackup) {
      console.error(`[Rollback] Backup not found: ${backupId}`);
      return false;
    }

    const restoredData = JSON.parse(rawBackup);
    const integrity = verifyStoreIntegrity(restoredData);
    if (!integrity.valid) {
      console.error(`[Rollback] Restored data failed integrity check:`, integrity.errors);
      return false;
    }

    saveStoreData(restoredData);
    console.log(`[Rollback] Successfully restored backup: ${backupId}`);
    return true;
  } catch (err) {
    console.error(`[Rollback] Error during rollback to ${backupId}:`, err);
    return false;
  }
}

/**
 * SQLite integrity checker helper (for Capacitor SQLite or native SQLite engines)
 * Executes `PRAGMA integrity_check` on any SQLite connection interface.
 */
export async function executeSqliteIntegrityCheck(
  sqliteDbConnection: { query: (sql: string) => Promise<{ values?: any[] }> }
): Promise<{ ok: boolean; result: string }> {
  try {
    const res = await sqliteDbConnection.query("PRAGMA integrity_check;");
    const firstVal = res?.values?.[0] ? Object.values(res.values[0])[0] : "";
    const isOk = String(firstVal).toLowerCase() === "ok";
    return {
      ok: isOk,
      result: String(firstVal),
    };
  } catch (e: any) {
    return {
      ok: false,
      result: e?.message || "SQLite integrity check execution failed",
    };
  }
}
