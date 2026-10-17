import { useState, useEffect, useCallback, useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useProductForm } from "@/hooks/productForm";
import type { Product, ProductMovement } from "@/types";
import ProductsActionBar from "@/components/products/ProductsActionBar";
import ProductsSearchBar from "@/components/products/ProductsSearchBar";
import ProductTable from "@/components/products/ProductTable";
import ProductFormModal from "@/components/products/ProductFormModal";
import ProductDeleteModal from "@/components/products/ProductDeleteModal";
import ProductHistoryModal from "@/components/products/ProductHistoryModal";
import ProductMovementsReportsModal from "@/components/products/ProductMovementsReportsModal";
import { loadStoreData } from "@/utils/localStorage";
import { getProductMovementsDB } from "@/lib/database";
import { formatCurrency } from "@/utils/formatters";
import {
  Package,
  Boxes,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus
} from "lucide-react";

export default function Products() {
  const {
    products,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    setProducts,
    saveMultipleProducts,
    loadProducts
  } = useProducts();

  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  const loadMovements = useCallback(async () => {
    try {
      const store = loadStoreData();
      let list = store.productMovements || [];

      // If online, optionally merge with Supabase movements
      if (navigator.onLine) {
        try {
          const dbRows = await getProductMovementsDB();
          if (dbRows && dbRows.length > 0) {
            const mappedDb: ProductMovement[] = dbRows.map((r: any) => ({
              id: r.id,
              productId: r.product_id,
              productName: r.product_name,
              productCode: r.product_code,
              customerId: r.customer_id,
              customerName: r.customer_name,
              invoiceId: r.invoice_id,
              invoiceNumber: r.invoice_number,
              date: r.date,
              quantity: Number(r.quantity),
              unitPrice: Number(r.unit_price),
              total: Number(r.total),
              costPrice: r.cost_price ? Number(r.cost_price) : undefined,
              type: r.type,
              isManualItem: r.is_manual_item,
              notes: r.notes,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
              isDeleted: r.is_deleted,
            }));

            // Combine without duplicate IDs
            const merged = [...list];
            for (const item of mappedDb) {
              if (!merged.some((m) => m.id === item.id)) {
                merged.push(item);
              }
            }
            list = merged;
          }
        } catch {
          // Keep local list
        }
      }

      setMovements(list);
    } catch (err) {
      console.error("Error loading movements:", err);
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleSuccess = () => {
    loadProducts();
    loadMovements();
    setSearchQuery("");
  };

  const handleViewHistory = (prod: Product) => {
    setSelectedProductForHistory(prod);
    setIsHistoryModalOpen(true);
  };

  const {
    formData,
    setFormData,
    isAddModalOpen,
    setIsAddModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    selectedProduct,
    error,
    loading,
    handleAddNew,
    handleEdit,
    handleDeleteClick,
    handleSubmit,
    handleDeleteConfirm,
    resetForm
  } = useProductForm(setProducts, handleSuccess);

  // Real-time KPI summaries for products
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalValue = products.reduce((acc, p) => acc + (Number(p.price || 0) * Number(p.quantity || 0)), 0);
    const lowStockCount = products.filter(p => Number(p.quantity) <= Number(p.lowStockThreshold || 5)).length;
    const outOfStockCount = products.filter(p => Number(p.quantity) <= 0).length;

    return {
      totalCount,
      totalValue,
      lowStockCount,
      outOfStockCount
    };
  }, [products]);

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إدارة المنتجات والأصناف</h1>
            <p className="text-xs text-slate-500">
              قائمة البضائع، أسعار الشراء والبيع، هوامش الربح وسجل الحركات
            </p>
          </div>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">إجمالي الأصناف</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{stats.totalCount}</h3>
            <p className="text-[11px] font-bold text-blue-600 mt-0.5">منتج مسجل</p>
          </div>
        </div>

        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">القيمة السوقية الإجمالية</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5 font-sans">{formatCurrency(stats.totalValue)}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-0.5">بسعر البيع الحالي</p>
          </div>
        </div>

        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">المخزون المنخفض</p>
            <h3 className="text-xl font-black text-amber-600 mt-0.5">{stats.lowStockCount}</h3>
            <p className="text-[11px] font-bold text-amber-600 mt-0.5">قاربت على النفاذ</p>
          </div>
        </div>

        <div className="gsc-card p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500 truncate">حركات المخزون المسجلة</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{movements.length}</h3>
            <p className="text-[11px] font-bold text-purple-600 mt-0.5">حركة وارد وصادر</p>
          </div>
        </div>
      </div>

      {/* ── Action Bar (Import / Export / Reports) ── */}
      <ProductsActionBar
        onAddNew={handleAddNew}
        products={filteredProducts}
        onProductsUpdate={setProducts}
        onImportProducts={saveMultipleProducts}
        onOpenReports={() => setIsReportsModalOpen(true)}
      />

      {/* ── Search & Sort Bar ── */}
      <ProductsSearchBar 
        searchQuery={searchQuery} 
        onSearchChange={e => setSearchQuery(e.target.value)} 
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      {/* ── Products Table ── */}
      <ProductTable
        products={filteredProducts}
        searchQuery={searchQuery}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onViewHistory={handleViewHistory}
      />

      {/* Add / Edit Form Modal */}
      <ProductFormModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        error={error}
        loading={loading}
        selectedProduct={selectedProduct}
      />

      {/* Delete Confirmation Modal */}
      <ProductDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        loading={loading}
        selectedProduct={selectedProduct}
      />

      {/* Product Movement History Modal */}
      {selectedProductForHistory && isHistoryModalOpen && (
        <ProductHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedProductForHistory(null);
          }}
          product={selectedProductForHistory}
          movements={movements}
        />
      )}

      {/* Product Movements & Stagnant Reports Modal */}
      {isReportsModalOpen && (
        <ProductMovementsReportsModal
          isOpen={isReportsModalOpen}
          onClose={() => setIsReportsModalOpen(false)}
          products={products}
          movements={movements}
          onRefreshData={() => {
            loadProducts();
            loadMovements();
          }}
        />
      )}
    </div>
  );
}