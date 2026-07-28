import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import CreateInvoice from "./pages/CreateInvoice";
import Sales from "./pages/Sales";
import Suppliers from "./pages/Suppliers";
import Expenses from "./pages/Expenses";
import Returns from "./pages/Returns";
import Debtors from "./pages/Debtors";
import DebtorsOverview from "./pages/DebtorsOverview";
import Creditors from "./pages/Creditors";
import CreditorDetails from "./pages/CreditorDetails";
import CreditorsOverview from "./pages/CreditorsOverview";
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";
import AccountStatement from "./pages/AccountStatement";
import Payments from "./pages/Payments";
import UnpaidInvoices from "./pages/UnpaidInvoices";

const queryClient = new QueryClient();

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppProvider>
              <SettingsProvider>
                <OfflineIndicator />
                <Toaster />
                <Sonner />
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
              </SettingsProvider>
            </AppProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
