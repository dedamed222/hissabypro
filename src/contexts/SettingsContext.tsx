
import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from "react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { Currency, PaymentMethod } from "@/types";
import { toast } from "@/hooks/use-toast";
import { translations } from "@/locales";
import { getStoreSettings, upsertStoreSettings } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export interface SettingsState {
  currency: string;
  locale: "ar" | "fr";
  customCurrencies: Currency[];
  customPaymentMethods: PaymentMethod[];
}

interface SettingsContextType extends SettingsState {
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  addCustomCurrency: (currency: Currency) => void;
  removeCustomCurrency: (code: string) => void;
  addCustomPaymentMethod: (method: PaymentMethod) => void;
  removeCustomPaymentMethod: (id: string) => void;
  updateCustomPaymentMethod: (id: string, method: PaymentMethod) => void;
  getAvailableCurrencies: () => Currency[];
  getAvailablePaymentMethods: () => PaymentMethod[];
}

const defaultCurrencies: Currency[] = [
  { code: "MRU", name: "أوقية موريتانية", symbol: "MRU" },
  { code: "USD", name: "دولار أمريكي", symbol: "$" },
  { code: "EUR", name: "يورو", symbol: "€" },
  { code: "GBP", name: "جنيه استرليني", symbol: "£" }
];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: "cash", name: "نقداً" },
  { id: "BANKILY", name: "BANKILY" },
  { id: "MASRVI", name: "MASRVI" },
  { id: "SEDAD", name: "SEDAD" },
  { id: "BIMBANK", name: "BIMBANK" },
  { id: "BCIPAY", name: "BCIPAY" },
  { id: "CLICK", name: "CLICK" },
];

const defaultSettings: SettingsState = {
  currency: "MRU",
  locale: "ar",
  customCurrencies: [],
  customPaymentMethods: []
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  updateSettings: () => { },
  addCustomCurrency: () => { },
  removeCustomCurrency: () => { },
  addCustomPaymentMethod: () => { },
  removeCustomPaymentMethod: () => { },
  updateCustomPaymentMethod: () => { },
  getAvailableCurrencies: () => [],
  getAvailablePaymentMethods: () => [],
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const loadSettings = useCallback(async () => {
    try {
      let loadedSettings = { ...defaultSettings };
      const storeData = loadStoreData();
      const savedLocale = localStorage.getItem("app-locale") as "ar" | "fr" | null;

      // 1. Load from localStorage first (for fast initial render)
      if (storeData.settings) {
        loadedSettings = {
          ...defaultSettings,
          ...storeData.settings,
          customCurrencies: storeData.settings.customCurrencies || [],
          customPaymentMethods: storeData.settings.customPaymentMethods || []
        };
      }

      // 2. If authenticated, fetch from Supabase and overwrite
      if (isAuthenticated) {
        const dbSettings = await getStoreSettings();
        if (dbSettings) {
          loadedSettings = {
            ...loadedSettings,
            currency: dbSettings.currency || loadedSettings.currency,
            locale: (dbSettings.locale as "ar" | "fr") || loadedSettings.locale,
            customCurrencies: (dbSettings.custom_currencies as unknown as Currency[]) || loadedSettings.customCurrencies,
            customPaymentMethods: (dbSettings.custom_payment_methods as unknown as PaymentMethod[]) || loadedSettings.customPaymentMethods,
          };

          // Update localStorage with cloud data
          const data = loadStoreData();
          data.settings = loadedSettings;
          saveStoreData(data);
        }
      }

      // Prioritize localStorage locale if it exists (user preference on this specific device)
      if (savedLocale) {
        loadedSettings.locale = savedLocale;
      }

      setSettings(loadedSettings);
      setIsLoaded(true);

      // Initialize settings in storage if they don't exist
      if (!storeData.settings) {
        const data = loadStoreData();
        data.settings = loadedSettings;
        saveStoreData(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Real-time sync: reload settings when changed on another device
  useRealtimeSync(['store_settings'], loadSettings, user?.id);

  const saveToCloud = async (newSettings: SettingsState) => {
    if (isAuthenticated) {
      try {
        await upsertStoreSettings({
          currency: newSettings.currency,
          locale: newSettings.locale,
          custom_currencies: newSettings.customCurrencies,
          custom_payment_methods: newSettings.customPaymentMethods,
        });
      } catch (error) {
        console.error("Error saving settings to cloud:", error);
      }
    }
  };

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };

      // Save to local storage
      const data = loadStoreData();
      data.settings = updatedSettings;
      saveStoreData(data);

      // Sync locale with localStorage for consistency
      if (newSettings.locale) {
        localStorage.setItem("app-locale", newSettings.locale);
      }

      // Save to cloud
      saveToCloud(updatedSettings);

      return updatedSettings;
    });
  };

  const addCustomCurrency = (currency: Currency) => {
    setSettings(prev => {
      // Prevent duplicates
      const exists = prev.customCurrencies.some(c => c.code === currency.code);
      if (exists) return prev;

      const updatedCurrency = { ...currency, isCustom: true };
      const updatedSettings = {
        ...prev,
        customCurrencies: [...prev.customCurrencies, updatedCurrency]
      };

      // Save to local storage
      const data = loadStoreData();
      data.settings = updatedSettings;
      saveStoreData(data);

      // Save to cloud
      saveToCloud(updatedSettings);

      return updatedSettings;
    });
  };

  const removeCustomCurrency = (code: string) => {
    setSettings(prev => {
      const updatedSettings = {
        ...prev,
        customCurrencies: prev.customCurrencies.filter(c => c.code !== code)
      };

      // If the removed currency is the selected one, revert to default
      if (prev.currency === code) {
        updatedSettings.currency = "MRU";
      }

      // Save to local storage
      const data = loadStoreData();
      data.settings = updatedSettings;
      saveStoreData(data);

      // Save to cloud
      saveToCloud(updatedSettings);

      return updatedSettings;
    });
  };

  const addCustomPaymentMethod = (method: PaymentMethod) => {
    setSettings(prev => {
      // Prevent duplicates
      const exists = prev.customPaymentMethods.some(m => m.id === method.id);
      if (exists) return prev;

      const updatedMethod = { ...method, isCustom: true };
      const updatedSettings = {
        ...prev,
        customPaymentMethods: [...prev.customPaymentMethods, updatedMethod]
      };

      // Save to local storage
      const data = loadStoreData();
      data.settings = updatedSettings;
      saveStoreData(data);

      // Save to cloud
      saveToCloud(updatedSettings);

      return updatedSettings;
    });
  };

  const removeCustomPaymentMethod = (id: string) => {
    setSettings(prev => {
      const updatedSettings = {
        ...prev,
        customPaymentMethods: prev.customPaymentMethods.filter(m => m.id !== id)
      };

      // Save to local storage
      const data = loadStoreData();
      data.settings = updatedSettings;
      saveStoreData(data);

      // Save to cloud
      saveToCloud(updatedSettings);

      return updatedSettings;
    });
  };

  const updateCustomPaymentMethod = (id: string, method: PaymentMethod) => {
    setSettings(prev => {
      // Find the payment method to update
      const index = prev.customPaymentMethods.findIndex(m => m.id === id);

      // If not found, return the previous state
      if (index === -1) return prev;

      // Create a copy of the custom payment methods array
      const updatedPaymentMethods = [...prev.customPaymentMethods];

      // Update the payment method at the found index
      updatedPaymentMethods[index] = { ...method, isCustom: true };

      const updatedSettings = {
        ...prev,
        customPaymentMethods: updatedPaymentMethods
      };

      // Save to local storage
      const data = loadStoreData();
      data.settings = updatedSettings;
      saveStoreData(data);

      // Save to cloud
      saveToCloud(updatedSettings);

      return updatedSettings;
    });
  };

  const getAvailableCurrencies = () => {
    return [...defaultCurrencies, ...settings.customCurrencies];
  };

  const getAvailablePaymentMethods = () => {
    return [...defaultPaymentMethods, ...settings.customPaymentMethods];
  };

  // Don't render children until settings are loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        updateSettings,
        addCustomCurrency,
        removeCustomCurrency,
        addCustomPaymentMethod,
        removeCustomPaymentMethod,
        updateCustomPaymentMethod,
        getAvailableCurrencies,
        getAvailablePaymentMethods
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
