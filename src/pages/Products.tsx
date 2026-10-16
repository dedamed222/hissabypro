import { useState, useEffect, useCallback } from "react";
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

  return (
    <div className="space-y-6">
      <ProductsActionBar
        onAddNew={handleAddNew}
        products={filteredProducts}
        onProductsUpdate={setProducts}
        onImportProducts={saveMultipleProducts}
        onOpenReports={() => setIsReportsModalOpen(true)}
      />
      <ProductsSearchBar 
        searchQuery={searchQuery} 
        onSearchChange={e => setSearchQuery(e.target.value)} 
        sortOption={sortOption}
        setSortOption={setSortOption}
      />
      <ProductTable
        products={filteredProducts}
        searchQuery={searchQuery}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onViewHistory={handleViewHistory}
      />
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