
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Store, Upload } from "lucide-react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { useToast } from "@/components/ui/use-toast";
import { StoreInfo } from "@/types";

const Index = () => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: "",
    phone: "",
    email: "",
    photoUrl: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const data = loadStoreData();
    if (data.storeInfo) {
      setStoreInfo(data.storeInfo);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setStoreInfo(prev => ({ ...prev, photoUrl: base64String }));
        
        // Save to localStorage
        const data = loadStoreData();
        data.storeInfo = { ...storeInfo, photoUrl: base64String };
        saveStoreData(data);
        
        toast({
          title: "تم رفع الصورة بنجاح",
          description: "تم حفظ صورة المتجر",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadStoreData();
    data.storeInfo = storeInfo;
    saveStoreData(data);
    
    toast({
      title: "تم حفظ المعلومات",
      description: "تم تحديث معلومات المتجر بنجاح",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            معلومات المتجر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                {storeInfo.photoUrl ? (
                  <div className="relative w-48 h-48">
                    <img
                      src={storeInfo.photoUrl}
                      alt="Store"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => document.getElementById("photo-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      تغيير الصورة
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-48 h-48 border-dashed"
                      onClick={() => document.getElementById("photo-upload")?.click()}
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 mb-2" />
                        <span>اضغط لرفع صورة المتجر</span>
                      </div>
                    </Button>
                  </div>
                )}
                <input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  title="تحميل صورة المتجر"
                  aria-label="تحميل صورة المتجر"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Store className="w-5 h-5" />
                <Input
                  placeholder="اسم المتجر"
                  value={storeInfo.name}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Phone className="w-5 h-5" />
                <Input
                  placeholder="رقم الهاتف"
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="flex-1"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Mail className="w-5 h-5 text-gray-500" />
                <Input
                  placeholder="البريد الإلكتروني"
                  value={storeInfo.email}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="flex-1"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Store className="w-5 h-5 text-gray-500" />
                <Input
                  placeholder="العنوان الكامل"
                  value={storeInfo.address || ""}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, address: e.target.value }))}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Store className="w-5 h-5 text-gray-500" />
                <Input
                  placeholder="رقم السجل التجاري (اختياري)"
                  value={storeInfo.commercialRegister || ""}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, commercialRegister: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              حفظ المعلومات
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
