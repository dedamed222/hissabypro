import React, { useState, useEffect } from "react";
import InventoryTable from "./InventoryTable";
import { Product, Warehouse } from "@/types";
import { useLocale } from "@/hooks/useLocale";
import { Warehouse as WarehouseIcon, Layers } from "lucide-react";

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
        setSelectedWarehouse("all");
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
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(normalized) ||
        (p.code && p.code.toLowerCase().includes(normalized)) ||
        (p.category && p.category.toLowerCase().includes(normalized))
      );
    }
    setFilteredProducts(filtered);
  }, [searchQuery, stockFilter, warehouseProducts]);

  if (activeWarehouses.length === 0 && products.length === 0) {
    return (
      <div className="gsc-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Layers size={28} />
        </div>
        <p className="text-slate-700 font-bold text-base mb-1">لا توجد منتجات أو مخازن مسجلة حالياً</p>
        <p className="text-xs text-slate-400">قم بإضافة المنتجات أو إعداد المخازن للبدء في تتبع المخزون</p>
      </div>
    );
  }

  const currentWarehouseName = selectedWarehouse === "all"
    ? "جميع المخازن والمنتجات"
    : (activeWarehouses.find(w => w.id === selectedWarehouse)?.name || "المخزن المحدد");

  return (
    <div className="space-y-5">
      {/* ── Warehouse Pill Segmented Navigation ── */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto border border-slate-200/80">
        <button
          onClick={() => setSelectedWarehouse("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedWarehouse === "all"
              ? "bg-white text-slate-900 shadow-sm shadow-slate-900/5 font-black"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Layers size={14} />
          <span>جميع المخازن</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-sans">
            {products.length}
          </span>
        </button>

        {activeWarehouses.map(warehouse => {
          const countInWarehouse = products.filter(p => p.warehouseId === warehouse.id).length;
          const isSelected = selectedWarehouse === warehouse.id;
          return (
            <button
              key={warehouse.id}
              onClick={() => setSelectedWarehouse(warehouse.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-white text-blue-600 shadow-sm shadow-blue-500/10 font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <WarehouseIcon size={14} />
              <span>{warehouse.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-sans ${
                isSelected ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {countInWarehouse}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active Warehouse Inventory Content ── */}
      <InventoryTable
        products={warehouseProducts}
        filteredProducts={filteredProducts}
        lowStockCount={lowStockCount}
        searchQuery={searchQuery}
        stockFilter={stockFilter}
        setSearchQuery={setSearchQuery}
        setStockFilter={setStockFilter}
        warehouseName={currentWarehouseName}
      />
    </div>
  );
}