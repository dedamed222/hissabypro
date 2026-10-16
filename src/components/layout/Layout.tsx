
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useSettings } from "@/contexts/SettingsContext";

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const { navPosition = "bottom" } = useSettings();

  // Run auto-sync globally
  useAutoSync();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isBottomNav = navPosition === "bottom";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {/* Sidebar / Bottom Navigation Container */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Subtle dot grid background */}
          <div className="w-full min-h-full bg-dots">
            <div className="min-h-full bg-gradient-to-br from-slate-50/80 via-indigo-50/20 to-purple-50/20">
              {/* Padding bottom leaves room for navigation bar */}
              <div className={`animate-fade-in ${isBottomNav ? "pb-28" : "pb-24 lg:pb-6"}`}>
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}