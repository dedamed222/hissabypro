import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
export default function Layout() {
  const {
    isAuthenticated
  } = useAuth();
  const {
    sidebarOpen
  } = useApp();

  // إعادة التوجيه إلى صفحة تسجيل الدخول إذا لم يكن المستخدم مصادقًا
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
      {/* الشريط الجانبي */}
      <Sidebar />
      
      {/* المحتوى الرئيسي */}
      <div className="flex flex-col flex-1">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/95 via-blue-50/20 to-indigo-50/30 backdrop-blur-sm">
          <div className="w-full h-full">
            <div className="animate-fade-in h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>;
}