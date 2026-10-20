import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  ChevronDown,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Check,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { locale, changeLocale, isRTL } = useLocale();
  const isFr = locale === "fr";

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Language Dropdown state
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Forgot Password modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Handle Login Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(isFr ? "Veuillez saisir votre nom d'utilisateur ou e-mail" : "يرجى إدخال اسم المستخدم أو البريد الإلكتروني");
      return;
    }
    if (!password.trim()) {
      setError(isFr ? "Veuillez saisir votre mot de passe" : "يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);
    try {
      // Determine if identifier is an email or username
      const emailToUse = trimmed.includes("@") ? trimmed : `${trimmed}@hissabypro.com`;

      const result = await login(emailToUse, password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        // If it failed and didn't have an @, also try raw identifier just in case
        if (!trimmed.includes("@")) {
          const secondTry = await login(trimmed, password);
          if (secondTry.success) {
            navigate("/dashboard");
            return;
          }
        }
        setError(
          result.error ||
            (isFr
              ? "Identifiant ou mot de passe incorrect."
              : "اسم المستخدم أو كلمة المرور غير صحيحة.")
        );
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(isFr ? "Une erreur est survenue lors de la connexion." : "حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetLoading(true);
    setResetMessage("");
    try {
      const email = resetEmail.includes("@") ? resetEmail.trim() : `${resetEmail.trim()}@hissabypro.com`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetErr) {
        setResetMessage(isFr ? "Impossible d'envoyer l'e-mail de réinitialisation: " + resetErr.message : "تعذر إرسال رابط الاستعادة: " + resetErr.message);
      } else {
        setResetMessage(
          isFr
            ? "Un lien de réinitialisation a été envoyé à votre adresse e-mail si elle existe."
            : "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح."
        );
      }
    } catch (err) {
      setResetMessage(isFr ? "Une erreur est survenue." : "حدث خطأ غير متوقع.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative select-none">
      {/* ── Top-Right Language Dropdown Pill ── */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Globe size={15} className="text-slate-600" />
            <span>{isFr ? "Français" : "العربية"}</span>
            <ChevronDown
              size={13}
              className={`text-slate-400 transition-transform duration-200 ${
                isLangMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isLangMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-32 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-xs font-medium z-40 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  changeLocale("fr");
                  setIsLangMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer ${
                  isFr ? "text-blue-600 font-bold bg-blue-50/50" : "text-slate-700"
                }`}
              >
                <span>Français</span>
                {isFr && <Check size={14} className="text-blue-600" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  changeLocale("ar");
                  setIsLangMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer ${
                  !isFr ? "text-blue-600 font-bold bg-blue-50/50" : "text-slate-700"
                }`}
              >
                <span>العربية</span>
                {!isFr && <Check size={14} className="text-blue-600" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Form Container ── */}
      <div className="w-full max-w-[400px] sm:max-w-[430px] flex flex-col items-center">
        {/* App Logo Squircle */}
        <div className="w-[76px] h-[76px] rounded-[22px] bg-gradient-to-b from-[#1D74FF] via-[#0E65FF] to-[#0051EB] shadow-xl shadow-blue-500/25 flex items-center justify-center mb-5 shrink-0 transition-transform hover:scale-105 duration-300">
          <svg
            viewBox="0 0 100 100"
            className="w-11 h-11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left piece of the modern interlocking H */}
            <path
              d="M33 54.5V29.5C33 26.2 34.8 23.2 37.6 21.6L46.8 16.3C49.9 14.5 53.8 16.8 53.8 20.4V33C53.8 35.2 52 37 49.8 37H44.5V54.5C44.5 55.6 43.6 56.5 42.5 56.5H35C33.9 56.5 33 55.6 33 54.5Z"
              fill="url(#h_left_grad)"
            />
            {/* Right piece of the modern interlocking H (180deg symmetric) */}
            <g transform="rotate(180 50 50)">
              <path
                d="M33 54.5V29.5C33 26.2 34.8 23.2 37.6 21.6L46.8 16.3C49.9 14.5 53.8 16.8 53.8 20.4V33C53.8 35.2 52 37 49.8 37H44.5V54.5C44.5 55.6 43.6 56.5 42.5 56.5H35C33.9 56.5 33 55.6 33 54.5Z"
                fill="url(#h_right_grad)"
              />
            </g>
            <defs>
              <linearGradient
                id="h_left_grad"
                x1="33"
                y1="16"
                x2="54"
                y2="56"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#E0F7FF" />
                <stop offset="1" stopColor="#FFFFFF" />
              </linearGradient>
              <linearGradient
                id="h_right_grad"
                x1="33"
                y1="16"
                x2="54"
                y2="56"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#FFFFFF" />
                <stop offset="1" stopColor="#BAE6FD" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Headings */}
        <h1 className="text-[32px] sm:text-[34px] font-black tracking-tight text-slate-900 leading-tight">
          <span>Hissaby </span>
          <span className="text-[#2563EB]">Pro</span>
        </h1>

        <p className="text-base font-semibold text-slate-700 mt-1">
          {isFr ? "Système de gestion de magasin" : "نظام إدارة المتاجر"}
        </p>

        <p className="text-xs sm:text-[13px] text-slate-400 mt-1 mb-7 text-center">
          {isFr
            ? "Gérez facilement votre boutique, vos stocks et vos ventes."
            : "أدر متجرك، مخزونك ومبيعاتك بكل سهولة واحترافية."}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-rose-400 hover:text-rose-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {/* Input 1: Nom d'utilisateur */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder={isFr ? "Nom d'utilisateur" : "اسم المستخدم أو البريد الإلكتروني"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
              className="w-full h-12 pl-11 pr-4 bg-white border border-[#CBD5E1] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15 transition-all"
            />
          </div>

          {/* Input 2: Mot de passe */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder={isFr ? "Mot de passe" : "كلمة المرور"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full h-12 pl-11 pr-11 bg-white border border-[#CBD5E1] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-[#2563EB]/15 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Primary Action Button (Se connecter ->) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{isFr ? "Connexion..." : "جاري تسجيل الدخول..."}</span>
              </>
            ) : (
              <>
                <span>{isFr ? "Se connecter" : "تسجيل الدخول"}</span>
                {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </>
            )}
          </button>
        </form>

        {/* Divider (── ou ──) */}
        <div className="w-full relative my-5 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="absolute bg-white px-3 text-xs text-slate-400 font-medium">
            {isFr ? "ou" : "أو"}
          </span>
        </div>

        {/* Secondary Action Button (Créer un compte) */}
        <button
          type="button"
          onClick={() => navigate("/register")}
          className="w-full h-12 bg-white hover:bg-blue-50/40 border border-[#93C5FD] text-[#2563EB] text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
        >
          <UserPlus size={17} />
          <span>{isFr ? "Créer un compte" : "إنشاء حساب جديد"}</span>
        </button>

        {/* Forgot Password Link */}
        <p className="mt-8 text-center text-xs text-slate-500">
          <span>
            {isFr
              ? "Vous avez oublié votre mot de passe ? "
              : "هل نسيت كلمة المرور؟ "}
          </span>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="text-[#2563EB] font-semibold hover:underline cursor-pointer"
          >
            {isFr ? "Réinitialiser" : "إعادة التعيين"}
          </button>
        </p>
      </div>

      {/* ── Forgot Password Modal ── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-5 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                {isFr ? "Réinitialisation du mot de passe" : "إعادة تعيين كلمة المرور"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetMessage("");
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {isFr
                ? "Saisissez l'adresse e-mail associée à votre compte pour recevoir un lien de réinitialisation sécurisé."
                : "أدخل البريد الإلكتروني المرتبط بحسابك لتلقي رابط إعادة تعيين كلمة المرور."}
            </p>

            {resetMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="email"
                placeholder="nom@exemple.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isFr ? "Fermer" : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {resetLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{isFr ? "Envoyer le lien" : "إرسال الرابط"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
