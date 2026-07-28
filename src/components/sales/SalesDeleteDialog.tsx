
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import type { DailySale } from "@/types";
import { useLocale } from "@/hooks/useLocale";

interface SalesDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleToDelete: DailySale | null;
  onConfirm: () => void;
}

export const SalesDeleteDialog = ({
  open,
  onOpenChange,
  saleToDelete,
  onConfirm
}: SalesDeleteDialogProps) => {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirmDelete')}</DialogTitle>
          <DialogDescription>
            {t('deleteSalesConfirmDesc')} 
            {saleToDelete && (
              <div className="mt-2 font-medium">
                {saleToDelete.productName} ({saleToDelete.quantity} {t('units')})
              </div>
            )}
            <div className="mt-2 text-green-600">
              {t('returnToStockMsg')}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
            {t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
