
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
    <div className="flex items-center gap-3 mx-3">
      {storeInfo.photoUrl ? (
        <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg border-2 border-white/50 ring-2 ring-blue-500/20">
          <img
            src={storeInfo.photoUrl}
            alt="Store"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-white/50">
          <span>{locale === "ar" ? "م" : "M"}</span>
        </div>
      )}
      {storeInfo.name && (
        <div>
          <span className="font-bold text-gray-800 text-base">{storeInfo.name}</span>
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
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 h-18 px-6 flex items-center justify-between z-30 shadow-sm print:hidden">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-105 shadow-sm border border-blue-100/50"
          aria-label={sidebarOpen ? t.closeMenu : t.openMenu}
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        
        <Link to="/dashboard" className="flex items-center hover:scale-105 transition-transform">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <span className="font-bold text-xl">
              {t.dashboard}
            </span>
          </div>
        </Link>
      </div>
      
      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <SearchBar />
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <LanguageSwitcher />
        
        {/* Notifications */}
        <button 
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors relative"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </button>
        
        {/* Store name and image */}
        <StoreLogoPreview locale={locale} />
        <div className="flex items-center gap-3">
          <div className={`text-sm ${locale === "ar" ? "text-right" : "text-left"}`}>
            <p className="font-semibold text-gray-800">{profile?.name || user?.email}</p>
            <p className="text-gray-500 text-xs">
              {profile?.role === "admin" ? t.admin : t.user}
            </p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shadow-lg border-2 border-white/50 hover:scale-105 transition-transform cursor-pointer">
            {(profile?.name || user?.email)?.charAt(0)?.toUpperCase() || (locale === "ar" ? "م" : "U")}
          </div>
        </div>
      </div>
    </header>
  );
}
