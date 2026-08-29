
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Menu, X, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadStoreData } from "@/utils/localStorage";
import SearchBar from "./SearchBar";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Helper component for Store logo/name in header
function StoreLogoPreview({ locale }: { locale: "ar" | "fr" }) {
  const [storeInfo, setStoreInfo] = useState({ name: "", photoUrl: "" });
  const t = translations[locale];

  useEffect(() => {
    const data = loadStoreData();
    if (data && data.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || "",
        photoUrl: data.storeInfo.photoUrl || "",
      });
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      {storeInfo.photoUrl ? (
        <div className="w-10 h-10 rounded-full overflow-hidden shadow-md border-2 border-white/50 ring-2 ring-blue-500/20">
          <img src={storeInfo.photoUrl} alt="Store" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white/50">
          <span>{locale === "ar" ? "م" : "M"}</span>
        </div>
      )}
      {storeInfo.name && (
        <div className="hidden lg:block">
          <span className="font-bold text-gray-800 text-sm">{storeInfo.name}</span>
          <p className="text-xs text-gray-500">{t.storeManagementSystem}</p>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { toggleSidebar, sidebarOpen } = useApp();
  const { user, profile } = useAuth();
  const { locale } = useLocale();
  const t = translations[locale];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 h-16 px-3 sm:px-4 md:px-6 flex items-center justify-between z-30 shadow-sm print:hidden flex-shrink-0">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl hover:bg-blue-50 text-blue-600 transition-all duration-200 border border-blue-100/50"
          aria-label={sidebarOpen ? t.closeMenu : t.openMenu}
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link to="/dashboard" className="flex items-center hover:scale-105 transition-transform">
          <span className="font-bold text-base md:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t.dashboard}
          </span>
        </Link>
      </div>

      {/* Center: Search — hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-6">
        <SearchBar />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        <LanguageSwitcher />

        <button
          className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors relative"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Store logo — hidden on small mobile */}
        <div className="hidden sm:block">
          <StoreLogoPreview locale={locale} />
        </div>

        {/* User info + avatar */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:block text-sm">
            <p className="font-semibold text-gray-800 leading-tight">{profile?.name || user?.email}</p>
            <p className="text-gray-500 text-xs">
              {profile?.role === "admin" ? t.admin : t.user}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg border-2 border-white/50 cursor-pointer hover:scale-105 transition-transform flex-shrink-0">
            {(profile?.name || user?.email)?.charAt(0)?.toUpperCase() || (locale === "ar" ? "م" : "U")}
          </div>
        </div>
      </div>
    </header>
  );
}
