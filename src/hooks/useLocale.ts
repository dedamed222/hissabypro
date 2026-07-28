import { useCallback, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { translations, TranslationKey } from "@/locales";

export function useLocale() {
  const { locale, updateSettings } = useSettings();

  // Apply RTL/LTR direction based on language on mount and when locale changes
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (locale === "ar") {
      htmlElement.setAttribute("dir", "rtl");
      htmlElement.setAttribute("lang", "ar");
    } else {
      htmlElement.setAttribute("dir", "ltr");
      htmlElement.setAttribute("lang", "fr");
    }
  }, [locale]);

  const changeLocale = (lang: "ar" | "fr") => {
    localStorage.setItem("app-locale", lang);
    // Update settings context which will instantly trigger re-renders across the app
    updateSettings({ locale: lang });

    // Force immediate DOM update
    const htmlElement = document.documentElement;
    if (lang === "ar") {
      htmlElement.setAttribute("dir", "rtl");
      htmlElement.setAttribute("lang", "ar");
    } else {
      htmlElement.setAttribute("dir", "ltr");
      htmlElement.setAttribute("lang", "fr");
    }
  };

  // Translation function
  const t = useCallback((key: TranslationKey): string => {
    return translations[locale]?.[key] || translations.ar[key] || key;
  }, [locale]);

  // Check if current locale is RTL
  const isRTL = locale === "ar";

  // Date formatting
  const formatDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale === 'ar' ? 'en-GB' : 'fr-FR');
  }, [locale]);

  return { locale, changeLocale, t, isRTL, formatDate };
}
