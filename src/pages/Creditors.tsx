import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { Plus, User, Package, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Creditor, Customer, Product } from "@/types";
import CustomerSelector from "@/components/invoice/CustomerSelector";
import CreditorsList from "@/components/creditors/CreditorsList";
import ProductSearch from "@/components/sales/ProductSearch";
import NewProductForm from "@/components/creditors/NewProductForm";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useToast } from "@/hooks/use-toast";
import { 
  getCreditors, 
  upsertCreditor, 
  deleteCreditor,
  updateCreditorStatus
} from "@/lib/database";

export default function Creditors() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    productName: "",
    quantity: "",
    price: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditorsList, setCreditorsList] = useState<Creditor[]>([]);

  // For editing creditors
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof formData>(formData);
  const [selectedEditCustomer, setSelectedEditCustomer] = useState<Customer | null>(null);

  // For delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Product search functionality
  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch,
    products,
    setProducts
  } = useProductSearch();

  const data = loadStoreData();

  // Fetch creditors from Supabase on mount and merge with localStorage
  useEffect(() => {
    const fetchCreditors = async () => {
      try {
        const remoteCreditors = await getCreditors();
        const storeData = loadStoreData();
        const localCreditors: Creditor[] = storeData.creditors || [];

        // Map Supabase records to local Creditor type
        const mappedRemote: Creditor[] = remoteCreditors.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          address: c.address || "",
          amount: c.amount || 0,
          notes: c.notes || "",
          productCode: c.product_code || "",
          productName: c.product_name || "",
          quantity: c.quantity || 0,
          price: c.price || 0,
          total: c.total || c.amount || 0,
          date: c.date || c.created_at || new Date().toISOString(),
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          status: c.status || 'pending'
        }));

        // Merge: remote records take priority; add local records not in remote
        const remoteIds = new Set(mappedRemote.map((c) => c.id));
        const localOnly = localCreditors.filter((c) => !remoteIds.has(c.id));
        const merged = [...mappedRemote, ...localOnly];

        // Update localStorage with merged data
        storeData.creditors = merged;
        saveStoreData(storeData);

        setCreditorsList(merged);
      } catch (err) {
        console.error("Failed to fetch creditors from Supabase:", err);
        // Fall back to localStorage
        const storeData = loadStoreData();
        setCreditorsList(storeData.creditors || []);
      }
    };
    fetchCreditors();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: 'pending' | 'paid') => {
    const newStatus: 'pending' | 'paid' = currentStatus === 'pending' ? 'paid' : 'pending';
    
    try {
      const storeData = loadStoreData();
      const updatedCreditors = (storeData.creditors || []).map((c: Creditor) => 
        c.id === id ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c
      );
      
      storeData.creditors = updatedCreditors;
      saveStoreData(storeData);
      setCreditorsList(updatedCreditors);

      // Sync to Supabase
      if (id.length === 36) {
        await updateCreditorStatus(id, newStatus);
      }

      toast({
        title: newStatus === 'paid' ? "تم التسديد" : "تمت إعادة التعيين",
        description: newStatus === 'paid' ? "تم وضع علامة مسدد على الدائنية" : "تمت إعادة الدائنية إلى قائمة الانتظار"
      });
    } catch (err) {
      console.error("Error toggling creditor status:", err);
      const errorMessage = err instanceof Error ? err.message : "فشل تحديث حالة الدائنية";
      toast({
        title: "خطأ في المزامنة",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleProductAdded = (newProduct: Product) => {
    setProducts([...products, newProduct]);
    setFormData({
      ...formData,
      productCode: newProduct.code,
      productName: newProduct.name,
      price: String(newProduct.price)
    });
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
        name: customer.name
      });
    }
  };

  const handleEditCustomerChange = (customerId: string) => {
    const customer = data.customers?.find((c: Customer) => c.id === customerId);
    if (customer) {
      setSelectedEditCustomer(customer);
      setEditForm({
        ...editForm,
        name: customer.name
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      setError("يرجى إدخال اسم الدائن");
      return;
    }
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

    setError("");
    setLoading(true);
    
    try {
      const storeData = loadStoreData();
      const now = new Date().toISOString();
      const quantity = Number(formData.quantity);
      const price = Number(formData.price);
      const calculatedTotal = quantity * price;

      // تحديث المخزون: زيادة كمية المنتج
      const productIndex = storeData.products.findIndex(
        (p: Product) => p.code === formData.productCode.trim()
      );
      
      if (productIndex !== -1) {
        storeData.products[productIndex].quantity += quantity;
      }

      // إذا كان هناك عميل محدد، نخصم من دينه
      if (selectedCustomer) {
        // البحث عن المدين في قائمة المدينين
        const debtorIndex = storeData.debtors?.findIndex(
          (d: any) => d.name === selectedCustomer.name
        );

        if (debtorIndex !== -1 && debtorIndex !== undefined) {
          // تحديث دين العميل الموجود
          const currentDebt = storeData.debtors[debtorIndex].totalAmount || 0;
          const newDebt = currentDebt - calculatedTotal;
          storeData.debtors[debtorIndex].totalAmount = Math.max(0, newDebt);
          storeData.debtors[debtorIndex].updatedAt = now;
        }
      }

      const newCreditor: Creditor = {
        id: generateId(),
        name: formData.name.trim(),
        phone: "",
        productCode: formData.productCode.trim(),
        productName: formData.productName.trim(),
        quantity: quantity,
        date: now,
        price: price,
        total: calculatedTotal,
        amount: calculatedTotal,
        createdAt: now,
        updatedAt: now
      };

      storeData.creditors = [...(storeData.creditors || []), newCreditor];
      saveStoreData(storeData);
      setCreditorsList(storeData.creditors);
      
      setFormData({
        name: "",
        productCode: "",
        productName: "",
        quantity: "",
        price: ""
      });
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Error adding creditor:", err);
      setError("حدث خطأ أثناء إضافة الدائن");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (creditor: Creditor) => {
    setEditId(creditor.id);
    setEditForm({
      name: creditor.name,
      productCode: creditor.productCode || "",
      productName: creditor.productName || "",
      quantity: String(creditor.quantity ?? ""),
      price: String(creditor.price || 0)
    });

    // Find the customer that matches this creditor
    const customer = data.customers?.find((c: Customer) => 
      c.name === creditor.name
    );
    setSelectedEditCustomer(customer || null);
  };

  const handleEditSubmit = (id: string) => {
    if (!editForm.name.trim() || !editForm.productCode.trim() || !editForm.productName.trim() || !editForm.quantity || isNaN(Number(editForm.quantity)) || Number(editForm.quantity) <= 0 || !editForm.price || isNaN(Number(editForm.price)) || Number(editForm.price) <= 0) {
      setError("يرجى إدخال بيانات صحيحة عند التعديل");
      return;
    }

    const quantity = Number(editForm.quantity);
    const price = Number(editForm.price);
    const calculatedTotal = quantity * price;

    const storeData = loadStoreData();
    storeData.creditors = (storeData.creditors || []).map((creditor: Creditor) => 
      creditor.id === id ? {
        ...creditor,
        name: editForm.name.trim(),
        productCode: editForm.productCode.trim(),
        productName: editForm.productName.trim(),
        quantity: quantity,
        price: price,
        total: calculatedTotal,
        amount: calculatedTotal,
        updatedAt: new Date().toISOString()
      } : creditor
    );
    saveStoreData(storeData);
    setCreditorsList(storeData.creditors || []);
    setEditId(null);
    setSelectedEditCustomer(null);
    setError("");
  };

  const handleEditCancel = () => {
    setEditId(null);
    setSelectedEditCustomer(null);
    setError("");
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = (id: string) => {
    const storeData = loadStoreData();
    storeData.creditors = (storeData.creditors || []).filter((creditor: Creditor) => creditor.id !== id);
    saveStoreData(storeData);
    setCreditorsList(storeData.creditors || []);
    setDeleteId(null);
  };

  // Get existing creditors list for quick selection
  const existingCreditors = creditorsList;
  const uniqueCreditorNames = [...new Set(existingCreditors.map(c => c.name))];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl mb-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">إدارة الدائنين</h1>
            <p className="text-gray-600">تتبع وإدارة حسابات الدائنين والتعاملات المالية</p>
          </div>
          <Button
            onClick={() => navigate('/creditors/overview')}
            className="gap-2"
            size="lg"
          >
            <BarChart3 className="w-5 h-5" />
            ملخص شامل
          </Button>
        </div>
      </div>

      {/* Existing Creditors Quick Access */}
      {uniqueCreditorNames.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              الدائنين الحاليين
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {uniqueCreditorNames.map((name, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({...formData, name: name})}
                  className="text-sm hover:bg-blue-50"
                >
                  {name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة دائن جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            {/* Customer Selection Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات الدائن
              </h3>
              <CustomerSelector
                selectedCustomer={selectedCustomer}
                customers={data.customers || []}
                onCustomerChange={handleCustomerChange}
              />
              <div className="mt-4">
                <label className="block mb-2 font-medium">اسم الدائن</label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="أدخل اسم الدائن أو اختر من القائمة" 
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Product Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  معلومات المنتج
                </h3>
                <NewProductForm onProductAdded={handleProductAdded} />
              </div>
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
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              <Plus className="mr-2" size={18} />
              {loading ? "جاري الإضافة..." : "إضافة دائن"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreditorsList
        creditors={creditorsList}
        customers={data.customers || []}
        editId={editId}
        editForm={editForm}
        selectedEditCustomer={selectedEditCustomer}
        deleteId={deleteId}
        onEdit={handleEdit}
        onEditSubmit={handleEditSubmit}
        onEditCancel={handleEditCancel}
        onEditFormChange={handleEditFormChange}
        onEditCustomerChange={handleEditCustomerChange}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        setDeleteId={setDeleteId}
      />
    </div>
  );
}
