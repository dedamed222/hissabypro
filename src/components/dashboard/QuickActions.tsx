
import { Link } from "react-router-dom";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import {
  ShoppingCart, Package, FileText, Users, DollarSign, Settings, Plus,
  Truck, Archive, Receipt
} from "lucide-react";

export function QuickActions() {
  const { locale } = useLocale();
  const t = translations[locale];

  const quickActions = [
    { titleKey: "createInvoice", icon: FileText, path: "/create-invoice",
      gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)", bg: "rgba(99,102,241,0.06)" },
    { titleKey: "addProduct", icon: Plus, path: "/products",
      gradient: "linear-gradient(135deg, #10b981, #06b6d4)", bg: "rgba(16,185,129,0.06)" },
    { titleKey: "sales", icon: ShoppingCart, path: "/sales",
      gradient: "linear-gradient(135deg, #f59e0b, #f97316)", bg: "rgba(245,158,11,0.06)" },
    { titleKey: "customers", icon: Users, path: "/customers",
      gradient: "linear-gradient(135deg, #a855f7, #ec4899)", bg: "rgba(168,85,247,0.06)" },
    { titleKey: "inventory", icon: Package, path: "/inventory",
      gradient: "linear-gradient(135deg, #0ea5e9, #06b6d4)", bg: "rgba(14,165,233,0.06)" },
    { titleKey: "expenses", icon: DollarSign, path: "/expenses",
      gradient: "linear-gradient(135deg, #ef4444, #f97316)", bg: "rgba(239,68,68,0.06)" },
    { titleKey: "suppliers", icon: Truck, path: "/suppliers",
      gradient: "linear-gradient(135deg, #84cc16, #10b981)", bg: "rgba(132,204,22,0.06)" },
    { titleKey: "archive", icon: Archive, path: "/archive",
      gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)", bg: "rgba(139,92,246,0.06)" },
  ];

  return (
    <div className="dashboard-section p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #6366f1, #8b5cf6)" }} />
          {t.quickActions}
        </h2>
        <div className="pulse-dot" />
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5">
        {quickActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="group flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
            style={{ background: action.bg }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow"
              style={{ background: action.gradient }}
            >
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[0.65rem] font-semibold text-gray-600 text-center leading-tight truncate w-full">
              {t[action.titleKey as keyof typeof t] as string}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
