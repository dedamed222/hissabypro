import { useEffect, useState } from "react";
import { getProducts, getWarehouses } from "@/lib/database";
import { Product, Warehouse } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import InventoryTabs from "@/components/inventory/InventoryTabs";
import WarehouseManager from "@/components/inventory/WarehouseManager";
import { Button } from "@/components/ui/button";
import { Settings, Boxes, Warehouse as WarehouseIcon } from "lucide-react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useLocale } from "@/hooks/useLocale";

export default function Inventory() {
  const { locale } = useLocale();
  const isFr = locale === 'fr';

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showWarehouseManager, setShowWarehouseManager] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load products and warehouses on component mount
  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      // 1. Immediately display locally available products and warehouses
      const { loadStoreData } = await import("@/utils/localStorage");
      const localStore = loadStoreData();
      if (localStore.products && localStore.products.length > 0) {
        setProducts(localStore.products);
      }
      if (localStore.warehouses && localStore.warehouses.length > 0) {
        setWarehouses(localStore.warehouses);
      }

      let productsData: any[] = [];
      let warehousesData: any[] = [];

      if (isAuthenticated) {
        [productsData, warehousesData] = await Promise.all([
          getProducts().catch(() => []),
          getWarehouses().catch(() => [])
        ]);
      } else {
        productsData = localStore.products || [];
        warehousesData = localStore.warehouses || [];
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

  // Real-time sync: reload when products change on any device
  useRealtimeSync(['products'], loadData, user?.id);

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Boxes size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isFr ? "Gestion des stocks et entrepôts" : "إدارة المخزون والمستودعات"}
            </h1>
            <p className="text-xs text-slate-500">
              {isFr 
                ? "Suivi des quantités, valeur du stock, alertes de réapprovisionnement et gestion des entrepôts"
                : "متابعة الكميات، قيمة المخزون، تنبيهات النواقص وإدارة المستودعات"
              }
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowWarehouseManager(!showWarehouseManager)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${
            showWarehouseManager
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs"
          }`}
        >
          {showWarehouseManager ? (
            <>
              <Boxes size={15} />
              <span>{isFr ? "Retour au tableau des stocks" : "العودة لجدول المخزون"}</span>
            </>
          ) : (
            <>
              <WarehouseIcon size={15} />
              <span>{isFr ? "Gérer les entrepôts" : "إدارة وتخصيص المخازن"}</span>
            </>
          )}
        </button>
      </div>

      {showWarehouseManager ? (
        <WarehouseManager />
      ) : (
        <InventoryTabs products={products} warehouses={warehouses} onDataChange={loadData} />
      )}
    </div>
  );
}