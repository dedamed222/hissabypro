import React, { useState, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { useSettings } from "@/contexts/SettingsContext";
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
  TrendingUp,
  Search,
  PanelLeft,
  PanelBottom,
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
  const { navPosition = "bottom", updateSettings } = useSettings();
  const t = translations[locale];
  const navigate = useNavigate();

  const [menuSearch, setMenuSearch] = useState("");

  const isBottomMode = navPosition === "bottom";

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

  const toggleNavMode = () => {
    const nextMode = isBottomMode ? "sidebar" : "bottom";
    updateSettings({ navPosition: nextMode });
    toast({
      title: t.settingsSaved || "تم تحديث موضع شريط التنقل",
      description: nextMode === "bottom" ? t.navPositionBottom : t.navPositionSidebar,
    });
  };

  const userName = profile?.name || user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase() || (locale === "ar" ? "م" : "U");

  // Filtered menu items for Bottom Sheet search
  const filteredGroups = useMemo(() => {
    if (!menuSearch.trim()) return menuGroups;
    const q = menuSearch.trim().toLowerCase();
    return menuGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          const title = (t[item.titleKey as keyof typeof t] as string || "").toLowerCase();
          return title.includes(q);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [menuGroups, menuSearch, t]);

  return (
    <>
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. CLASSIC VERTICAL SIDEBAR (Shown ONLY when navPosition === 'sidebar' on Desktop) */}
      {/* ────────────────────────────────────────────────────────── */}
      {!isBottomMode && (
        <aside
          className={cn(
            "hidden lg:flex flex-col h-full transition-all duration-300 ease-in-out print:hidden flex-shrink-0 z-30",
            "border-e border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-sm",
            sidebarCollapsed ? "w-[68px]" : "w-64"
          )}
        >
          {/* Header */}
          <div className="flex-shrink-0 px-3 pt-4 pb-3 border-b border-gray-100/80">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2.5 px-1">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 leading-tight">Hissaby Pro</h2>
                    <p className="text-[10px] text-gray-400 leading-tight">{t.storeManagementSystem}</p>
                  </div>
                </div>
              )}

              {sidebarCollapsed && (
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              )}

              <button
                onClick={toggleCollapse}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                title={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
              >
                <svg
                  className={cn("w-4 h-4 transition-transform", sidebarCollapsed && "rotate-180")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={locale === "ar" ? "M11 19l-7-7 7-7M5 19l7-7-7-7" : "M13 19l7-7-7-7M5 19l7-7-7-7"}
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {menuGroups.map((group) => (
              <div key={group.labelKey} className="mb-1">
                {!sidebarCollapsed && (
                  <div className="sidebar-group-label">
                    {t[group.labelKey as keyof typeof t] as string}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "sidebar-link-premium group relative",
                            sidebarCollapsed && "justify-center px-0 py-2.5",
                            isActive && "sidebar-link-active font-semibold shadow-sm"
                          )
                        }
                        title={sidebarCollapsed ? (t[item.titleKey as keyof typeof t] as string) : undefined}
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                                isActive ? "shadow-sm" : ""
                              )}
                              style={{
                                backgroundColor: isActive ? item.color : item.bgColor,
                                color: isActive ? "#ffffff" : item.color,
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            {!sidebarCollapsed && (
                              <span className="truncate flex-1 text-[0.825rem]">
                                {t[item.titleKey as keyof typeof t] as string}
                              </span>
                            )}
                            {!sidebarCollapsed && isActive && (
                              <div
                                className="w-1.5 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 p-3 border-t border-gray-100/80 bg-gray-50/50 space-y-2">
            {!sidebarCollapsed && isAuthenticated && (
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white border border-gray-100 shadow-xs">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
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

            {/* Switch to Bottom Bar button */}
            {!sidebarCollapsed && (
              <button
                onClick={toggleNavMode}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[0.75rem] text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-all font-medium"
                title={t.navPositionBottom}
              >
                <span className="flex items-center gap-2">
                  <PanelBottom className="w-3.5 h-3.5" />
                  <span>{t.navPositionBottom}</span>
                </span>
                <span className="text-[10px] text-indigo-500">تبديل</span>
              </button>
            )}

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
          </div>
        </aside>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. BOTTOM NAVIGATION BAR - FULL WIDTH */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 gsc-bottom-nav print:hidden transition-all duration-300 pb-safe",
          !isBottomMode && "lg:hidden"
        )}
      >
        <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {/* Dashboard (الرئيسية) - Large active pill */}
          <NavLink
            to="/dashboard"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-600 hover:text-blue-600 hover:bg-slate-100"
              )
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-xs truncate">{t.home}</span>
          </NavLink>

          {/* Products (المنتجات) */}
          <NavLink
            to="/products"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <Package className="w-4 h-4 text-cyan-600" />
            <span className="hidden sm:inline truncate">{t.products}</span>
          </NavLink>

          {/* Inventory (المخزون) */}
          <NavLink
            to="/inventory"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <Warehouse className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline truncate">{t.inventory}</span>
          </NavLink>

          {/* Sales (المبيعات) */}
          <NavLink
            to="/sales"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <ShoppingCart className="w-4 h-4 text-emerald-500" />
            <span className="truncate">{t.sales}</span>
          </NavLink>

          {/* Invoices (الفواتير) */}
          <NavLink
            to="/create-invoice"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline truncate">{t.invoices || "الفواتير"}</span>
          </NavLink>

          {/* Customers (العملاء) */}
          <NavLink
            to="/customers"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline truncate">{t.customers}</span>
          </NavLink>

          {/* Suppliers (الموردون) */}
          <NavLink
            to="/suppliers"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <Truck className="w-4 h-4 text-teal-500" />
            <span className="truncate">{t.suppliers}</span>
          </NavLink>

          {/* Expenses (المصروفات) */}
          <NavLink
            to="/expenses"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <DollarSign className="w-4 h-4 text-rose-500" />
            <span className="truncate">{t.expenses}</span>
          </NavLink>

          {/* Reports (التقارير) */}
          <NavLink
            to="/account-statement"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
                isActive ? "text-blue-600 font-bold bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            <Receipt className="w-4 h-4 text-purple-500" />
            <span className="truncate">{t.reports || "التقارير"}</span>
          </NavLink>

          {/* More Menu (...) */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all flex-shrink-0",
              sidebarOpen ? "text-blue-600 font-bold bg-blue-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <span className="tracking-widest text-sm leading-none font-bold">...</span>
            <span className="text-xs truncate">{locale === "ar" ? "المزيد" : "Plus"}</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. MODERN BOTTOM SHEET (Opens when clicking "Main Menu / المزيد") */}
      {/* Native-feeling, thumb-friendly, categorized grid of all features */}
      {/* ────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end print:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
            onClick={closeSidebar}
          />

          {/* Sheet Modal */}
          <div
            className={cn(
              "relative bg-white rounded-t-3xl max-h-[85vh] sm:max-h-[80vh] shadow-2xl flex flex-col z-50",
              "border-t border-slate-200/80 transition-all duration-300 ease-out",
              "w-full max-w-4xl mx-auto"
            )}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={closeSidebar}>
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {t.mainMenu || "القائمة الرئيسية"}
                  </h3>
                  <p className="text-xs text-gray-400">Hissaby Pro</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Fast Switcher between Bottom and Sidebar */}
                <button
                  onClick={toggleNavMode}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                  title={t.navPosition}
                >
                  {isBottomMode ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelBottom className="w-3.5 h-3.5" />}
                  <span>{isBottomMode ? "تحويل لشريط جانبي" : "تثبيت في الأسفل"}</span>
                </button>

                <button
                  onClick={closeSidebar}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search inside Menu */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder={locale === "ar" ? "ابحث في القائمة..." : "Rechercher dans le menu..."}
                  className="w-full ps-9 pe-4 py-2 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Categorized Menu Items Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.labelKey}>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {t[group.labelKey as keyof typeof t] as string}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={closeSidebar}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 p-3 rounded-2xl border transition-all text-start group",
                              isActive
                                ? "bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-xs ring-1 ring-indigo-500/20 font-bold"
                                : "bg-white hover:bg-slate-50 border-gray-100 hover:border-gray-200 text-gray-700 shadow-2xs"
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                                style={{
                                  backgroundColor: isActive ? item.color : item.bgColor,
                                  color: isActive ? "#ffffff" : item.color,
                                }}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold leading-tight line-clamp-2">
                                {t[item.titleKey as keyof typeof t] as string}
                              </span>
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Sheet Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    >
                      {userInitial}
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]">
                      {userName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile switcher button */}
                <button
                  onClick={toggleNavMode}
                  className="sm:hidden flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700"
                >
                  {isBottomMode ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelBottom className="w-3.5 h-3.5" />}
                  <span>{isBottomMode ? "شريط جانبي" : "شريط سفلي"}</span>
                </button>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      closeSidebar();
                      handleLogout();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logout}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      closeSidebar();
                      handleLogin();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t.login}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
