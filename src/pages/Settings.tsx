
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
import { PrintSettings } from "@/components/settings/PrintSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff, PanelBottom, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { currency, locale, navPosition = "bottom", updateSettings } = useSettings();
  const { changeLocale } = useLocale();
  const isFr = locale === "fr";
  const t = translations[locale as keyof typeof translations];
  const [newCurrency, setNewCurrency] = useState("");
  const [newLocale, setNewLocale] = useState("");
  const [newNavPosition, setNewNavPosition] = useState<"bottom" | "sidebar">("bottom");
  const { subscribe, unsubscribe, getPermissionState, isSupported } = usePushNotifications();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setNewCurrency(currency);
    setNewLocale(locale);
    setNewNavPosition(navPosition || "bottom");
    getPermissionState().then(setNotifPermission);
  }, [currency, locale, navPosition]);

  const handleSaveSettings = () => {
    updateSettings({
      currency: newCurrency,
      locale: newLocale as "ar" | "fr",
      navPosition: newNavPosition,
    });
    changeLocale(newLocale as "ar" | "fr");
    toast({
      title: isFr ? "Paramètres mis à jour" : (t.settingsSaved || "تم تحديث الإعدادات"),
      description: isFr ? "Les paramètres ont été enregistrés avec succès." : "تم حفظ الإعدادات بنجاح.",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t.settings}</h1>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
          <TabsList className="flex w-max min-w-full md:grid md:grid-cols-7 h-auto p-1">
            <TabsTrigger value="general" className="px-4 py-2">{isFr ? "Général" : "الإعدادات العامة"}</TabsTrigger>
            <TabsTrigger value="account" className="px-4 py-2">{isFr ? "Compte" : "الحساب"}</TabsTrigger>
            <TabsTrigger value="company" className="px-4 py-2">{isFr ? "Entreprise" : "الشركة"}</TabsTrigger>
            <TabsTrigger value="print" className="px-4 py-2">{isFr ? "Impression" : "الطباعة"}</TabsTrigger>
            <TabsTrigger value="currencies" className="px-4 py-2">{isFr ? "Devises" : "العملات"}</TabsTrigger>
            <TabsTrigger value="payments" className="px-4 py-2">{isFr ? "Moyens de paiement" : "طرق الدفع"}</TabsTrigger>
            <TabsTrigger value="backup" className="px-4 py-2">{isFr ? "Sauvegardes" : "النسخ الاحتياطية"}</TabsTrigger>
            <TabsTrigger value="cloud" className="px-4 py-2">{isFr ? "Cloud" : "السحابة"}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{isFr ? "Paramètres généraux" : "الإعدادات العامة"}</CardTitle>
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
                    <SelectValue placeholder={isFr ? "Sélectionner la langue" : "اختر اللغة"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{isFr ? "Arabe (العربية)" : "العربية"}</SelectItem>
                    <SelectItem value="fr">{isFr ? "Français (الفرنسية)" : "الفرنسية"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t.navPosition}</Label>
                <p className="text-xs text-gray-500">{t.navPositionDesc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewNavPosition("bottom")}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border-2 text-start transition-all",
                      newNavPosition === "bottom"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg flex-shrink-0", newNavPosition === "bottom" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500")}>
                      <PanelBottom className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{t.navPositionBottom}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.navPositionBottomDesc}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewNavPosition("sidebar")}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border-2 text-start transition-all",
                      newNavPosition === "sidebar"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg flex-shrink-0", newNavPosition === "sidebar" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500")}>
                      <PanelLeft className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{t.navPositionSidebar}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.navPositionSidebarDesc}</div>
                    </div>
                  </button>
                </div>
              </div>

              <Button onClick={handleSaveSettings}>{isFr ? "Enregistrer les paramètres" : "حفظ الإعدادات"}</Button>

              {/* Push Notifications Toggle */}
              {isSupported() && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="block mb-2">{isFr ? "Notifications mobiles 🔔" : "إشعارات الهاتف 🔔"}</Label>
                  {notifPermission === 'granted' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-green-600 font-medium">
                        {isFr ? "✅ Notifications activées" : "✅ الإشعارات مفعّلة"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await unsubscribe();
                          setNotifPermission('default');
                          toast({ title: isFr ? "Notifications désactivées" : "تم إلغاء الإشعارات" });
                        }}
                      >
                        <BellOff className="w-4 h-4 mr-2" />
                        {isFr ? "Désactiver les notifications" : "إلغاء الإشعارات"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={async () => {
                        const success = await subscribe();
                        if (success) {
                          setNotifPermission('granted');
                          toast({ 
                            title: isFr ? "Notifications activées !" : "تم تفعيل الإشعارات!", 
                            description: isFr ? "Vous recevrez des notifications pour chaque vente, dette ou rupture de stock." : "ستصلك إشعارات لكل عملية بيع أو دين أو نقص في المخزون." 
                          });
                        } else {
                          toast({ 
                            title: isFr ? "Échec de l'activation des notifications" : "لم يتم تفعيل الإشعارات", 
                            description: isFr ? "Veuillez autoriser les notifications dans les paramètres de votre navigateur." : "يرجى السماح بالإشعارات من إعدادات المتصفح.", 
                            variant: "destructive" 
                          });
                        }
                      }}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      {isFr ? "Activer les notifications mobiles" : "تفعيل إشعارات الهاتف"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="company">
          <CompanyProfile />
        </TabsContent>

        <TabsContent value="print">
          <PrintSettings />
        </TabsContent>

        <TabsContent value="currencies">
          <Card>
            <CardHeader>
              <CardTitle>{isFr ? "Devises" : "العملات"}</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrencyForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>{isFr ? "Moyens de paiement" : "طرق الدفع"}</CardTitle>
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

