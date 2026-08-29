import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useApp } from "@/contexts/AppContext";

export default function Layout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-white/95 via-blue-50/20 to-indigo-50/30 backdrop-blur-sm">
          {/* pb-32 leaves room for the mobile bottom nav bar and safe area */}
          <div className="w-full min-h-full pb-32 lg:pb-6">
            <div className="animate-fade-in min-h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}