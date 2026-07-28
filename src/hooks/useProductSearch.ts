
import { useState, useEffect, useMemo } from "react";
import { loadStoreData } from "@/utils/localStorage";
import type { Product } from "@/types";

export const useProductSearch = (initialProducts?: Product[]) => {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
    } else {
      const storeData = loadStoreData();
      setProducts(storeData.products || []);
    }
  }, [initialProducts]);

  // تحسين البحث باستخدام useMemo
  const filteredProducts = useMemo(() => {
    if (searchTerm.trim() === "") {
      return [];
    }
    
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    return products
      .filter(p => 
        p.name.toLowerCase().includes(searchTermLower) || 
        p.code.toLowerCase().includes(searchTermLower)
      )
      .sort((a, b) => {
        // ترتيب النتائج: أولاً المنتجات المتوفرة، ثم حسب التطابق
        if (a.quantity > 0 && b.quantity === 0) return -1;
        if (a.quantity === 0 && b.quantity > 0) return 1;
        
        // ترتيب حسب قوة التطابق
        const aNameMatch = a.name.toLowerCase().startsWith(searchTermLower);
        const bNameMatch = b.name.toLowerCase().startsWith(searchTermLower);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }, [searchTerm, products]);

  // إظهار نتائج البحث تلقائياً عند الكتابة
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      setShowProductSearch(true);
    }
  }, [searchTerm]);

  const clearSearch = () => {
    setSearchTerm("");
    setShowProductSearch(false);
  };

  return {
    products,
    setProducts,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch,
    clearSearch
  };
};
