
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();
  const t = translations[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-600 transition-colors border border-gray-200/50"
        >
          <Globe size={18} />
          <span className="font-medium text-sm">
            {locale === "ar" ? "العربية" : "Français"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white z-50 min-w-[140px]">
        <DropdownMenuItem
          onClick={() => changeLocale("ar")}
          className={`flex items-center gap-2 cursor-pointer ${
            locale === "ar" ? "bg-blue-50 text-blue-700" : ""
          }`}
        >
          <span className="text-lg">🇸🇦</span>
          <span>العربية</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLocale("fr")}
          className={`flex items-center gap-2 cursor-pointer ${
            locale === "fr" ? "bg-blue-50 text-blue-700" : ""
          }`}
        >
          <span className="text-lg">🇫🇷</span>
          <span>Français</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
