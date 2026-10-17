import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Package, Save } from "lucide-react";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { Product } from "@/types";
import { useLocale } from "@/hooks/useLocale";

interface NewProductFormProps {
  onProductAdded: (product: Product) => void;
}

const NewProductForm = ({ onProductAdded }: NewProductFormProps) => {
  const { locale } = useLocale();
  const isFr = locale === 'fr';

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    price: "",
    cost: "",
    quantity: "",
    lowStockThreshold: "5",
    category: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.price || !formData.cost) {
      setError(isFr ? "Veuillez remplir tous les champs obligatoires" : "يرجى إدخال جميع البيانات المطلوبة");
      return;
    }

    const price = Number(formData.price);
    const cost = Number(formData.cost);
    const quantity = Number(formData.quantity) || 0;
    const lowStockThreshold = Number(formData.lowStockThreshold) || 5;

    if (isNaN(price) || price <= 0) {
      setError(isFr ? "Veuillez entrer un prix valide" : "يرجى إدخال سعر صحيح");
      return;
    }

    if (isNaN(cost) || cost < 0) {
      setError(isFr ? "Veuillez entrer un coût valide" : "يرجى إدخال تكلفة صحيحة");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const storeData = loadStoreData();
      
      // Check if product code already exists
      const existingProduct = storeData.products.find(p => p.code === formData.code.trim());
      if (existingProduct) {
        setError(isFr ? "Le code produit existe déjà" : "رمز المنتج موجود مسبقاً");
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const newProduct: Product = {
        id: generateId(),
        code: formData.code.trim(),
        name: formData.name.trim(),
        price: price,
        cost: cost,
        quantity: quantity,
        lowStockThreshold: lowStockThreshold,
        category: formData.category.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        sold: 0
      };

      storeData.products = [...(storeData.products || []), newProduct];
      saveStoreData(storeData);
      
      onProductAdded(newProduct);
      
      // Reset form
      setFormData({
        code: "",
        name: "",
        price: "",
        cost: "",
        quantity: "",
        lowStockThreshold: "5",
        category: ""
      });
      setShowForm(false);
    } catch (err) {
      console.error("Error adding product:", err);
      setError(isFr ? "Une erreur est survenue lors de l'ajout du produit" : "حدث خطأ أثناء إضافة المنتج");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      code: "",
      name: "",
      price: "",
      cost: "",
      quantity: "",
      lowStockThreshold: "5",
      category: ""
    });
    setError("");
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        variant="outline"
        className="flex items-center gap-2 text-green-600 border-green-600 hover:bg-green-50"
      >
        <Plus className="w-4 h-4" />
        {isFr ? "Ajouter un nouveau produit" : "إضافة منتج جديد"}
      </Button>
    );
  }

  return (
    <Card className="shadow-lg border-green-200">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Package className="w-5 h-5" />
          {isFr ? "Ajouter un nouveau produit" : "إضافة منتج جديد"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-medium text-sm">
                {isFr ? "Code produit *" : "رمز المنتج *"}
              </label>
              <Input
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                placeholder={isFr ? "Entrez le code produit" : "أدخل رمز المنتج"}
                className="focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-sm">
                {isFr ? "Nom du produit *" : "اسم المنتج *"}
              </label>
              <Input
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder={isFr ? "Entrez le nom du produit" : "أدخل اسم المنتج"}
                className="focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-sm">
                {isFr ? "Prix de vente *" : "سعر البيع *"}
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                className="focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-sm">
                {isFr ? "Coût d'achat *" : "تكلفة الشراء *"}
              </label>
              <Input
                type="number"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: e.target.value})}
                placeholder="0.00"
                className="focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-sm">
                {isFr ? "Quantité initiale" : "الكمية الأولية"}
              </label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
                placeholder="0"
                className="focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-sm">
                {isFr ? "Seuil de stock bas" : "حد المخزون المنخفض"}
              </label>
              <Input
                type="number"
                value={formData.lowStockThreshold}
                onChange={e => setFormData({...formData, lowStockThreshold: e.target.value})}
                placeholder="5"
                className="focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block mb-2 font-medium text-sm">
              {isFr ? "Catégorie" : "الفئة"}
            </label>
            <Input
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              placeholder={isFr ? "Catégorie du produit (optionnel)" : "فئة المنتج (اختياري)"}
              className="focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="mr-2" size={18} />
              {loading ? (isFr ? "Enregistrement..." : "جاري الحفظ...") : (isFr ? "Enregistrer le produit" : "حفظ المنتج")}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={loading}
            >
              {isFr ? "Annuler" : "إلغاء"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewProductForm;
