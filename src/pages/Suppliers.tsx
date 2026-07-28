import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { formatDate } from "@/utils/formatters";
import { Plus, Search, Edit, Trash2, X, Save, AlertCircle, Download } from "lucide-react";
import { getSuppliers, upsertSupplier, deleteSupplier } from "@/lib/database";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (err) {
      console.error("Error loading suppliers:", err);
      setError("فشل تحميل البيانات من السحابة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMigrate = async () => {
    const storeData = loadStoreData();
    const localSuppliers = storeData.suppliers || [];
    if (localSuppliers.length === 0) {
      alert("لا توجد بيانات محلية لترحيلها");
      return;
    }

    if (!confirm(`هل تريد ترحيل ${localSuppliers.length} مورد من الجهاز إلى السحابة؟`)) {
      return;
    }

    setLoading(true);
    try {
      for (const supplier of localSuppliers) {
        await upsertSupplier({
          name: supplier.name,
          phone: supplier.phone || "",
          email: supplier.email || "",
          address: supplier.address || "",
          notes: supplier.notes || ""
        });
      }
      alert("تم ترحيل البيانات بنجاح");
      loadData();
    } catch (err) {
      console.error("Migration error:", err);
      setError("حدث خطأ أثناء ترحيل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    setIsModalOpen(true);
    setSelectedSupplier(null);
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (supplier: any) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المورد؟")) return;
    
    setLoading(true);
    try {
      // Delete from Supabase
      await deleteSupplier(supplier.id);
      
      // Update local state
      const updated = suppliers.filter((s: any) => s.id !== supplier.id);
      setSuppliers(updated);
      setFilteredSuppliers(updated);
      
      // Also update localStorage for consistency
      const storeData = loadStoreData();
      storeData.suppliers = storeData.suppliers.filter((s: any) => s.id !== supplier.id);
      saveStoreData(storeData);
    } catch (err) {
      console.error("Error deleting supplier:", err);
      setError("حدث خطأ أثناء الحذف من السحابة");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.name.trim()) {
      setError("يرجى إدخال اسم المورد");
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        id: selectedSupplier?.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: formData.notes
      };

      await upsertSupplier(payload);
      await loadData();

      setIsModalOpen(false);
      setSelectedSupplier(null);
      setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
    } catch (err) {
      console.error("Error saving supplier:", err);
      setError("حدث خطأ أثناء حفظ البيانات في السحابة");
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }
    
    const filtered = suppliers.filter((supplier: any) =>
      supplier.name.toLowerCase().includes(query.toLowerCase()) ||
      supplier.phone?.includes(query) ||
      supplier.email?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleMigrate} title="ترحيل البيانات المحلية">
            <Download className="ml-2" size={18} />
            ترحيل
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="ml-2" size={18} />
            إضافة مورد جديد
          </Button>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="البحث عن مورد..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الموردين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full arab-table">
              <thead>
                <tr>
                  <th>اسم المورد</th>
                  <th>رقم الهاتف</th>
                  <th>البريد الإلكتروني</th>
                  <th>العنوان</th>
                  <th>آخر تحديث</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier: any) => (
                    <tr key={supplier.id}>
                      <td>{supplier.name}</td>
                      <td>{supplier.phone || "-"}</td>
                      <td>{supplier.email || "-"}</td>
                      <td>{supplier.address || "-"}</td>
                      <td>{formatDate(supplier.updatedAt)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                            <Edit size={18} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier)} className="text-red-600">
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد موردين"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {selectedSupplier ? "تعديل مورد" : "إضافة مورد جديد"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block mb-1">اسم المورد *</label>
                  <input
                    type="text"
                    id="supplier_name"
                    title="اسم المورد"
                    placeholder="أدخل اسم المورد"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    id="supplier_phone"
                    title="رقم الهاتف"
                    placeholder="مثال: 05XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    id="supplier_email"
                    title="البريد الإلكتروني"
                    placeholder="example@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block mb-1">العنوان</label>
                  <input
                    type="text"
                    id="supplier_address"
                    title="العنوان"
                    placeholder="أدخل العنوان التفصيلي"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block mb-1">ملاحظات</label>
                  <textarea
                    id="supplier_notes"
                    title="ملاحظات"
                    placeholder="أضف أي ملاحظات إضافية هنا..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2" size={18} />
                      حفظ
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
