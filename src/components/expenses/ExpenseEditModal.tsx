import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expense } from "@/types";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/useLocale";

interface ExpenseEditModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ExpenseEditModal({ expense, isOpen, onClose, onUpdate }: ExpenseEditModalProps) {
  const { locale } = useLocale();
  const isFr = locale === 'fr';

  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(expense?.amount?.toString() || "");
  const [category, setCategory] = useState(expense?.category || "general");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "BANKILY" | "MASRVI" | "SEDAD" | "BIMBANK" | "BCIPAY" | "CLICK">(
    (expense?.paymentMethod as "cash" | "BANKILY" | "MASRVI" | "SEDAD" | "BIMBANK" | "BCIPAY" | "CLICK") || "cash"
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!expense) return;
    
    if (!description.trim()) {
      toast({
        title: isFr ? "Erreur" : "خطأ",
        description: isFr ? "Veuillez entrer une description de la dépense" : "يرجى إدخال وصف المصروف",
        variant: "destructive",
      });
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: isFr ? "Erreur" : "خطأ",
        description: isFr ? "Veuillez entrer un montant valide" : "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const storeData = loadStoreData();
      const expenseIndex = storeData.expenses.findIndex(e => e.id === expense.id);
      
      if (expenseIndex !== -1) {
        storeData.expenses[expenseIndex] = {
          ...expense,
          description: description.trim(),
          amount: Number(amount),
          category,
          paymentMethod,
          updatedAt: new Date().toISOString(),
        };
        
        saveStoreData(storeData);
        onUpdate();
        onClose();
        
        toast({
          title: isFr ? "Mis à jour" : "تم التحديث",
          description: isFr ? "La dépense a été mise à jour avec succès" : "تم تحديث المصروف بنجاح",
        });
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: isFr ? "Erreur" : "خطأ",
        description: isFr ? "Une erreur est survenue lors de la mise à jour" : "حدث خطأ أثناء تحديث المصروف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isFr ? "Modifier la dépense" : "تعديل المصروف"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">{isFr ? "Description" : "الوصف"}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isFr ? "Description de la dépense" : "وصف المصروف"}
            />
          </div>
          
          <div>
            <Label htmlFor="amount">{isFr ? "Montant" : "المبلغ"}</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div>
            <Label htmlFor="category">{isFr ? "Catégorie" : "الفئة"}</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="general">{isFr ? "Général" : "عام"}</option>
              <option value="utilities">{isFr ? "Services" : "مرافق"}</option>
              <option value="salary">{isFr ? "Salaires" : "رواتب"}</option>
              <option value="rent">{isFr ? "Loyer" : "إيجار"}</option>
              <option value="supplies">{isFr ? "Fournitures" : "مستلزمات"}</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="paymentMethod">{isFr ? "Mode de paiement" : "طريقة الدفع"}</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full p-2 border rounded"
            >
              <option value="cash">{isFr ? "Espèces" : "نقداً"}</option>
              <option value="BANKILY">BANKILY</option>
              <option value="MASRVI">MASRVI</option>
              <option value="SEDAD">SEDAD</option>
              <option value="BIMBANK">BIMBANK</option>
              <option value="BCIPAY">BCIPAY</option>
              <option value="CLICK">CLICK</option>
            </select>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              {isFr ? "Annuler" : "إلغاء"}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (isFr ? "Enregistrement..." : "جاري الحفظ...") : (isFr ? "Enregistrer" : "حفظ التغييرات")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
