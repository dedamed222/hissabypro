
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
  Menu
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Sidebar = () => {
  const { sidebarOpen, closeSidebar, sidebarCollapsed, toggleCollapse, toggleSidebar } = useApp();
  const { logout, isAuthenticated, user, profile } = useAuth();
  const { locale } = useLocale();
  const t = translations[locale];
  const navigate = useNavigate();

  const menuItems = [
    {
      titleKey: "home",
      icon: LayoutDashboard,
      path: "/dashboard",
      color: "from-blue-500 to-cyan-500"
    },
    {
      titleKey: "products",
      icon: Package,
      path: "/products",
      color: "from-green-500 to-emerald-500"
    },
    {
      titleKey: "inventory",
      icon: Warehouse,
      path: "/inventory",
      color: "from-orange-500 to-red-500"
    },
    {
      titleKey: "customers",
      icon: Users,
      path: "/customers",
      color: "from-purple-500 to-pink-500"
    },
    {
      titleKey: "createInvoice",
      icon: FileText,
      path: "/create-invoice",
      color: "from-indigo-500 to-blue-500"
    },
    {
      titleKey: "sales",
      icon: ShoppingCart,
      path: "/sales",
      color: "from-teal-500 to-green-500"
    },
    {
      titleKey: "suppliers",
      icon: Truck,
      path: "/suppliers",
      color: "from-amber-500 to-orange-500"
    },
    {
      titleKey: "expenses",
      icon: DollarSign,
      path: "/expenses",
      color: "from-red-500 to-pink-500"
    },
    {
      titleKey: "returns",
      icon: Undo,
      path: "/returns",
      color: "from-gray-500 to-slate-500"
    },
    {
      titleKey: "debtors",
      icon: UserCheck,
      path: "/debtors",
      color: "from-lime-500 to-green-500"
    },
    {
      titleKey: "creditors",
      icon: UserX,
      path: "/creditors",
      color: "from-rose-500 to-red-500"
    },
    {
      titleKey: "payments",
      icon: CreditCard,
      path: "/payments",
      color: "from-violet-500 to-purple-500"
    },
    {
      titleKey: "unpaidInvoices",
      icon: AlertCircle,
      path: "/unpaid-invoices",
      color: "from-yellow-500 to-amber-500"
    },
    {
      titleKey: "accountStatement",
      icon: Receipt,
      path: "/account-statement",
      color: "from-emerald-500 to-teal-500"
    },
    {
      titleKey: "archive",
      icon: Archive,
      path: "/archive",
      color: "from-stone-500 to-gray-500"
    },
    {
      titleKey: "settings",
      icon: Settings,
      path: "/settings",
      color: "from-slate-500 to-zinc-500"
    },
  ];

  const handleLogout = () => {
    logout();
    toast({
      title: t.logoutSuccess,
      description: t.logoutSuccessDesc,
    });
    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Desktop/Tablet Sidebar (Slide-in on mobile) */}
      <div className={cn(
        "bg-white/95 backdrop-blur-md shadow-lg border-e border-gray-200/50 transition-all duration-300 print:hidden",
        "fixed inset-y-0 start-0 z-50 h-full lg:relative lg:transform-none lg:translate-x-0 rtl:lg:translate-x-0",
        sidebarCollapsed ? "w-20" : "w-64",
        sidebarOpen
          ? "translate-x-0"
          : "-translate-x-full rtl:translate-x-full"
      )}>
        <div className="flex flex-col h-full pb-16 lg:pb-0">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors hidden lg:block"
                aria-label={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
                title={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
              >
                <svg
                  className={cn("w-5 h-5 text-gray-600 transition-transform", sidebarCollapsed && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
              {/* Close button for mobile inside sidebar */}
              <button
                onClick={closeSidebar}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors lg:hidden"
                aria-label={t.closeMenu}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t.mainMenu}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{t.comprehensiveSystem}</p>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    closeSidebar();
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-sm font-medium relative overflow-hidden min-h-[44px]",
                    sidebarCollapsed && "justify-center",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-md border border-blue-200/50 scale-105"
                      : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/50 hover:text-gray-800 hover:shadow-sm hover:scale-102"
                  )
                }
                title={sidebarCollapsed ? t[item.titleKey as keyof typeof t] as string : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-2 rounded-lg transition-all duration-200 ${isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                      : "bg-gray-100 group-hover:bg-gray-200"
                      }`}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                    </div>
                    {!sidebarCollapsed && <span className="truncate flex-1">{t[item.titleKey as keyof typeof t]}</span>}
                    {!sidebarCollapsed && isActive && (
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200/50 bg-gradient-to-r from-gray-50 to-blue-50/30 space-y-3">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-sm font-medium bg-gradient-to-r from-red-50 to-rose-50 text-red-700 hover:shadow-md border border-red-200/50 hover:scale-105 min-h-[44px]",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? t.logout : undefined}
              >
                <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg">
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                </div>
                {!sidebarCollapsed && <span className="truncate flex-1">{t.logout}</span>}
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className={cn(
                  "w-full group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-sm font-medium bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:shadow-md border border-green-200/50 hover:scale-105 min-h-[44px]",
                  sidebarCollapsed && "justify-center"
                )}
                title={sidebarCollapsed ? t.login : undefined}
              >
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                  <LogIn className="w-5 h-5 flex-shrink-0" />
                </div>
                {!sidebarCollapsed && <span className="truncate flex-1">{t.login}</span>}
              </button>
            )}

            {!sidebarCollapsed && (
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">
                  {t.systemVersion}
                </div>
                <div className="flex justify-center space-x-2 gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">{t.connected}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-medium truncate w-full text-center">{t.home}</span>
          </NavLink>

          {/* Products */}
          <NavLink
            to="/products"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Package className="w-6 h-6" />
            <span className="text-[10px] font-medium truncate w-full text-center">{t.products}</span>
          </NavLink>

          {/* Create Invoice (Prominent Center Button) */}
          <NavLink
            to="/create-invoice"
            className="flex flex-col items-center justify-center w-full h-full -mt-5"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium text-blue-600 mt-1 truncate w-full text-center">{t.createInvoice}</span>
          </NavLink>

          {/* Sales */}
          <NavLink
            to="/sales"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-[10px] font-medium truncate w-full text-center">{t.sales}</span>
          </NavLink>

          {/* More Menu */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              sidebarOpen ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-medium truncate w-full text-center">{t.mainMenu}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
