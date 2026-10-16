
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useApp } from "@/contexts/AppContext";
import { useAutoSync } from "@/hooks/useAutoSync";

export default function Layout() {
  const { isAuthenticated } = useAuth();

  // Run auto-sync globally
  useAutoSync();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Subtle dot grid background */}
          <div className="w-full min-h-full bg-dots">
            <div className="min-h-full bg-gradient-to-br from-slate-50/80 via-indigo-50/20 to-purple-50/20">
              {/* pb-24 leaves room for mobile bottom nav bar */}
              <div className="pb-24 lg:pb-4 animate-fade-in">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}