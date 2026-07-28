import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import type { Product } from "@/types";
import type { ProductFormData } from "./useProductFormState";
import { toast } from "@/hooks/use-toast";
import { upsertProduct, deleteProduct as deleteProductDB } from "@/lib/database";

interface ProductFormHandlersParams {
  state: {
    formData: ProductFormData;
    setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isDeleteModalOpen: boolean;
    setIsDeleteModalOpen: (open: boolean) => void;
    selectedProduct: Product | null;
    setSelectedProduct: (p: Product | null) => void;
    error: string;
    setError: (e: string) => void;
    loading: boolean;
    setLoading: (l: boolean) => void;
    resetForm: () => void;
  };
  setProducts: (products: Product[]) => void;
  onSuccess?: () => void;
  isAuthenticated: boolean;
}

export function useProductFormHandlers({ state, setProducts, onSuccess, isAuthenticated }: ProductFormHandlersParams) {
  const handleAddNew = () => {
    state.resetForm();
    state.setIsAddModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    state.setSelectedProduct(product);
    state.setFormData({
      code: product.code,
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      category: product.category || "",
      cost: product.cost ? product.cost.toString() : "",
      warehouseId: product.warehouseId || "",
    });
    state.setIsAddModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    state.setSelectedProduct(product);
    state.setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    state.setError("");

    if (!state.formData.code.trim()) {
      state.setError("يرجى إدخال رمز المنتج");
      return;
    }

    if (!state.formData.name.trim()) {
      state.setError("يرجى إدخال اسم المنتج");
      return;
    }
    
    if (!state.formData.warehouseId) {
      state.setError("يرجى اختيار المخزن");
      return;
    }

    const price = parseFloat(state.formData.price);
    if (isNaN(price) || price < 0) {
      state.setError("يرجى إدخال سعر صحيح");
      return;
    }

    const quantity = parseInt(state.formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      state.setError("يرجى إدخال كمية صحيحة");
      return;
    }

    const lowStockThreshold = parseInt(state.formData.lowStockThreshold);
    if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      state.setError("يرجى إدخال حد أدنى صحيح للمخزون");
      return;
    }
    
    let cost = 0;
    if (state.formData.cost && state.formData.cost.trim() !== "") {
      cost = parseFloat(state.formData.cost);
      if (isNaN(cost) || cost < 0) {
        state.setError("يرجى إدخال تكلفة صحيحة");
        return;
      }
    } else {
      cost = price * 0.7;
    }

    state.setLoading(true);

    try {
      const now = new Date().toISOString();
      let savedProduct: any = null;
      
      // 1. --- Optional Cloud Sync ---
      if (isAuthenticated) {
        try {
          const result = await upsertProduct({
            id: state.selectedProduct ? (state.selectedProduct.id?.length === 36 ? state.selectedProduct.id : undefined) : undefined,
            code: state.formData.code.trim(),
            name: state.formData.name.trim(),
            description: state.selectedProduct?.description || "",
            price,
            cost,
            quantity,
            low_stock_threshold: lowStockThreshold,
            category: state.formData.category,
            warehouse_id: state.formData.warehouseId,
            supplier_id: state.selectedProduct?.supplierId,
            photo_url: state.selectedProduct?.photoUrl,
            barcode: state.selectedProduct?.barcode,
            sold: state.selectedProduct?.sold || 0
          });
          
          if (result) {
            // Map Supabase result back to Product type
            savedProduct = {
              id: result.id,
              code: result.code,
              name: result.name,
              description: result.description,
              price: result.price,
              cost: result.cost,
              quantity: result.quantity,
              lowStockThreshold: result.low_stock_threshold,
              category: result.category,
              warehouseId: result.warehouse_id,
              supplierId: result.supplier_id,
              photoUrl: result.photo_url,
              barcode: result.barcode,
              sold: result.sold,
              createdAt: result.created_at,
              updatedAt: result.updated_at
            };
          }
        } catch (dbErr: any) {
          console.error("Database sync error:", dbErr);
          let errorMessage = "فشل حفظ المنتج في السحابة";
          if (dbErr?.message?.includes("unique_code") || dbErr?.code === '23505') {
            errorMessage = "رمز المنتج مكرر فضلاً استخدم رمزاً آخر";
          } else if (dbErr?.message) {
            errorMessage += `: ${dbErr.message}`;
            if (dbErr.details) errorMessage += ` (${dbErr.details})`;
            if (dbErr.hint) errorMessage += ` - ${dbErr.hint}`;
          }
          // بداية إصلاح: إيقاف التنفيذ عند أي خطأ في Supabase لمنع اختفاء المنتج
          toast({
            title: "خطأ في الحفظ",
            description: errorMessage,
            variant: "destructive"
          });
          state.setLoading(false);
          return;
          // نهاية إصلاح
        }
      }

      // 2. --- Local Sync Secondary ---
      const storeData = loadStoreData();
      if (state.selectedProduct) {
        const updatedProducts = storeData.products.map((p) =>
          p.id === state.selectedProduct!.id
            ? (savedProduct || {
                ...p,
                code: state.formData.code,
                name: state.formData.name,
                price,
                cost,
                quantity,
                lowStockThreshold,
                category: state.formData.category,
                warehouseId: state.formData.warehouseId,
                updatedAt: now,
              })
            : p
        );
        storeData.products = updatedProducts;
        saveStoreData(storeData);
        setProducts(updatedProducts);
        
        toast({
          title: "تم التحديث بنجاح",
          description: `تم تحديث المنتج ${state.formData.name} بنجاح`
        });
      } else {
        const newProduct: Product = savedProduct || {
          id: generateId(),
          code: state.formData.code,
          name: state.formData.name,
          price,
          cost,
          quantity,
          lowStockThreshold,
          category: state.formData.category,
          warehouseId: state.formData.warehouseId,
          createdAt: now,
          updatedAt: now,
        };

        storeData.products = [...storeData.products, newProduct];
        saveStoreData(storeData);
        setProducts(storeData.products);
        
        toast({
          title: "تمت الإضافة بنجاح",
          description: `تم إضافة المنتج ${state.formData.name} بنجاح`
        });
      }

      state.setIsAddModalOpen(false);
      state.resetForm();
      state.setSelectedProduct(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error saving product:", err);
      state.setError("حدث خطأ أثناء حفظ المنتج");
    } finally {
      state.setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!state.selectedProduct) return;

    state.setLoading(true);

    try {
      const storeData = loadStoreData();
      const updatedProducts = storeData.products.filter(
        (p) => p.id !== state.selectedProduct!.id
      );

      storeData.products = updatedProducts;
      saveStoreData(storeData);
      setProducts(updatedProducts);

      try {
        if (state.selectedProduct.id?.length === 36) {
          await deleteProductDB(state.selectedProduct.id);
        }
      } catch (dbErr) {
        console.error("Database deletion error:", dbErr);
      }

      toast({
        title: "تم الحذف بنجاح",
        description: `تم حذف المنتج ${state.selectedProduct.name} بنجاح`
      });

      if (onSuccess) {
        onSuccess();
      }

      state.setIsDeleteModalOpen(false);
      state.setSelectedProduct(null);
    } catch (err) {
      console.error("Error deleting product:", err);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المنتج",
        variant: "destructive"
      });
    } finally {
      state.setLoading(false);
    }
  };

  return {
    handleAddNew,
    handleEdit,
    handleDeleteClick,
    handleSubmit,
    handleDeleteConfirm,
  };
}
