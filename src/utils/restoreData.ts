/**
 * Data Restore Utility
 * 
 * Restores and enriches store data with recovered invoices, client notes,
 * customer files, and product movements.
 * Fetches from /recoveredStoreData.json (public folder) to avoid bloating the JS bundle.
 * Guarded by a localStorage flag, but will also enrich if notes or customer invoices are missing.
 */

import { loadStoreData, saveStoreData } from "./localStorage";

const RESTORE_FLAG_KEY = "arab-hub-data-restored-v2";

export async function restoreRecoveredData(force = false): Promise<{ restored: boolean; message: string }> {
  try {
    const isDone = localStorage.getItem(RESTORE_FLAG_KEY) === "done";
    const currentData = loadStoreData();

    // Check if store already has clientNotes, customer invoices, and products
    const hasClientNotes = currentData.clientNotes && currentData.clientNotes.length > 0;
    const hasInvoices = currentData.invoices && currentData.invoices.length > 0;
    const hasCustomerFiles = currentData.customerFiles && currentData.customerFiles.length > 0;

    if (!force && isDone && hasClientNotes && hasInvoices && hasCustomerFiles) {
      return { restored: false, message: "البيانات مكتملة ومحملة بالفعل" };
    }

    // Fetch from public folder — served as a static asset
    const response = await fetch("/recoveredStoreData.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const recoveredData = (await response.json()) as any;

    if (!recoveredData || typeof recoveredData !== "object") {
      return { restored: false, message: "ملف البيانات المستردة غير صالح" };
    }

    // Safe merge helper: keeps local items if already present, adds missing recovered items
    const mergeById = <T extends { id?: string }>(recoveredList: T[] = [], localList: T[] = []): T[] => {
      const map = new Map<string, T>();
      recoveredList.forEach((item) => {
        if (item && item.id) map.set(item.id, item);
      });
      localList.forEach((item) => {
        if (item && item.id) map.set(item.id, item);
      });
      return Array.from(map.values());
    };

    const storeData = {
      users: mergeById(recoveredData.users || [], currentData.users),
      products: mergeById(recoveredData.products || [], currentData.products),
      customers: mergeById(recoveredData.customers || [], currentData.customers),
      invoices: mergeById(recoveredData.invoices || [], currentData.invoices),
      returns: mergeById(recoveredData.returns || [], currentData.returns),
      expenses: mergeById(recoveredData.expenses || [], currentData.expenses),
      suppliers: mergeById(recoveredData.suppliers || [], currentData.suppliers),
      creditors: mergeById(recoveredData.creditors || [], currentData.creditors),
      mostRecentProducts: Array.from(new Set([...(currentData.mostRecentProducts || []), ...(recoveredData.mostRecentProducts || [])])),
      dailySales: mergeById(recoveredData.dailySales || [], currentData.dailySales),
      debtors: mergeById(recoveredData.debtors || [], currentData.debtors),
      warehouses: mergeById(
        recoveredData.warehouses && recoveredData.warehouses.length > 0
          ? recoveredData.warehouses
          : [
              {
                id: "WH-MAIN",
                name: "المخزن الرئيسي",
                location: "الموقع الرئيسي",
                description: "المخزن الرئيسي للمنتجات",
                isActive: true,
                createdAt: new Date().toISOString(),
              },
            ],
        currentData.warehouses
      ),
      clientNotes: mergeById(recoveredData.clientNotes || [], currentData.clientNotes),
      priceChangeHistories: mergeById(recoveredData.priceChangeHistories || [], currentData.priceChangeHistories),
      customerFiles: mergeById(recoveredData.customerFiles || [], currentData.customerFiles),
      productMovements: mergeById(recoveredData.productMovements || [], currentData.productMovements),
      storeInfo: currentData.storeInfo?.name ? currentData.storeInfo : (recoveredData.storeInfo || { name: "", phone: "", email: "", photoUrl: "" }),
      settings: currentData.settings || recoveredData.settings || undefined,
    };

    saveStoreData(storeData as any);
    localStorage.setItem(RESTORE_FLAG_KEY, "done");

    const productCount = storeData.products.length;
    const invoiceCount = storeData.invoices.length;
    const customerCount = storeData.customers.length;
    const notesCount = storeData.clientNotes.length;
    const filesCount = storeData.customerFiles.length;

    console.log(`[DataRestore] Restored: ${productCount} products, ${invoiceCount} invoices, ${customerCount} customers, ${notesCount} client notes, ${filesCount} files`);

    return {
      restored: true,
      message: `تم استعادة وتحديث ${productCount} منتج، ${invoiceCount} فاتورة، ${customerCount} عميل، ${notesCount} ملاحظة، ${filesCount} ملف بنجاح`,
    };
  } catch (error) {
    console.error("[DataRestore] Failed:", error);
    return { restored: false, message: `فشل استعادة البيانات: ${error}` };
  }
}

export function resetRestoreFlag(): void {
  localStorage.removeItem(RESTORE_FLAG_KEY);
  localStorage.removeItem("arab-hub-data-restored-v1");
}
