import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { restoreRecoveredData } from "@/utils/restoreData";
import { pushToCloud } from "@/hooks/useAutoSync";
import { AccountingProvider } from "@/contexts/AccountingContext";

import { Suspense, lazy, useEffect, useState } from "react";

// Pages (Lazy Loaded)
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const NotFound = lazy(() => import("./pages/NotFound"));
import Layout from "./components/layout/Layout";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Customers = lazy(() => import("./pages/Customers"));
const ClientNotes = lazy(() => import("./pages/ClientNotes"));
const CreateInvoice = lazy(() => import("./pages/CreateInvoice"));
const Sales = lazy(() => import("./pages/Sales"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Returns = lazy(() => import("./pages/Returns"));
const Debtors = lazy(() => import("./pages/Debtors"));
const DebtorsOverview = lazy(() => import("./pages/DebtorsOverview"));
const Creditors = lazy(() => import("./pages/Creditors"));
const CreditorDetails = lazy(() => import("./pages/CreditorDetails"));
const CreditorsOverview = lazy(() => import("./pages/CreditorsOverview"));
const Archive = lazy(() => import("./pages/Archive"));
const Settings = lazy(() => import("./pages/Settings"));
const AccountStatement = lazy(() => import("./pages/AccountStatement"));
const Payments = lazy(() => import("./pages/Payments"));
const UnpaidInvoices = lazy(() => import("./pages/UnpaidInvoices"));
// ── Accounting Module (feature-flagged, lazy loaded) ──────────────────────────
const AccountingJournal = lazy(() => import("./pages/accounting/AccountingJournal"));
const AccountingLedger = lazy(() => import("./pages/accounting/AccountingLedger"));
const AccountingTrialBalance = lazy(() => import("./pages/accounting/AccountingTrialBalance"));
const AccountingStatements = lazy(() => import("./pages/accounting/AccountingStatements"));
const ChartOfAccounts = lazy(() => import("./pages/accounting/ChartOfAccounts"));
const FiscalPeriods = lazy(() => import("./pages/accounting/FiscalPeriods"));
const ThirdPartyAccounts = lazy(() => import("./pages/accounting/ThirdPartyAccounts"));
const AccountingBackfill = lazy(() => import("./pages/accounting/AccountingBackfill"));
const AccountingSettings = lazy(() => import("./pages/accounting/AccountingSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      try {
        return await get(key);
      } catch (e) {
        console.warn("Error reading from IndexedDB persister:", e);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await set(key, value);
      } catch (e) {
        console.warn("Error saving to IndexedDB persister:", e);
      }
    },
    removeItem: async (key) => {
      try {
        await del(key);
      } catch (e) {
        console.warn("Error deleting from IndexedDB persister:", e);
      }
    },
  },
});

const App = () => {
  const [restoreChecked, setRestoreChecked] = useState(false);

  // Step 1: On first ever load — check if localStorage is empty and restore data
  useEffect(() => {
    restoreRecoveredData().then(({ restored, message }) => {
      if (restored) {
        console.log("[DataRestore]", message);
        // Reload so all contexts pick up the restored data fresh
        window.location.reload();
      } else {
        setRestoreChecked(true);
      }
    }).catch((e) => {
      console.error("[DataRestore] error:", e);
      setRestoreChecked(true);
    });
  }, []);

  // Step 2: After page reloads with restored data, push everything to cloud
  useEffect(() => {
    const alreadyRestored = localStorage.getItem("arab-hub-data-restored-v2") === "done";
    const cloudPushDone = localStorage.getItem("arab-hub-cloud-push-v2") === "done";
    if (alreadyRestored && !cloudPushDone && navigator.onLine) {
      // Delay slightly to let contexts initialize first
      const timer = setTimeout(() => {
        pushToCloud(() => {}).then(() => {
          localStorage.setItem("arab-hub-cloud-push-v2", "done");
          console.log("[CloudSync] Restored data pushed to cloud successfully");
        }).catch((e) => {
          console.warn("[CloudSync] Cloud push failed (will retry next load):", e);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!restoreChecked && localStorage.getItem("arab-hub-data-restored-v2") !== "done") {
    // Show a brief loading screen while we check/restore data
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: "16px", background: "#0f172a", color: "#94a3b8", fontFamily: "sans-serif" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #1e40af", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p>جاري استعادة البيانات...</p>
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <TooltipProvider>
          <AuthProvider>
            <AppProvider>
              <SettingsProvider>
                <AccountingProvider>
                <OfflineIndicator />
                <Toaster />
                <Sonner />
                <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-arab-blue"></div></div>}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected routes */}
                    <Route path="/" element={<Layout />}>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="products" element={<Products />} />
                      <Route path="inventory" element={<Inventory />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="client-notes" element={<ClientNotes />} />
                      <Route path="create-invoice" element={<CreateInvoice />} />
                      <Route path="sales" element={<Sales />} />
                      <Route path="suppliers" element={<Suppliers />} />
                      <Route path="expenses" element={<Expenses />} />
                      <Route path="returns" element={<Returns />} />
                      <Route path="debtors" element={<Debtors />} />
                      <Route path="debtors/overview" element={<DebtorsOverview />} />
                      <Route path="creditors" element={<Creditors />} />
                      <Route path="creditors/overview" element={<CreditorsOverview />} />
                      <Route path="creditors/:name" element={<CreditorDetails />} />
                      <Route path="archive" element={<Archive />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="account-statement" element={<AccountStatement />} />
                      <Route path="payments" element={<Payments />} />
                      <Route path="unpaid-invoices" element={<UnpaidInvoices />} />
                      {/* ── Accounting Module Routes (visible only when feature flag enabled) ── */}
                      <Route path="accounting/journal" element={<AccountingJournal />} />
                      <Route path="accounting/ledger" element={<AccountingLedger />} />
                      <Route path="accounting/trial-balance" element={<AccountingTrialBalance />} />
                      <Route path="accounting/financial-statements" element={<AccountingStatements />} />
                      <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                      <Route path="accounting/periods" element={<FiscalPeriods />} />
                      <Route path="accounting/third-parties" element={<ThirdPartyAccounts />} />
                      <Route path="accounting/backfill" element={<AccountingBackfill />} />
                      <Route path="accounting/settings" element={<AccountingSettings />} />
                    </Route>

                    {/* 404 route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </AccountingProvider>
              </SettingsProvider>
            </AppProvider>
          </AuthProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
