
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { loadStoreData } from "@/utils/localStorage";

export default function Home() {
  const navigate = useNavigate();
  const [storeInfo, setStoreInfo] = useState({ name: "", photoUrl: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charge les informations du magasin
    const data = loadStoreData();
    if (data && data.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || "",
        photoUrl: data.storeInfo.photoUrl || "",
      });
    }
    
    // Simulation d'un délai de chargement pour l'animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4">
      <div className={`transition-all duration-700 ease-in-out transform ${isLoading ? "scale-100" : "scale-90"}`}>
        <AnimatedLogo size="lg" className="mb-8" />
      </div>
      
      <div className={`text-center transition-opacity duration-700 ease-in-out ${isLoading ? "opacity-0" : "opacity-100"}`}>
        <h1 className="text-4xl font-bold mb-2 text-arab-indigo">حسابي برو</h1>
        <p className="text-lg text-gray-600 mb-8">نظام إدارة المتاجر الأمثل</p>
        
        {storeInfo.name && (
          <div className="flex items-center justify-center mb-6 space-x-2">
            {storeInfo.photoUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                <img
                  src={storeInfo.photoUrl}
                  alt={storeInfo.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Store size={24} className="text-gray-500" />
              </div>
            )}
            <span className="text-xl font-semibold">{storeInfo.name}</span>
          </div>
        )}
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 rtl:space-x-reverse">
          <Button
            size="lg"
            className="bg-gradient-indigo hover:bg-arab-indigo-dark transition-all"
            onClick={() => navigate("/dashboard")}
          >
            لوحة التحكم
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="border-arab-indigo text-arab-indigo hover:bg-arab-indigo/10"
            onClick={() => navigate("/login")}
          >
            تبديل الحساب
          </Button>
        </div>
      </div>
      
      <div className={`mt-12 text-sm text-gray-500 transition-opacity duration-700 delay-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        © {new Date().getFullYear()} حسابي برو - جميع الحقوق محفوظة
      </div>
    </div>
  );
}
