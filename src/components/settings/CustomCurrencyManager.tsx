
import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const CustomCurrencyManager = () => {
  const { customCurrencies, addCustomCurrency, removeCustomCurrency } = useSettings();
  const { locale } = useLocale();
  const t = translations[locale];
  const { toast } = useToast();
  
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: ""
  });
  
  const handleAddCurrency = () => {
    if (!newCurrency.code.trim()) {
      toast({ 
        title: t.currencyCodeRequired || "Currency code is required",
        variant: "destructive" 
      });
      return;
    }
    
    if (!newCurrency.name.trim()) {
      toast({ 
        title: t.currencyNameRequired || "Currency name is required",
        variant: "destructive"
      });
      return;
    }
    
    addCustomCurrency({
      code: newCurrency.code.toUpperCase(),
      name: newCurrency.name,
      symbol: newCurrency.symbol || newCurrency.code.toUpperCase()
    });
    
    setNewCurrency({ code: "", name: "", symbol: "" });
    
    toast({
      title: t.currencyAdded || "Currency added successfully",
    });
  };
  
  const handleRemoveCurrency = (code: string) => {
    removeCustomCurrency(code);
    toast({
      title: t.currencyRemoved || "Currency removed",
    });
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t.customCurrencies}</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {customCurrencies.map((currency) => (
          <div key={currency.code} className="flex items-center justify-between p-3 border rounded-md">
            <div className="flex flex-col">
              <div className="font-medium">{currency.name}</div>
              <div className="text-sm text-gray-500">
                {currency.code} {currency.symbol && `(${currency.symbol})`}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleRemoveCurrency(currency.code)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {customCurrencies.length === 0 && (
          <div className="text-center py-4 text-gray-500 italic">
            {t.addCustomCurrency}
          </div>
        )}
      </div>
      
      <div className="p-4 border rounded-md mt-4 bg-muted/20">
        <h4 className="font-medium mb-2">{t.addCustomCurrency}</h4>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">{t.currencyCode}</label>
              <Input 
                value={newCurrency.code} 
                onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })} 
                placeholder="USD, EUR, etc." 
                className="uppercase"
                maxLength={5}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">{t.currencyName}</label>
              <Input 
                value={newCurrency.name} 
                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })} 
                placeholder={t.currencyName}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">{t.currencySymbol}</label>
            <Input 
              value={newCurrency.symbol} 
              onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })} 
              placeholder="$, €, etc."
              maxLength={3}
            />
          </div>
          <Button onClick={handleAddCurrency} className="w-full">
            {t.addCurrency}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomCurrencyManager;
