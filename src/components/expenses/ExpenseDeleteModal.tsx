
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Expense } from "@/types";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { toast } from "@/hooks/use-toast";

interface ExpenseDeleteModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function ExpenseDeleteModal({ expense, isOpen, onClose, onDelete }: ExpenseDeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!expense) return;
    
    setLoading(true);
    try {
      const storeData = loadStoreData();
      storeData.expenses = storeData.expenses.filter(e => e.id !== expense.id);
      
      saveStoreData(storeData);
      onDelete();
      onClose();
      
      toast({
        title: "تم الحذف",
        description: "تم حذف المصروف بنجاح",
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المصروف",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.
            <br />
            <strong>الوصف:</strong> {expense?.description}
            <br />
            <strong>المبلغ:</strong> {expense?.amount}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? "جاري الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
