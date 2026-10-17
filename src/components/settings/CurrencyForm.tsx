import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Coins, Landmark } from "lucide-react";

export const CurrencyForm = () => {
  const { customCurrencies, addCustomCurrency, removeCustomCurrency } = useSettings();
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";

  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
  });

  const handleAddCurrency = () => {
    if (!newCurrency.code.trim() || !newCurrency.name.trim()) {
      toast({
        title: isFr ? "Champs obligatoires manquants" : "يرجى ملء جميع الحقول المطلوبة",
        description: isFr ? "Veuillez renseigner le code et le nom de la devise." : "الرمز والاسم مطلوبان.",
        variant: "destructive",
      });
      return;
    }

    addCustomCurrency({
      code: newCurrency.code.toUpperCase(),
      name: newCurrency.name,
      symbol: newCurrency.symbol || newCurrency.code.toUpperCase(),
    });

    setNewCurrency({ code: "", name: "", symbol: "" });

    toast({
      title: isFr ? "Devise ajoutée" : "تم إضافة العملة بنجاح",
      description: isFr ? "La nouvelle devise a été ajoutée à vos paramètres." : "تم حفظ العملة الجديدة في النظام.",
    });
  };

  const handleRemoveCurrency = (code: string) => {
    removeCustomCurrency(code);
    toast({
      title: isFr ? "Devise supprimée" : "تم حذف العملة",
      description: isFr ? `La devise ${code} a été retirée.` : `تمت إزالة العملة ${code}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* List of Custom Currencies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">
              {isFr ? "Devises personnalisées" : "العملات المخصصة"}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {customCurrencies.length} {isFr ? "devises" : "عملات"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {customCurrencies.map((currency) => (
            <div
              key={currency.code}
              className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:border-indigo-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-sm">
                  {currency.symbol || currency.code.slice(0, 2)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{currency.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {currency.code} {currency.symbol && `• (${currency.symbol})`}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCurrency(currency.code)}
                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer h-8 w-8 p-0"
                title={isFr ? "Supprimer la devise" : "حذف العملة"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {customCurrencies.length === 0 && (
            <div className="col-span-full text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Landmark className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isFr ? "Aucune devise personnalisée" : "لا توجد عملات مخصصة"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isFr
                  ? "Ajoutez des devises supplémentaires (MRU, EUR, USD, etc.) ci-dessous."
                  : "أضف عملات إضافية (أوقية، يورو، دولار، إلخ) من النموذج أدناه."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Currency Form */}
      <div className="p-5 border border-slate-200/80 rounded-2xl bg-gradient-to-b from-slate-50/70 to-white shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Plus className="w-4 h-4 text-indigo-600" />
          <h4 className="font-bold text-sm text-slate-800">
            {isFr ? "Ajouter une nouvelle devise" : "إضافة عملة جديدة"}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {isFr ? "Code (ex: MRU, EUR)" : "رمز العملة (ISO)"}
            </Label>
            <Input
              value={newCurrency.code}
              onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
              placeholder="USD, EUR, MRU..."
              className="uppercase font-mono text-sm"
              maxLength={5}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {isFr ? "Nom complet de la devise" : "اسم العملة"}
            </Label>
            <Input
              value={newCurrency.name}
              onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
              placeholder={isFr ? "Ouguiya, Euro, Dollar..." : "أوقية جديدة، يورو، دولار..."}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {isFr ? "Symbole court" : "الرمز المختصر"}
            </Label>
            <Input
              value={newCurrency.symbol}
              onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              placeholder="UM, €, $, etc."
              maxLength={5}
              className="text-sm font-semibold"
            />
          </div>
        </div>

        <Button
          onClick={handleAddCurrency}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-sm"
        >
          <Plus className={`h-4 w-4 ${isRTL ? "ml-1.5" : "mr-1.5"}`} />
          {isFr ? "Ajouter cette devise" : "إضافة العملة"}
        </Button>
      </div>
    </div>
  );
};
