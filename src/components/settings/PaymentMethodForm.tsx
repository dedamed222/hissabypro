import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit2, X, Check, Plus, CreditCard, Wallet } from "lucide-react";
import { PaymentMethod } from "@/types";

export const PaymentMethodForm = () => {
  const {
    customPaymentMethods,
    addCustomPaymentMethod,
    removeCustomPaymentMethod,
    updateCustomPaymentMethod,
  } = useSettings();
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";

  const [newMethod, setNewMethod] = useState({
    id: "",
    name: "",
  });

  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editValues, setEditValues] = useState({ id: "", name: "" });

  const handleAddMethod = () => {
    if (!newMethod.id.trim() || !newMethod.name.trim()) {
      toast({
        title: isFr ? "Champs obligatoires manquants" : "يرجى ملء جميع الحقول المطلوبة",
        description: isFr ? "L'identifiant et le nom sont requis." : "المعرف والاسم مطلوبان.",
        variant: "destructive",
      });
      return;
    }

    addCustomPaymentMethod({
      id: newMethod.id.toUpperCase(),
      name: newMethod.name,
    });

    setNewMethod({ id: "", name: "" });

    toast({
      title: isFr ? "Moyen de paiement ajouté" : "تم إضافة طريقة الدفع بنجاح",
      description: isFr ? "Le moyen de paiement a été enregistré." : "تم حفظ وسيلة الدفع الجديدة في النظام.",
    });
  };

  const handleRemoveMethod = (id: string) => {
    removeCustomPaymentMethod(id);
    toast({
      title: isFr ? "Moyen de paiement supprimé" : "تم حذف طريقة الدفع",
      description: isFr ? `Le moyen de paiement ${id} a été retiré.` : `تم حذف ${id} من الخيارات.`,
    });
  };

  const startEditing = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditValues({
      id: method.id,
      name: method.name,
    });
  };

  const cancelEditing = () => {
    setEditingMethod(null);
  };

  const saveEditing = () => {
    if (!editValues.id.trim() || !editValues.name.trim()) {
      toast({
        title: isFr ? "Champs requis" : "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (editingMethod) {
      updateCustomPaymentMethod(editingMethod.id, {
        id: editValues.id.toUpperCase(),
        name: editValues.name,
      });

      setEditingMethod(null);

      toast({
        title: isFr ? "Moyen de paiement mis à jour" : "تم تحديث طريقة الدفع بنجاح",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* List of Custom Payment Methods */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">
              {isFr ? "Moyens de paiement configurés" : "طرق الدفع المخصصة"}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {customPaymentMethods.length} {isFr ? "méthodes" : "طرق"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {customPaymentMethods.map((method) => (
            <div
              key={method.id}
              className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between"
            >
              {editingMethod && editingMethod.id === method.id ? (
                <div className="flex flex-1 items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="w-full sm:w-1/3">
                    <Input
                      value={editValues.id}
                      onChange={(e) => setEditValues({ ...editValues, id: e.target.value })}
                      placeholder="VISA, BANKILY, etc."
                      className="uppercase font-mono text-sm"
                    />
                  </div>
                  <div className="w-full sm:w-2/3">
                    <Input
                      value={editValues.name}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      placeholder={isFr ? "Nom de la méthode" : "اسم طريقة الدفع"}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveEditing}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-9 w-9 p-0 rounded-lg cursor-pointer"
                      title={isFr ? "Valider" : "تأكيد"}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 h-9 w-9 p-0 rounded-lg cursor-pointer"
                      title={isFr ? "Annuler" : "إلغاء"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{method.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{method.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(method)}
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8 w-8 p-0 rounded-lg cursor-pointer"
                      title={isFr ? "Modifier" : "تعديل"}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMethod(method.id)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg cursor-pointer"
                      title={isFr ? "Supprimer" : "حذف"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {customPaymentMethods.length === 0 && (
            <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isFr ? "Aucun moyen de paiement personnalisé" : "لا توجد طرق دفع مخصصة"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isFr
                  ? "Ajoutez des moyens de paiement spécifiques (Bankily, Masrvi, Carte bancaire, etc.) ci-dessous."
                  : "أضف طرق دفع إضافية مثل (بنكيلي، مصروفي، سداد، فيزا، إلخ) من النموذج أدناه."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Payment Method Form */}
      <div className="p-5 border border-slate-200/80 rounded-2xl bg-gradient-to-b from-slate-50/70 to-white shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Plus className="w-4 h-4 text-indigo-600" />
          <h4 className="font-bold text-sm text-slate-800">
            {isFr ? "Ajouter un nouveau moyen de paiement" : "إضافة طريقة دفع جديدة"}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {isFr ? "Identifiant (Code en majuscules)" : "معرف طريقة الدفع (Code)"}
            </Label>
            <Input
              value={newMethod.id}
              onChange={(e) => setNewMethod({ ...newMethod, id: e.target.value })}
              placeholder="BANKILY, MASRVI, SADAD, CARD..."
              className="uppercase font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              {isFr ? "Nom affiché sur les factures" : "اسم طريقة الدفع"}
            </Label>
            <Input
              value={newMethod.name}
              onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
              placeholder={isFr ? "ex: Bankily, Virement bancaire, Chèque" : "مثال: تطبيق بنكيلي، شيك بنكي، بطاقة دفع"}
              className="text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleAddMethod}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-sm"
        >
          <Plus className={`h-4 w-4 ${isRTL ? "ml-1.5" : "mr-1.5"}`} />
          {isFr ? "Ajouter cette méthode" : "إضافة طريقة الدفع"}
        </Button>
      </div>
    </div>
  );
};
