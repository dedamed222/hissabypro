import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { Warehouse } from "@/types";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Switch } from "@/components/ui/switch";

export default function WarehouseManager() {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      description: "",
      isActive: true,
    });
    setSelectedWarehouse(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location || "",
      description: warehouse.description || "",
      isActive: warehouse.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (selectedWarehouse) {
      updateWarehouse(selectedWarehouse.id, formData);
      setIsEditModalOpen(false);
    } else {
      addWarehouse(formData);
      setIsAddModalOpen(false);
    }
    resetForm();
  };

  const handleDelete = (warehouse: Warehouse) => {
    if (confirm(`هل أنت متأكد من حذف المخزن "${warehouse.name}"؟`)) {
      deleteWarehouse(warehouse.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5" />
            إدارة المخازن
          </CardTitle>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            إضافة مخزن
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {warehouses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد مخازن. قم بإضافة مخزن جديد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`border rounded-lg p-4 ${
                    warehouse.isActive ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                      {warehouse.location && (
                        <p className="text-sm text-gray-600">{warehouse.location}</p>
                      )}
                      {warehouse.description && (
                        <p className="text-sm text-gray-500 mt-1">{warehouse.description}</p>
                      )}
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs ${
                        warehouse.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {warehouse.isActive ? "نشط" : "غير نشط"}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(warehouse)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(warehouse)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Add/Edit Modal */}
      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedWarehouse ? "تعديل المخزن" : "إضافة مخزن جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">اسم المخزن *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المخزن"
              />
            </div>
            <div>
              <Label htmlFor="location">الموقع</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="أدخل موقع المخزن"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="أدخل وصف المخزن"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">المخزن نشط</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {selectedWarehouse ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
