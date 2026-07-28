
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Expense } from "@/types";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { toast } from "@/hooks/use-toast";

interface ExpenseEditModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ExpenseEditModal({ expense, isOpen, onClose, onUpdate }: ExpenseEditModalProps) {
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
        title: "خطأ",
        description: "يرجى إدخال وصف المصروف",
        variant: "destructive",
      });
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
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
          title: "تم التحديث",
          description: "تم تحديث المصروف بنجاح",
        });
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المصروف",
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
          <DialogTitle>تعديل المصروف</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">الوصف</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المصروف"
            />
          </div>
          
          <div>
            <Label htmlFor="amount">المبلغ</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div>
            <Label htmlFor="category">الفئة</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="general">عام</option>
              <option value="utilities">مرافق</option>
              <option value="salary">رواتب</option>
              <option value="rent">إيجار</option>
              <option value="supplies">مستلزمات</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="paymentMethod">طريقة الدفع</Label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full p-2 border rounded"
            >
              <option value="cash">نقداً</option>
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
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
