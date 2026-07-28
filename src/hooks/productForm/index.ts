
import { useProductFormState } from "./useProductFormState";
import { useProductFormHandlers } from "./useProductFormHandlers";
import type { Product } from "@/types";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Composed hook - API compatible with old useProductForm,
 * just pass setProducts as before!
 */
export function useProductForm(setProducts: (products: Product[]) => void, onSuccess?: () => void) {
  const state = useProductFormState();
  const { isAuthenticated } = useAuth();
  const handlers = useProductFormHandlers({ state, setProducts, onSuccess, isAuthenticated });
  return {
    ...state,
    ...handlers,
  };
}

export type { ProductFormData } from "./useProductFormState";
