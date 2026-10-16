
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

  const userName = profile?.name || user?.email || "";
  const userInitial = userName.charAt(0)?.toUpperCase() || (locale === "ar" ? "م" : "U");

  const isBottomMode = navPosition === "bottom";

  return (
    <header className="header-premium min-h-[3.75rem] px-3 sm:px-4 md:px-6 flex items-center justify-between z-30 flex-shrink-0 print:hidden">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 text-gray-500 transition-all",
            !isBottomMode && "lg:hidden"
          )}
          aria-label={sidebarOpen ? t.closeMenu : t.openMenu}
          title={t.mainMenu}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-bold text-base md:text-lg gradient-text hidden sm:block">
            Hissaby Pro
          </span>
        </Link>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4 lg:mx-6">
        <SearchBar />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher />

        {/* Notification bell */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Store logo */}
        <div className="hidden sm:flex items-center">
          <StoreLogoPreview locale={locale} />
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 ms-1">
          <div className="hidden lg:block text-end">
            <p className="text-[0.78rem] font-semibold text-gray-800 leading-tight truncate max-w-[120px]">
              {userName}
            </p>
            <p className="text-[0.68rem] text-gray-400">
              {profile?.role === "admin" ? t.admin : t.user}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:scale-105 transition-transform shadow-md flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}
