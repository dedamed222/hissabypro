import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Menu, X, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

export default function Header() {
  const { toggleSidebar, sidebarOpen } = useApp();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const { navPosition = "bottom" } = useSettings();
  const t = translations[locale];

  const userName = profile?.name || user?.email?.split('@')[0] || (locale === "ar" ? "المهدي صالحي" : "Mehdi Salehi");
  const isBottomMode = navPosition === "bottom";

  return (
    <header className="bg-gradient-to-r from-[#0047cc] via-[#0052d9] to-[#0a2f85] text-white h-16 px-3.5 sm:px-6 flex items-center justify-between z-30 flex-shrink-0 border-b border-blue-900/40 print:hidden select-none shadow-md">
      {/* Left: Hamburger Menu & Brand Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 text-white transition-all cursor-pointer"
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
            <span className="text-[10px] sm:text-[11px] text-blue-100/90 font-medium leading-tight mt-0.5">
              {locale === "ar" ? "نظام إدارة المتجر" : "Système de gestion de magasin"}
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Notification Bell, Language Pill, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell with Red Badge "3" */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 end-1 min-w-[16px] h-[16px] flex items-center justify-center bg-rose-500 text-white text-[9.5px] font-black rounded-full px-0.5 border border-blue-900 shadow-xs">
            3
          </span>
        </button>

        {/* Language Switcher Pill */}
        <LanguageSwitcher />

        {/* Circular User Avatar with Green Online Dot */}
        <div className="relative cursor-pointer hover:opacity-90 transition-opacity">
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
      </div>
    </header>
  );
}
