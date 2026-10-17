import React, { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { useSettings } from "@/contexts/SettingsContext";
import { translations } from "@/locales";
import { cn } from "@/lib/utils";
import { loadStoreData } from "@/utils/localStorage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Plus,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MenuItem {
  titleKey: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bgColor: string;
  badge?: string;
  shortcut?: string;
}

interface MenuGroup {
  id: string;
  labelKey: string;
  items: MenuItem[];
}

const Sidebar = () => {
  const { sidebarOpen, closeSidebar, sidebarCollapsed, toggleCollapse, toggleSidebar } = useApp();
  const { logout, isAuthenticated, user, profile } = useAuth();
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const { navPosition = "bottom", updateSettings } = useSettings();
  const t = translations[locale];
  const navigate = useNavigate();
  const location = useLocation();

  const [menuSearch, setMenuSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [storeInfo, setStoreInfo] = useState({ name: "", photoUrl: "" });

  const isBottomMode = navPosition === "bottom";

  // Load store info for header branding
  useEffect(() => {
    const data = loadStoreData();
    if (data?.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || "",
        photoUrl: data.storeInfo.photoUrl || "",
      });
    }
  }, []);

  const menuGroups: MenuGroup[] = [
    {
      id: "overview",
      labelKey: "menuGroupOverview",
      items: [
        {
          titleKey: "home",
          icon: LayoutDashboard,
          path: "/dashboard",
          color: "#4f46e5",
          bgColor: "rgba(79, 70, 229, 0.12)",
        },
      ],
    },
    {
      id: "sales",
      labelKey: "menuGroupSales",
      items: [
        {
          titleKey: "createInvoice",
          icon: FileText,
          path: "/create-invoice",
          color: "#0284c7",
          bgColor: "rgba(2, 132, 199, 0.12)",
        },
        {
          titleKey: "sales",
          icon: ShoppingCart,
          path: "/sales",
          color: "#059669",
          bgColor: "rgba(5, 150, 105, 0.12)",
        },
        {
          titleKey: "returns",
          icon: Undo,
          path: "/returns",
          color: "#d97706",
          bgColor: "rgba(217, 119, 6, 0.12)",
        },
        {
          titleKey: "unpaidInvoices",
          icon: AlertCircle,
          path: "/unpaid-invoices",
          color: "#dc2626",
          bgColor: "rgba(220, 38, 38, 0.12)",
        },
        {
          titleKey: "archive",
          icon: Archive,
          path: "/archive",
          color: "#7c3aed",
          bgColor: "rgba(124, 58, 237, 0.12)",
        },
      ],
    },
    {
      id: "inventory",
      labelKey: "menuGroupInventory",
      items: [
        {
          titleKey: "products",
          icon: Package,
          path: "/products",
          color: "#0891b2",
          bgColor: "rgba(8, 145, 178, 0.12)",
        },
        {
          titleKey: "inventory",
          icon: Warehouse,
          path: "/inventory",
          color: "#ea580c",
          bgColor: "rgba(234, 88, 12, 0.12)",
        },
        {
          titleKey: "suppliers",
          icon: Truck,
          path: "/suppliers",
          color: "#65a30d",
          bgColor: "rgba(101, 163, 13, 0.12)",
        },
        {
          titleKey: "expenses",
          icon: DollarSign,
          path: "/expenses",
          color: "#db2777",
          bgColor: "rgba(219, 39, 119, 0.12)",
        },
      ],
    },
    {
      id: "finance",
      labelKey: "menuGroupFinance",
      items: [
        {
          titleKey: "customers",
          icon: Users,
          path: "/customers",
          color: "#9333ea",
          bgColor: "rgba(147, 51, 234, 0.12)",
        },
        {
          titleKey: "clientNotes",
          icon: StickyNote,
          path: "/client-notes",
          color: "#ca8a04",
          bgColor: "rgba(202, 138, 4, 0.12)",
        },
        {
          titleKey: "debtors",
          icon: UserCheck,
          path: "/debtors",
          color: "#16a34a",
          bgColor: "rgba(22, 163, 74, 0.12)",
        },
        {
          titleKey: "creditors",
          icon: UserX,
          path: "/creditors",
          color: "#e11d48",
          bgColor: "rgba(225, 29, 72, 0.12)",
        },
        {
          titleKey: "payments",
          icon: CreditCard,
          path: "/payments",
          color: "#8b5cf6",
          bgColor: "rgba(139, 92, 246, 0.12)",
        },
        {
          titleKey: "accountStatement",
          icon: Receipt,
          path: "/account-statement",
          color: "#0d9488",
          bgColor: "rgba(13, 148, 136, 0.12)",
        },
      ],
    },
    {
      id: "system",
      labelKey: "menuGroupSystem",
      items: [
        {
          titleKey: "settings",
          icon: Settings,
          path: "/settings",
          color: "#475569",
          bgColor: "rgba(71, 85, 105, 0.12)",
        },
      ],
    },
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
      title: isFr ? "Position du menu mise à jour" : (t.settingsSaved || "تم تحديث موضع شريط التنقل"),
      description: nextMode === "bottom" ? t.navPositionBottom : t.navPositionSidebar,
    });
  };

  const userName = profile?.name || user?.email?.split("@")[0] || (isFr ? "Utilisateur" : "المستخدم");
  const userInitial = userName.charAt(0).toUpperCase() || (locale === "ar" ? "م" : "U");

  // Filtered menu items for Bottom Sheet / Command Palette search & categories
  const filteredGroups = useMemo(() => {
    let groups = menuGroups;

    // Filter by Category Chip
    if (activeCategoryFilter !== "all") {
      groups = groups.filter((g) => g.id === activeCategoryFilter);
    }

    // Filter by Search
    if (!menuSearch.trim()) return groups;
    const q = menuSearch.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          const title = (t[item.titleKey as keyof typeof t] as string || "").toLowerCase();
          return title.includes(q);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [menuGroups, menuSearch, activeCategoryFilter, t]);

  // Quick Action Shortcuts for Bottom Sheet
  const quickShortcuts = [
    {
      title: isFr ? "Nouvelle facture" : "فاتورة جديدة",
      icon: Plus,
      path: "/create-invoice",
      color: "bg-indigo-600 text-white hover:bg-indigo-700",
    },
    {
      title: isFr ? "Nouveau produit" : "إضافة منتج",
      icon: Package,
      path: "/products",
      color: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    },
    {
      title: isFr ? "Relevé client" : "كشف حساب",
      icon: Receipt,
      path: "/account-statement",
      color: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    },
    {
      title: isFr ? "Retours" : "المرتجعات",
      icon: Undo,
      path: "/returns",
      color: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    },
  ];

  const categoryChips = [
    { id: "all", label: isFr ? "Tout" : "الكل" },
    { id: "sales", label: isFr ? "Ventes" : "الفواتير" },
    { id: "inventory", label: isFr ? "Stock" : "المخزون" },
    { id: "finance", label: isFr ? "Finance" : "المالية" },
    { id: "system", label: isFr ? "Système" : "النظام" },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP VERTICAL SIDEBAR                                */}
      {/* Shown on LG+ when navPosition === 'sidebar'                */}
      {/* ────────────────────────────────────────────────────────── */}
      {!isBottomMode && (
        <aside
          className={cn(
            "hidden lg:flex flex-col h-full transition-all duration-300 ease-in-out print:hidden flex-shrink-0 z-30 select-none",
            "border-e border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-sm",
            sidebarCollapsed ? "w-[72px]" : "w-64"
          )}
        >
          {/* Header & Logo */}
          <div className="flex-shrink-0 px-3.5 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {storeInfo.photoUrl ? (
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                      <img src={storeInfo.photoUrl} alt="Store" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                    >
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">
                        {storeInfo.name || "Hissaby Pro"}
                      </h2>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-200/60 uppercase">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isFr ? "Système de gestion" : (t.storeManagementSystem || "نظام إدارة المبيعات")}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto shadow-sm"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Collapse/Expand Toggle Button */}
              <button
                onClick={toggleCollapse}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer",
                  sidebarCollapsed && "mx-auto mt-2"
                )}
                title={sidebarCollapsed ? t.expandMenu : t.collapseMenu}
              >
                {sidebarCollapsed ? (
                  isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : (
                  isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Quick Action: New Invoice Button */}
            {!sidebarCollapsed ? (
              <button
                onClick={() => navigate("/create-invoice")}
                className="mt-3.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                <span>{isFr ? "Nouvelle Facture" : (t.createInvoice || "إنشاء فاتورة")}</span>
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate("/create-invoice")}
                    className="mt-3 w-10 h-10 mx-auto rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side={isRTL ? "left" : "right"} className="font-bold text-xs">
                  {isFr ? "Nouvelle Facture" : (t.createInvoice || "إنشاء فاتورة")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
            {menuGroups.map((group) => (
              <div key={group.labelKey} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-2 pt-1 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{t[group.labelKey as keyof typeof t] as string}</span>
                    <span className="text-[9px] text-slate-300 font-normal">({group.items.length})</span>
                  </div>
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const itemTitle = t[item.titleKey as keyof typeof t] as string || item.titleKey;

                    if (sidebarCollapsed) {
                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>
                            <NavLink
                              to={item.path}
                              className={({ isActive }) =>
                                cn(
                                  "w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all group relative my-1",
                                  isActive
                                    ? "bg-indigo-50 text-indigo-600 shadow-xs ring-1 ring-indigo-500/30"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                                )
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <div
                                    className={cn(
                                      "w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                                      isActive ? "shadow-xs" : ""
                                    )}
                                    style={{
                                      backgroundColor: isActive ? item.color : item.bgColor,
                                      color: isActive ? "#ffffff" : item.color,
                                    }}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  {isActive && (
                                    <span
                                      className={cn(
                                        "absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-indigo-600",
                                        isRTL ? "-right-1" : "-left-1"
                                      )}
                                    />
                                  )}
                                </>
                              )}
                            </NavLink>
                          </TooltipTrigger>
                          <TooltipContent side={isRTL ? "left" : "right"} className="text-xs font-semibold">
                            {itemTitle}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all group relative",
                            isActive
                              ? "bg-gradient-to-r from-indigo-50/90 to-blue-50/70 text-indigo-700 font-bold border-s-[3px] border-indigo-600 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                                isActive ? "shadow-xs" : ""
                              )}
                              style={{
                                backgroundColor: isActive ? item.color : item.bgColor,
                                color: isActive ? "#ffffff" : item.color,
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <span className="truncate flex-1 text-[0.8rem]">
                              {itemTitle}
                            </span>

                            {isActive && (
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
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

          {/* Footer User & Quick Mode Switcher */}
          <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
            {!sidebarCollapsed && isAuthenticated && (
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-xs"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                >
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[0.78rem] font-bold text-slate-800 truncate">{userName}</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online" />
                  </div>
                  <p className="text-[0.68rem] text-slate-400">
                    {profile?.role === "admin" ? t.admin : t.user}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Navigation Mode Switcher Button */}
            {!sidebarCollapsed ? (
              <button
                onClick={toggleNavMode}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[0.72rem] text-slate-600 bg-white hover:bg-slate-100 border border-slate-200/60 transition-all font-medium cursor-pointer"
                title={t.navPositionBottom}
              >
                <span className="flex items-center gap-1.5">
                  <PanelBottom className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t.navPositionBottom}</span>
                </span>
                <span className="text-[10px] text-indigo-600 font-bold">{isFr ? "Basculer" : "تبديل"}</span>
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleNavMode}
                    className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <PanelBottom className="w-4 h-4 text-indigo-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side={isRTL ? "left" : "right"} className="text-xs">
                  {t.navPositionBottom}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Logout / Login */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                title={sidebarCollapsed ? t.logout : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[0.78rem] font-bold cursor-pointer",
                  "bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all",
                  sidebarCollapsed && "justify-center px-0 w-8 h-8 mx-auto"
                )}
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{t.logout}</span>}
              </button>
            ) : (
              <button
                onClick={handleLogin}
                title={sidebarCollapsed ? t.login : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[0.78rem] font-bold cursor-pointer",
                  "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all",
                  sidebarCollapsed && "justify-center px-0 w-8 h-8 mx-auto"
                )}
              >
                <LogIn className="w-3.5 h-3.5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{t.login}</span>}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE DRAWER SIDEBAR                                   */}
      {/* Shown when in Sidebar Mode on Mobile (<LG) and opened      */}
      {/* ────────────────────────────────────────────────────────── */}
      {!isBottomMode && sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={closeSidebar}
          />

          {/* Drawer Content */}
          <aside
            className={cn(
              "relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-start duration-200",
              isRTL ? "border-l border-slate-200" : "border-r border-slate-200"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{storeInfo.name || "Hissaby Pro"}</h3>
                  <p className="text-[10px] text-slate-400">{isFr ? "Menu latéral" : "الشريط الجانبي"}</p>
                </div>
              </div>

              <button
                onClick={closeSidebar}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action */}
            <div className="p-3 border-b border-slate-100">
              <button
                onClick={() => {
                  closeSidebar();
                  navigate("/create-invoice");
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isFr ? "Nouvelle Facture" : (t.createInvoice || "إنشاء فاتورة")}</span>
              </button>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {menuGroups.map((group) => (
                <div key={group.labelKey} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    {t[group.labelKey as keyof typeof t] as string}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={closeSidebar}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                              isActive
                                ? "bg-indigo-50 text-indigo-700 border-s-4 border-indigo-600 font-bold"
                                : "text-slate-600 hover:bg-slate-50"
                            )
                          }
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: item.bgColor, color: item.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{t[item.titleKey as keyof typeof t] as string}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
              <button
                onClick={() => {
                  closeSidebar();
                  toggleNavMode();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 font-bold"
              >
                <span className="flex items-center gap-2">
                  <PanelBottom className="w-4 h-4 text-indigo-600" />
                  <span>{isFr ? "Basculer vers barre inférieure" : "التحويل للشريط السفلي"}</span>
                </span>
              </button>

              {isAuthenticated && (
                <button
                  onClick={() => {
                    closeSidebar();
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.logout}</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. FLOATING DOCK BOTTOM NAVIGATION BAR                    */}
      {/* Visible when navPosition === 'bottom' (or mobile fallback) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-2 sm:bottom-4 left-0 right-0 z-40 print:hidden transition-all duration-300 pointer-events-none pb-safe px-3 sm:px-6 flex justify-center",
          !isBottomMode && "lg:hidden"
        )}
      >
        <div className="pointer-events-auto w-full max-w-lg md:max-w-xl bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_12px_36px_rgba(15,23,42,0.14)] px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1">
          {/* Tab 1: Dashboard (الرئيسية) */}
          <NavLink
            to="/dashboard"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all group relative cursor-pointer",
                isActive ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-transform group-hover:scale-110",
                    isActive ? "bg-indigo-50 text-indigo-600 shadow-2xs" : ""
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-[11px] leading-tight truncate max-w-[64px]">
                  {t.home}
                </span>
                {isActive && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* Tab 2: Sales (المبيعات) */}
          <NavLink
            to="/sales"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all group relative cursor-pointer",
                isActive ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-transform group-hover:scale-110",
                    isActive ? "bg-emerald-50 text-emerald-600 shadow-2xs" : ""
                  )}
                >
                  <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-[11px] leading-tight truncate max-w-[64px]">
                  {t.sales}
                </span>
                {isActive && <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* Centerpiece Hero Action: Create Invoice (+ فاتورة) */}
          <NavLink
            to="/create-invoice"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center -mt-5 sm:-mt-6 flex-shrink-0 px-2 group cursor-pointer"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-200 group-hover:scale-105 active:scale-95",
                    isActive
                      ? "bg-gradient-to-tr from-indigo-700 via-blue-700 to-sky-500 shadow-indigo-600/40 ring-4 ring-indigo-50"
                      : "bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-400 shadow-indigo-500/30 hover:shadow-indigo-500/50"
                  )}
                >
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 mt-1 leading-tight">
                  {isFr ? "Facture" : "فاتورة"}
                </span>
              </>
            )}
          </NavLink>

          {/* Tab 3: Products (المنتجات) */}
          <NavLink
            to="/products"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all group relative cursor-pointer",
                isActive ? "text-cyan-600 font-bold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-transform group-hover:scale-110",
                    isActive ? "bg-cyan-50 text-cyan-600 shadow-2xs" : ""
                  )}
                >
                  <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <span className="text-[10px] sm:text-[11px] leading-tight truncate max-w-[64px]">
                  {t.products}
                </span>
                {isActive && <span className="w-1 h-1 rounded-full bg-cyan-600 mt-0.5" />}
              </>
            )}
          </NavLink>

          {/* Tab 4: More / Command Sheet (المزيد) */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all group relative cursor-pointer",
              sidebarOpen
                ? "text-indigo-600 font-bold bg-indigo-50/70"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
            title={t.mainMenu}
          >
            <div className="p-1.5 rounded-xl transition-transform group-hover:scale-110">
              <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="text-[10px] sm:text-[11px] leading-tight truncate max-w-[64px]">
              {isFr ? "Menu" : "المزيد"}
            </span>
            {sidebarOpen && <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />}
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. MODERN COMMAND BOTTOM SHEET ("المزيد / Plus")          */}
      {/* Native-feeling, categorized grid of all features           */}
      {/* ────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end print:hidden">
          {/* Backdrop with subtle blur */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={closeSidebar}
          />

          {/* Bottom Sheet Card */}
          <div
            className={cn(
              "relative bg-white rounded-t-3xl max-h-[88vh] sm:max-h-[82vh] shadow-2xl flex flex-col z-50",
              "border-t border-slate-200/90 transition-all duration-300 ease-out animate-in slide-in-from-bottom-6",
              "w-full max-w-3xl mx-auto overflow-hidden"
            )}
          >
            {/* Grab Handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-pointer" onClick={closeSidebar}>
              <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors" />
            </div>

            {/* Header: Branding & Action Switcher */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                >
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {t.mainMenu || (isFr ? "Menu Principal" : "لوحة التحكم والتنقل")}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {storeInfo.name || "Hissaby Pro"} • {isFr ? "Tous les modules" : "كافة الوظائف"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Fast Switcher between Bottom and Sidebar */}
                <button
                  onClick={toggleNavMode}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  title={t.navPosition}
                >
                  {isBottomMode ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelBottom className="w-3.5 h-3.5" />}
                  <span>
                    {isBottomMode
                      ? (isFr ? "Passer en barre latérale" : "تثبيت كشريط جانبي")
                      : (isFr ? "Passer en barre inférieure" : "تثبيت كشريط سفلي")}
                  </span>
                </button>

                <button
                  onClick={closeSidebar}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search & Category Filter Pills */}
            <div className="px-5 pt-3 pb-2 space-y-2.5 bg-slate-50/60 border-b border-slate-100">
              {/* Search Input */}
              <div className="relative">
                <Search className={cn("w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2", isRTL ? "right-3" : "left-3")} />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder={locale === "ar" ? "ابحث عن صفحة أو عملية..." : "Rechercher une page ou fonction..."}
                  className={cn(
                    "w-full py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-all",
                    isRTL ? "pr-9 pl-8" : "pl-9 pr-8"
                  )}
                />
                {menuSearch && (
                  <button
                    onClick={() => setMenuSearch("")}
                    className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600", isRTL ? "left-2.5" : "right-2.5")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {categoryChips.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setActiveCategoryFilter(chip.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                      activeCategoryFilter === chip.id
                        ? "bg-indigo-600 text-white shadow-xs font-bold"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                {isFr ? "Raccourcis :" : "روابط سريعة :"}
              </span>
              {quickShortcuts.map((sc, idx) => {
                const Icon = sc.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      closeSidebar();
                      navigate(sc.path);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs",
                      sc.color
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sc.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Categorized Menu Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredGroups.map((group) => (
                <div key={group.labelKey} className="space-y-2">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                    <span>{t[group.labelKey as keyof typeof t] as string}</span>
                    <span className="text-[10px] text-slate-300 font-normal">
                      {group.items.length} {isFr ? "éléments" : "عنصر"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const itemTitle = t[item.titleKey as keyof typeof t] as string || item.titleKey;
                      const isCurrentRoute = location.pathname === item.path;

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={closeSidebar}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 p-3 rounded-2xl border transition-all text-start group cursor-pointer relative",
                              isActive
                                ? "bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20 font-bold"
                                : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700 shadow-2xs hover:shadow-xs"
                            )
                          }
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-2xs"
                            style={{
                              backgroundColor: isCurrentRoute ? item.color : item.bgColor,
                              color: isCurrentRoute ? "#ffffff" : item.color,
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold leading-tight block truncate">
                              {itemTitle}
                            </span>
                            {isCurrentRoute && (
                              <span className="inline-block text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded-full mt-0.5">
                                {isFr ? "Actuel" : "الحالي"}
                              </span>
                            )}
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">
                    {isFr ? "Aucun module trouvé pour votre recherche." : "لم يتم العثور على أي نتائج للبحث."}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Sheet Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isAuthenticated && (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
                    >
                      {userInitial}
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
                      {userName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile switcher button */}
                <button
                  onClick={toggleNavMode}
                  className="sm:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 cursor-pointer"
                >
                  {isBottomMode ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelBottom className="w-3.5 h-3.5" />}
                  <span>{isBottomMode ? (isFr ? "Barre latérale" : "شريط جانبي") : (isFr ? "Barre inférieure" : "شريط سفلي")}</span>
                </button>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      closeSidebar();
                      handleLogout();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
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
    </TooltipProvider>
  );
};

export default Sidebar;
