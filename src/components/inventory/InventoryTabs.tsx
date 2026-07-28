import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryTable from "./InventoryTable";
import { Product, Warehouse } from "@/types";
import { useLocale } from "@/hooks/useLocale";

interface InventoryTabsProps {
  products: Product[];
  warehouses: Warehouse[];
  onDataChange: () => void;
}
export default function InventoryTabs({
  products,
  warehouses,
  onDataChange
}: InventoryTabsProps) {
  const { t } = useLocale();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [warehouseProducts, setWarehouseProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [lowStockCount, setLowStockCount] = useState(0);

  // Active warehouses only
  const activeWarehouses = warehouses.filter(w => w.isActive);

  // Set default warehouse on mount
  useEffect(() => {
    if (!selectedWarehouse) {
      if (activeWarehouses.length > 0) {
        setSelectedWarehouse(activeWarehouses[0].id);
      } else {
        setSelectedWarehouse("all");
      }
    }
  }, [activeWarehouses, selectedWarehouse]);

  // Filter products by warehouse
  useEffect(() => {
    if (selectedWarehouse === "all") {
      setWarehouseProducts(products);
      const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold);
      setLowStockCount(lowStock.length);
    } else if (selectedWarehouse) {
      const filtered = products.filter(p => p.warehouseId === selectedWarehouse);
      setWarehouseProducts(filtered);
      const lowStock = filtered.filter(p => p.quantity <= p.lowStockThreshold);
      setLowStockCount(lowStock.length);
    }
  }, [selectedWarehouse, products]);

  // Apply search and stock filters
  useEffect(() => {
    let filtered = [...warehouseProducts];

    // Apply stock filter
    if (stockFilter === "low") {
      filtered = filtered.filter(p => p.quantity <= p.lowStockThreshold);
    } else if (stockFilter === "available") {
      filtered = filtered.filter(p => p.quantity > p.lowStockThreshold);
    } else if (stockFilter === "out") {
      filtered = filtered.filter(p => p.quantity === 0);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const normalized = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(normalized) || p.code.toLowerCase().includes(normalized) || p.category && p.category.toLowerCase().includes(normalized));
    }
    setFilteredProducts(filtered);
  }, [searchQuery, stockFilter, warehouseProducts]);
  if (activeWarehouses.length === 0 && products.length === 0) {
    return <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
        <p className="text-gray-600 text-lg mb-4">لا توجد منتجات أو مخازن نشطة</p>
        <p className="text-sm text-gray-500">قم بإضافة منتج أو مخزن من الأقسام المخصصة</p>
      </div>;
  }
  return <Tabs value={selectedWarehouse} onValueChange={setSelectedWarehouse} className="w-full">
      <TabsList className="grid w-full mb-6" style={{
      gridTemplateColumns: `repeat(${activeWarehouses.length + 1}, 1fr)`
    }}>
        <TabsTrigger value="all">{t('all')}</TabsTrigger>
        {activeWarehouses.map(warehouse => <TabsTrigger key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
          </TabsTrigger>)}
      </TabsList>

      <TabsContent value="all" className="space-y-6">
        <InventoryTable products={products} filteredProducts={filteredProducts} lowStockCount={lowStockCount} searchQuery={searchQuery} stockFilter={stockFilter} setSearchQuery={setSearchQuery} setStockFilter={setStockFilter} warehouseName="جميع المنتجات" />
      </TabsContent>
      
      {activeWarehouses.map(warehouse => <TabsContent key={warehouse.id} value={warehouse.id} className="space-y-6">
          <InventoryTable products={warehouseProducts} filteredProducts={filteredProducts} lowStockCount={lowStockCount} searchQuery={searchQuery} stockFilter={stockFilter} setSearchQuery={setSearchQuery} setStockFilter={setStockFilter} warehouseName={warehouse.name} />
        </TabsContent>)}
    </Tabs>;
}