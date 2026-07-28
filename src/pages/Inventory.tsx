import { useEffect, useState } from "react";
import { getProducts, getWarehouses } from "@/lib/database";
import { Product, Warehouse } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import InventoryTabs from "@/components/inventory/InventoryTabs";
import WarehouseManager from "@/components/inventory/WarehouseManager";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showWarehouseManager, setShowWarehouseManager] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load products and warehouses on component mount
  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      let productsData: any[] = [];
      let warehousesData: any[] = [];

      if (isAuthenticated) {
        [productsData, warehousesData] = await Promise.all([
          getProducts(),
          getWarehouses()
        ]);
      } else {
        // Guest mode fallback
        const { loadStoreData } = await import("@/utils/localStorage");
        const store = loadStoreData();
        productsData = store.products || [];
        warehousesData = store.warehouses || [];
      }

      const mappedProducts: Product[] = productsData.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        price: p.price,
        cost: p.cost,
        quantity: p.quantity,
        lowStockThreshold: p.low_stock_threshold || p.lowStockThreshold || 5,
        category: p.category,
        supplierId: p.supplier_id || p.supplierId,
        warehouseId: p.warehouse_id || p.warehouseId,
        photoUrl: p.photo_url || p.photoUrl,
        barcode: p.barcode,
        sold: p.sold || 0,
        createdAt: p.created_at || p.createdAt,
        updatedAt: p.updated_at || p.updatedAt
      }));

      const mappedWarehouses: Warehouse[] = warehousesData.map(w => ({
        id: w.id,
        name: w.name,
        location: w.location,
        description: w.description,
        isActive: w.is_active !== undefined ? w.is_active : w.isActive,
        createdAt: w.created_at || w.createdAt,
        updatedAt: w.updated_at || w.updatedAt
      }));

      setProducts(mappedProducts);
      setWarehouses(mappedWarehouses);
    } catch (error) {
      console.error("Error loading inventory data:", error);
    }
  };

  return <div className="space-y-6">
      <div className="flex items-center justify-between mb-6 mx-[30px]">
        <h1 className="text-2xl font-bold">المخزون</h1>
        <Button variant="outline" onClick={() => setShowWarehouseManager(!showWarehouseManager)}>
          <Settings className="w-4 h-4 mr-2" />
          {showWarehouseManager ? "عرض المخزون" : "إدارة المخازن"}
        </Button>
      </div>
      
      {showWarehouseManager ? <WarehouseManager /> : <InventoryTabs products={products} warehouses={warehouses} onDataChange={loadData} />}
    </div>;
}