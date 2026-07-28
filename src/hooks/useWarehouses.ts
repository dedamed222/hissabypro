import { useState, useEffect } from "react";
import { Warehouse } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getWarehouses, upsertWarehouse, deleteWarehouse, getProducts } from "@/lib/database";

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses();
      const mapped = data.map(w => ({
        id: w.id,
        name: w.name,
        location: w.location,
        description: w.description,
        isActive: w.is_active,
        createdAt: w.created_at,
        updatedAt: w.updated_at
      }));
      setWarehouses(mapped);
    } catch (error) {
      console.error("Error loading warehouses:", error);
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
      // Check if warehouse has products in Supabase
      const products = await getProducts();
      const hasProducts = products.some((p: any) => p.warehouse_id === id);
      if (hasProducts) {
        toast({
          title: "تحذير",
          description: "لا يمكن حذف المخزن لأنه يحتوي على منتجات",
          variant: "destructive",
        });
        return false;
      }
      
      await deleteWarehouse(id);
      await loadWarehouses();
      
      toast({
        title: "تم بنجاح",
        description: "تم حذف المخزن بنجاح",
      });
      
      return true;
    } catch (error) {
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
