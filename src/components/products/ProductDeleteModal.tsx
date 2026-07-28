
import { AlertTriangle, Trash2 } from "lucide-react";
import { Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";

interface ProductDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  selectedProduct: Product | null;
}

export default function ProductDeleteModal({
  isOpen, onClose, onConfirm, loading, selectedProduct
}: ProductDeleteModalProps) {
  const { t } = useLocale();

  if (!isOpen || !selectedProduct) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-4 border-b">
          <h3 className="font-medium text-lg">{t('deleteConfirmation')}</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 text-amber-600 mb-4">
            <AlertTriangle size={24} />
            <p>{t('confirmDelete')}</p>
          </div>
          <p className="mb-2">
            <strong>{t('name')}:</strong> {selectedProduct.name}
          </p>
          <p className="mb-2">
            <strong>{t('code')}:</strong> {selectedProduct.code}
          </p>
          <p>
            <strong>{t('productPrice')}:</strong> {selectedProduct.price}
          </p>
          <p className="mt-4 text-red-600 text-sm">
            {t('cannotUndo')}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{t('deleting')}</span>
              </>
            ) : (
              <>
                <Trash2 size={18} />
                <span>{t('deleteProduct')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
