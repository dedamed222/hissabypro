import { useState, useEffect } from "react";
import { Warehouse } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWarehouses, upsertWarehouse, deleteWarehouse, getProducts } from "@/lib/database";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      const mapped = data.map((w: any) => ({
        id: w.id,
        name: w.name,
        location: w.location,
        description: w.description,
        isActive: w.is_active,
        createdAt: w.created_at,
        updatedAt: w.updated_at
      }));

      // Deduplicate: remove WH-MAIN from localStorage if Supabase returned real warehouses
      if (mapped.length > 0) {
        const storeData = loadStoreData();
        const localWarehouses = storeData.warehouses || [];
        // Keep only warehouses that are in the Supabase result (drop legacy WH-MAIN etc.)
        const realIds = new Set(mapped.map((w: Warehouse) => w.id));
        const filteredLocal = localWarehouses.filter((w: Warehouse) =>
          realIds.has(w.id)
        );
        // If localStorage still has legacy entries not in Supabase, clean them up
        if (filteredLocal.length !== localWarehouses.length) {
          saveStoreData({ ...storeData, warehouses: mapped });
        }
        setWarehouses(mapped);
      } else {
        // No Supabase data - fall back to localStorage but deduplicate by name
        const storeData = loadStoreData();
        const localWarehouses = storeData.warehouses || [];
        const seen = new Set<string>();
        const deduped = localWarehouses.filter((w: Warehouse) => {
          if (seen.has(w.name)) return false;
          seen.add(w.name);
          return true;
        });
        setWarehouses(deduped);
      }
    } catch (error) {
      console.error("Error loading warehouses:", error);
      // Fallback to localStorage
      const storeData = loadStoreData();
      setWarehouses(storeData.warehouses || []);
    }
  };

  const addWarehouse = async (warehouse: Omit<Warehouse, "id" | "createdAt">) => {
    try {
      const newWarehouse = await upsertWarehouse({
        name: warehouse.name,
        location: warehouse.location,
        description: warehouse.description,
        is_active: warehouse.isActive
      });
      
      await loadWarehouses();
      
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المخزن بنجاح",
      });
      
      return newWarehouse;
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المخزن",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateWarehouse = async (id: string, updates: Partial<Warehouse>) => {
    try {
      await upsertWarehouse({
        id,
        name: updates.name as string,
        location: updates.location,
        description: updates.description,
        is_active: updates.isActive
      });
      await loadWarehouses();
      
      toast({
        title: "تم بنجاح",
        description: "تم تحديث المخزن بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المخزن",
        variant: "destructive",
      });
    }
  };

  const deleteWarehouseSync = async (id: string) => {
    try {
      // Remove from localStorage first (handles legacy non-UUID ids like WH-MAIN)
      const storeData = loadStoreData();
      const updatedWarehouses = (storeData.warehouses || []).filter(
        (w: Warehouse) => w.id !== id
      );
      saveStoreData({ ...storeData, warehouses: updatedWarehouses });

      // Also delete from Supabase if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        // Check if warehouse has products in Supabase
        const products = await getProducts();
        const hasProducts = products.some((p: any) => p.warehouse_id === id);
        if (hasProducts) {
          // Restore to localStorage since we can't delete
          saveStoreData({ ...storeData });
          toast({
            title: "تحذير / Avertissement",
            description: "لا يمكن حذف المخزن لأنه يحتوي على منتجات — Ce dépôt contient des produits",
            variant: "destructive",
          });
          return false;
        }
        await deleteWarehouse(id);
      }

      await loadWarehouses();

      toast({
        title: "تم بنجاح",
        description: "تم حذف المخزن بنجاح / Dépôt supprimé avec succès",
      });

      return true;
    } catch (error) {
      console.error("deleteWarehouseSync error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف المخزن",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    warehouses,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse: deleteWarehouseSync,
    reloadWarehouses: loadWarehouses,
  };
}
