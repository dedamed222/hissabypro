/**
 * Data Restore Utility
 * 
 * Restores recovered store data into localStorage if the store is currently empty.
 * Fetches from /recoveredStoreData.json (public folder) to avoid bloating the JS bundle.
 * Runs once at app startup, guarded by a localStorage flag.
 */

import { loadStoreData, saveStoreData } from "./localStorage";

const RESTORE_FLAG_KEY = "arab-hub-data-restored-v1";

function isStoreEmpty(): boolean {
  try {
    const data = loadStoreData();
    return (
      (!data.products || data.products.length === 0) &&
      (!data.customers || data.customers.length === 0) &&
      (!data.invoices || data.invoices.length === 0)
    );
  } catch {
    return true;
  }
}

export async function restoreRecoveredData(): Promise<{ restored: boolean; message: string }> {
  try {
    if (localStorage.getItem(RESTORE_FLAG_KEY) === "done") {
      return { restored: false, message: "البيانات محملة بالفعل" };
    }

    if (!isStoreEmpty()) {
      localStorage.setItem(RESTORE_FLAG_KEY, "done");
      return { restored: false, message: "البيانات موجودة بالفعل" };
    }

    // Fetch from public folder — not bundled, served as a static asset
    const response = await fetch("/recoveredStoreData.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const recoveredData = await response.json() as any;

    if (!recoveredData || typeof recoveredData !== "object") {
      return { restored: false, message: "ملف البيانات المستردة غير صالح" };
    }

    const storeData = {
      users: recoveredData.users || [],
      products: recoveredData.products || [],
      customers: recoveredData.customers || [],
      invoices: recoveredData.invoices || [],
      returns: recoveredData.returns || [],
      expenses: recoveredData.expenses || [],
      suppliers: recoveredData.suppliers || [],
      creditors: recoveredData.creditors || [],
      mostRecentProducts: recoveredData.mostRecentProducts || [],
      dailySales: recoveredData.dailySales || [],
      debtors: recoveredData.debtors || [],
      warehouses: recoveredData.warehouses && recoveredData.warehouses.length > 0
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
      clientNotes: recoveredData.clientNotes || [],
      priceChangeHistories: recoveredData.priceChangeHistories || [],
      customerFiles: recoveredData.customerFiles || [],
      productMovements: recoveredData.productMovements || [],
      storeInfo: recoveredData.storeInfo || { name: "", phone: "", email: "", photoUrl: "" },
    };

    saveStoreData(storeData as any);
    localStorage.setItem(RESTORE_FLAG_KEY, "done");

    const productCount = storeData.products.length;
    const invoiceCount = storeData.invoices.length;
    const customerCount = storeData.customers.length;

    console.log(`[DataRestore] Restored: ${productCount} products, ${invoiceCount} invoices, ${customerCount} customers`);

    return {
      restored: true,
      message: `تم استعادة ${productCount} منتج، ${invoiceCount} فاتورة، ${customerCount} عميل`,
    };
  } catch (error) {
    console.error("[DataRestore] Failed:", error);
    return { restored: false, message: `فشل استعادة البيانات: ${error}` };
  }
}

export function resetRestoreFlag(): void {
  localStorage.removeItem(RESTORE_FLAG_KEY);
}
