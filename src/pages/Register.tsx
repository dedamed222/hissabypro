
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/locales";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const t = translations[locale];
  const { toast } = useToast();
  const { register: registerUser, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    name: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const { password } = formData;
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^A-Za-z0-9]/)) strength += 1;
    setPasswordStrength(strength > 3 ? 3 : strength);
  }, [formData.password]);

  const renderPasswordStrength = () => {
    const colors = ["bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
    const labels = ["ضعيفة جدًا", "ضعيفة", "متوسطة", "قوية"];
    return (
      <div className="mt-1">
        <div className="flex h-1 w-full space-x-1 rtl:space-x-reverse">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-full w-1/4 rounded ${index < passwordStrength + 1 ? colors[passwordStrength] : "bg-gray-200"}`}
            />
          ))}
        </div>
        <p className={`mt-1 text-xs ${colors[passwordStrength]?.replace("bg-", "text-")}`}>
          {formData.password ? labels[passwordStrength] : ""}
        </p>
      </div>
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    try {
      const schema = z
        .object({
          username: z
            .string()
            .min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
            .max(20, "اسم المستخدم يجب ألا يتجاوز 20 حرفًا")
            .regex(/^[a-zA-Z0-9_-]+$/, "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام ورموز - و _ فقط"),
          password: z
            .string()
            .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
            .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل")
            .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل"),
          confirmPassword: z.string(),
          email: z.string().email("البريد الإلكتروني غير صالح"),
          name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "كلمتا المرور غير متطابقتين",
          path: ["confirmPassword"],
        });
      schema.parse(formData);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("حدث خطأ أثناء التحقق من البيانات");
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await registerUser(
        formData.email.trim(),
        formData.password,
        formData.name.trim(),
        formData.username.trim()
      );

      if (result.success) {
        setSuccess(true);
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
        });
      } else {
        setError(result.error || "حدث خطأ أثناء إنشاء الحساب");
      }
    } catch (err) {
      console.error("Error registering user:", err);
      setError("حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
          <CheckCircle className="mx-auto text-green-500" size={64} />
          <h1 className="text-2xl font-bold text-gray-900">تم إنشاء الحساب!</h1>
          <p className="text-gray-600">
            تم إرسال رسالة تحقق إلى <strong>{formData.email}</strong>. يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك ثم تسجيل الدخول.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-arab-blue hover:bg-arab-blue-dark text-center"
          >
            الذهاب إلى تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t.registerTitle || "إنشاء حساب جديد"}</h1>
          <p className="mt-2 text-gray-600">{t.registerSubtitle || "يرجى إدخال بياناتك لإنشاء حساب"}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.fullName || "الاسم الكامل"}</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder={t.fullNamePlaceholder || "أدخل اسمك الكامل"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t.username}</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dir-auto"
                placeholder={t.usernamePlaceholder}
              />
              <p className="mt-1 text-xs text-gray-500">اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط (3-20 حرف)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t.email || "البريد الإلكتروني"}</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dir-auto"
                placeholder={t.emailPlaceholder || "أدخل بريدك الإلكتروني"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder={t.passwordPlaceholder}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {renderPasswordStrength()}
              <p className="mt-1 text-xs text-gray-500">كلمة المرور يجب أن تكون 8 أحرف على الأقل، وتحتوي على حرف كبير ورقم</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t.confirmPassword || "تأكيد كلمة المرور"}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder={t.confirmPasswordPlaceholder || "أكد كلمة المرور"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-arab-blue hover:bg-arab-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-arab-blue"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  <span>{t.loginLoading}</span>
                </>
              ) : (
                t.registerBtn || "إنشاء حساب"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm">
              {t.alreadyHaveAccount || "لديك حساب بالفعل؟"}{" "}
              <Link to="/login" className="font-medium text-arab-blue hover:text-arab-blue-dark">
                {t.loginLink || "تسجيل الدخول"}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
