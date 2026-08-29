import { useEffect, useState } from "react";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { Customer } from "@/types";
import { formatShortDate } from "@/utils/formatters";
import {
  Plus, Search, Edit, Trash2, X,
  Save, AlertCircle, User, Download
} from "lucide-react";
import { getCustomers, upsertCustomer, deleteCustomer } from "@/lib/database";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  // Load customers on component mount
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      const mapped = data.map(c => ({
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
      setCustomers(mapped);
      setFilteredCustomers(mapped);
    } catch (err) {
      console.error("Error loading customers:", err);
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
    if (storeData.customers.length === 0) {
      alert("لا توجد بيانات محلية لترحيلها");
      return;
    }

    if (!confirm(`هل تريد ترحيل ${storeData.customers.length} عميل من الجهاز إلى السحابة؟`)) {
      return;
    }

    setLoading(true);
    try {
      for (const customer of storeData.customers) {
        await upsertCustomer({
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          company: customer.company,
          notes: customer.notes
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

  // Filter customers when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const normalized = searchQuery.trim().toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(normalized) ||
        customer.company.toLowerCase().includes(normalized) ||
        customer.phone.includes(normalized) ||
        customer.email.toLowerCase().includes(normalized)
    );

    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    setError("");
  };

  // Open add modal
  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
    });
    setIsModalOpen(true);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  // Form input change handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save customer (add or edit)
  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (!formData.name.trim()) {
      setError("يرجى إدخال اسم العميل");
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();

      const payload = {
        id: selectedCustomer?.id,
        name: formData.name,
        company: formData.company,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: formData.notes
      };

      await upsertCustomer(payload);

      // Reload from Supabase
      await loadData();

      // Close modal and reset form
      setIsModalOpen(false);
      resetForm();
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Error saving customer:", err);
      setError("حدث خطأ أثناء حفظ بيانات العميل في السحابة");
    } finally {
      setLoading(false);
    }
  };

  // Delete customer
  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;

    setLoading(true);

    try {
      await deleteCustomer(selectedCustomer.id);
      await loadData();

      // Close modal and reset selection
      setIsDeleteModalOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Error deleting customer:", err);
      setError("حدث خطأ أثناء حذف العميل من السحابة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">إدارة العملاء</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMigrate}
            title="ترحيل البيانات المحلية"
            className="p-2 text-arab-blue hover:bg-blue-50 rounded-full transition-colors"
          >
            <Download size={20} />
          </button>
          <button
            onClick={handleAddNew}
            className="bg-arab-blue text-white px-4 py-2 rounded-md hover:bg-arab-blue-dark transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            <span>إضافة عميل</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="البحث عن عميل..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue bg-white"
        />
      </div>

      {/* Customers table */}
      <div className="overflow-x-auto bg-transparent md:bg-white md:rounded-lg md:shadow">
        <table className="arab-table block md:table">
          <thead className="bg-gray-50 hidden md:table-header-group">
            <tr>
              <th className="font-medium">الاسم</th>
              <th className="font-medium">الشركة</th>
              <th className="font-medium">رقم الهاتف</th>
              <th className="font-medium">البريد الإلكتروني</th>
              <th className="font-medium">آخر تحديث</th>
              <th className="font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="mobile-card-row">
                  <td data-label="الاسم">
                    <div className="font-bold md:font-normal text-gray-900 md:text-gray-700">{customer.name}</div>
                  </td>
                  <td data-label="الشركة">
                    <div>{customer.company || "-"}</div>
                  </td>
                  <td data-label="رقم الهاتف">
                    <div dir="ltr" className="text-right">{customer.phone || "-"}</div>
                  </td>
                  <td data-label="البريد الإلكتروني">
                    <div>{customer.email || "-"}</div>
                  </td>
                  <td data-label="آخر تحديث">
                    <div>{formatShortDate(customer.updatedAt)}</div>
                  </td>
                  <td data-label="الإجراءات">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="تعديل"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(customer)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="block md:table-row bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-0 md:border-0 md:shadow-none md:rounded-none">
                <td colSpan={6} className="text-center py-8 text-gray-500 block md:table-cell">
                  {searchQuery
                    ? "لا يوجد عملاء مطابقين لبحثك"
                    : "لا يوجد عملاء مسجلين بعد"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium text-lg">
                {selectedCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                  setSelectedCustomer(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="p-4 space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="arab-form-group">
                    <label htmlFor="name" className="arab-label">
                      الاسم <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
                      required
                    />
                  </div>

                  <div className="arab-form-group">
                    <label htmlFor="company" className="arab-label">
                      الشركة
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="arab-form-group">
                    <label htmlFor="phone" className="arab-label">
                      رقم الهاتف
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
                      dir="ltr"
                    />
                  </div>

                  <div className="arab-form-group">
                    <label htmlFor="email" className="arab-label">
                      البريد الإلكتروني
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="arab-form-group">
                  <label htmlFor="address" className="arab-label">
                    العنوان
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
                  />
                </div>

                <div className="arab-form-group">
                  <label htmlFor="notes" className="arab-label">
                    ملاحظات
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-arab-blue"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                    setSelectedCustomer(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-arab-blue text-white px-4 py-2 rounded-md hover:bg-arab-blue-dark transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>حفظ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="font-medium text-lg">تأكيد الحذف</h3>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <AlertCircle size={24} />
                <p>هل أنت متأكد من حذف هذا العميل؟</p>
              </div>

              <p className="mb-2">
                <strong>الاسم:</strong> {selectedCustomer.name}
              </p>
              {selectedCustomer.company && (
                <p className="mb-2">
                  <strong>الشركة:</strong> {selectedCustomer.company}
                </p>
              )}
              {selectedCustomer.phone && (
                <p>
                  <strong>رقم الهاتف:</strong> {selectedCustomer.phone}
                </p>
              )}

              <p className="mt-4 text-red-600 text-sm">
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedCustomer(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>حذف العميل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
