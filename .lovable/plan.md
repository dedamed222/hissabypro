
## الخطة: إضافة قاعدة بيانات Supabase للتطبيق

### الوضع الحالي
التطبيق يخزن جميع البيانات محلياً في `localStorage` مشفرة. البيانات الرئيسية:
- المنتجات (products)
- العملاء (customers)
- الفواتير (invoices)
- المبيعات اليومية (dailySales)
- المصروفات (expenses)
- الموردين (suppliers)
- الدائنون (creditors)
- المدينون (debtors)
- المرتجعات (returns)
- المخازن (warehouses)
- المستخدمون (users) + المصادقة

### الهدف
إنشاء جداول Supabase لجميع الكيانات الرئيسية مع ربطها بمصادقة Supabase Auth، والاستمرار في دعم `localStorage` كبديل احتياطي للمرحلة الانتقالية.

---

### الجداول المطلوب إنشاؤها

```text
profiles           ← معلومات المستخدم (name, username, role)
products           ← المنتجات
customers          ← العملاء
invoices           ← الفواتير
invoice_items      ← بنود الفاتورة
daily_sales        ← المبيعات اليومية
expenses           ← المصروفات
suppliers          ← الموردون
creditors          ← الدائنون
debtors            ← المدينون
returns            ← المرتجعات
warehouses         ← المخازن
store_settings     ← إعدادات المتجر والعملة
```

كل جدول يرتبط بـ `user_id` حتى يرى كل مستخدم بياناته فقط، مع RLS policies لحماية البيانات.

---

### خطوات التنفيذ

**1. إنشاء جداول قاعدة البيانات (Migration)**
- إنشاء migration واحد يحتوي على جميع الجداول مع العلاقات والفهارس
- تفعيل Row Level Security على كل جدول
- إنشاء trigger لإنشاء `profile` تلقائياً عند تسجيل مستخدم جديد

**2. تحديث نظام المصادقة**
- استبدال `AuthContext.tsx` ليستخدم `supabase.auth.signInWithPassword` و `supabase.auth.signUp`
- إزالة الاعتماد على `localStorage` لتخزين المستخدمين
- تحديث صفحة `Register.tsx` و `Login.tsx` لاستخدام Supabase Auth

**3. إنشاء طبقة بيانات موحدة**
- إنشاء ملف `src/lib/database.ts` يحتوي على دوال CRUD لكل كيان تستخدم Supabase
- الدوال: `getProducts`, `saveProduct`, `deleteProduct`, `getInvoices`, etc.

**4. تحديث الـ Hooks والصفحات الرئيسية**
- تحديث `useProducts.ts` ليجلب البيانات من Supabase
- تحديث `useSalesForm.ts` و `useInvoiceForm.ts`
- تحديث صفحات: Products, Sales, Customers, Expenses, Suppliers, Debtors, Creditors

**5. مزامنة البيانات المحلية (Migration للبيانات الحالية)**
- إضافة زر في Settings لرفع البيانات المحلية الحالية إلى Supabase

---

### الملاحظات التقنية
- كل الجداول تستخدم `uuid` كـ primary key
- `user_id` غير nullable في كل جدول لضمان RLS صحيح
- يتم الاحتفاظ بـ `localStorage` كـ fallback مؤقت أثناء offline
- لن يتم حذف أي بيانات محلية موجودة
