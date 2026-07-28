import { useProducts } from "@/hooks/useProducts";
import { useProductForm } from "@/hooks/productForm";
import type { Product } from "@/types";
import ProductsActionBar from "@/components/products/ProductsActionBar";
import ProductsSearchBar from "@/components/products/ProductsSearchBar";
import ProductTable from "@/components/products/ProductTable";
import ProductFormModal from "@/components/products/ProductFormModal";
import ProductDeleteModal from "@/components/products/ProductDeleteModal";
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
  const handleSuccess = () => {
    loadProducts();
    setSearchQuery("");
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
  return <div className="space-y-6">
      <ProductsActionBar onAddNew={handleAddNew} products={filteredProducts} onProductsUpdate={setProducts} onImportProducts={saveMultipleProducts} />
      <ProductsSearchBar 
        searchQuery={searchQuery} 
        onSearchChange={e => setSearchQuery(e.target.value)} 
        sortOption={sortOption}
        setSortOption={setSortOption}
      />
      <ProductTable products={filteredProducts} searchQuery={searchQuery} onEdit={handleEdit} onDelete={handleDeleteClick} />
      <ProductFormModal isOpen={isAddModalOpen} onClose={() => {
      setIsAddModalOpen(false);
      resetForm();
    }} onSubmit={handleSubmit} formData={formData} setFormData={setFormData} error={error} loading={loading} selectedProduct={selectedProduct} />
      <ProductDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} loading={loading} selectedProduct={selectedProduct} />
    </div>;
}