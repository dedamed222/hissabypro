
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const { locale } = useLocale();
  const t = translations[locale];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-arab-blue mb-4">{t.fourOhFour}</h1>
        <p className="text-2xl font-medium mb-6">{t.notFoundTitle}</p>
        <p className="text-gray-600 mb-8">
          {t.notFoundDesc}
        </p>

        <Link
          to={isAuthenticated ? "/dashboard" : "/login"}
          className="bg-arab-blue text-white px-6 py-3 rounded-md hover:bg-arab-blue-dark transition-colors inline-block"
        >
          {isAuthenticated ? t.backToDashboard : t.backToLogin}
        </Link>
      </div>
    </div>
  );
}
