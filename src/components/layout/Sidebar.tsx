
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  StickyNote,
  FileText,
  ShoppingCart,
  Truck,
  DollarSign,
  Undo,
  UserCheck,
  UserX,
  Archive,
  Settings,
  Receipt,
  CreditCard,
  AlertCircle,
  Warehouse,
  LogOut,
  LogIn,
  X,
  Menu,
  TrendingUp
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MenuItem {
  titleKey: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bgColor: string;
}

interface MenuGroup {
  labelKey: string;
  items: MenuItem[];
}

const Sidebar = () => {
  const { sidebarOpen, closeSidebar, sidebarCollapsed, toggleCollapse, toggleSidebar } = useApp();
  const { logout, isAuthenticated, user, profile } = useAuth();
  const { locale } = useLocale();
  const t = translations[locale];
  const navigate = useNavigate();

  const menuGroups: MenuGroup[] = [
    {
      labelKey: "menuGroupOverview",
      items: [
        { titleKey: "home", icon: LayoutDashboard, path: "/dashboard", color: "#6366f1", bgColor: "rgba(99,102,241,0.1)" },
      ]
    },
    {
      labelKey: "menuGroupSales",
      items: [
        { titleKey: "createInvoice", icon: FileText, path: "/create-invoice", color: "#0ea5e9", bgColor: "rgba(14,165,233,0.1)" },
        { titleKey: "sales", icon: ShoppingCart, path: "/sales", color: "#10b981", bgColor: "rgba(16,185,129,0.1)" },
        { titleKey: "returns", icon: Undo, path: "/returns", color: "#f59e0b", bgColor: "rgba(245,158,11,0.1)" },
        { titleKey: "unpaidInvoices", icon: AlertCircle, path: "/unpaid-invoices", color: "#ef4444", bgColor: "rgba(239,68,68,0.1)" },
        { titleKey: "archive", icon: Archive, path: "/archive", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.1)" },
      ]
    },
    {
      labelKey: "menuGroupInventory",
      items: [
        { titleKey: "products", icon: Package, path: "/products", color: "#06b6d4", bgColor: "rgba(6,182,212,0.1)" },
        { titleKey: "inventory", icon: Warehouse, path: "/inventory", color: "#f97316", bgColor: "rgba(249,115,22,0.1)" },
        { titleKey: "suppliers", icon: Truck, path: "/suppliers", color: "#84cc16", bgColor: "rgba(132,204,22,0.1)" },
        { titleKey: "expenses", icon: DollarSign, path: "/expenses", color: "#ec4899", bgColor: "rgba(236,72,153,0.1)" },
      ]
    },
    {
      labelKey: "menuGroupFinance",
      items: [
        { titleKey: "customers", icon: Users, path: "/customers", color: "#a855f7", bgColor: "rgba(168,85,247,0.1)" },
        { titleKey: "clientNotes", icon: StickyNote, path: "/client-notes", color: "#f59e0b", bgColor: "rgba(245,158,11,0.1)" },
        { titleKey: "debtors", icon: UserCheck, path: "/debtors", color: "#22c55e", bgColor: "rgba(34,197,94,0.1)" },
        { titleKey: "creditors", icon: UserX, path: "/creditors", color: "#ef4444", bgColor: "rgba(239,68,68,0.1)" },
        { titleKey: "payments", icon: CreditCard, path: "/payments", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.1)" },
        { titleKey: "accountStatement", icon: Receipt, path: "/account-statement", color: "#06b6d4", bgColor: "rgba(6,182,212,0.1)" },
      ]
    },
    {
      labelKey: "menuGroupSystem",
      items: [
        { titleKey: "settings", icon: Settings, path: "/settings", color: "#64748b", bgColor: "rgba(100,116,139,0.1)" },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    toast({ title: t.logoutSuccess, description: t.logoutSuccessDesc });
    navigate("/login");
  };

  const handleLogin = () => navigate("/login");

  const userName = profile?.name || user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase() || (locale === "ar" ? "م" : "U");

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col h-full transition-all duration-300 ease-in-out print:hidden",
          "fixed inset-y-0 start-0 z-50 lg:relative lg:transform-none lg:translate-x-0",
          "border-e border-gray-200/50",
          sidebarCollapsed ? "w-[68px]" : "w-64",
          sidebarOpen
            ? "translate-x-0 rtl:translate-x-0"
            : "-translate-x-full rtl:translate-x-full"
        )}
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,249,255,0.97) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "2px 0 20px rgba(99,102,241,0.06), 1px 0 0 rgba(226,232,240,0.5)"
        }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-3 pt-4 pb-3 border-b border-gray-100/80">
          <div className="flex items-center justify-between">
            {/* Logo + Brand */}
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">Hissaby Pro</h2>
                  <p className="text-[10px] text-gray-400 leading-tight">{t.storeManagementSystem}</p>
                </div>
              </div>
            )}

            {sidebarCollapsed && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Toggle buttons */}
            <div className="flex items-center gap-1">
              {/* Desktop collapse toggle */}
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                title={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
              >
                <svg className={cn("w-4 h-4 transition-transform", sidebarCollapsed && "rotate-180")}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={locale === "ar" ? "M11 19l-7-7 7-7M5 19l7-7-7-7" : "M13 19l7-7-7-7M5 19l7-7-7-7"} />
                </svg>
              </button>

              {/* Mobile close */}
              <button
                onClick={closeSidebar}
                className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {menuGroups.map((group) => (
            <div key={group.labelKey} className="mb-1">
              {/* Group label */}
              {!sidebarCollapsed && (
                <div className="sidebar-group-label">
                  {t[group.labelKey as keyof typeof t] as string}
                </div>
              )}

              {/* Group items */}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                    title={sidebarCollapsed ? t[item.titleKey as keyof typeof t] as string : undefined}
                    className={({ isActive }) =>
                      cn(
                        "nav-link-premium",
                        sidebarCollapsed && "justify-center px-2",
                        isActive && "active"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className="nav-icon flex-shrink-0"
                          style={{
                            background: isActive ? item.color : "transparent",
                            color: isActive ? "#fff" : item.color,
                          }}
                        >
                          <item.icon className="w-4 h-4" />
                        </div>
                        {!sidebarCollapsed && (
                          <span className="truncate flex-1 text-[0.825rem]">
                            {t[item.titleKey as keyof typeof t] as string}
                          </span>
                        )}
                        {!sidebarCollapsed && isActive && (
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: item.color }} />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-2 pb-4 border-t border-gray-100/80 pt-3 space-y-2">
          {/* User Card */}
          {!sidebarCollapsed && isAuthenticated && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gray-50/80">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] font-semibold text-gray-800 truncate">{userName}</p>
                <p className="text-[0.68rem] text-gray-400">
                  {profile?.role === "admin" ? t.admin : t.user}
                </p>
              </div>
            </div>
          )}

          {/* Logout / Login */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              title={sidebarCollapsed ? t.logout : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[0.825rem] font-medium",
                "bg-red-50 text-red-600 hover:bg-red-100 transition-all",
                sidebarCollapsed && "justify-center px-2"
              )}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span>{t.logout}</span>}
            </button>
          ) : (
            <button
              onClick={handleLogin}
              title={sidebarCollapsed ? t.login : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[0.825rem] font-medium",
                "bg-green-50 text-green-600 hover:bg-green-100 transition-all",
                sidebarCollapsed && "justify-center px-2"
              )}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              {!sidebarCollapsed && <span>{t.login}</span>}
            </button>
          )}

          {/* Version indicator */}
          {!sidebarCollapsed && (
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="pulse-dot" />
              <span className="text-[0.65rem] text-gray-400">{t.systemVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 mobile-nav-premium z-40 pb-safe print:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          {/* Dashboard */}
          <NavLink to="/dashboard"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-all",
              isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            )}>
            {({ isActive }) => (
              <>
                <div className={cn("p-1.5 rounded-lg transition-all", isActive && "bg-indigo-50")}>
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-medium">{t.home}</span>
              </>
            )}
          </NavLink>

          {/* Products */}
          <NavLink to="/products"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-all",
              isActive ? "text-cyan-600" : "text-gray-400 hover:text-gray-600"
            )}>
            {({ isActive }) => (
              <>
                <div className={cn("p-1.5 rounded-lg transition-all", isActive && "bg-cyan-50")}>
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-medium">{t.products}</span>
              </>
            )}
          </NavLink>

          {/* Create Invoice — Center FAB */}
          <NavLink to="/create-invoice"
            className="flex flex-col items-center justify-center w-full h-full -mt-6 gap-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-[9px] font-medium text-indigo-600">{t.createInvoice}</span>
          </NavLink>

          {/* Sales */}
          <NavLink to="/sales"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-all",
              isActive ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
            )}>
            {({ isActive }) => (
              <>
                <div className={cn("p-1.5 rounded-lg transition-all", isActive && "bg-emerald-50")}>
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-medium">{t.sales}</span>
              </>
            )}
          </NavLink>

          {/* More Menu */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-all",
              sidebarOpen ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <div className={cn("p-1.5 rounded-lg transition-all", sidebarOpen && "bg-indigo-50")}>
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-medium">{t.mainMenu}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
