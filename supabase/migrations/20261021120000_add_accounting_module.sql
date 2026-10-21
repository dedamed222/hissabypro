-- =====================================================================
-- HISSABY PRO — Accounting Module Migration (Phase 1)
-- Version: accounting-v1 | Date: 2026-10-21
-- Type: ADDITIVE ONLY (CREATE TABLE IF NOT EXISTS / ADD COLUMN with DEFAULT)
-- Safe: IDEMPOTENT — can be run multiple times without side effects
-- Prerequisite: supabase/migrations/20260325122648_*.sql must exist
-- =====================================================================

-- ── Shared trigger function already exists from base migration ────────────────
-- (public.update_updated_at_column is reused)

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 1: accounting_accounts (دليل الحسابات / Plan Comptable)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_accounts (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  name_ar        TEXT NOT NULL,
  name_fr        TEXT NOT NULL,
  account_class  INTEGER NOT NULL CHECK (account_class BETWEEN 1 AND 7),
  type           TEXT NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  parent_id      UUID REFERENCES public.accounting_accounts(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  device_id      TEXT,
  sync_status    TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','failed')),
  is_deleted     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='accounting_accounts' AND policyname='Users can manage own accounting accounts'
  ) THEN
    CREATE POLICY "Users can manage own accounting accounts"
      ON public.accounting_accounts
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_accounting_accounts_updated_at'
  ) THEN
    CREATE TRIGGER trg_accounting_accounts_updated_at
      BEFORE UPDATE ON public.accounting_accounts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acc_accounts_user    ON public.accounting_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_acc_accounts_code    ON public.accounting_accounts(user_id, code);
CREATE INDEX IF NOT EXISTS idx_acc_accounts_class   ON public.accounting_accounts(account_class);
CREATE INDEX IF NOT EXISTS idx_acc_accounts_deleted ON public.accounting_accounts(is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 2: accounting_fiscal_periods (الفترات المالية / Périodes Fiscales)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_fiscal_periods (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  closed_at   TIMESTAMPTZ,
  closed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id   TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','failed')),
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_period_dates CHECK (end_date >= start_date),
  UNIQUE (user_id, code)
);

ALTER TABLE public.accounting_fiscal_periods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='accounting_fiscal_periods' AND policyname='Users can manage own fiscal periods'
  ) THEN
    CREATE POLICY "Users can manage own fiscal periods"
      ON public.accounting_fiscal_periods
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_acc_fiscal_periods_updated_at'
  ) THEN
    CREATE TRIGGER trg_acc_fiscal_periods_updated_at
      BEFORE UPDATE ON public.accounting_fiscal_periods
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acc_periods_user    ON public.accounting_fiscal_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_acc_periods_dates   ON public.accounting_fiscal_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_acc_periods_closed  ON public.accounting_fiscal_periods(is_closed);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 3: accounting_journal_entries (رؤوس قيود اليومية / En-têtes d'Écriture)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_journal_entries (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_number          TEXT NOT NULL,
  entry_date            DATE NOT NULL,
  period_id             UUID NOT NULL REFERENCES public.accounting_fiscal_periods(id),
  source_document_type  TEXT NOT NULL CHECK (
                          source_document_type IN (
                            'sales_invoice','purchase_invoice','payment','receipt',
                            'expense','return','cogs','manual','reversal','closing'
                          )
                        ),
  source_document_id    UUID,         -- nullable FK to original document (invoice id, etc.)
  source_document_ref   TEXT,         -- human-readable ref e.g. "INV-2026-00042"
  description           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'posted'
                          CHECK (status IN ('draft','posted','reversed')),
  reversed_by_id        UUID REFERENCES public.accounting_journal_entries(id) ON DELETE SET NULL,
  total_debit           NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit          NUMERIC(15,2) NOT NULL DEFAULT 0,
  device_id             TEXT,
  sync_status           TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','failed')),
  is_deleted            BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Enforce double-entry balance at DB level
  CONSTRAINT ck_entry_balanced CHECK (
    ABS(total_debit - total_credit) < 0.01
  ),
  UNIQUE (user_id, entry_number)
);

ALTER TABLE public.accounting_journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='accounting_journal_entries' AND policyname='Users can manage own journal entries'
  ) THEN
    CREATE POLICY "Users can manage own journal entries"
      ON public.accounting_journal_entries
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_acc_journal_entries_updated_at'
  ) THEN
    CREATE TRIGGER trg_acc_journal_entries_updated_at
      BEFORE UPDATE ON public.accounting_journal_entries
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acc_entries_user    ON public.accounting_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_acc_entries_date    ON public.accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_acc_entries_period  ON public.accounting_journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_acc_entries_status  ON public.accounting_journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_acc_entries_src_doc ON public.accounting_journal_entries(source_document_id);
CREATE INDEX IF NOT EXISTS idx_acc_entries_deleted ON public.accounting_journal_entries(is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 4: accounting_journal_lines (أسطر القيد / Lignes d'Écriture)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_journal_lines (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id         UUID NOT NULL REFERENCES public.accounting_journal_entries(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES public.accounting_accounts(id),
  account_code     TEXT,
  account_name_ar  TEXT,
  account_name_fr  TEXT,
  third_party_id   UUID,         -- customer.id or supplier.id (logical FK, no hard constraint for flexibility)
  third_party_name TEXT,
  third_party_type TEXT CHECK (third_party_type IN ('customer','supplier','dual') OR third_party_type IS NULL),
  debit            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit           NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description      TEXT,
  device_id        TEXT,
  sync_status      TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','failed')),
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Each line must be either debit or credit, not both
  CONSTRAINT ck_line_one_side CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

ALTER TABLE public.accounting_journal_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='accounting_journal_lines' AND policyname='Users can manage own journal lines'
  ) THEN
    CREATE POLICY "Users can manage own journal lines"
      ON public.accounting_journal_lines
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_acc_journal_lines_updated_at'
  ) THEN
    CREATE TRIGGER trg_acc_journal_lines_updated_at
      BEFORE UPDATE ON public.accounting_journal_lines
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acc_lines_entry       ON public.accounting_journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_acc_lines_account     ON public.accounting_journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_acc_lines_third_party ON public.accounting_journal_lines(third_party_id);
CREATE INDEX IF NOT EXISTS idx_acc_lines_user        ON public.accounting_journal_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_acc_lines_deleted     ON public.accounting_journal_lines(is_deleted);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE 5: accounting_account_mappings (ربط العمليات بالحسابات / Paramétrage Comptes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_account_mappings (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_key  TEXT NOT NULL,
  account_id     UUID NOT NULL REFERENCES public.accounting_accounts(id),
  account_code   TEXT,
  description    TEXT,
  device_id      TEXT,
  sync_status    TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','failed')),
  is_deleted     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation_key)
);

ALTER TABLE public.accounting_account_mappings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='accounting_account_mappings' AND policyname='Users can manage own account mappings'
  ) THEN
    CREATE POLICY "Users can manage own account mappings"
      ON public.accounting_account_mappings
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='trg_acc_account_mappings_updated_at'
  ) THEN
    CREATE TRIGGER trg_acc_account_mappings_updated_at
      BEFORE UPDATE ON public.accounting_account_mappings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_acc_mappings_user ON public.accounting_account_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_acc_mappings_key  ON public.accounting_account_mappings(operation_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK PROCEDURE (for reference — run manually if needed):
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.accounting_account_mappings CASCADE;
-- DROP TABLE IF EXISTS public.accounting_journal_lines CASCADE;
-- DROP TABLE IF EXISTS public.accounting_journal_entries CASCADE;
-- DROP TABLE IF EXISTS public.accounting_fiscal_periods CASCADE;
-- DROP TABLE IF EXISTS public.accounting_accounts CASCADE;
-- NOTE: Only execute rollback after explicit user approval — never automatically.
