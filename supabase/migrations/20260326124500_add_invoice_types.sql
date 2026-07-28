-- Add new columns for invoice types
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sales';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS debt_type TEXT;

-- Update the CHECK constraint on status to include 'partial'
-- First, drop the existing unnamed check constraint by finding its name (if you created it with a name you can drop it directly)
-- Note: In standard Supabase generated tables, unnamed constraints need dynamic dropping or doing it via dashboard.
-- Let's make it robust by adding a generic script or just removing and adding if named.
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%';
    
    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.invoices DROP CONSTRAINT ' || con_name;
    END IF;
END $$;

ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('pending', 'paid', 'cancelled', 'partial'));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_type_check CHECK (type IN ('sales', 'quotation', 'debt'));
ALTER TABLE public.invoices ADD CONSTRAINT invoices_debt_type_check CHECK (debt_type IS NULL OR debt_type IN ('debtor', 'creditor'));
