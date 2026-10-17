
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Menu, X, Bell, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadStoreData } from "@/utils/localStorage";
import SearchBar from "./SearchBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

function StoreLogoPreview({ locale }: { locale: "ar" | "fr" }) {
  const [storeInfo, setStoreInfo] = useState({ name: "", photoUrl: "" });

  useEffect(() => {
    const data = loadStoreData();
    if (data?.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || "",
        photoUrl: data.storeInfo.photoUrl || "",
      });
    }
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      {storeInfo.photoUrl ? (
        <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-white shadow-md ring-2 ring-indigo-500/10">
          <img src={storeInfo.photoUrl} alt="Store" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          {storeInfo.name?.charAt(0)?.toUpperCase() || (locale === "ar" ? "م" : "M")}
        </div>
      )}
      {storeInfo.name && (
        <div className="hidden xl:block">
          <p className="text-[0.8rem] font-semibold text-gray-800 leading-tight">{storeInfo.name}</p>
          <p className="text-[0.68rem] text-gray-400 leading-tight">
            {locale === "ar" ? "نظام إدارة المتجر" : "Gestion de magasin"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { toggleSidebar, sidebarOpen } = useApp();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const { navPosition = "bottom" } = useSettings();
  const t = translations[locale];

  const userName = profile?.name || user?.email?.split('@')[0] || (locale === "ar" ? "المهدي صالحي" : "Mehdi Salehi");
  const userRole = profile?.role === "admin" ? (locale === "ar" ? "مدير النظام" : "Administrateur") : (locale === "ar" ? "مستخدم" : "Utilisateur");

  const isBottomMode = navPosition === "bottom";

  return (
    <header className="gsc-header-bg text-white h-14 px-3 sm:px-6 flex items-center justify-between z-30 flex-shrink-0 border-b border-slate-800/80 print:hidden select-none">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 transition-all",
            !isBottomMode && "lg:hidden"
          )}
          aria-label={sidebarOpen ? t.closeMenu : t.openMenu}
          title={t.mainMenu}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-95 transition-opacity">
          {/* GSC Logo Badge */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-sm tracking-tighter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-base md:text-lg tracking-wider text-white">
              GSC.
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline-block font-normal">
              {locale === "ar" ? "نظام إدارة المتاجر" : "Système de gestion de magasin"}
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
        <SearchBar />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark Mode Icon */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
          title={locale === "ar" ? "الوضع الليلي" : "Mode sombre"}
          aria-label="Theme"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        {/* Notification Bell */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1 end-1 min-w-[14px] h-[14px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 border border-slate-900 shadow-sm">
            3
          </span>
        </button>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* User profile with Avatar */}
        <div className="flex items-center gap-2.5 ms-1 sm:ms-2 ps-2 border-s border-slate-700/60">
          <div className="hidden sm:block text-end">
            <p className="text-xs font-bold text-white leading-tight">
              {userName}
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              {userRole}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full ring-2 ring-blue-500/30 overflow-hidden bg-slate-700 flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:ring-blue-400 transition-all">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="User"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to avatar letter
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="select-none">M</span>
          </div>
        </div>
      </div>
    </header>
  );
}
