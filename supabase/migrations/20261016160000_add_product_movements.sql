-- Create product_movements table for tracking all sales, returns, and adjustments
CREATE TABLE IF NOT EXISTS public.product_movements (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT NOT NULL,
    product_code TEXT,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    invoice_id TEXT,
    invoice_number TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'sale',
    is_manual_item BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Fast search indexes for scaling to thousands of movements
CREATE INDEX IF NOT EXISTS idx_product_movements_product_id ON public.product_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_movements_customer_id ON public.product_movements(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_movements_invoice_id ON public.product_movements(invoice_id);
CREATE INDEX IF NOT EXISTS idx_product_movements_invoice_number ON public.product_movements(invoice_number);
CREATE INDEX IF NOT EXISTS idx_product_movements_date ON public.product_movements(date DESC);
CREATE INDEX IF NOT EXISTS idx_product_movements_user_id ON public.product_movements(user_id);

-- Enable Row Level Security
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own product movements"
    ON public.product_movements
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
