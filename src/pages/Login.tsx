import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { loadStoreData } from "@/utils/localStorage";
export default function Login() {
  const {
    isAuthenticated
  } = useAuth();
  const navigate = useNavigate();
  const {
    locale
  } = useLocale();
  const t = translations[locale];
  const [storeInfo, setStoreInfo] = useState({
    name: "",
    photoUrl: ""
  });
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
    // Load store info for display
    const data = loadStoreData();
    if (data && data.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || "",
        photoUrl: data.storeInfo.photoUrl || ""
      });
    }
  }, [isAuthenticated, navigate]);
  const handleDownload = () => {
    // هنا سيتم إضافة رابط التحميل عندما يكون متاحاً
    window.open("https://github.com/your-repo/releases/latest", "_blank");
  };
  return <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-ocean p-4 bg-amber-300">
      {/* App Logo */}
      <div className="mb-6 text-center rounded">
        <img src="/lovable-uploads/9bf8f3b6-2cd1-4788-a907-3ea9cb2eb6fc.png" alt="Hissaby Pro" className="h-32 mb-4 mx-auto" />
      </div>
      
      {/* Display store info if available */}
      {storeInfo.name && <div className="mb-6 text-center">
          {storeInfo.photoUrl ? <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-2 border-white shadow-lg">
              <img src={storeInfo.photoUrl} alt={storeInfo.name} className="w-full h-full object-cover" />
            </div> : <div className="w-20 h-20 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl border-2 border-white shadow-lg">
              {storeInfo.name.charAt(0) || "م"}
            </div>}
          <h1 className="text-xl font-bold text-white mb-1">{storeInfo.name}</h1>
          <p className="text-white/80 text-sm">نظام إدارة المتاجر</p>
        </div>}
      
      <LoginForm />
      
      

      <p className="text-white text-sm mt-4 opacity-75">
        {t.rights.replace("{year}", new Date().getFullYear().toString())}
      </p>
    </div>;
}