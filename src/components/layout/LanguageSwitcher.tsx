
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 outline-none"
        >
          <span className="text-sm">{locale === "ar" ? "🇸🇦" : "🇫🇷"}</span>
          <span className="text-xs">
            {locale === "ar" ? "العربية" : "Français"}
          </span>
          <span className="text-[10px] opacity-70">▾</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border border-slate-800 text-white z-50 min-w-[130px] rounded-xl shadow-xl p-1">
        <DropdownMenuItem
          onClick={() => changeLocale("ar")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium ${
            locale === "ar" ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <span className="text-base">🇸🇦</span>
          <span>العربية</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLocale("fr")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-medium ${
            locale === "fr" ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
          }`}
        >
          <span className="text-base">🇫🇷</span>
          <span>Français</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

