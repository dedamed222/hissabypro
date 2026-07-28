
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, X, Check, Plus } from "lucide-react";
import { PaymentMethod } from "@/types";

export const PaymentMethodForm = () => {
  const { customPaymentMethods, addCustomPaymentMethod, removeCustomPaymentMethod, updateCustomPaymentMethod } = useSettings();
  const { locale } = useLocale();
  const t = translations[locale];
  
  const [newMethod, setNewMethod] = useState({
    id: "",
    name: ""
  });
  
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editValues, setEditValues] = useState({ id: "", name: "" });
  
  const handleAddMethod = () => {
    if (!newMethod.id.trim() || !newMethod.name.trim()) {
      toast({ 
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }
    
    addCustomPaymentMethod({
      id: newMethod.id.toUpperCase(),
      name: newMethod.name
    });
    
    setNewMethod({ id: "", name: "" });
    
    toast({
      title: "تم إضافة طريقة الدفع بنجاح",
    });
  };
  
  const handleRemoveMethod = (id: string) => {
    removeCustomPaymentMethod(id);
    toast({
      title: "تم حذف طريقة الدفع",
    });
  };
  
  const startEditing = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditValues({
      id: method.id,
      name: method.name
    });
  };
  
  const cancelEditing = () => {
    setEditingMethod(null);
  };
  
  const saveEditing = () => {
    if (!editValues.id.trim() || !editValues.name.trim()) {
      toast({ 
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }
    
    if (editingMethod) {
      updateCustomPaymentMethod(editingMethod.id, {
        id: editValues.id.toUpperCase(),
        name: editValues.name
      });
      
      setEditingMethod(null);
      
      toast({
        title: "تم تحديث طريقة الدفع بنجاح",
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">طرق الدفع المخصصة</h3>
      
      <div className="grid grid-cols-1 gap-4">
        {customPaymentMethods.map((method) => (
          <div key={method.id} className="flex items-center justify-between p-3 border rounded-md">
            {editingMethod && editingMethod.id === method.id ? (
              <div className="flex flex-1 space-x-2 rtl:space-x-reverse">
                <div className="w-1/3">
                  <Input 
                    value={editValues.id} 
                    onChange={(e) => setEditValues({ ...editValues, id: e.target.value })}
                    placeholder="VISA, MASTERCARD, etc."
                    className="uppercase"
                  />
                </div>
                <div className="w-2/3">
                  <Input 
                    value={editValues.name} 
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    placeholder="اسم طريقة الدفع"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={saveEditing}
                  className="text-green-500 hover:text-green-700"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={cancelEditing}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-gray-500">{method.id}</div>
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => startEditing(method)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveMethod(method.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        
        {customPaymentMethods.length === 0 && (
          <div className="text-center py-4 text-gray-500 italic">
            لا توجد طرق دفع مخصصة
          </div>
        )}
      </div>
      
      <div className="p-4 border rounded-md mt-4 bg-muted/20">
        <h4 className="font-medium mb-2">إضافة طريقة دفع جديدة</h4>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>معرف طريقة الدفع</Label>
              <Input 
                value={newMethod.id} 
                onChange={(e) => setNewMethod({ ...newMethod, id: e.target.value })} 
                placeholder="VISA, MASTERCARD, etc." 
                className="uppercase"
              />
            </div>
            <div>
              <Label>اسم طريقة الدفع</Label>
              <Input 
                value={newMethod.name} 
                onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })} 
                placeholder="اسم طريقة الدفع"
              />
            </div>
          </div>
          <Button onClick={handleAddMethod} className="w-full flex items-center justify-center gap-1">
            <Plus className="h-4 w-4" />
            إضافة طريقة الدفع
          </Button>
        </div>
      </div>
    </div>
  );
};
