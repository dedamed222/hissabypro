import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { getProducts, deleteDailySale } from "@/lib/database";
import { loadStoreData, saveStoreData, generateId, updateInventoryForSale } from "@/utils/localStorage";
import { Product, DailySales, Debtor, Creditor } from "@/types";
import { useState, useEffect } from "react";

// Define SalesFormData interface
interface SalesFormData {
  productId: string;
  productName: string;
  productCode: string;
  unitPrice: string;
  quantity: string;
  paymentMethod: string;
  transactionType: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
}

export const useSalesForm = (dateFilter?: string, onSuccessCallback?: () => void) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [filterDate, setFilterDate] = useState(dateFilter || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [successfulSale, setSuccessfulSale] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  
  const { getAvailablePaymentMethods } = useSettings();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Form data state
  const [formData, setFormData] = useState<SalesFormData>({
    productId: "",
    productName: "",
    productCode: "",
    unitPrice: "",
    quantity: "1",
    paymentMethod: "cash",
    transactionType: "sale",
    customerName: "",
    customerPhone: "",
    customerId: ""
  });
  
  useEffect(() => {
    loadProducts();
    loadSales();
  }, [filterDate]);

  const loadProducts = async () => {
    try {
      let mapped: Product[] = [];
      if (isAuthenticated) {
        // Fetch fresh data from Supabase (single source of truth)
        const rows = await getProducts();
        mapped = rows.map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description,
          price: r.price,
          cost: r.cost,
          quantity: r.quantity,
          lowStockThreshold: r.low_stock_threshold,
          category: r.category,
          supplierId: r.supplier_id,
          warehouseId: r.warehouse_id,
          photoUrl: r.photo_url,
          barcode: r.barcode,
          sold: r.sold,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } else {
        const storeData = loadStoreData();
        mapped = storeData.products || [];
      }

      setProducts(mapped); // No more filtering zero-quantity products

      // Sync back to localStorage so the rest of the app is consistent
      const storeDataByAfterFetch = loadStoreData();
      storeDataByAfterFetch.products = mapped;
      saveStoreData(storeDataByAfterFetch);
    } catch (err) {
      console.error("Error loading products, falling back to localStorage", err);
      const storeData = loadStoreData();
      setProducts(storeData.products || []);
    }
  };

  const loadSales = () => {
    const storeData = loadStoreData();
    const filteredSales = storeData.dailySales.filter(sale => sale.date === filterDate);
    setDailySales(filteredSales);
  };

  const filteredProducts = searchTerm.trim() === ""
    ? products
    : products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  const handleSubmit = async () => {
    if (!formData.productId) {
      setError("يرجى اختيار منتج أولاً");
      return;
    }

    // Find current product data
    const selectedProd = products.find(p => p.id === formData.productId);
    if (!selectedProd) {
      setError("المنتج غير موجود");
      return;
    }

    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("يجب أن تكون الكمية أكبر من صفر");
      return;
    }

    // Validate customer info for debt/credit transactions
    if (formData.transactionType !== 'sale') {
      if (!formData.customerName.trim()) {
        setError("يرجى إدخال اسم العميل");
        return;
      }
      if (!formData.customerPhone.trim()) {
        setError("يرجى إدخال رقم الهاتف");
        return;
      }
    }

    // Only check quantity limits for new sales, not when editing
    if (!isEditing && qty > selectedProd.quantity) {
      setError(`الكمية المتاحة (${selectedProd.quantity}) غير كافية`);
      return;
    }

    setError("");
    
    try {
      const storeData = loadStoreData();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      
      const unitPrice = parseFloat(formData.unitPrice);
      
      // For editing, we need to restore the previous quantity first
      if (isEditing && editingSaleId) {
        // ... keep existing code (editing logic)
        const oldSale = storeData.dailySales.find(sale => sale.id === editingSaleId);
        if (oldSale) {
          const productIndex = storeData.products.findIndex(p => p.id === oldSale.productId);
          if (productIndex !== -1) {
            storeData.products[productIndex].quantity += oldSale.quantity || 0;
            
            if (qty > storeData.products[productIndex].quantity) {
              setError(`الكمية المتاحة (${storeData.products[productIndex].quantity}) غير كافية بعد التعديل`);
              return;
            }
            storeData.products[productIndex].quantity -= qty;
            storeData.products[productIndex].updatedAt = now.toISOString();
            
            const updatedSales = storeData.dailySales.map(sale => {
              if (sale.id === editingSaleId) {
                return {
                  ...sale,
                  productId: formData.productId,
                  productCode: formData.productCode,
                  productName: formData.productName,
                  unitPrice: unitPrice,
                  quantity: qty,
                  remainingQuantity: storeData.products[productIndex].quantity,
                  total: unitPrice * qty,
                  paymentMethod: formData.paymentMethod,
                };
              }
              return sale;
            });
            
            storeData.dailySales = updatedSales;
            saveStoreData(storeData);
            
            try {
              const { upsertProduct } = await import("@/lib/database");
              const currentProduct = storeData.products[productIndex];
              await upsertProduct({
                id: currentProduct.id?.length === 36 ? currentProduct.id : undefined,
                code: currentProduct.code,
                name: currentProduct.name,
                description: currentProduct.description || undefined,
                price: currentProduct.price,
                cost: currentProduct.cost,
                quantity: currentProduct.quantity,
                low_stock_threshold: currentProduct.lowStockThreshold || 0,
                category: currentProduct.category || undefined,
                supplier_id: currentProduct.supplierId || undefined,
                warehouse_id: currentProduct.warehouseId || undefined,
                photo_url: currentProduct.photoUrl || undefined,
                barcode: currentProduct.barcode || undefined,
                sold: currentProduct.sold || 0
              });
            } catch (err) {
              console.error("Failed to sync inventory to DB during edit", err);
            }
            
            toast({
              title: "تم التحديث بنجاح",
              description: `تم تعديل بيانات البيع بنجاح`
            });
            
            resetForm();
            loadProducts();
            loadSales();
            if (onSuccessCallback) {
              onSuccessCallback();
            }
            return;
          }
        }
      } else {
        // This is a new transaction
        const productIndex = storeData.products.findIndex(p => p.id === formData.productId);
        if (productIndex !== -1) {
          // Only update inventory for sales and debts, not credits
          if (formData.transactionType === 'sale' || formData.transactionType === 'debt') {
            storeData.products[productIndex].quantity -= qty;
            storeData.products[productIndex].sold = (storeData.products[productIndex].sold || 0) + qty;
          }
          storeData.products[productIndex].updatedAt = now.toISOString();
          
          // Create the new daily sale record
          const newSale: DailySales = {
            id: generateId(),
            productId: formData.productId,
            productCode: formData.productCode,
            productName: formData.productName,
            unitPrice: unitPrice,
            quantity: qty,
            remainingQuantity: storeData.products[productIndex].quantity,
            total: unitPrice * qty,
            paymentMethod: formData.paymentMethod,
            date: dateStr,
            totalSales: unitPrice * qty,
            createdAt: now.toISOString(),
          };

          storeData.dailySales = [...storeData.dailySales, newSale];

          // Handle debt/credit records
          if (formData.transactionType === 'debt') {
            const newDebtor: Debtor = {
              id: generateId(),
              name: formData.customerName,
              customer_id: formData.customerId,
              phone: formData.customerPhone,
              totalAmount: unitPrice * qty,
              date: dateStr,
              createdAt: now.toISOString(),
              productCode: formData.productCode,
              productName: formData.productName,
              quantity: qty,
              productPrice: unitPrice
            };
            storeData.debtors = [...(storeData.debtors || []), newDebtor];

            // ⚡ Sync Debtor to Supabase
            try {
              const { upsertDebtor } = await import("@/lib/database");
              await upsertDebtor({
                id: newDebtor.id.length === 36 ? newDebtor.id : undefined,
                name: newDebtor.name,
                customer_id: newDebtor.customer_id,
                phone: newDebtor.phone,
                total_amount: newDebtor.totalAmount,
                date: newDebtor.date,
                notes: `بيع: ${formData.productName}`,
                products: [{
                  productCode: formData.productCode,
                  productName: formData.productName,
                  quantity: qty,
                  price: unitPrice,
                  total: unitPrice * qty
                }]
              });
            } catch (err) {
              console.error("Failed to sync debtor to DB", err);
            }

          } else if (formData.transactionType === 'credit') {
            const newCreditor: Creditor = {
              id: generateId(),
              name: formData.customerName,
              customer_id: formData.customerId,
              phone: formData.customerPhone,
              amount: unitPrice * qty,
              date: dateStr,
              createdAt: now.toISOString(),
              productCode: formData.productCode,
              productName: formData.productName,
              quantity: qty,
              price: unitPrice,
              total: unitPrice * qty
            };
            storeData.creditors = [...(storeData.creditors || []), newCreditor];

            // ⚡ Sync Creditor to Supabase
            try {
              const { upsertCreditor } = await import("@/lib/database");
              await upsertCreditor({
                id: newCreditor.id.length === 36 ? newCreditor.id : undefined,
                name: newCreditor.name,
                customer_id: newCreditor.customer_id,
                phone: newCreditor.phone,
                amount: newCreditor.amount,
                date: newCreditor.date,
                product_code: newCreditor.productCode,
                product_name: newCreditor.productName,
                quantity: newCreditor.quantity,
                price: newCreditor.price,
                total: newCreditor.total
              });
            } catch (err) {
              console.error("Failed to sync creditor to DB", err);
            }
          }
          
          saveStoreData(storeData);
          
          if (formData.transactionType === 'sale' || formData.transactionType === 'debt') {
            try {
              const { upsertProduct } = await import("@/lib/database");
              const currentProduct = storeData.products[productIndex];
              await upsertProduct({
                id: currentProduct.id?.length === 36 ? currentProduct.id : undefined,
                code: currentProduct.code,
                name: currentProduct.name,
                description: currentProduct.description || undefined,
                price: currentProduct.price,
                cost: currentProduct.cost,
                quantity: currentProduct.quantity,
                low_stock_threshold: currentProduct.lowStockThreshold || 0,
                category: currentProduct.category || undefined,
                supplier_id: currentProduct.supplierId || undefined,
                warehouse_id: currentProduct.warehouseId || undefined,
                photo_url: currentProduct.photoUrl || undefined,
                barcode: currentProduct.barcode || undefined,
                sold: currentProduct.sold || 0
              });
            } catch (err) {
              console.error("Failed to sync inventory to DB during sale", err);
            }
          }
          
          // Show success toast based on transaction type
          const transactionTypes = {
            sale: "بيع",
            debt: "مديونية",
            credit: "دائنية"
          };
          
          toast({
            title: `تم تسجيل ${transactionTypes[formData.transactionType as keyof typeof transactionTypes]} بنجاح`,
            description: `تم ${formData.transactionType === 'sale' ? 'بيع' : 'تسجيل'} ${qty} وحدة من ${formData.productName}`
          });
          
          resetForm();
          setSuccessfulSale(true);
          
          setSuccess(`تم تسجيل ${transactionTypes[formData.transactionType as keyof typeof transactionTypes]} بنجاح`);
          setTimeout(() => {
            setSuccess("");
            setSuccessfulSale(false);
          }, 3000);
          
          loadProducts();
          loadSales();
          if (onSuccessCallback) {
            onSuccessCallback();
          }
        } else {
          setError("لم يتم العثور على المنتج في المخزون");
        }
      }
    } catch (err) {
      console.error("Error recording transaction:", err);
      setError("حدث خطأ أثناء تسجيل العملية");
    }
  };

  const handleEdit = (sale: DailySales) => {
    setIsEditing(true);
    setEditingSaleId(sale.id);
    
    setFormData({
      productId: sale.productId || "",
      productName: sale.productName || "",
      productCode: sale.productCode || "",
      unitPrice: sale.unitPrice ? sale.unitPrice.toString() : "0",
      quantity: sale.quantity ? sale.quantity.toString() : "1",
      paymentMethod: sale.paymentMethod || "cash",
      transactionType: "sale",
      customerName: "",
      customerPhone: ""
    });
  };

  const resetForm = () => {
    setFormData({
      productId: "",
      productName: "",
      productCode: "",
      unitPrice: "",
      quantity: "1",
      paymentMethod: "cash",
      transactionType: "sale",
      customerName: "",
      customerPhone: ""
    });
    setSelectedProduct(null);
    setQuantity(1);
    setSearchTerm("");
    setIsEditing(false);
    setEditingSaleId(null);
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      const storeData = loadStoreData();
      
      const saleToDelete = storeData.dailySales.find(sale => sale.id === saleId);
      
      if (!saleToDelete) {
        setError("لم يتم العثور على السجل");
        return;
      }
      
      if (saleToDelete.productId) {
        const productIndex = storeData.products.findIndex(p => p.id === saleToDelete.productId);
        
        if (productIndex !== -1) {
          storeData.products[productIndex].quantity += saleToDelete.quantity || 0;
          
          storeData.products[productIndex].sold = Math.max(
            0, 
            (storeData.products[productIndex].sold || 0) - (saleToDelete.quantity || 0)
          );
          
          storeData.products[productIndex].updatedAt = new Date().toISOString();
          
          try {
            const { upsertProduct } = await import("@/lib/database");
            const currentProduct = storeData.products[productIndex];
            await upsertProduct({
              id: currentProduct.id?.length === 36 ? currentProduct.id : undefined,
              code: currentProduct.code,
              name: currentProduct.name,
              description: currentProduct.description || undefined,
              price: currentProduct.price,
              cost: currentProduct.cost,
              quantity: currentProduct.quantity,
              low_stock_threshold: currentProduct.lowStockThreshold || 0,
              category: currentProduct.category || undefined,
              supplier_id: currentProduct.supplierId || undefined,
              warehouse_id: currentProduct.warehouseId || undefined,
              photo_url: currentProduct.photoUrl || undefined,
              barcode: currentProduct.barcode || undefined,
              sold: currentProduct.sold || 0
            });
          } catch (err) {
            console.error("Failed to sync inventory to DB during delete", err);
          }
        }
      }
      
      try {
        if (saleToDelete.id?.length === 36) {
          await deleteDailySale(saleToDelete.id);
        }
      } catch (dbErr) {
        console.error("Database sale deletion error:", dbErr);
      }

      storeData.dailySales = storeData.dailySales.filter(sale => sale.id !== saleId);
      saveStoreData(storeData);
      
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف البيع واسترجاع الكمية إلى المخزون"
      });
      
      loadProducts();
      loadSales();
      
    } catch (err) {
      console.error("Error deleting sale:", err);
      setError("حدث خطأ أثناء حذف البيع");
    }
  };

  const handleDateChange = (date: string) => {
    setFilterDate(date);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setQuantity(value);
      setFormData({ ...formData, quantity: e.target.value });
    }
  };

  const getTotalSales = () => {
    return dailySales.reduce((total, sale) => total + (sale.total || 0), 0);
  };

  const getPaymentMethodSales = (method: string) => {
    return dailySales
      .filter(sale => sale.paymentMethod === method)
      .reduce((total, sale) => total + (sale.total || 0), 0);
  };

  const getAvailablePaymentMethodsWithSales = () => {
    const methods = getAvailablePaymentMethods();
    return methods.map(method => ({
      id: method.id,
      name: method.name,
      total: getPaymentMethodSales(method.id)
    }));
  };

  return {
    products,
    filteredProducts,
    selectedProduct,
    setSelectedProduct,
    quantity,
    setQuantity,
    handleQuantityChange,
    searchTerm,
    setSearchTerm,
    error,
    success,
    dailySales,
    filterDate,
    handleDateChange,
    handleDeleteSale,
    getTotalSales,
    getPaymentMethodSales,
    getAvailablePaymentMethodsWithSales,
    paymentMethod,
    setPaymentMethod,
    successfulSale,
    formData,
    setFormData,
    handleSubmit,
    isEditing,
    resetForm,
    handleEdit
  };
};
