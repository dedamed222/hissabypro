
import { useState, useEffect, useCallback, useMemo } from "react";
import { getReturns, upsertReturn, deleteReturn as deleteReturnDB, getInvoices, upsertProduct } from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import type { Return, Invoice, Product } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { getProducts } from "@/lib/database";

// Map DB row (snake_case) → app Return type (camelCase)
const mapRow = (row: Record<string, any>): Return => ({
  id: row.id as string,
  returnNumber: row.return_number as string,
  invoiceId: row.invoice_id as string | undefined,
  customerId: row.customer_id as string | undefined,
  customerName: row.customer_name as string,
  products: (typeof row.products === 'string' ? JSON.parse(row.products) : row.products) || [],
  items: row.return_items?.map((item: any) => ({
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    price: item.price,
    total: item.total
  })) || [],
  total: row.total as number,
  reason: row.reason as string | undefined,
  notes: row.notes as string | undefined,
  status: row.status as string | undefined,
  date: row.date as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string | undefined,
  invoiceNumber: row.invoice_number as string | undefined,
});

const mapInvoiceRow = (row: Record<string, any>): Invoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  customerId: row.customer_id,
  customerName: row.customer_name,
  products: [], // Not needed for selection
  items: row.invoice_items?.map((item: any) => ({
    productId: item.product_id,
    productName: item.product_name,
    productCode: "", // Not returned by default select
    quantity: item.quantity,
    price: item.price,
    total: item.total
  })) || [],
  total: row.total,
  subtotal: row.subtotal,
  discount: row.discount,
  tax: row.tax,
  paymentMethod: row.payment_method,
  status: row.status,
  type: row.type,
  date: row.date,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const useReturns = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        const rows = await getReturns();
        const mapped = rows.map(mapRow);
        setReturns(mapped);
        
        // Also load invoices for selection
        const invoiceRows = await getInvoices();
        setInvoices(invoiceRows.map(mapInvoiceRow));
      } else {
        // Guest mode - fallback to localStorage
        const { loadStoreData } = await import("@/utils/localStorage");
        const storeData = loadStoreData();
        setReturns(storeData.returns || []);
        setInvoices(storeData.invoices || []);
      }
    } catch (err) {
      console.error("Error loading returns data:", err);
      setError("فشل تحميل البيانات");
      toast({ title: "خطأ", description: "فشل تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const filteredReturns = useMemo(() => {
    let result = [...returns];

    // Search filter
    if (searchQuery.trim()) {
      const normalized = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.customerName.toLowerCase().includes(normalized) ||
          r.returnNumber.toLowerCase().includes(normalized) ||
          (r.invoiceNumber || "").toLowerCase().includes(normalized)
      );
    }

    // Sort by date desc
    result.sort((a, b) => 
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    return result;
  }, [returns, searchQuery]);

  const filteredInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) return [];
    
    const normalized = invoiceSearchQuery.trim().toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(normalized) ||
        inv.customerName.toLowerCase().includes(normalized)
    ).slice(0, 5); // Limit results
  }, [invoices, invoiceSearchQuery]);

  const saveReturn = async (ret: Partial<Return> & { 
    customerName: string; 
    returnNumber: string; 
    total: number,
    items?: any[]
  }) => {
    try {
      setLoading(true);
      await upsertReturn({
        id: ret.id,
        return_number: ret.returnNumber,
        invoice_id: ret.invoiceId,
        customer_id: ret.customerId,
        customer_name: ret.customerName,
        products: ret.products,
        total: ret.total,
        reason: ret.reason,
        notes: ret.notes,
        status: ret.status,
        date: ret.date,
        invoice_number: ret.invoiceNumber,
      });

      // Update inventory for each returned item
      if (ret.items && ret.items.length > 0) {
        const productsData = await getProducts();
        
        for (const item of ret.items) {
          const productRow = productsData.find(p => p.id === item.productId);
          if (productRow) {
            await upsertProduct({
              id: productRow.id,
              code: productRow.code,
              name: productRow.name,
              price: productRow.price,
              cost: productRow.cost,
              quantity: productRow.quantity + item.quantity,
              low_stock_threshold: productRow.low_stock_threshold,
              category: productRow.category,
              supplier_id: productRow.supplier_id,
              warehouse_id: productRow.warehouse_id,
              photo_url: productRow.photo_url,
              barcode: productRow.barcode,
              sold: Math.max(0, (productRow.sold || 0) - item.quantity)
            });
          }
        }
      }

      await loadReturns();
      toast({ title: "نجاح", description: "تم تسجيل المرتجع وتحديث المخزون بنجاح" });
    } catch (err) {
      console.error("Error saving return:", err);
      toast({ title: "خطأ", description: "فشل حفظ المرتجع", variant: "destructive" });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeReturn = async (id: string) => {
    try {
      await deleteReturnDB(id);
      setReturns((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error deleting return:", err);
      throw err;
    }
  };

  return {
    returns,
    invoices,
    selectedInvoice,
    setSelectedInvoice,
    filteredReturns,
    filteredInvoices,
    searchQuery,
    setSearchQuery,
    invoiceSearchQuery,
    setInvoiceSearchQuery,
    error,
    setError,
    loading,
    setLoading,
    setReturns,
    loadReturns,
    saveReturn,
    removeReturn,
  };
};
