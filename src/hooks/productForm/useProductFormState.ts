
import { useState } from "react";
import type { Product } from "@/types";

export interface ProductFormData {
  code: string;
  name: string;
  price: string;
  quantity: string;
  lowStockThreshold: string;
  category: string;
  cost: string;
  warehouseId: string;
}

export function useProductFormState() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    code: "",
    name: "",
    price: "",
    quantity: "",
    lowStockThreshold: "",
    category: "",
    cost: "",
    warehouseId: "",
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      price: "",
      quantity: "",
      lowStockThreshold: "",
      category: "",
      cost: "",
      warehouseId: "",
    });
    setError("");
    setSelectedProduct(null);
  };

  return {
    isAddModalOpen,
    setIsAddModalOpen,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    selectedProduct,
    setSelectedProduct,
    error,
    setError,
    loading,
    setLoading,
    formData,
    setFormData,
    resetForm,
  };
}
