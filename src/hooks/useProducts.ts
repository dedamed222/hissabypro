
import { useState, useEffect, useCallback, useMemo } from "react";
import { getProducts, upsertProduct, insertProducts, deleteProduct as deleteProductDB } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

// Map DB row (snake_case) → app Product type (camelCase)
const mapRow = (row: any): Product => ({
  id: String(row.id),
  code: String(row.code || ""),
  name: String(row.name || ""),
  description: row.description ? String(row.description) : undefined,
  price: Number(row.price || 0),
  cost: Number(row.cost || 0),
  quantity: Number(row.quantity || 0),
  lowStockThreshold: Number(row.low_stock_threshold || 5),
  category: row.category ? String(row.category) : undefined,
  supplierId: row.supplier_id ? String(row.supplier_id) : undefined,
  warehouseId: row.warehouse_id ? String(row.warehouse_id) : undefined,
  photoUrl: row.photo_url ? String(row.photo_url) : undefined,
  barcode: row.barcode ? String(row.barcode) : undefined,
  sold: Number(row.sold || 0),
  createdAt: String(row.created_at || new Date().toISOString()),
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
});

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("created_at-desc");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        const rows = await getProducts();
        const mapped = rows.map(mapRow);
        setProducts(mapped);
      } else {
        // Guest mode - fallback to localStorage
        const { loadStoreData } = await import("@/utils/localStorage");
        const storeData = loadStoreData();
        setProducts(storeData.products || []);
      }
    } catch (err) {
      console.error("Error loading products:", err);
      setError("فشل تحميل المنتجات");
      toast({ title: "خطأ", description: "فشل تحميل المنتجات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const normalized = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(normalized) ||
          p.code.toLowerCase().includes(normalized) ||
          (p.category || "").toLowerCase().includes(normalized)
      );
    }

    // Sort logic
    switch (sortOption) {
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "quantity-asc":
        result.sort((a, b) => a.quantity - b.quantity);
        break;
      case "quantity-desc":
        result.sort((a, b) => b.quantity - a.quantity);
        break;
      case "sold-asc":
        result.sort((a, b) => (a.sold || 0) - (b.sold || 0));
        break;
      case "sold-desc":
        result.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
      default: // created_at-desc
        result.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }

    return result;
  }, [products, searchQuery, sortOption]);

  const saveProduct = async (product: Partial<Product> & { name: string; code: string }) => {
    try {
      await upsertProduct({
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        price: product.price ?? 0,
        cost: product.cost ?? 0,
        quantity: product.quantity ?? 0,
        low_stock_threshold: product.lowStockThreshold ?? 5,
        category: product.category,
        supplier_id: product.supplierId,
        warehouse_id: product.warehouseId,
        photo_url: product.photoUrl,
        barcode: product.barcode,
        sold: product.sold ?? 0,
      });
      await loadProducts();
    } catch (err) {
      console.error("Error saving product:", err);
      throw err;
    }
  };

  const saveMultipleProducts = async (newProducts: (Partial<Product> & { name: string; code: string })[]) => {
    try {
      await insertProducts(
        newProducts.map((product) => ({
          id: product.id?.length === 36 ? product.id : undefined,
          code: product.code,
          name: product.name,
          description: product.description,
          price: product.price ?? 0,
          cost: product.cost ?? 0,
          quantity: product.quantity ?? 0,
          low_stock_threshold: product.lowStockThreshold ?? 5,
          category: product.category,
          supplier_id: product.supplierId,
          warehouse_id: product.warehouseId,
          photo_url: product.photoUrl,
          barcode: product.barcode,
          sold: product.sold ?? 0,
        }))
      );
      await loadProducts();
    } catch (err) {
      console.error("Error saving multiple products:", err);
      throw err;
    }
  };

  const removeProduct = async (id: string) => {
    try {
      await deleteProductDB(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err);
      throw err;
    }
  };

  return {
    products,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    error,
    setError,
    loading,
    setLoading,
    setProducts,
    loadProducts,
    saveProduct,
    saveMultipleProducts,
    removeProduct,
  };
};
