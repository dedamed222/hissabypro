/**
 * Unified Supabase database layer — CRUD helpers for all entities.
 * Every function scoped to the authenticated user via RLS.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Generic helpers ─────────────────────────────────────────────────────────
/**
 * Simple UUID format check to prevent DB syntax errors (e.g., from legacy 'WH-MAIN' IDs).
 */
export const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

type SnakeToCamelString<S extends string> =
  S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelString<U>>}` : S;

export class AuthenticationError extends Error {
  code: string;
  constructor(message: string, code: string = 'NOT_AUTHENTICATED') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

/**
 * Resilient helper to get the authenticated user.
 * Tries local session first, refreshes if needed, and falls back to network.
 */
export async function getAuthenticatedUser() {
  try {
    // 1. Try fast local session check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (session?.user) {
      // Check if token is close to expiry (e.g., within 60 seconds)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const isExpiredOrClose = expiresAt > 0 && Date.now() > expiresAt - 60000;

      if (isExpiredOrClose) {
        // Token is expired or close to expiry, force refresh
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshedSession?.user) {
          return refreshedSession.user;
        }
        if (refreshError) {
          console.warn("Session refresh failed:", refreshError);
        }
      } else {
        // Session is valid and not expiring soon
        return session.user;
      }
    }

    // 2. Fallback to network call if session is missing or refresh failed
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (user) return user;

    // 3. If both fail, throw specific error
    throw new AuthenticationError(
      "Not authenticated. Please log in again.",
      sessionError || userError ? "SESSION_EXPIRED" : "NOT_AUTHENTICATED"
    );
  } catch (err: any) {
    if (err instanceof AuthenticationError) throw err;
    throw new AuthenticationError(err.message || "Authentication failed");
  }
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertProduct(product: {
  id?: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  quantity: number;
  low_stock_threshold: number;
  category?: string;
  supplier_id?: string;
  warehouse_id?: string;
  photo_url?: string;
  barcode?: string;
  sold?: number;
}) {
  const user = await getAuthenticatedUser();

  const payload: any = {
    ...product,
    user_id: user.id,
    warehouse_id: isValidUUID(product.warehouse_id) ? product.warehouse_id : null,
    supplier_id: isValidUUID(product.supplier_id) ? product.supplier_id : null,
    category: product.category && product.category.trim() !== "" ? product.category : null,
    description: product.description && product.description.trim() !== "" ? product.description : null,
    photo_url: product.photo_url && product.photo_url.trim() !== "" ? product.photo_url : null,
    barcode: product.barcode && product.barcode.trim() !== "" ? product.barcode : null,
  };

  if (!payload.id) {
    // منتج جديد - استخدم insert لضمان توليد المعرف
    delete payload.id;
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // تحديث منتج موجود
    const { data, error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function insertProducts(products: {
  id?: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  quantity: number;
  low_stock_threshold: number;
  category?: string;
  supplier_id?: string;
  warehouse_id?: string;
  photo_url?: string;
  barcode?: string;
  sold?: number;
}[]) {
  const user = await getAuthenticatedUser();

  // Remove undefined IDs to allow Supabase to auto-generate UUIDs
  const payload = products.map((p) => {
    const item = { ...p, user_id: user.id };
    if (!item.id) {
      delete item.id;
    }
    return item;
  });

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

export async function getCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCustomer(customer: {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  company?: string;
  photo_url?: string;
  notes?: string;
}) {
  const user = await getAuthenticatedUser();

  const payload = { ...customer, user_id: user.id };
  const { data, error } = await supabase
    .from("customers")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

// ─── INVOICES ────────────────────────────────────────────────────────────────

export async function getInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertInvoice(invoice: {
  id?: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  total: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping_cost?: number;
  payment_method: string;
  status: "pending" | "paid" | "partial" | "cancelled";
  type?: "sales" | "quotation" | "debt";
  due_date?: string;
  debt_type?: "debtor" | "creditor" | null;
  notes?: string;
  date?: string;
}, items?: Array<{
  product_id?: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}>) {
  const user = await getAuthenticatedUser();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .upsert({ ...invoice, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (invErr) throw invErr;

  if (items && items.length > 0 && inv) {
    // Delete old items then re-insert
    await supabase.from("invoice_items").delete().eq("invoice_id", inv.id);
    const itemRows = items.map(it => ({ ...it, invoice_id: inv.id }));
    const { error: itemErr } = await supabase.from("invoice_items").insert(itemRows);
    if (itemErr) throw itemErr;
  }

  return inv;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

// ─── DAILY SALES ─────────────────────────────────────────────────────────────

export async function getDailySales() {
  const { data, error } = await supabase
    .from("daily_sales")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertDailySale(sale: {
  date: string;
  total_sales: number;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  quantity?: number;
  total?: number;
  unit_price?: number;
  payment_method?: string;
  remaining_quantity?: number;
}) {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("daily_sales")
    .insert({ ...sale, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertDailySale(sale: {
  id?: string;
  date: string;
  total_sales: number;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  quantity?: number;
  total?: number;
  unit_price?: number;
  payment_method?: string;
  remaining_quantity?: number;
}) {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("daily_sales")
    .upsert({ ...sale, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDailySale(id: string) {
  const { error } = await supabase.from("daily_sales").delete().eq("id", id);
  if (error) throw error;
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertExpense(expense: {
  id?: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  notes?: string;
  payment_method?: string;
  reference?: string;
}) {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("expenses")
    .upsert({ ...expense, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ─── SUPPLIERS ───────────────────────────────────────────────────────────────

export async function getSuppliers() {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertSupplier(supplier: {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  photo_url?: string;
  notes?: string;
}) {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("suppliers")
    .upsert({ ...supplier, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}

// ─── CREDITORS ───────────────────────────────────────────────────────────────

export async function getCreditors() {
  const { data, error } = await supabase
    .from("creditors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCreditor(creditor: {
  id?: string;
  name: string;
  customer_id?: string;
  phone?: string;
  email?: string;
  address?: string;
  amount: number;
  notes?: string;
  product_code?: string;
  product_name?: string;
  quantity?: number;
  price?: number;
  total?: number;
  date?: string;
  status?: 'pending' | 'paid';
}) {
  const user = await getAuthenticatedUser();

  const payload: any = {
    name: creditor.name,
    customer_id: creditor.customer_id,
    phone: creditor.phone,
    email: creditor.email,
    address: creditor.address,
    amount: creditor.amount,
    notes: creditor.notes,
    product_code: creditor.product_code,
    product_name: creditor.product_name,
    quantity: creditor.quantity,
    price: creditor.price,
    total: creditor.total || creditor.amount,
    date: creditor.date,
    status: creditor.status || 'pending',
    user_id: user.id
  };

  if (creditor.id) payload.id = creditor.id;

  const { data, error } = await supabase
    .from("creditors")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Upsert Creditor Error:", error);
    throw error;
  }
  return data;
}

export async function updateCreditorStatus(id: string, status: 'pending' | 'paid') {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("creditors")
    .update({ status } as any)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Update Creditor Status Error:", error);
    throw error;
  }
  return data;
}

export async function deleteCreditor(id: string) {
  const { error } = await supabase.from("creditors").delete().eq("id", id);
  if (error) throw error;
}

// ─── DEBTORS ─────────────────────────────────────────────────────────────────

export async function getDebtors() {
  const { data, error } = await supabase
    .from("debtors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertDebtor(debtor: {
  id?: string;
  name: string;
  customer_id?: string;
  phone?: string;
  total_amount: number;
  products?: unknown;
  notes?: string;
  date?: string;
  status?: 'pending' | 'paid';
}) {
  const user = await getAuthenticatedUser();

  const payload: any = {
    name: debtor.name,
    customer_id: debtor.customer_id,
    phone: debtor.phone,
    total_amount: debtor.total_amount,
    amount: debtor.total_amount, // Redundancy for compatibility
    notes: debtor.notes,
    date: debtor.date,
    products: debtor.products,
    status: debtor.status || 'pending',
    user_id: user.id
  };

  // Some schemas might use debtor_name instead of name
  payload.debtor_name = debtor.name;

  if (debtor.id) payload.id = debtor.id;

  const { data, error } = await (supabase.from("debtors") as any)
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Upsert Debtor Error:", error);
    throw error;
  }
  return data;
}

export async function updateDebtorStatus(id: string, status: 'pending' | 'paid') {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("debtors")
    .update({ status } as any)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Update Debtor Status Error:", error);
    throw error;
  }
  return data;
}

export async function deleteDebtor(id: string) {
  const { error } = await supabase.from("debtors").delete().eq("id", id);
  if (error) throw error;
}

// ─── RETURNS ─────────────────────────────────────────────────────────────────

export async function getReturns() {
  const { data, error } = await supabase
    .from("returns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertReturn(ret: {
  id?: string;
  return_number: string;
  invoice_id?: string;
  customer_id?: string;
  customer_name: string;
  products?: unknown;
  total: number;
  reason?: string;
  notes?: string;
  status?: string;
  date?: string;
  invoice_number?: string;
}) {
  const user = await getAuthenticatedUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("returns") as any)
    .upsert({ ...ret, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReturn(id: string) {
  const { error } = await supabase.from("returns").delete().eq("id", id);
  if (error) throw error;
}

// ─── WAREHOUSES ──────────────────────────────────────────────────────────────

export async function getWarehouses() {
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertWarehouse(wh: {
  id?: string;
  name: string;
  location?: string;
  description?: string;
  is_active?: boolean;
}) {
  const user = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("warehouses")
    .upsert({ ...wh, user_id: user.id }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWarehouse(id: string) {
  const { error } = await supabase.from("warehouses").delete().eq("id", id);
  if (error) throw error;
}

// ─── STORE SETTINGS ──────────────────────────────────────────────────────────

export async function getStoreSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertStoreSettings(settings: {
  id?: string;
  store_name?: string;
  store_phone?: string;
  store_email?: string;
  store_photo_url?: string;
  currency?: string;
  locale?: string;
  custom_currencies?: unknown;
  custom_payment_methods?: unknown;
}) {
  const user = await getAuthenticatedUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("store_settings") as any)
    .upsert({ ...settings, user_id: user.id }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
