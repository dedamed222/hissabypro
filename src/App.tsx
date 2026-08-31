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

import { Suspense, lazy } from "react";

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
    getItem: async (key) => await get(key),
    setItem: async (key, value) => await set(key, value),
    removeItem: async (key) => await del(key),
  },
});

const App = () => {
  return (
    <BrowserRouter>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <TooltipProvider>
          <AuthProvider>
            <AppProvider>
              <SettingsProvider>
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
                    </Route>

                    {/* 404 route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SettingsProvider>
            </AppProvider>
          </AuthProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
