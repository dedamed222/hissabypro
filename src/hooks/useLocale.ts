
import { useEffect, useState, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { translations, TranslationKey } from "@/locales";

export function useLocale() {
  const { locale: settingsLocale, updateSettings } = useSettings();
  const [locale, setLocale] = useState<"ar" | "fr">(settingsLocale || "ar");

  useEffect(() => {
    // Sync with settings context
    if (settingsLocale && settingsLocale !== locale) {
      setLocale(settingsLocale);
    }
  }, [settingsLocale]);

  useEffect(() => {
    // Apply RTL/LTR direction based on language
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
    setLocale(lang);
    localStorage.setItem("app-locale", lang);
    // Update settings context when locale changes
    updateSettings({ locale: lang });
    
    // Force re-render by updating document attributes
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
    return translations[locale][key] || translations.ar[key] || key;
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
