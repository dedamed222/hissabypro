import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { Plus, User, FileText, Package, BarChart3 } from "lucide-react";
import type { Debtor, Customer, Product } from "@/types";
import CustomerSelector from "@/components/invoice/CustomerSelector";
import DebtorProductSelector from "@/components/debtors/DebtorProductSelector";
import DebtorsList from "@/components/debtors/DebtorsList";
import ProductSearch from "@/components/sales/ProductSearch";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useToast } from "@/hooks/use-toast";
import { getDebtors, upsertDebtor, deleteDebtor, updateDebtorStatus } from "@/lib/database";

interface DebtorProductItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export default function Debtors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    debtorName: "",
    phone: "",
    notes: "",
    productCode: "",
    productName: "",
    quantity: "",
    price: ""
  });
  const [selectedProducts, setSelectedProducts] = useState<DebtorProductItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [debtorsList, setDebtorsList] = useState<Debtor[]>([]);
  
  // For editing
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof formData>(formData);
  const [editProducts, setEditProducts] = useState<DebtorProductItem[]>([]);
  const [selectedEditCustomer, setSelectedEditCustomer] = useState<Customer | null>(null);

  // Product search functionality
  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch
  } = useProductSearch();

  const data = loadStoreData();

  // Fetch debtors from Supabase on mount and merge with localStorage
  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        const remoteDebtors = await getDebtors();
        const storeData = loadStoreData();
        const localDebtors: Debtor[] = storeData.debtors || [];

        // Map Supabase records to local Debtor type
        const mappedRemote: Debtor[] = remoteDebtors.map((d: any) => ({
          id: d.id,
          name: d.name,
          debtorName: d.name,
          phone: d.phone || "",
          products: Array.isArray(d.products) ? d.products : [],
          totalAmount: d.total_amount || 0,
          amount: d.total_amount || 0,
          notes: d.notes || "",
          date: d.date || d.created_at || new Date().toISOString(),
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          status: d.status || 'pending'
        }));

        // Merge: remote records take priority; add local records not in remote
        const remoteIds = new Set(mappedRemote.map((d) => d.id));
        const localOnly = localDebtors.filter((d) => !remoteIds.has(d.id));
        const merged = [...mappedRemote, ...localOnly];

        // Update localStorage with merged data
        storeData.debtors = merged;
        saveStoreData(storeData);

        setDebtorsList(merged);
      } catch (err) {
        console.error("Failed to fetch debtors from Supabase:", err);
        // Fall back to localStorage
        const storeData = loadStoreData();
        setDebtorsList(storeData.debtors || []);
      }
    };
    fetchDebtors();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: 'pending' | 'paid') => {
    const newStatus: 'pending' | 'paid' = currentStatus === 'pending' ? 'paid' : 'pending';
    
    try {
      const storeData = loadStoreData();
      const updatedDebtors = (storeData.debtors || []).map((d: Debtor) => 
        d.id === id ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
      );
      
      storeData.debtors = updatedDebtors;
      saveStoreData(storeData);
      setDebtorsList(updatedDebtors);

      // Sync to Supabase
      if (id.length === 36) {
        await updateDebtorStatus(id, newStatus);
      }

      toast({
        title: newStatus === 'paid' ? "تم التسديد" : "تمت إعادة التعيين",
        description: newStatus === 'paid' ? "تم وضع علامة مسدد على المديونية" : "تمت إعادة المديونية إلى قائمة الانتظار"
      });
    } catch (err) {
      console.error("Error toggling debtor status:", err);
      const errorMessage = err instanceof Error ? err.message : "فشل تحديث حالة المديونية";
      toast({
        title: "خطأ في المزامنة",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleProductSelect = (product: any) => {
    setFormData({
      ...formData,
      productCode: product.code,
      productName: product.name,
      price: String(product.price)
    });
    setShowProductSearch(false);
    setSearchTerm("");
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = data.customers?.find((c: Customer) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setFormData({
        ...formData,
        debtorName: customer.name,
        phone: customer.phone || ""
      });
    }
  };

  const handleEditCustomerChange = (customerId: string) => {
    const customer = data.customers?.find((c: Customer) => c.id === customerId);
    if (customer) {
      setSelectedEditCustomer(customer);
      setEditForm({
        ...editForm,
        debtorName: customer.name,
        phone: customer.phone || ""
      });
    }
  };

  const handleAddProduct = () => {
    if (!formData.productCode.trim() || !formData.productName.trim()) {
      setError("يرجى إدخال معلومات المنتج");
      return;
    }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError("يرجى إدخال سعر صحيح");
      return;
    }
    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
      setError("يرجى إدخال كمية صحيحة");
      return;
    }

    const quantity = Number(formData.quantity);
    const price = Number(formData.price);
    
    // Check if product exists in inventory and has enough quantity
    const storeData = loadStoreData();
    const product = storeData.products?.find(p => p.code === formData.productCode.trim());
    if (product && product.quantity < quantity) {
      setError(`الكمية المتاحة في المخزون: ${product.quantity} فقط`);
      return;
    }
    
    const productId = Date.now().toString(); // Generate temporary ID

    const newProduct: DebtorProductItem = {
      productId,
      productCode: formData.productCode.trim(),
      productName: formData.productName.trim(),
      quantity,
      price,
      total: quantity * price
    };

    setSelectedProducts([...selectedProducts, newProduct]);
    
    // Clear product fields
    setFormData({
      ...formData,
      productCode: "",
      productName: "",
      quantity: "",
      price: ""
    });
    setError("");
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts.splice(index, 1);
    setSelectedProducts(updatedProducts);
  };

  const handleSubmit = async () => {
    if (!formData.debtorName.trim()) {
      setError("يرجى إدخال اسم المدين");
      return;
    }
    if (!formData.phone.trim()) {
      setError("يرجى إدخال رقم الهاتف");
      return;
    }
    if (selectedProducts.length === 0) {
      setError("يرجى إضافة منتج واحد على الأقل");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const storeData = loadStoreData();
      const now = new Date().toISOString();
      const totalAmount = selectedProducts.reduce((sum, item) => sum + item.total, 0);

      // Update inventory - deduct quantities
      const updatedProducts = (storeData.products || []).map(product => {
        const debtorProduct = selectedProducts.find(sp => sp.productCode === product.code);
        if (debtorProduct) {
          const newQuantity = product.quantity - debtorProduct.quantity;
          if (newQuantity < 0) {
            throw new Error(`الكمية المتاحة للمنتج "${product.name}" غير كافية`);
          }
          return {
            ...product,
            quantity: newQuantity,
            updatedAt: now
          };
        }
        return product;
      });

      const newDebtor: Debtor = {
        id: generateId(),
        name: formData.debtorName.trim(),
        debtorName: formData.debtorName.trim(),
        phone: formData.phone.trim(),
        products: selectedProducts,
        totalAmount: totalAmount,
        amount: totalAmount,
        notes: formData.notes,
        date: now,
        createdAt: now,
        updatedAt: now,
        // Legacy fields for backward compatibility
        productCode: selectedProducts[0]?.productCode || "",
        productName: selectedProducts[0]?.productName || "",
        quantity: selectedProducts[0]?.quantity || 0,
        productPrice: selectedProducts[0]?.price || 0
      };

      storeData.products = updatedProducts;
      storeData.debtors = [...(storeData.debtors || []), newDebtor];
      saveStoreData(storeData);
      setDebtorsList(storeData.debtors);

      // --- Sync added debtor to Supabase ---
      try {
        await upsertDebtor({
          id: newDebtor.id?.length === 36 ? newDebtor.id : undefined,
          name: newDebtor.name,
          phone: newDebtor.phone,
          total_amount: newDebtor.totalAmount,
          notes: newDebtor.notes,
          date: newDebtor.date,
          products: newDebtor.products // Note: Supabase debtor table expects 'products' as Json
        });
      } catch (dbErr) {
        console.error("Database sync error (add debtor):", dbErr);
      }
      // -------------------------------------

      toast({
        title: "تم بنجاح",
        description: "تمت إضافة المدين وتحديث المخزون بنجاح"
      });

      // Reset form
      setFormData({
        debtorName: "",
        phone: "",
        notes: "",
        productCode: "",
        productName: "",
        quantity: "",
        price: ""
      });
      setSelectedProducts([]);
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Error adding debtor:", err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المدين";
      setError(errorMessage);
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (debtor: Debtor) => {
    setEditId(debtor.id);
    setEditForm({
      debtorName: debtor.debtorName || debtor.name,
      phone: debtor.phone || "",
      notes: debtor.notes || "",
      productCode: "",
      productName: "",
      quantity: "",
      price: ""
    });

    // Set edit products
    if (Array.isArray(debtor.products) && debtor.products.length > 0) {
      setEditProducts(debtor.products);
    } else {
      // Legacy format
      setEditProducts([{
        productId: debtor.id,
        productCode: debtor.productCode || "",
        productName: debtor.productName || "",
        quantity: debtor.quantity || 0,
        price: debtor.productPrice || 0,
        total: (debtor.quantity || 0) * (debtor.productPrice || 0)
      }]);
    }

    // Find matching customer
    const customer = data.customers?.find((c: Customer) => 
      c.name === (debtor.debtorName || debtor.name)
    );
    setSelectedEditCustomer(customer || null);
  };

  const handleEditSubmit = (id: string) => {
    if (!editForm.debtorName.trim() || !editForm.phone.trim() || editProducts.length === 0) {
      setError("يرجى إدخال بيانات صحيحة عند التعديل");
      return;
    }

    const totalAmount = editProducts.reduce((sum, item) => sum + item.total, 0);

    const storeData = loadStoreData();
    storeData.debtors = (storeData.debtors || []).map((d: Debtor) => 
      d.id === id ? {
        ...d,
        name: editForm.debtorName.trim(),
        debtorName: editForm.debtorName.trim(),
        phone: editForm.phone.trim(),
        products: editProducts,
        totalAmount: totalAmount,
        amount: totalAmount,
        notes: editForm.notes,
        updatedAt: new Date().toISOString(),
        // Update legacy fields with first product
        productCode: editProducts[0]?.productCode || "",
        productName: editProducts[0]?.productName || "",
        quantity: editProducts[0]?.quantity || 0,
        productPrice: editProducts[0]?.price || 0
      } : d
    );
    saveStoreData(storeData);
    setDebtorsList(storeData.debtors);
    setEditId(null);
    setSelectedEditCustomer(null);
    setError("");
  };

  const handleDelete = async (id: string) => {
    const storeData = loadStoreData();
    const debtorToDelete = (storeData.debtors || []).find((d: Debtor) => d.id === id);

    if (debtorToDelete) {
      // --- Restore Inventory Logic ---
      const productsToRestore: { productId: string, quantity: number }[] = [];
      
      if (Array.isArray(debtorToDelete.products) && debtorToDelete.products.length > 0) {
        debtorToDelete.products.forEach((p: any) => {
          if (p.productId) productsToRestore.push({ productId: p.productId, quantity: p.quantity });
        });
      } else if (debtorToDelete.productCode) {
        // Legacy single product format
        const product = (storeData.products || []).find((p: any) => p.code === debtorToDelete.productCode);
        if (product) productsToRestore.push({ productId: product.id, quantity: debtorToDelete.quantity || 0 });
      }

      // Update Local Inventory
      const updatedProducts = (storeData.products || []).map((p: Product) => {
        const restoreItem = productsToRestore.find(ri => ri.productId === p.id);
        if (restoreItem) {
          return { ...p, quantity: p.quantity + restoreItem.quantity };
        }
        return p;
      });

      storeData.products = updatedProducts;
      
      // Update Cloud Inventory (Supabase)
      for (const item of productsToRestore) {
        const productData = updatedProducts.find(p => p.id === item.productId);
        if (productData) {
          try {
            const { upsertProduct } = await import("@/lib/database");
            await upsertProduct({
              id: productData.id,
              code: productData.code,
              name: productData.name,
              price: productData.price,
              cost: productData.cost,
              quantity: productData.quantity,
              low_stock_threshold: productData.lowStockThreshold || 0,
              category: productData.category || undefined,
              barcode: productData.barcode || undefined,
              sold: (productData.sold || 0) - item.quantity // Decrement sold count
            });
          } catch (err) {
            console.error("Failed to sync inventory to DB on debtor delete", err);
          }
        }
      }
    }

    // Filter out the debtor
    storeData.debtors = (storeData.debtors || []).filter((d: Debtor) => d.id !== id);
    saveStoreData(storeData);
    setDebtorsList(storeData.debtors);

    // Sync deletion to Supabase
    try {
      if (id.length === 36) {
        await deleteDebtor(id);
      }
    } catch (dbErr) {
      console.error("Database deletion error (debtor):", dbErr);
    }

    toast({
      title: "تم الحذف",
      description: "تم حذف المديونية واسترجاع المنتجات للمخزون"
    });

    setDeleteId(null);
  };

  // Get existing debtors list for quick selection
  const existingDebtors = debtorsList;
  const uniqueDebtorNames = [...new Set(existingDebtors.map(d => d.debtorName || d.name))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6" />
          إدارة المديونين
        </h1>
        <Button
          onClick={() => navigate("/debtors/overview")}
          className="flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          الملخص الشامل
        </Button>
      </div>

      {/* Existing Debtors Quick Access */}
      {uniqueDebtorNames.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              المديونين الحاليين
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {uniqueDebtorNames.map((name, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({...formData, debtorName: name})}
                  className="text-sm hover:bg-blue-50"
                >
                  {name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Debtor Form */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة مدين جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Customer Selection */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات المدين
              </h3>
              <CustomerSelector
                selectedCustomer={selectedCustomer}
                customers={data.customers || []}
                onCustomerChange={handleCustomerChange}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block mb-2 font-medium">اسم المدين</label>
                  <Input 
                    value={formData.debtorName} 
                    onChange={e => setFormData({...formData, debtorName: e.target.value})} 
                    placeholder="أدخل اسم المدين أو اختر من القائمة" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">رقم الهاتف</label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="رقم الهاتف" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 font-medium">ملاحظات</label>
                  <Input 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="ملاحظات إضافية (اختياري)" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Product Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                معلومات المنتج
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block mb-2 font-medium">رمز المنتج</label>
                  <Input 
                    value={formData.productCode} 
                    onChange={e => {
                      setFormData({...formData, productCode: e.target.value});
                      setSearchTerm(e.target.value);
                      setShowProductSearch(true);
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    placeholder="أدخل رمز المنتج أو ابحث" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <ProductSearch
                    show={showProductSearch && (searchTerm.length > 0 || formData.productCode.length > 0)}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filteredProducts={filteredProducts}
                    onSelect={handleProductSelect}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">اسم المنتج</label>
                  <Input 
                    value={formData.productName} 
                    onChange={e => setFormData({...formData, productName: e.target.value})} 
                    placeholder="اسم المنتج" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">الكمية</label>
                  <Input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={e => setFormData({...formData, quantity: e.target.value})} 
                    placeholder="الكمية" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">سعر الوحدة</label>
                  <Input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    placeholder="0.00" 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleAddProduct} 
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                إضافة منتج
              </Button>
            </div>

            {/* Selected Products Display */}
            {selectedProducts.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">المنتجات المحددة</h3>
                <div className="space-y-2">
                  {selectedProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium">{product.productName}</div>
                        <div className="text-sm text-gray-600">
                          الرمز: {product.productCode} | الكمية: {product.quantity} | السعر: {product.price}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">
                          {(product.total).toFixed(2)} د.ج
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveProduct(index)}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">المجموع الكلي:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {selectedProducts.reduce((sum, item) => sum + item.total, 0).toFixed(2)} د.ج
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              <Plus className="mr-2" size={18} />
              {loading ? "جاري الإضافة..." : "إضافة مدين"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debtors List */}
      <DebtorsList
        debtors={debtorsList}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        deleteId={deleteId}
        setDeleteId={setDeleteId}
      />

      {/* Edit Modal */}
      {editId && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تعديل بيانات المدين
            </h3>
            
            <div className="space-y-4">
              <CustomerSelector
                selectedCustomer={selectedEditCustomer}
                customers={data.customers || []}
                onCustomerChange={handleEditCustomerChange}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium">اسم المدين</label>
                  <Input 
                    value={editForm.debtorName} 
                    onChange={e => setEditForm(prev => ({...prev, debtorName: e.target.value}))} 
                    placeholder="اسم المدين"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">رقم الهاتف</label>
                  <Input 
                    value={editForm.phone} 
                    onChange={e => setEditForm(prev => ({...prev, phone: e.target.value}))} 
                    placeholder="رقم الهاتف"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 font-medium">ملاحظات</label>
                  <Input 
                    value={editForm.notes} 
                    onChange={e => setEditForm(prev => ({...prev, notes: e.target.value}))} 
                    placeholder="ملاحظات إضافية"
                  />
                </div>
              </div>

              <DebtorProductSelector
                selectedProducts={editProducts}
                onProductsChange={setEditProducts}
              />
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button 
                variant="default" 
                onClick={() => handleEditSubmit(editId)} 
                className="bg-green-600 hover:bg-green-700"
              >
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={() => setEditId(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
