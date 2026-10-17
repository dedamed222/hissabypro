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
import { useLocale } from "@/hooks/useLocale";

export default function WarehouseManager() {
  const { locale, isRTL } = useLocale();
  const isFr = locale === 'fr';

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
    const confirmMsg = isFr
      ? `Êtes-vous sûr de vouloir supprimer le dépôt "${warehouse.name}" ?`
      : `هل أنت متأكد من حذف المخزن "${warehouse.name}"؟`;
    if (confirm(confirmMsg)) {
      deleteWarehouse(warehouse.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-blue-600" />
            <span>{isFr ? "Gestion des Dépôts / Magasins" : "إدارة المخازن"}</span>
          </CardTitle>
          <Button onClick={handleAdd} className="gap-2 font-bold cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>{isFr ? "Ajouter un dépôt" : "إضافة مخزن"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {warehouses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {isFr
                ? "Aucun dépôt enregistré. Veuillez ajouter un nouveau dépôt."
                : "لا توجد مخازن. قم بإضافة مخزن جديد."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`border rounded-xl p-4 transition-all shadow-xs ${
                    warehouse.isActive ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900">{warehouse.name}</h3>
                      {warehouse.location && (
                        <p className="text-sm text-slate-600 mt-0.5">{warehouse.location}</p>
                      )}
                      {warehouse.description && (
                        <p className="text-xs text-slate-500 mt-1">{warehouse.description}</p>
                      )}
                    </div>
                    <div
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        warehouse.isActive
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {warehouse.isActive
                        ? (isFr ? "Actif" : "نشط")
                        : (isFr ? "Inactif" : "غير نشط")}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(warehouse)}
                      className="flex-1 gap-1 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{isFr ? "Modifier" : "تعديل"}</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(warehouse)}
                      className="cursor-pointer"
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
        <DialogContent style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          <DialogHeader>
            <DialogTitle>
              {selectedWarehouse
                ? (isFr ? "Modifier le dépôt" : "تعديل المخزن")
                : (isFr ? "Ajouter un nouveau dépôt" : "إضافة مخزن جديد")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{isFr ? "Nom du dépôt *" : "اسم المخزن *"}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isFr ? "Ex: Dépôt Central, Magasin 1..." : "أدخل اسم المخزن"}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location">{isFr ? "Emplacement / Adresse" : "الموقع"}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={isFr ? "Ex: Zone Industrielle, Alger..." : "أدخل موقع المخزن"}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">{isFr ? "Description / Notes" : "الوصف"}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={isFr ? "Détails supplémentaires..." : "أدخل وصف المخزن"}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="isActive" className="cursor-pointer">
                {isFr ? "Dépôt actif" : "المخزن نشط"}
              </Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
              className="cursor-pointer"
            >
              {isFr ? "Annuler" : "إلغاء"}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()} className="cursor-pointer">
              {selectedWarehouse
                ? (isFr ? "Mettre à jour" : "تحديث")
                : (isFr ? "Ajouter" : "إضافة")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
