import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Menu, X, Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSettings } from "@/contexts/SettingsContext";
import { CircularClock } from "@/components/common/CircularClock";
import { NotificationCenter } from "./NotificationCenter";
import { cn } from "@/lib/utils";

export default function Header() {
  const { toggleSidebar, sidebarOpen } = useApp();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const { navPosition = "bottom" } = useSettings();
  const t = translations[locale];

  const userName = profile?.name || user?.email?.split('@')[0] || (locale === "ar" ? "المهدي صالحي" : "Mehdi Salehi");
  const userRole = locale === "ar" ? "المسؤول" : "Administrateur";
  const isBottomMode = navPosition === "bottom";

  return (
    <header className="bg-gradient-to-r from-[#0047cc] via-[#0052d9] to-[#0a2f85] text-white h-16 px-3 sm:px-5 lg:px-6 flex items-center justify-between z-30 flex-shrink-0 border-b border-blue-900/40 print:hidden select-none shadow-md">
      {/* Left: Logo & Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 text-white transition-all cursor-pointer lg:hidden"
          aria-label={sidebarOpen ? t.closeMenu : t.openMenu}
          title={t.mainMenu}
        >
          {sidebarOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-95 transition-opacity">
          {/* Isometric Hexagon GSC Logo */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 relative flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 36 36" fill="none" className="w-full h-full drop-shadow-sm">
              <path
                d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
                fill="url(#cubeGradient)"
                stroke="#60a5fa"
                strokeWidth="1.5"
              />
              <path
                d="M18 2V18L32 10M18 18L4 10"
                stroke="#93c5fd"
                strokeWidth="1.5"
                strokeOpacity="0.8"
              />
              {/* Ascending Chart Bars on front face */}
              <rect x="11" y="22" width="2.5" height="5" rx="0.75" fill="#ffffff" />
              <rect x="15" y="19" width="2.5" height="8" rx="0.75" fill="#ffffff" />
              <rect x="19" y="16" width="2.5" height="11" rx="0.75" fill="#ffffff" />
              <rect x="23" y="13" width="2.5" height="14" rx="0.75" fill="#38bdf8" />
              <defs>
                <linearGradient id="cubeGradient" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0284c7" />
                  <stop offset="0.5" stopColor="#2563eb" />
                  <stop offset="1" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="font-black text-lg sm:text-xl tracking-tight text-white leading-none">
              GSC<span className="text-cyan-300">.</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-blue-100/90 font-medium leading-tight mt-0.5 hidden sm:block">
              {locale === "ar" ? "نظام إدارة المتجر" : "Système de gestion de magasin"}
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-white/50 absolute top-1/2 -translate-y-1/2 left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder={locale === "ar" ? "البحث عن منتج، عميل، فاتورة..." : "Rechercher un produit, un client, une facture..."}
            className="w-full h-9 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/25 focus:border-white/30 transition-all pl-10 pr-16"
          />
          <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-1 text-[10px] text-white/40 font-medium bg-white/10 px-1.5 py-0.5 rounded">
            Ctrl + K
          </div>
        </div>
      </div>

      {/* Right: Circular Clock, Notification Center, Language Pill, User Avatar, Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Circular Analog & Digital Clock */}
        <CircularClock size={32} showDigital={true} showDate={true} variant="header" className="hidden sm:flex" />

        {/* Interactive Notification Bell & Popover */}
        <NotificationCenter />

        {/* Language Switcher Pill */}
        <LanguageSwitcher />

        {/* User Profile with Name */}
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
          <div className="relative">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-2 ring-white/60 overflow-hidden bg-slate-700 flex items-center justify-center text-white text-xs font-bold shadow-md">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                alt="User"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="select-none">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0047cc]" />
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="text-xs font-bold text-white leading-tight">{userName}</span>
            <span className="text-[10px] text-blue-200/80 font-medium leading-tight">{userRole}</span>
          </div>
        </div>

        {/* Settings Gear */}
        <Link
          to="/settings"
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
