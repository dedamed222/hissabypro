
import { useState, useEffect } from "react";
import { loadStoreData } from "@/utils/localStorage";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useSalesForm } from "@/hooks/useSalesForm";
import { useProductSearch } from "@/hooks/useProductSearch";
import { SalesForm } from "@/components/sales/SalesForm";
import { SalesList } from "@/components/sales/SalesList";
import { InventoryTransaction } from "@/components/inventory/InventoryTransaction";
import { SalesHeader } from "@/components/sales/SalesHeader";
import { PaymentMethodCards } from "@/components/sales/PaymentMethodCards";
import { SalesFilters } from "@/components/sales/SalesFilters";
import { SalesTable } from "@/components/sales/SalesTable";
import { SalesDeleteDialog } from "@/components/sales/SalesDeleteDialog";
import type { DailySale, Product } from "@/types";

export default function Sales() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<DailySale | null>(null);
  const { products, loadProducts } = useProducts();
  const { toast } = useToast();
  
  // The callback function will be called after a successful form submission
  const refreshData = () => {
    loadProducts();
  };
  
  const salesFormData = useSalesForm(dateFilter, refreshData);

  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch,
    clearSearch
  } = useProductSearch(products);

  const handleProductSelect = (product: Product) => {
    salesFormData.setFormData({
      ...salesFormData.formData,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unitPrice: product.price.toString(),
    });
    setShowProductSearch(false);
    clearSearch();
  };

  const handleDelete = (sale: DailySale) => {
    setSaleToDelete(sale);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!saleToDelete) return;
    salesFormData.handleDeleteSale(saleToDelete.id || "");
    setShowDeleteDialog(false);
    setSaleToDelete(null);
    refreshData();
  };

  const data = loadStoreData();
  const allDailySales = (data.dailySales || []);
  
  // Filter sales by date and payment method
  const filteredSales = allDailySales.filter(sale => {
    const matchesDate = sale.date.startsWith(dateFilter);
    const matchesPaymentMethod = paymentMethodFilter === "all" || sale.paymentMethod === paymentMethodFilter;
    return matchesDate && matchesPaymentMethod;
  });

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  
  // Get unique payment methods
  const paymentMethods = [...new Set(allDailySales.map(sale => sale.paymentMethod))].filter(Boolean);
  
  // Calculate totals by payment method
  const getPaymentMethodTotal = (method: string) => {
    return filteredSales
      .filter(sale => sale.paymentMethod === method)
      .reduce((sum, sale) => sum + sale.total, 0);
  };

  // Data is loaded from localStorage

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <SalesHeader totalSales={totalSales} />

      <PaymentMethodCards 
        totalSales={totalSales}
        paymentMethods={paymentMethods}
        getPaymentMethodTotal={getPaymentMethodTotal}
      />
      
      <SalesFilters
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        paymentMethods={paymentMethods}
      />

      <SalesForm
        formData={salesFormData.formData}
        setFormData={salesFormData.setFormData}
        error={salesFormData.error}
        isEditing={salesFormData.isEditing}
        handleSubmit={salesFormData.handleSubmit}
        resetForm={salesFormData.resetForm}
        showProductSearch={showProductSearch}
        setShowProductSearch={setShowProductSearch}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredProducts={filteredProducts}
        onProductSelect={handleProductSelect}
      />

      <SalesTable
        filteredSales={filteredSales}
        totalSales={totalSales}
        onDelete={handleDelete}
      />

      <SalesList
        sales={filteredSales}
        onEdit={salesFormData.handleEdit}
        onDelete={handleDelete}
      />
      
      <InventoryTransaction 
        transactions={filteredSales}
        products={products} 
      />

      <SalesDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        saleToDelete={saleToDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
