import { useState, useEffect } from "react";
import { Customer, Product, Invoice, InvoiceItem } from "@/types";
import {
  generateId,
  generateInvoiceNumber,
  updateMostRecentProducts,
  loadStoreData,
  saveStoreData
} from "@/utils/localStorage";
import { getProducts, getCustomers, upsertInvoice } from "@/lib/database";
import { useProducts } from "@/hooks/useProducts";

export const useInvoiceForm = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [manualQuantity, setManualQuantity] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial">("paid");
  
  const [invoiceType, setInvoiceType] = useState<"sales" | "quotation" | "debt">("sales");
  const [dueDate, setDueDate] = useState<string>("");
  const [debtType, setDebtType] = useState<"debtor" | "creditor">("debtor");
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { getInvoices } = await import("@/lib/database");
        const [productsData, customersData, invoicesData] = await Promise.all([
          getProducts(),
          getCustomers(),
          getInvoices()
        ]);
        
        const mappedProducts: Product[] = productsData.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          price: p.price,
          cost: p.cost,
          quantity: p.quantity,
          lowStockThreshold: p.low_stock_threshold,
          category: p.category,
          supplierId: p.supplier_id,
          warehouseId: p.warehouse_id,
          photoUrl: p.photo_url,
          barcode: p.barcode,
          sold: p.sold,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));

        const mappedCustomers: Customer[] = customersData.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email,
          address: c.address,
          company: c.company,
          photoUrl: c.photo_url,
          notes: c.notes,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));

        setProducts(mappedProducts);
        setCustomers(mappedCustomers);

        // Check if we are converting a quote
        const urlParams = new URLSearchParams(window.location.search);
        const quoteId = urlParams.get('quoteId');
        
        if (quoteId) {
          const quote = invoicesData.find((inv: any) => inv.id === quoteId);
          if (quote) {
            setInvoiceType('sales');
            const quoteItems = quote.invoice_items || [];
            
            setInvoiceItems(quoteItems.map((item: any) => {
              const product = mappedProducts.find(p => p.id === item.product_id);
              return {
                productId: item.product_id,
                productName: item.product_name,
                productCode: product ? product.code : '',
                quantity: item.quantity,
                price: item.price,
                total: item.total
              };
            }));
            
            const customer = mappedCustomers.find(c => c.name === quote.customer_name);
            if (customer) setSelectedCustomer(customer);
            setNotes(`محولة من عرض السعر رقم: ${quote.invoice_number}`);
          }
        }
      } catch (err) {
        console.error("Error fetching invoice form data:", err);
        setError("فشل تحميل البيانات من السحابة");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    const newInvoiceNumber = generateInvoiceNumber("INV");
    setInvoiceNumber(newInvoiceNumber);
  }, []);
  
  const subtotal = invoiceItems.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const total = subtotal - discount + taxAmount;

  const filteredProducts = searchTerm.trim() === ""
    ? products
    : products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  const handleAddProduct = () => {
    if (!selectedProduct) {
      setError("يرجى اختيار منتج أولاً");
      return;
    }
    
    const finalQuantity = manualQuantity !== null ? manualQuantity : quantity;
    
    if (finalQuantity <= 0) {
      setError("يجب أن تكون الكمية أكبر من صفر");
      return;
    }
    
    if (invoiceType !== 'quotation' && finalQuantity > selectedProduct.quantity) {
      setError(`الكمية المتاحة (${selectedProduct.quantity}) غير كافية`);
      return;
    }
    
    setError("");
    
    const existingItemIndex = invoiceItems.findIndex(
      item => item.productId === selectedProduct.id
    );
    
    if (existingItemIndex !== -1) {
      const updatedItems = [...invoiceItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + finalQuantity;
      
      if (newQuantity > selectedProduct.quantity) {
        setError(`الكمية المتاحة (${selectedProduct.quantity}) غير كافية`);
        return;
      }
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total: selectedProduct.price * newQuantity,
      };
      
      setInvoiceItems(updatedItems);
    } else {
      const newItem: InvoiceItem = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productCode: selectedProduct.code,
        quantity: finalQuantity,
        price: selectedProduct.price,
        total: selectedProduct.price * finalQuantity,
      };
      
      setInvoiceItems([...invoiceItems, newItem]);
    }
    
    updateMostRecentProducts(selectedProduct.id);
    
    setSelectedProduct(null);
    setQuantity(1);
    setManualQuantity(null);
    setSearchTerm("");
  };
  
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...invoiceItems];
    updatedItems.splice(index, 1);
    setInvoiceItems(updatedItems);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
  };
  
  const handleSaveInvoice = async () => {
    if (!selectedCustomer) {
      setError("يرجى اختيار عميل");
      return;
    }
    
    if (invoiceItems.length === 0) {
      setError("يجب إضافة منتج واحد على الأقل للفاتورة");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const now = currentDate.toISOString();
      
      // Save invoice and items to Supabase
      const invData = {
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        total: total,
        subtotal: subtotal,
        discount: discount,
        tax: taxAmount,
        payment_method: paymentMethod,
        status: paymentStatus,
        type: invoiceType,
        notes: notes,
        date: now.split('T')[0]
      };

      const itemRows = invoiceItems.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }));

      await upsertInvoice(invData, itemRows);
      
      // Update inventory in Supabase for sales and debtor invoices
      if (invoiceType === "sales" || (invoiceType === "debt" && debtType === "debtor")) {
        // We do this sequentially to avoid race conditions, but in a real app logic should be in a transaction or RPC
        for (const item of invoiceItems) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            // Usually we'd use an increment/decrement RPC, but here we'll use upsert for simplicity
            // since that's what's available in database.ts
            const { upsertProduct } = await import("@/lib/database");
            await upsertProduct({
              id: product.id?.length === 36 ? product.id : undefined,
              code: product.code,
              name: product.name,
              description: product.description || undefined,
              price: product.price,
              cost: product.cost,
              quantity: product.quantity - item.quantity,
              low_stock_threshold: product.lowStockThreshold || Math.max(0, product.quantity - item.quantity - 10),
              category: product.category || undefined,
              supplier_id: product.supplierId || undefined,
              warehouse_id: product.warehouseId || undefined,
              photo_url: product.photoUrl || undefined,
              barcode: product.barcode || undefined,
              sold: (product.sold || 0) + item.quantity
            });
          }
        }
      }
      
      // Record debt in Supabase if applicable
      if (invoiceType === "debt") {
        const storeData = loadStoreData();
        const currentNowStr = new Date().toISOString();
        
        if (debtType === "debtor") {
          const { upsertDebtor } = await import("@/lib/database");
          await upsertDebtor({
            name: selectedCustomer.name,
            phone: selectedCustomer.phone || "",
            total_amount: total,
            notes: `فاتورة دين رقم: ${invoiceNumber}`,
            date: now.split('T')[0]
          });
          
          // Save to localStorage so it appears in the Debtors page
          const newDebtor = {
            id: generateId(),
            name: selectedCustomer.name,
            debtorName: selectedCustomer.name,
            phone: selectedCustomer.phone || "",
            products: invoiceItems.map(item => ({
              productId: item.productId,
              productCode: item.productCode,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              total: item.total
            })),
            totalAmount: total,
            amount: total,
            notes: `فاتورة دين رقم: ${invoiceNumber}`,
            date: currentNowStr,
            createdAt: currentNowStr,
            updatedAt: currentNowStr,
            productCode: invoiceItems[0]?.productCode || "",
            productName: invoiceItems[0]?.productName || "",
            quantity: invoiceItems[0]?.quantity || 0,
            productPrice: invoiceItems[0]?.price || 0
          };
          storeData.debtors = [...(storeData.debtors || []), newDebtor];
          saveStoreData(storeData);
          
        } else {
          const { upsertCreditor } = await import("@/lib/database");
          await upsertCreditor({
            name: selectedCustomer.name,
            phone: selectedCustomer.phone || "",
            amount: total,
            notes: `فاتورة دين رقم: ${invoiceNumber}`,
            date: now.split('T')[0],
            address: selectedCustomer.address || ""
          });
          
          // Save to localStorage so it appears in the Creditors page
          const newCreditor = {
            id: generateId(),
            name: selectedCustomer.name,
            phone: selectedCustomer.phone || "",
            email: selectedCustomer.email || "",
            address: selectedCustomer.address || "",
            amount: total,
            notes: `فاتورة دين رقم: ${invoiceNumber}`,
            createdAt: currentNowStr,
            updatedAt: currentNowStr,
            productCode: invoiceItems[0]?.productCode || "",
            productName: invoiceItems[0]?.productName || "",
            quantity: invoiceItems[0]?.quantity || 0,
            price: invoiceItems[0]?.price || 0,
            total: total,
            date: now.split('T')[0]
          };
          storeData.creditors = [...(storeData.creditors || []), newCreditor];
          saveStoreData(storeData);
        }
      }
      
      setSuccess("تم حفظ الفاتورة بنجاح في السحابة");
      setInvoiceItems([]);
      setSelectedCustomer(null);
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      setInvoiceType("sales");
      setDueDate("");
      setDebtType("debtor");
      setNotes("");
      setDiscount(0);
      setTaxRate(0);
      setInvoiceNumber(generateInvoiceNumber("INV"));
      
      // Refresh products from database to get updated quantities
      const productsData = await getProducts();
      const mappedProducts: Product[] = productsData.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        price: p.price,
        cost: p.cost,
        quantity: p.quantity,
        lowStockThreshold: p.low_stock_threshold,
        category: p.category,
        supplierId: p.supplier_id,
        warehouseId: p.warehouse_id,
        photoUrl: p.photo_url,
        barcode: p.barcode,
        sold: p.sold,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
      setProducts(mappedProducts);
      
      setCurrentDate(new Date());
      
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error("Error saving invoice:", err);
      setError(`حدث خطأ أثناء حفظ الفاتورة: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrintInvoice = () => {
    window.print();
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setManualQuantity(value);
  };

  return {
    customers,
    selectedCustomer,
    handleCustomerChange,
    products,
    filteredProducts,
    selectedProduct,
    setSelectedProduct,
    invoiceItems,
    paymentMethod,
    setPaymentMethod,
    paymentStatus,
    setPaymentStatus,
    invoiceType,
    setInvoiceType,
    dueDate,
    setDueDate,
    debtType,
    setDebtType,
    notes,
    setNotes,
    invoiceNumber,
    quantity,
    manualQuantity,
    handleQuantityChange,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    success,
    currentDate,
    setCurrentDate,
    subtotal,
    discount,
    setDiscount,
    taxRate,
    setTaxRate,
    taxAmount,
    total,
    handleAddProduct,
    handleRemoveItem,
    handleSaveInvoice,
    handlePrintInvoice
  };
};
