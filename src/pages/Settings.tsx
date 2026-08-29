
import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { CurrencyForm } from "@/components/settings/CurrencyForm";
import { PaymentMethodForm } from "@/components/settings/PaymentMethodForm";
import { BackupManager } from "@/components/settings/BackupManager";
import { CloudMigration } from "@/components/settings/CloudMigration";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { CompanyProfile } from "@/components/settings/CompanyProfile";

export default function Settings() {
  const { currency, locale, updateSettings } = useSettings();
  const { changeLocale } = useLocale();
  const t = translations[locale as keyof typeof translations];
  const [newCurrency, setNewCurrency] = useState("");
  const [newLocale, setNewLocale] = useState("");

  useEffect(() => {
    setNewCurrency(currency);
    setNewLocale(locale);
  }, [currency, locale]);

  const handleSaveSettings = () => {
    updateSettings({
      currency: newCurrency,
      locale: newLocale as "ar" | "fr",
    });
    changeLocale(newLocale as "ar" | "fr");
    toast({
      title: t.settingsSaved || "تم تحديث الإعدادات",
      description: "تم حفظ الإعدادات بنجاح.",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t.settings}</h1>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
          <TabsList className="flex w-max min-w-full md:grid md:grid-cols-7 h-auto p-1">
            <TabsTrigger value="general" className="px-4 py-2">الإعدادات العامة</TabsTrigger>
            <TabsTrigger value="account" className="px-4 py-2">الحساب</TabsTrigger>
            <TabsTrigger value="company" className="px-4 py-2">الشركة</TabsTrigger>
            <TabsTrigger value="currencies" className="px-4 py-2">العملات</TabsTrigger>
            <TabsTrigger value="payments" className="px-4 py-2">طرق الدفع</TabsTrigger>
            <TabsTrigger value="backup" className="px-4 py-2">النسخ الاحتياطية</TabsTrigger>
            <TabsTrigger value="cloud" className="px-4 py-2">السحابة</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">{t.currency}</Label>
                <Input
                  id="currency"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="locale">{t.language}</Label>
                <Select value={newLocale} onValueChange={(value) => setNewLocale(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اللغة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">الفرنسية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveSettings}>حفظ الإعدادات</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="company">
          <CompanyProfile />
        </TabsContent>

        <TabsContent value="currencies">
          <Card>
            <CardHeader>
              <CardTitle>العملات</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencyForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>طرق الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <BackupManager />
        </TabsContent>

        <TabsContent value="cloud">
          <CloudMigration />
        </TabsContent>
      </Tabs>
    </div>
  );
}

