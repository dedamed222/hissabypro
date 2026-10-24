import { useSettings } from "@/contexts/SettingsContext";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  BellOff,
  PanelBottom,
  PanelLeft,
  Settings2,
  User,
  Building2,
  Printer,
  Coins,
  CreditCard,
  HardDrive,
  Cloud,
  Check,
  Globe2,
  Sparkles,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { currency, locale, navPosition = "bottom", updateSettings } = useSettings();
  const { changeLocale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const t = translations[locale as keyof typeof translations];

  const [newCurrency, setNewCurrency] = useState("");
  const [newLocale, setNewLocale] = useState("");
  const [newNavPosition, setNewNavPosition] = useState<"bottom" | "sidebar">("bottom");
  const { subscribe, unsubscribe, getPermissionState, isSupported } = usePushNotifications();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewCurrency(currency || "DZD");
    setNewLocale(locale);
    setNewNavPosition(navPosition || "bottom");
    getPermissionState().then(setNotifPermission);
  }, [currency, locale, navPosition]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    updateSettings({
      currency: newCurrency,
      locale: newLocale as "ar" | "fr",
      navPosition: newNavPosition,
    });
    changeLocale(newLocale as "ar" | "fr");

    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: isFr ? "Paramètres enregistrés" : (t.settingsSaved || "تم حفظ الإعدادات"),
        description: isFr
          ? "Toutes les modifications ont été appliquées avec succès."
          : "تم تطبيق جميع التغييرات بنجاح.",
      });
    }, 250);
  };

  const navTabs = [
    {
      id: "general",
      label: isFr ? "Général" : "الإعدادات العامة",
      description: isFr ? "Langue, devise et affichage" : "اللغة والعملة وشكل العرض",
      icon: Settings2,
    },
    {
      id: "account",
      label: isFr ? "Compte" : "الحساب",
      description: isFr ? "Identifiants et sécurité" : "اسم المستخدم وكلمة المرور",
      icon: User,
    },
    {
      id: "company",
      label: isFr ? "Entreprise" : "هوية المحل",
      description: isFr ? "Nom commercial et logo" : "اسم المتجر والشعار",
      icon: Building2,
    },
    {
      id: "print",
      label: isFr ? "Impression" : "الطباعة والورق",
      description: isFr ? "En-tête et formats" : "مقاسات الفواتير والهوامش",
      icon: Printer,
    },
    {
      id: "currencies",
      label: isFr ? "Devises" : "العملات",
      description: isFr ? "Multi-devises personnalisées" : "إدارة العملات المخصصة",
      icon: Coins,
    },
    {
      id: "payments",
      label: isFr ? "Moyens de paiement" : "طرق الدفع",
      description: isFr ? "Modes de règlement" : "خيارات الدفع والتحويل",
      icon: CreditCard,
    },
    {
      id: "backup",
      label: isFr ? "Sauvegardes" : "النسخ الاحتياطي",
      description: isFr ? "Export et restauration" : "تصدير واستيراد البيانات",
      icon: HardDrive,
    },
    {
      id: "cloud",
      label: isFr ? "Cloud & Sync" : "السحابة والمزامنة",
      description: isFr ? "Synchronisation Supabase" : "ترحيل البيانات وقاعدة السحاب",
      icon: Cloud,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl space-y-6">
      {/* ── Page Hero Header ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-medium text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isFr ? "Panneau de configuration Pro" : "لوحة التخصيص والإعدادات الاحترافية"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Settings2 className="w-7 h-7 text-indigo-400" />
              <span>{t.settings}</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isFr
                ? "Personnalisez votre système de gestion : modifiez la langue, adaptez l'impression de vos factures, configurez les devises et sauvegardez vos données en toute sécurité."
                : "قم بتهيئة النظام وفق احتياجاتك: تخصيص اللغة والعملة، إعدادات الطباعة وهوية الفواتير، طرق الدفع المخصصة، والنسخ الاحتياطي التلقائي والمزامنة السحابية."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
            <Globe2 className="w-4 h-4 text-indigo-400" />
            <div className="text-xs">
              <div className="text-slate-400">{isFr ? "Langue active" : "اللغة الحالية"}</div>
              <div className="font-bold text-white uppercase">{isFr ? "Français 🇫🇷" : "العربية 🇲🇷"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Settings Tabs ──────────────────────────────────────────── */}
      <Tabs defaultValue="general" className="space-y-6">
        {/* Navigation Bar / Tabs List */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          <TabsList className="flex w-max min-w-full md:grid md:grid-cols-4 lg:grid-cols-8 h-auto p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80 gap-1.5 shadow-sm">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl font-medium text-xs md:text-xs whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:font-bold text-slate-600 hover:text-slate-900"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* ── Tab 1: General Settings ────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Main Preferences */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Language & Currency */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <Globe2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800">
                        {isFr ? "Langue & Devise Principale" : "اللغة والعملة الأساسية"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isFr
                          ? "Choisissez la langue de l'interface et la devise par défaut de vos ventes."
                          : "اختر لغة عرض الواجهة والعملة الافتراضية للمعاملات والفواتير."}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Language Selector Cards */}
                  <div>
                    <Label className="text-xs font-bold text-slate-700 block mb-2.5">
                      {t.language}
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewLocale("ar")}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-xl border-2 text-start transition-all cursor-pointer",
                          newLocale === "ar"
                            ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🇲🇷</span>
                          <div>
                            <div className="font-bold text-sm text-slate-900">العربية</div>
                            <div className="text-xs text-slate-500">الاتجاه من اليمين لليسار (RTL)</div>
                          </div>
                        </div>
                        {newLocale === "ar" && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewLocale("fr")}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-xl border-2 text-start transition-all cursor-pointer",
                          newLocale === "fr"
                            ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🇫🇷</span>
                          <div>
                            <div className="font-bold text-sm text-slate-900">Français</div>
                            <div className="text-xs text-slate-500">Direction de gauche à droite (LTR)</div>
                          </div>
                        </div>
                        {newLocale === "fr" && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Currency Input */}
                  <div>
                    <Label htmlFor="currency" className="text-xs font-bold text-slate-700 block mb-1.5">
                      {t.currency}
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input
                          id="currency"
                          value={newCurrency}
                          onChange={(e) => setNewCurrency(e.target.value)}
                          placeholder="DZD, MRU, EUR, USD..."
                          className="font-bold text-slate-800"
                        />
                      </div>
                      <div className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 shrink-0">
                        {isFr ? "Exemple :" : "معاينة :"} 1 250,00 {newCurrency || "DZD"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Navigation Position */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <PanelBottom className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800">
                        {t.navPosition}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t.navPositionDesc}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bottom Nav Option */}
                    <button
                      type="button"
                      onClick={() => setNewNavPosition("bottom")}
                      className={cn(
                        "flex flex-col p-4 rounded-xl border-2 text-start transition-all cursor-pointer group relative",
                        newNavPosition === "bottom"
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            newNavPosition === "bottom"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:text-slate-800"
                          )}
                        >
                          <PanelBottom className="w-5 h-5" />
                        </div>
                        {newNavPosition === "bottom" && (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {isFr ? "Actif" : "مفعّل"}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-slate-900">{t.navPositionBottom}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-normal">
                        {t.navPositionBottomDesc}
                      </div>

                      {/* Mockup Graphic */}
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-col gap-1.5 opacity-80">
                        <div className="h-2 w-full bg-slate-200 rounded" />
                        <div className="h-6 w-full bg-slate-100 rounded border border-slate-200 flex items-center justify-around px-2">
                          <div className="h-1.5 w-6 bg-slate-300 rounded" />
                          <div className="h-1.5 w-6 bg-slate-300 rounded" />
                          <div className="h-1.5 w-6 bg-slate-300 rounded" />
                        </div>
                        <div className="h-3 w-full bg-indigo-500/40 rounded flex items-center justify-center">
                          <div className="h-1 w-12 bg-indigo-600 rounded" />
                        </div>
                      </div>
                    </button>

                    {/* Sidebar Nav Option */}
                    <button
                      type="button"
                      onClick={() => setNewNavPosition("sidebar")}
                      className={cn(
                        "flex flex-col p-4 rounded-xl border-2 text-start transition-all cursor-pointer group relative",
                        newNavPosition === "sidebar"
                          ? "border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            newNavPosition === "sidebar"
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:text-slate-800"
                          )}
                        >
                          <PanelLeft className="w-5 h-5" />
                        </div>
                        {newNavPosition === "sidebar" && (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            {isFr ? "Actif" : "مفعّل"}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-slate-900">{t.navPositionSidebar}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-normal">
                        {t.navPositionSidebarDesc}
                      </div>

                      {/* Mockup Graphic */}
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex gap-1.5 opacity-80 h-[48px]">
                        <div className="w-8 h-full bg-indigo-500/40 rounded flex flex-col items-center justify-center gap-1">
                          <div className="h-1 w-4 bg-indigo-600 rounded" />
                          <div className="h-1 w-4 bg-indigo-600 rounded" />
                        </div>
                        <div className="flex-1 h-full bg-slate-100 rounded border border-slate-200 p-1 flex flex-col gap-1">
                          <div className="h-2 w-full bg-slate-200 rounded" />
                          <div className="h-2 w-2/3 bg-slate-200 rounded" />
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 1 Col: Push Notifications & Save Card */}
            <div className="space-y-6">
              {/* Push Notifications Card */}
              {isSupported() && (
                <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-slate-800">
                            {isFr ? "Notifications Mobiles" : "إشعارات الهاتف"}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {isFr ? "Alertes en direct" : "تنبيهات فورية للمبيعات والمخزون"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {isFr
                        ? "Recevez des notifications instantanées pour chaque facture enregistrée, échéance de dette ou rupture de stock, même lorsque l'application est fermée."
                        : "استلم إشعارات سريعة عند حدوث عمليات بيع، استحقاق ديون العملاء، أو وصول كميات المخزون للحد الأدنى."}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {isFr ? "Statut :" : "حالة التفعيل :"}
                      </span>
                      {notifPermission === "granted" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3" />
                          {isFr ? "Activées" : "مفعلة"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-200/60 px-2.5 py-0.5 rounded-full">
                          {isFr ? "Non activées" : "معطلة"}
                        </span>
                      )}
                    </div>

                    {notifPermission === "granted" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-slate-700 hover:text-rose-600 hover:bg-rose-50 border-slate-200 cursor-pointer text-xs"
                        onClick={async () => {
                          await unsubscribe();
                          setNotifPermission("default");
                          toast({
                            title: isFr ? "Notifications désactivées" : "تم إلغاء الإشعارات",
                            description: isFr
                              ? "Vous ne recevrez plus de notifications push."
                              : "تم إيقاف استلام إشعارات الهاتف.",
                          });
                        }}
                      >
                        <BellOff className={`w-3.5 h-3.5 ${isRTL ? "ml-1.5" : "mr-1.5"}`} />
                        {isFr ? "Désactiver les alertes" : "إلغاء التفعيل"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer text-xs shadow-sm"
                        onClick={async () => {
                          const success = await subscribe();
                          if (success) {
                            setNotifPermission("granted");
                            toast({
                              title: isFr ? "Notifications activées !" : "تم تفعيل الإشعارات بنجاح!",
                              description: isFr
                                ? "Vous recevrez désormais des alertes pour chaque vente et mouvement."
                                : "ستصلك الآن تنبيهات لكل عملية بيع ونقص في المخزون.",
                            });
                          } else {
                            toast({
                              title: isFr
                                ? "Échec de l'activation des notifications"
                                : "تعذر تفعيل الإشعارات",
                              description: isFr
                                ? "Veuillez autoriser les notifications dans les paramètres de votre navigateur."
                                : "يرجى منح الإذن للإشعارات في إعدادات متصفحك.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Bell className={`w-3.5 h-3.5 ${isRTL ? "ml-1.5" : "mr-1.5"}`} />
                        {isFr ? "Activer les notifications" : "تفعيل إشعارات الهاتف"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}


              {/* Action Save Card */}
              <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-white shadow-sm overflow-hidden">
                <CardContent className="p-5 space-y-3">
                  <div className="font-bold text-sm text-slate-900">
                    {isFr ? "Enregistrement des réglages" : "تطبيق وحفظ التعديلات"}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isFr
                      ? "N'oubliez pas d'enregistrer vos modifications pour mettre à jour la langue et la barre de menu."
                      : "انقر على زر الحفظ بالأسفل لتثبيت تفضيلات اللغة والعملة وشريط القائمة."}
                  </p>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-md py-5"
                  >
                    <Save className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"} ${isSaving ? "animate-spin" : ""}`} />
                    {isSaving
                      ? (isFr ? "Enregistrement en cours..." : "جارٍ الحفظ...")
                      : (isFr ? "Enregistrer les paramètres" : "حفظ الإعدادات")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Account Settings ────────────────────────────────────── */}
        <TabsContent value="account" className="focus-visible:outline-none">
          <AccountSettings />
        </TabsContent>

        {/* ── Tab 3: Company Profile ─────────────────────────────────────── */}
        <TabsContent value="company" className="focus-visible:outline-none">
          <CompanyProfile />
        </TabsContent>

        {/* ── Tab 4: Print Settings ──────────────────────────────────────── */}
        <TabsContent value="print" className="focus-visible:outline-none">
          <PrintSettings />
        </TabsContent>

        {/* ── Tab 5: Currencies ─────────────────────────────────────────── */}
        <TabsContent value="currencies" className="focus-visible:outline-none">
          <Card className="border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">
                    {isFr ? "Gestion des Devises Multiples" : "إدارة العملات المتعددة"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isFr
                      ? "Ajoutez ou supprimez des devises personnalisées utilisables lors de la création de factures."
                      : "قم بإضافة عملات جديدة لتمكين الفواتير من التعامل بمختلف العملات."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <CurrencyForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 6: Payment Methods ────────────────────────────────────── */}
        <TabsContent value="payments" className="focus-visible:outline-none">
          <Card className="border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">
                    {isFr ? "Moyens de Paiement" : "طرق ووسائل الدفع"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isFr
                      ? "Personnalisez vos options de règlement : espèces, virements bancaires, Bankily, Masrvi, etc."
                      : "حدد وسائل الدفع المقبولة في فواتيرك مثل الدفع النقدي، التحويلات، وتطبيقات الهاتف."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <PaymentMethodForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 7: Backup Manager ──────────────────────────────────────── */}
        <TabsContent value="backup" className="focus-visible:outline-none">
          <BackupManager />
        </TabsContent>

        {/* ── Tab 8: Cloud Migration & Sync ──────────────────────────────── */}
        <TabsContent value="cloud" className="focus-visible:outline-none">
          <CloudMigration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
