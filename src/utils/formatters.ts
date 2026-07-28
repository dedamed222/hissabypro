
import { useSettings } from "@/contexts/SettingsContext";

// Format currency with multiple currency options
export const formatCurrency = (amount: number, currency?: string): string => {
  // Default to MRU if no currency is provided
  const currencyToUse = currency || "MRU";
  
  const currencyFormats: { [key: string]: { locale: string, currency: string } } = {
    MRU: { locale: "en-US", currency: "MRU" },
    USD: { locale: "en-US", currency: "USD" },
    EUR: { locale: "en-US", currency: "EUR" },
    GBP: { locale: "en-US", currency: "GBP" }
  };

  const format = currencyFormats[currencyToUse] || currencyFormats.MRU;

  try {
    return new Intl.NumberFormat(format.locale, {
      style: "currency",
      currency: format.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for custom currencies
    return `${amount.toFixed(2)} ${currencyToUse}`;
  }
};

// Create a hook to use formatCurrency with current settings
export const useFormatCurrency = () => {
  const { currency, customCurrencies } = useSettings();
  
  return (amount: number, currencyOverride?: string) => {
    const currencyToUse = currencyOverride || currency;
    
    // If this is a custom currency, use a custom formatter
    const foundCustomCurrency = customCurrencies.find(c => c.code === currencyToUse);
    if (foundCustomCurrency) {
      const symbol = foundCustomCurrency.symbol || foundCustomCurrency.code;
      return `${amount.toFixed(2)} ${symbol}`;
    }
    
    return formatCurrency(amount, currencyToUse);
  };
};

// Format date in Gregorian format only
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("fr-MR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch (error) {
    console.error("formatDate error:", error);
    return "-";
  }
};

// Format short date
export const formatShortDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("fr-MR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (error) {
    console.error("formatShortDate error:", error);
    return "-";
  }
};

// Format Gregorian date
export const formatGregorianDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

// Format Gregorian short date
export const formatGregorianShortDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// Calculate percentage change
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

// Format percentage change for display
export const formatPercentageChange = (change: number): string => {
  return `${Math.abs(change).toFixed(0)}%`;
};

// Format number with thousands separators
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};
