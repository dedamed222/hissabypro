
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, AlertTriangle } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const t = translations[locale];
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (!password.trim()) {
      setError("يرجى إدخال كلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        toast({ title: "تم تسجيل الدخول بنجاح", description: "مرحبًا بك في نظام إدارة المتجر" });
        navigate("/dashboard");
      } else {
        setError(result.error || "فشل تسجيل الدخول. تأكد من صحة البريد الإلكتروني وكلمة المرور");
      }
    } catch (err) {
      setError("حدث خطأ أثناء محاولة تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.loginTitle}</h1>
        <p className="text-sm text-gray-600">{t.loginSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="أدخل بريدك الإلكتروني"
            autoComplete="email"
            required
            disabled={loading}
            className="dir-auto"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t.password}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-arab-blue text-white hover:bg-arab-blue-light"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              <span>{t.loginLoading}</span>
            </>
          ) : (
            <>
              <LogIn size={18} className="mr-2" />
              <span>{t.loginBtn}</span>
            </>
          )}
        </Button>

        <div className="text-center text-sm text-gray-500 mt-4">
          <p>
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-arab-blue hover:underline font-medium">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
