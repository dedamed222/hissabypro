import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  FileText,
  Clock,
  Globe,
  Lock,
  CheckCircle2,
  ChevronRight,
  Layers,
  Archive,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { loadStoreData } from "@/utils/localStorage";
import { useLocale } from "@/hooks/useLocale";

export default function Home() {
  const navigate = useNavigate();
  const { locale, changeLocale, isRTL } = useLocale();
  const isFr = locale === "fr";

  const [storeInfo, setStoreInfo] = useState({ name: "", photoUrl: "", phone: "" });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Load store information
    const data = loadStoreData();
    if (data && data.storeInfo) {
      setStoreInfo({
        name: data.storeInfo.name || "",
        photoUrl: data.storeInfo.photoUrl || "",
        phone: data.storeInfo.phone || "",
      });
    }

    // Live clock update
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: TrendingUp,
      title: isFr ? "Ventes & Facturation" : "المبيعات والفواتير الذكية",
      desc: isFr
        ? "Facturation rapide, reçus thermiques et devis professionnels en quelques clics."
        : "إصدار وطباعة فواتير البيع والإيصالات وعروض الأسعار بدقة وسرعة فائقة.",
      color: "from-blue-500/20 to-indigo-500/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
    },
    {
      icon: Package,
      title: isFr ? "Gestion de Stock" : "إدارة المخزون والمستودعات",
      desc: isFr
        ? "Contrôle en temps réel des quantités, alertes de rupture et codes-barres."
        : "متابعة كميات المنتجات فورياً وتنبيهات نفاد المخزون مع دعم الباركود.",
      color: "from-emerald-500/20 to-teal-500/10",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/30",
    },
    {
      icon: CreditCard,
      title: isFr ? "Créances & Règlements" : "الديون والتحصيلات المالية",
      desc: isFr
        ? "Suivi rigoureux des dettes clients et fournisseurs avec relances directes."
        : "متابعة ديون العملاء والموردين بدقة مع تذكير واتساب وربط مباشر بالأرشيف.",
      color: "from-amber-500/20 to-orange-500/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/30",
    },
    {
      icon: ShieldCheck,
      title: isFr ? "Sécurité & Cloud" : "مزامنة سحابية مشفرة",
      desc: isFr
        ? "Architecture Offline-First, chiffrement local et synchronisation temps réel."
        : "يعمل دون انقطاع حتى بدون إنترنت، مع تشفير محلي ومزامنة سحابية آمنة.",
      color: "from-purple-500/20 to-violet-500/10",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
    },
  ];

  return (
    <div
      className={`min-h-screen w-full bg-[#070b19] text-white flex flex-col justify-between relative overflow-x-hidden ${
        locale === "ar" ? "font-arabic" : "font-sans"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ── Ambient Glow Background Effects ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-80 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* ── Top Navigation Bar ── */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5 border-b border-white/[0.08] backdrop-blur-md bg-slate-950/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center">
              <img
                src="/lovable-uploads/9bf8f3b6-2cd1-4788-a907-3ea9cb2eb6fc.png"
                alt="Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white">
                  {isFr ? "Hissaby Pro" : "حسابي برو"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  v3.5 PRO
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isFr ? "Système prêt et opérationnel" : "النظام متصل وجاهز للعمل"}</span>
              </div>
            </div>
          </div>

          {/* Right Tools (Clock & Language Switcher) */}
          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {currentTime.toLocaleTimeString(isFr ? "fr-FR" : "ar-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => changeLocale(isFr ? "ar" : "fr")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
              title={isFr ? "Passer à l'arabe" : "Changer en Français"}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isFr ? "العربية" : "Français"}</span>
            </button>

            {/* Login / Switch Account */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
              className="hidden sm:flex border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.1] text-slate-200 text-xs font-bold rounded-xl"
            >
              <LogIn className={`w-3.5 h-3.5 ${isRTL ? "ml-1.5" : "mr-1.5"}`} />
              {isFr ? "Changer de compte" : "تبديل الحساب"}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16 max-w-6xl mx-auto w-full text-center">
        {/* Shimmer Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/15 via-indigo-500/20 to-purple-500/15 border border-indigo-400/30 text-indigo-300 text-xs sm:text-sm font-semibold mb-6 shadow-lg shadow-indigo-500/10 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span>
            {isFr
              ? "Nouvelle Génération ERP & Gestion de Commerce"
              : "الجيل المتطور لإدارة الأنشطة التجارية والمحاسبة الذكية"}
          </span>
        </div>

        {/* Animated Brand Logo Centerpiece with Luxury Glow */}
        <div className="relative mb-6 group cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-3xl blur-2xl opacity-40 group-hover:opacity-75 transition-opacity duration-700 -z-10" />
          <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/80 border border-white/15 backdrop-blur-xl shadow-2xl transition-transform duration-500 group-hover:scale-105">
            <AnimatedLogo size="md" className="mx-auto" />
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4">
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            {isFr ? "Gérez Votre Entreprise Avec" : "أدِر نشاطك التجاري بكل"}
          </span>{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent underline decoration-indigo-500/40 decoration-wavy decoration-2">
            {isFr ? "Hissaby Pro" : "احترافية وثقة"}
          </span>
        </h1>

        {/* Hero Description */}
        <p className="max-w-2xl text-slate-300 text-sm sm:text-base lg:text-lg mb-8 leading-relaxed font-normal">
          {isFr
            ? "Le système intégré complet pour la facturation, la maîtrise du stock, le suivi des créances et les rapports d'activité en temps réel."
            : "نظام شامل ومتكامل لإدارة الفواتير والمبيعات، ومراقبة المخزون، وتحصيل الديون مع ربط فوري بالأرشيف المركزي، مصمم للسرعة الفائقة والعمل الميداني."}
        </p>

        {/* Active Store Showcase Card (if store configured) */}
        {storeInfo.name && (
          <div className="mb-8 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md shadow-xl">
            {storeInfo.photoUrl ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-400/50 shadow-md">
                <img
                  src={storeInfo.photoUrl}
                  alt={storeInfo.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div className="text-right rtl:text-right ltr:text-left">
              <p className="text-[10px] text-slate-400 font-medium">
                {isFr ? "Établissement actif" : "المتجر / المؤسسة المسجلة"}
              </p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{storeInfo.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </p>
            </div>
          </div>
        )}

        {/* ── Main Call To Action Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-12">
          {/* Primary Action Button */}
          <Button
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base px-8 py-6 rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all transform hover:-translate-y-0.5 cursor-pointer border border-blue-400/30"
          >
            <span>{isFr ? "Entrer au Tableau de Bord" : "الدخول إلى لوحة التحكم"}</span>
            {isRTL ? (
              <ArrowLeft className="w-5 h-5 mr-2" />
            ) : (
              <ArrowRight className="w-5 h-5 ml-2" />
            )}
          </Button>

          {/* Quick Direct Links */}
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/create-invoice")}
            className="w-full sm:w-auto border-white/20 bg-white/[0.05] hover:bg-white/[0.12] text-white font-bold text-sm px-6 py-6 rounded-2xl backdrop-blur-md transition-all cursor-pointer"
          >
            <FileText className={`w-4 h-4 ${isRTL ? "ml-2 text-blue-400" : "mr-2 text-blue-400"}`} />
            <span>{isFr ? "Facture Rapide" : "فاتورة جديدة"}</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/archive")}
            className="w-full sm:w-auto border-white/20 bg-white/[0.05] hover:bg-white/[0.12] text-white font-bold text-sm px-6 py-6 rounded-2xl backdrop-blur-md transition-all cursor-pointer"
          >
            <Archive className={`w-4 h-4 ${isRTL ? "ml-2 text-amber-400" : "mr-2 text-amber-400"}`} />
            <span>{isFr ? "L'Archive" : "الأرشيف المركزي"}</span>
          </Button>
        </div>

        {/* ── Feature Highlights (4 Luxury Glass Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className={`p-5 rounded-2xl bg-gradient-to-b ${feat.color} bg-slate-900/60 border ${feat.borderColor} backdrop-blur-md text-right rtl:text-right ltr:text-left shadow-lg hover:border-white/40 transition-all hover:-translate-y-1`}
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-white/[0.08] ${feat.iconColor} flex items-center justify-center mb-3.5 border border-white/[0.08]`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full px-4 sm:px-8 py-5 border-t border-white/[0.08] backdrop-blur-md bg-slate-950/60 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isFr
                ? "Données sécurisées avec chiffrement local et cloud"
                : "بيانات محمية ومشفرة بأعلى معايير الأمان المحلية والسحابية"}
            </span>
          </div>

          <div>
            {isFr
              ? `© ${new Date().getFullYear()} Hissaby Pro Enterprise. Tous droits réservés.`
              : `© ${new Date().getFullYear()} حسابي برو (Hissaby Pro). جميع الحقوق محفوظة.`}
          </div>
        </div>
      </footer>
    </div>
  );
}
