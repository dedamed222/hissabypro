
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="account">الحساب</TabsTrigger>
          <TabsTrigger value="company">الشركة</TabsTrigger>
          <TabsTrigger value="currencies">العملات</TabsTrigger>
          <TabsTrigger value="payments">طرق الدفع</TabsTrigger>
          <TabsTrigger value="backup">النسخ الاحتياطية</TabsTrigger>
          <TabsTrigger value="cloud">السحابة</TabsTrigger>
        </TabsList>

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

