
import { Link } from "react-router-dom";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { 
  ShoppingCart, 
  Package, 
  FileText, 
  Users, 
  DollarSign,
  Settings,
  Plus
} from "lucide-react";

export function QuickActions() {
  const { locale } = useLocale();
  const t = translations[locale];

  const quickActions = [
    {
      titleKey: "createInvoice",
      descriptionKey: "createNewInvoice",
      icon: FileText,
      path: "/create-invoice",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50"
    },
    {
      titleKey: "addProduct",
      descriptionKey: "addNewProduct",
      icon: Plus,
      path: "/products",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50"
    },
    {
      titleKey: "sales",
      descriptionKey: "viewSales",
      icon: ShoppingCart,
      path: "/sales",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50"
    },
    {
      titleKey: "inventory",
      descriptionKey: "manageInventory",
      icon: Package,
      path: "/inventory",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50"
    },
    {
      titleKey: "customers",
      descriptionKey: "manageCustomers",
      icon: Users,
      path: "/customers",
      color: "from-teal-500 to-cyan-500",
      bgColor: "bg-teal-50"
    },
    {
      titleKey: "expenses",
      descriptionKey: "recordExpenses",
      icon: DollarSign,
      path: "/expenses",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50"
    },
    {
      titleKey: "settings",
      descriptionKey: "systemSettings",
      icon: Settings,
      path: "/settings",
      color: "from-gray-500 to-slate-500",
      bgColor: "bg-gray-50"
    }
  ];

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{t.quickActions}</h2>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className={`group ${action.bgColor} hover:bg-white rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 border border-gray-100/50`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${action.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">
                  {t[action.titleKey as keyof typeof t]}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {t[action.descriptionKey as keyof typeof t]}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
