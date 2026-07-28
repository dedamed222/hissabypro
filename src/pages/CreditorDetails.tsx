import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { 
  ArrowRight, 
  User, 
  Package, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Filter, 
  TrendingUp, 
  BarChart3, 
  Search,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Creditor, Product } from "@/types";
import ProductSearch from "@/components/sales/ProductSearch";
import { useProductSearch } from "@/hooks/useProductSearch";
import NewProductForm from "@/components/creditors/NewProductForm";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExportActions from "@/components/shared/ExportActions";
import { upsertCreditor, deleteCreditor } from "@/lib/database";
import { Badge } from "@/components/ui/badge";

export default function CreditorDetails() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [creditorData, setCreditorData] = useState<any>(null);
  const [formData, setFormData] = useState({
    productCode: "",
    productName: "",
    quantity: "",
    price: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Filter states
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    showProductSearch,
    setShowProductSearch,
    products,
    setProducts
  } = useProductSearch();

  useEffect(() => {
    loadCreditorData();
  }, [name]);

  const loadCreditorData = () => {
    const data = loadStoreData();
    const creditors = data.creditors || [];
    
    // Group all creditors for this customer
    const customerCreditors = creditors.filter(
      (c: Creditor) => c.name === decodeURIComponent(name || "")
    );

    if (customerCreditors.length === 0) {
      navigate("/creditors");
      return;
    }

    const grouped = {
      name: customerCreditors[0].name,
      products: customerCreditors.map((c: Creditor) => ({
        id: c.id,
        productCode: c.productCode || '',
        productName: c.productName || '',
        quantity: c.quantity || 0,
        price: c.price || 0,
        total: c.total || c.amount || 0,
        date: c.date,
        status: c.status || 'pending'
      })),
      totalAmount: customerCreditors.reduce((sum: number, c: Creditor) => 
        c.status === 'paid' ? sum : sum + (c.total || c.amount || 0), 0
      ),
      totalPaid: customerCreditors.reduce((sum: number, c: Creditor) => 
        c.status === 'paid' ? sum + (c.total || c.amount || 0) : sum, 0
      ),
      lastDate: customerCreditors.reduce((latest: string, c: Creditor) => {
        return new Date(c.date || 0) > new Date(latest) ? c.date : latest;
      }, customerCreditors[0].date)
    };

    setCreditorData(grouped);
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

  const handleAddProduct = async () => {
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

      const newCreditor: Creditor = {
        id: generateId(),
        name: creditorData.name,
        phone: "",
        productCode: formData.productCode.trim(),
        productName: formData.productName.trim(),
        quantity: quantity,
        date: now,
        price: price,
        total: calculatedTotal,
        amount: calculatedTotal,
        createdAt: now,
        updatedAt: now,
        status: 'pending'
      };

      storeData.creditors = [...(storeData.creditors || []), newCreditor];
      saveStoreData(storeData);
      
      // Sync added creditor to Supabase
      try {
        await upsertCreditor({
          id: newCreditor.id?.length === 36 ? newCreditor.id : undefined,
          name: newCreditor.name,
          phone: newCreditor.phone,
          amount: newCreditor.amount,
          date: newCreditor.date,
          product_code: newCreditor.productCode,
          product_name: newCreditor.productName,
          quantity: newCreditor.quantity,
          price: newCreditor.price,
          total: newCreditor.total,
          notes: newCreditor.notes,
          status: 'pending'
        });
      } catch (dbErr) {
        console.error("Database sync error (add creditor):", dbErr);
      }
      
      setFormData({
        productCode: "",
        productName: "",
        quantity: "",
        price: ""
      });
      
      loadCreditorData();
      toast.success("تم إضافة المنتج بنجاح");
    } catch (err) {
      console.error("Error adding product:", err);
      setError("حدث خطأ أثناء إضافة المنتج");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: 'pending' | 'paid') => {
    const newStatus: 'pending' | 'paid' = currentStatus === 'pending' ? 'paid' : 'pending';
    
    try {
      const storeData = loadStoreData();
      const updatedCreditors = (storeData.creditors || []).map((c: Creditor) => 
        c.id === productId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c
      );
      
      storeData.creditors = updatedCreditors;
      saveStoreData(storeData);

      // Sync to Supabase
      const creditorToUpdate = updatedCreditors.find(c => c.id === productId);
      if (creditorToUpdate && productId.length === 36) {
        await upsertCreditor({
          id: creditorToUpdate.id,
          name: creditorToUpdate.name,
          phone: creditorToUpdate.phone,
          amount: creditorToUpdate.amount,
          notes: creditorToUpdate.notes,
          product_code: creditorToUpdate.productCode,
          product_name: creditorToUpdate.productName,
          quantity: creditorToUpdate.quantity,
          price: creditorToUpdate.price,
          total: creditorToUpdate.total || creditorToUpdate.amount,
          date: creditorToUpdate.date,
          status: newStatus
        });
      }

      loadCreditorData();
      toast.success(newStatus === 'paid' ? "تم تسديد المعاملة" : "تمت إعادة المعاملة للانتظار");
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("فشل تحديث حالة المعاملة");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const storeData = loadStoreData();
    storeData.creditors = (storeData.creditors || []).filter((creditor: Creditor) => creditor.id !== productId);
    saveStoreData(storeData);

    // Sync deletion to Supabase
    try {
      if (productId.length === 36) {
        await deleteCreditor(productId);
      }
    } catch (dbErr) {
      console.error("Database deletion error (creditor):", dbErr);
    }

    setDeleteId(null);
    loadCreditorData();
    toast.success("تم حذف المنتج بنجاح");
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    if (!creditorData) return [];
    
    let filtered = [...creditorData.products];

    // Apply search filter
    if (filterSearch) {
      filtered = filtered.filter((p: any) =>
        p.productCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.productName.toLowerCase().includes(filterSearch.toLowerCase())
      );
    }

    // Apply date range filter
    if (filterDateFrom) {
      filtered = filtered.filter((p: any) => new Date(p.date) >= new Date(filterDateFrom));
    }
    if (filterDateTo) {
      filtered = filtered.filter((p: any) => new Date(p.date) <= new Date(filterDateTo));
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((p: any) => p.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "price-desc":
          return b.total - a.total;
        case "price-asc":
          return a.total - b.total;
        case "quantity-desc":
          return b.quantity - a.quantity;
        case "quantity-asc":
          return a.quantity - b.quantity;
        default:
          return 0;
      }
    });

    return filtered;
  }, [creditorData, filterSearch, filterDateFrom, filterDateTo, sortBy]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!creditorData) return null;
    
    const products = filteredAndSortedProducts;
    const totalQuantity = products.reduce((sum: number, p: any) => sum + p.quantity, 0);
    const avgPrice = products.length > 0 ? products.reduce((sum: number, p: any) => sum + p.total, 0) / products.length : 0;
    const maxTransaction = products.length > 0 ? Math.max(...products.map((p: any) => p.total)) : 0;
    const minTransaction = products.length > 0 ? Math.min(...products.map((p: any) => p.total)) : 0;
    
    // Most purchased product
    const productCounts = products.reduce((acc: any, p: any) => {
      const key = p.productCode;
      acc[key] = (acc[key] || 0) + p.quantity;
      return acc;
    }, {});
    const mostPurchased = Object.entries(productCounts).sort((a: any, b: any) => b[1] - a[1])[0];

    return {
      totalQuantity,
      avgPrice,
      maxTransaction,
      minTransaction,
      mostPurchased: mostPurchased ? { code: mostPurchased[0], quantity: mostPurchased[1] } : null
    };
  }, [creditorData, filteredAndSortedProducts]);

  if (!creditorData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/creditors")}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6" />
          تفاصيل الدائن
        </h1>
      </div>

      {/* Creditor Info Card */}
      <Card className="shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{creditorData.name}</CardTitle>
            </div>
            {creditorData.totalAmount === 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-sm py-1.5 px-3">
                <CheckCircle2 className="w-4 h-4 ml-1.5" /> تم تسديد الكل
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">إجمالي المنتجات</p>
                  <p className="text-2xl font-bold">{creditorData.products.length}</p>
                </div>
              </div>
            </div>
            
            <div className={`rounded-lg p-4 border ${creditorData.totalAmount > 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${creditorData.totalAmount > 0 ? 'bg-destructive/10' : 'bg-green-100'}`}>
                  <DollarSign className={`h-5 w-5 ${creditorData.totalAmount > 0 ? 'text-destructive' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المبلغ المتبقي</p>
                  <p className={`text-2xl font-bold ${creditorData.totalAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(creditorData.totalAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">المبلغ المدفوع</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(creditorData.totalPaid)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">إجمالي الكمية</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics?.totalQuantity || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">متوسط الصفقة</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(statistics?.avgPrice || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">آخر نشاط</p>
                  <p className="text-lg font-semibold">{formatDate(creditorData.lastDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Product Card */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة منتج جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">معلومات المنتج</h3>
              <NewProductForm onProductAdded={handleProductAdded} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block mb-2 font-medium text-sm">رمز المنتج</label>
                <Input 
                  value={formData.productCode} 
                  onChange={e => {
                    setFormData({...formData, productCode: e.target.value});
                    setSearchTerm(e.target.value);
                    setShowProductSearch(true);
                  }}
                  onFocus={() => setShowProductSearch(true)}
                  placeholder="أدخل رمز المنتج أو ابحث" 
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
                <label className="block mb-2 font-medium text-sm">اسم المنتج</label>
                <Input 
                  value={formData.productName} 
                  onChange={e => setFormData({...formData, productName: e.target.value})} 
                  placeholder="اسم المنتج" 
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm">الكمية</label>
                <Input 
                  type="number" 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  placeholder="الكمية" 
                />
              </div>
              <div>
                <label className="block mb-2 font-medium text-sm">سعر الوحدة</label>
                <Input 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})} 
                  placeholder="0.00" 
                />
              </div>
            </div>

            <Button 
              onClick={handleAddProduct} 
              disabled={loading} 
              className="w-full md:w-auto"
            >
              <Plus className="ml-2 h-4 w-4" />
              {loading ? "جاري الإضافة..." : "إضافة منتج"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              قائمة المنتجات والنشاطات ({filteredAndSortedProducts.length})
            </CardTitle>
            <ExportActions
              data={filteredAndSortedProducts}
              filename={`نشاطات_${creditorData.name}`}
              title={`نشاطات الدائن: ${creditorData.name}`}
              columns={[
                { 
                  key: 'status', 
                  header: 'الحالة',
                  render: (item: any) => item.status === 'paid' ? 'تم التسديد' : 'قيد الانتظار'
                },
                { key: 'productCode', header: 'رمز المنتج' },
                { key: 'productName', header: 'اسم المنتج' },
                { key: 'quantity', header: 'الكمية' },
                { 
                  key: 'price', 
                  header: 'سعر الوحدة',
                  render: (item: any) => formatCurrency(item.price)
                },
                { 
                  key: 'total', 
                  header: 'المبلغ الإجمالي',
                  render: (item: any) => formatCurrency(item.total)
                },
                { 
                  key: 'date', 
                  header: 'التاريخ',
                  render: (item: any) => formatDate(item.date)
                }
              ]}
              customerInfo={{
                name: creditorData.name
              }}
              totals={{
                totalQuantity: statistics?.totalQuantity || 0,
                totalDebit: creditorData.totalAmount,
                totalCredit: creditorData.totalPaid,
                finalBalance: creditorData.totalAmount
              }}
              hideBalanceStatus={true}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters Section */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">فلترة النشاطات</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1">
                <label className="block mb-2 text-sm font-medium">بحث في المنتجات</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="رمز أو اسم المنتج"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium">الحالة</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="paid">تم التسديد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">من تاريخ</label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium">إلى تاريخ</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium">ترتيب حسب</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الترتيب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">التاريخ (الأحدث أولاً)</SelectItem>
                    <SelectItem value="date-asc">التاريخ (الأقدم أولاً)</SelectItem>
                    <SelectItem value="price-desc">المبلغ (الأعلى أولاً)</SelectItem>
                    <SelectItem value="price-asc">المبلغ (الأقل أولاً)</SelectItem>
                    <SelectItem value="quantity-desc">الكمية (الأكثر أولاً)</SelectItem>
                    <SelectItem value="quantity-asc">الكمية (الأقل أولاً)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(filterSearch || filterDateFrom || filterDateTo) && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilterSearch("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setFilterStatus("all");
                  }}
                >
                  مسح الفلاتر
                </Button>
                <div className="text-sm text-muted-foreground flex items-center">
                  النتائج: {filteredAndSortedProducts.length} من {creditorData.products.length}
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-right p-3 font-semibold border">الحالة</th>
                  <th className="text-right p-3 font-semibold border">رمز المنتج</th>
                  <th className="text-right p-3 font-semibold border">اسم المنتج</th>
                  <th className="text-center p-3 font-semibold border">الكمية</th>
                  <th className="text-center p-3 font-semibold border">سعر الوحدة</th>
                  <th className="text-center p-3 font-semibold border">الإجمالي</th>
                  <th className="text-center p-3 font-semibold border">التاريخ</th>
                  <th className="text-center p-3 font-semibold border">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProducts.map((product: any) => (
                  <tr key={product.id} className={`border-b hover:bg-muted/30 transition-colors ${product.status === 'paid' ? 'opacity-70 bg-green-50/20' : ''}`}>
                    <td className="p-3 border text-center">
                      {product.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 ml-1" /> تم التسديد
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                          <Clock className="w-3 h-3 ml-1" /> قيد الانتظار
                        </Badge>
                      )}
                    </td>
                    <td className={`p-3 border font-medium ${product.status === 'paid' ? 'text-muted-foreground' : 'text-primary'}`}>
                      {product.productCode}
                    </td>
                    <td className={`p-3 border ${product.status === 'paid' ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                      {product.productName}
                    </td>
                    <td className="p-3 border text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${product.status === 'paid' ? 'bg-gray-100 text-gray-500' : 'bg-primary/10 text-primary'}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="p-3 border text-center font-medium">
                      {formatCurrency(product.price)}
                    </td>
                    <td className={`p-3 border text-center font-bold ${product.status === 'paid' ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(product.total)}
                    </td>
                    <td className="p-3 border text-center text-muted-foreground text-xs">
                      {formatDate(product.date)}
                    </td>
                    <td className="p-3 border text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(product.id, product.status)}
                          className={`h-8 w-8 p-0 ${product.status === 'paid' ? 'text-amber-600' : 'text-green-600'}`}
                          title={product.status === 'paid' ? "إلغاء التسديد" : "تسديد المعاملة"}
                        >
                          {product.status === 'paid' ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(product.id)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 font-bold">
                  <td colSpan={5} className="p-3 text-right border">
                    الرصيد المتبقي {filterSearch || filterDateFrom || filterDateTo || filterStatus !== "all" ? '(المفلتر)' : ''}:
                  </td>
                  <td className="p-3 text-center text-destructive text-lg border">
                    {formatCurrency(filteredAndSortedProducts.reduce((sum: number, p: any) => p.status === 'paid' ? sum : sum + p.total, 0))}
                  </td>
                  <td colSpan={2} className="border"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {filteredAndSortedProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p>{creditorData.products.length === 0 ? "لا توجد منتجات حالياً" : "لا توجد نتائج تطابق الفلاتر المحددة"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="min-w-[350px] mx-4 shadow-2xl">
            <CardHeader className="bg-destructive/10">
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                تأكيد الحذف
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-foreground mb-6">
                هل أنت متأكد من حذف هذا المنتج؟
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteProduct(deleteId)}
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف
                </Button>
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
