
-- ============================================================
-- HISSABY PRO — Full Database Schema
-- ============================================================

-- -------------------------------------------------------
-- 1. Shared updated_at trigger function
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- -------------------------------------------------------
-- 2. PROFILES  (linked to auth.users)
-- -------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE  USING (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------
-- 3. STORE SETTINGS
-- -------------------------------------------------------
CREATE TABLE public.store_settings (
  id                      UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name              TEXT,
  store_phone             TEXT,
  store_email             TEXT,
  store_photo_url         TEXT,
  currency                TEXT NOT NULL DEFAULT 'DZD',
  locale                  TEXT NOT NULL DEFAULT 'ar',
  custom_currencies       JSONB,
  custom_payment_methods  JSONB,
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own store settings" ON public.store_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 4. WAREHOUSES
-- -------------------------------------------------------
CREATE TABLE public.warehouses (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  location    TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own warehouses" ON public.warehouses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 5. PRODUCTS
-- -------------------------------------------------------
CREATE TABLE public.products (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code                TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  price               NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost                NUMERIC(15,2) NOT NULL DEFAULT 0,
  quantity            INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  category            TEXT,
  supplier_id         UUID,
  warehouse_id        UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  photo_url           TEXT,
  barcode             TEXT,
  sold                INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own products" ON public.products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_code    ON public.products(code);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 6. CUSTOMERS
-- -------------------------------------------------------
CREATE TABLE public.customers (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  company     TEXT,
  photo_url   TEXT,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own customers" ON public.customers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 7. INVOICES
-- -------------------------------------------------------
CREATE TABLE public.invoices (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(15,2),
  discount        NUMERIC(15,2),
  tax             NUMERIC(15,2),
  shipping_cost   NUMERIC(15,2),
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  notes           TEXT,
  date            TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoices" ON public.invoices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_status  ON public.invoices(status);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 8. INVOICE ITEMS
-- -------------------------------------------------------
CREATE TABLE public.invoice_items (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id   UUID,
  product_name TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  price        NUMERIC(15,2) NOT NULL DEFAULT 0,
  total        NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice items" ON public.invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- -------------------------------------------------------
-- 9. DAILY SALES
-- -------------------------------------------------------
CREATE TABLE public.daily_sales (
  id                 UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               TEXT NOT NULL,
  total_sales        NUMERIC(15,2) NOT NULL DEFAULT 0,
  product_id         UUID,
  product_name       TEXT,
  product_code       TEXT,
  quantity           INTEGER,
  total              NUMERIC(15,2),
  unit_price         NUMERIC(15,2),
  payment_method     TEXT,
  remaining_quantity INTEGER,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own daily sales" ON public.daily_sales
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_sales_user_id ON public.daily_sales(user_id);
CREATE INDEX idx_daily_sales_date    ON public.daily_sales(date);

-- -------------------------------------------------------
-- 10. EXPENSES
-- -------------------------------------------------------
CREATE TABLE public.expenses (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description    TEXT NOT NULL,
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  category       TEXT,
  date           TEXT NOT NULL,
  notes          TEXT,
  payment_method TEXT,
  reference      TEXT,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 11. SUPPLIERS
-- -------------------------------------------------------
CREATE TABLE public.suppliers (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  photo_url   TEXT,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own suppliers" ON public.suppliers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 12. CREDITORS
-- -------------------------------------------------------
CREATE TABLE public.creditors (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  product_code TEXT,
  product_name TEXT,
  quantity     INTEGER,
  price        NUMERIC(15,2),
  total        NUMERIC(15,2),
  date         TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own creditors" ON public.creditors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_creditors_user_id ON public.creditors(user_id);

CREATE TRIGGER trg_creditors_updated_at
  BEFORE UPDATE ON public.creditors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 13. DEBTORS
-- -------------------------------------------------------
CREATE TABLE public.debtors (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  products     JSONB,
  notes        TEXT,
  date         TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own debtors" ON public.debtors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_debtors_user_id ON public.debtors(user_id);

CREATE TRIGGER trg_debtors_updated_at
  BEFORE UPDATE ON public.debtors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- 14. RETURNS
-- -------------------------------------------------------
CREATE TABLE public.returns (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  return_number  TEXT NOT NULL,
  invoice_id     UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id    UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  products       JSONB,
  total          NUMERIC(15,2) NOT NULL DEFAULT 0,
  reason         TEXT,
  notes          TEXT,
  status         TEXT,
  date           TEXT,
  invoice_number TEXT,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own returns" ON public.returns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_returns_user_id ON public.returns(user_id);

CREATE TRIGGER trg_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
