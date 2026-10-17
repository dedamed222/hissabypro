import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Expense } from "@/types";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/useLocale";

interface ExpenseDeleteModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function ExpenseDeleteModal({ expense, isOpen, onClose, onDelete }: ExpenseDeleteModalProps) {
  const { locale } = useLocale();
  const isFr = locale === 'fr';
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
        title: isFr ? "Supprimé" : "تم الحذف",
        description: isFr ? "La dépense a été supprimée avec succès" : "تم حذف المصروف بنجاح",
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: isFr ? "Erreur" : "خطأ",
        description: isFr ? "Une erreur est survenue lors de la suppression" : "حدث خطأ أثناء حذف المصروف",
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
          <AlertDialogTitle>{isFr ? "Confirmer la suppression" : "تأكيد الحذف"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isFr 
              ? "Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible."
              : "هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء."
            }
            <br />
            <strong>{isFr ? "Description :" : "الوصف:"}</strong> {expense?.description}
            <br />
            <strong>{isFr ? "Montant :" : "المبلغ:"}</strong> {expense?.amount}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            {isFr ? "Annuler" : "إلغاء"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? (isFr ? "Suppression..." : "جاري الحذف...") : (isFr ? "Supprimer" : "حذف")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
