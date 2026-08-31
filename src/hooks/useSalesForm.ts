import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { getProducts, deleteDailySale } from "@/lib/database";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
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
  date: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  productCode: string;
  unitPrice: number;
  quantity: number;
  total: number;
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

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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
    customerId: "",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadProducts();
    loadSales();
  }, [filterDate]);

  const loadProducts = async () => {
    try {
      let mapped: Product[] = [];
      if (isAuthenticated) {
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

      setProducts(mapped);

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

  // ─── CART LOGIC ──────────────────────────────────────────────────

  /** Validate current form product fields and add a CartItem */
  const addToCart = () => {
    if (!formData.productId) {
      setError("يرجى اختيار منتج أولاً");
      return;
    }

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

    const unitPrice = parseFloat(formData.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      setError("يرجى إدخال سعر صحيح");
      return;
    }

    // Calculate already-in-cart quantity for same product
    const alreadyInCart = cartItems
      .filter(i => i.productId === formData.productId)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (qty + alreadyInCart > selectedProd.quantity) {
      setError(`الكمية المتاحة (${selectedProd.quantity}) غير كافية، لديك بالفعل ${alreadyInCart} في السلة`);
      return;
    }

    setError("");

    const newItem: CartItem = {
      productId: formData.productId,
      productName: formData.productName,
      productCode: formData.productCode,
      unitPrice,
      quantity: qty,
      total: unitPrice * qty,
    };

    setCartItems(prev => [...prev, newItem]);

    // Clear only product fields — keep transaction settings
    setFormData(prev => ({
      ...prev,
      productId: "",
      productName: "",
      productCode: "",
      unitPrice: "",
      quantity: "1",
    }));
    setSearchTerm("");
  };

  /** Remove a cart item by index */
  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  /** Computed cart total */
  const cartTotal = cartItems.reduce((sum, item) => sum + item.total, 0);

  // ─── SUBMIT CART ──────────────────────────────────────────────────

  const submitCart = async () => {
    if (cartItems.length === 0) {
      setError("السلة فارغة، يرجى إضافة منتج أولاً");
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

    setError("");

    try {
      const storeData = loadStoreData();
      const now = new Date();
      const dateStr = formData.date || now.toISOString().split('T')[0];

      // Process each cart item
      for (const item of cartItems) {
        const productIndex = storeData.products.findIndex(p => p.id === item.productId);
        if (productIndex === -1) continue;

        // Deduct inventory for sales and debts
        if (formData.transactionType === 'sale' || formData.transactionType === 'debt') {
          storeData.products[productIndex].quantity -= item.quantity;
          storeData.products[productIndex].sold = (storeData.products[productIndex].sold || 0) + item.quantity;
        }
        storeData.products[productIndex].updatedAt = now.toISOString();

        const newSale: DailySales = {
          id: generateId(),
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          remainingQuantity: storeData.products[productIndex].quantity,
          total: item.total,
          paymentMethod: formData.paymentMethod,
          date: dateStr,
          totalSales: item.total,
          createdAt: now.toISOString(),
        };

        storeData.dailySales = [...storeData.dailySales, newSale];

        // Sync product inventory to Supabase
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
      }

      // Create a single Debtor or Creditor record for the whole cart
      if (formData.transactionType === 'debt') {
        const productsList = cartItems.map(i => ({
          productCode: i.productCode,
          productName: i.productName,
          quantity: i.quantity,
          price: i.unitPrice,
          total: i.total,
        }));

        const newDebtor: Debtor = {
          id: generateId(),
          name: formData.customerName,
          customer_id: formData.customerId,
          phone: formData.customerPhone,
          totalAmount: cartTotal,
          date: dateStr,
          createdAt: now.toISOString(),
          productCode: cartItems.map(i => i.productCode).join(', '),
          productName: cartItems.map(i => i.productName).join(', '),
          quantity: cartItems.reduce((s, i) => s + i.quantity, 0),
          productPrice: cartTotal,
        };
        storeData.debtors = [...(storeData.debtors || []), newDebtor];

        try {
          const { upsertDebtor } = await import("@/lib/database");
          await upsertDebtor({
            id: newDebtor.id.length === 36 ? newDebtor.id : undefined,
            name: newDebtor.name,
            customer_id: newDebtor.customer_id,
            phone: newDebtor.phone,
            total_amount: newDebtor.totalAmount,
            date: newDebtor.date,
            notes: `بيع: ${cartItems.map(i => i.productName).join(' + ')}`,
            products: productsList,
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
          amount: cartTotal,
          date: dateStr,
          createdAt: now.toISOString(),
          productCode: cartItems.map(i => i.productCode).join(', '),
          productName: cartItems.map(i => i.productName).join(', '),
          quantity: cartItems.reduce((s, i) => s + i.quantity, 0),
          price: cartTotal,
          total: cartTotal,
        };
        storeData.creditors = [...(storeData.creditors || []), newCreditor];

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
            total: newCreditor.total,
          });
        } catch (err) {
          console.error("Failed to sync creditor to DB", err);
        }
      }

      saveStoreData(storeData);

      const transactionTypes = {
        sale: "بيع",
        debt: "مديونية",
        credit: "دائنية"
      };

      toast({
        title: `تم تسجيل ${transactionTypes[formData.transactionType as keyof typeof transactionTypes]} بنجاح`,
        description: `تم تسجيل ${cartItems.length} منتج بمجموع ${cartTotal.toFixed(2)}`
      });

      setCartItems([]);
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
    } catch (err) {
      console.error("Error recording transaction:", err);
      setError("حدث خطأ أثناء تسجيل العملية");
    }
  };

  // ─── SINGLE-ITEM SUBMIT (kept for edit mode) ─────────────────────

  const handleSubmit = async () => {
    if (!formData.productId) {
      setError("يرجى اختيار منتج أولاً");
      return;
    }

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

    setError("");

    try {
      const storeData = loadStoreData();
      const now = new Date();
      const dateStr = formData.date || now.toISOString().split('T')[0];

      const unitPrice = parseFloat(formData.unitPrice);

      if (isEditing && editingSaleId) {
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
                  date: dateStr,
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
          }
        }
      }
    } catch (err) {
      console.error("Error updating sale:", err);
      setError("حدث خطأ أثناء تعديل البيع");
    }
  };

  const handleEdit = (sale: DailySales) => {
    setIsEditing(true);
    setEditingSaleId(sale.id);
    setCartItems([]); // Clear cart when entering edit mode

    setFormData({
      productId: sale.productId || "",
      productName: sale.productName || "",
      productCode: sale.productCode || "",
      unitPrice: sale.unitPrice ? sale.unitPrice.toString() : "0",
      quantity: sale.quantity ? sale.quantity.toString() : "1",
      paymentMethod: sale.paymentMethod || "cash",
      transactionType: "sale",
      customerName: "",
      customerPhone: "",
      date: sale.date || new Date().toISOString().split('T')[0]
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
      customerPhone: "",
      date: new Date().toISOString().split('T')[0]
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
    submitCart,
    cartItems,
    addToCart,
    removeFromCart,
    cartTotal,
    isEditing,
    resetForm,
    handleEdit,
  };
};
