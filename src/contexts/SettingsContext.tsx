
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { Currency, PaymentMethod } from "@/types";
import { toast } from "@/hooks/use-toast";
import { translations } from "@/locales";

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
  updateSettings: () => {},
  addCustomCurrency: () => {},
  removeCustomCurrency: () => {},
  addCustomPaymentMethod: () => {},
  removeCustomPaymentMethod: () => {},
  updateCustomPaymentMethod: () => {},
  getAvailableCurrencies: () => [],
  getAvailablePaymentMethods: () => [],
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load settings from local storage
    const storeData = loadStoreData();
    const savedLocale = localStorage.getItem("app-locale") as "ar" | "fr" | null;
    
    let loadedSettings = { ...defaultSettings };
    
    if (storeData.settings) {
      loadedSettings = {
        ...defaultSettings,
        ...storeData.settings,
        customCurrencies: storeData.settings.customCurrencies || [],
        customPaymentMethods: storeData.settings.customPaymentMethods || []
      };
    }
    
    // Prioritize localStorage locale if it exists
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
  }, []);

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
