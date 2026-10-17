
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useSettings } from "@/contexts/SettingsContext";

export default function Layout() {
  const { isAuthenticated, loading } = useAuth();
  const { navPosition = "bottom" } = useSettings();

  // Run auto-sync globally
  useAutoSync();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#070b19]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isBottomNav = navPosition === "bottom";

  return (
    <div className="flex h-[100dvh] overflow-hidden gsc-dashboard-bg">
      {/* Sidebar / Bottom Navigation Container */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full min-h-full">
            <div className={`animate-fade-in ${isBottomNav ? "pb-24 lg:pb-28" : "pb-24 lg:pb-6"}`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}