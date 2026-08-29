import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadStoreData } from "@/utils/localStorage";
import { useToast } from "@/hooks/use-toast";
import {
    upsertProduct,
    upsertCustomer,
    upsertInvoice,
    upsertDailySale,
    upsertExpense,
    upsertSupplier,
    upsertCreditor,
    upsertDebtor,
    upsertWarehouse,
    upsertReturn
} from "@/lib/database";

export function useAutoSync() {
    const { isAuthenticated } = useAuth();
    const { toast } = useToast();
    const isSyncing = useRef(false);

    useEffect(() => {
        const handleSync = async () => {
            if (!isAuthenticated || !navigator.onLine || isSyncing.current) return;

            try {
                isSyncing.current = true;
                const storeData = loadStoreData();

                // We only want to sync if there's actually data to sync
                const hasData =
                    storeData.products.length > 0 ||
                    storeData.customers.length > 0 ||
                    storeData.invoices.length > 0 ||
                    storeData.dailySales.length > 0;

                if (!hasData) {
                    isSyncing.current = false;
                    return;
                }

                toast({
                    title: "مزامنة البيانات",
                    description: "جاري ترحيل البيانات المحلية إلى السحابة...",
                });

                // 1. Sync Warehouses
                if (storeData.warehouses) {
                    await Promise.allSettled(
                        storeData.warehouses.map(w => upsertWarehouse({
                            id: w.id.length === 36 ? w.id : undefined,
                            name: w.name,
                            location: w.location,
                            description: w.description,
                            is_active: w.isActive
                        }))
                    );
                }

                // 2. Sync Products
                await Promise.allSettled(
                    storeData.products.map(p => upsertProduct({
                        id: p.id.length === 36 ? p.id : undefined,
                        code: p.code,
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        cost: p.cost,
                        quantity: p.quantity,
                        low_stock_threshold: p.lowStockThreshold,
                        category: p.category,
                        supplier_id: p.supplierId,
                        warehouse_id: p.warehouseId,
                        photo_url: p.photoUrl,
                        barcode: p.barcode,
                        sold: p.sold
                    }))
                );

                // 3. Sync Customers
                await Promise.allSettled(
                    storeData.customers.map(c => upsertCustomer({
                        id: c.id.length === 36 ? c.id : undefined,
                        name: c.name,
                        phone: c.phone,
                        email: c.email,
                        address: c.address,
                        company: c.company,
                        photo_url: c.photoUrl,
                        notes: c.notes
                    }))
                );

                // 4. Sync Suppliers
                await Promise.allSettled(
                    storeData.suppliers.map(s => upsertSupplier({
                        id: s.id.length === 36 ? s.id : undefined,
                        name: s.name,
                        phone: s.phone,
                        email: s.email,
                        address: s.address,
                        photo_url: s.photoUrl,
                        notes: s.notes
                    }))
                );

                // 5. Sync Invoices
                await Promise.allSettled(
                    storeData.invoices.map(inv => {
                        const items = inv.items?.map(item => ({
                            product_id: item.productId,
                            product_name: item.productName,
                            quantity: item.quantity,
                            price: item.price,
                            total: item.total
                        })) || [];

                        return upsertInvoice({
                            id: inv.id.length === 36 ? inv.id : undefined,
                            invoice_number: inv.invoiceNumber,
                            customer_id: inv.customerId,
                            customer_name: inv.customerName,
                            total: inv.total,
                            subtotal: inv.subtotal,
                            discount: inv.discount,
                            tax: inv.tax,
                            shipping_cost: inv.shippingCost,
                            payment_method: inv.paymentMethod,
                            status: inv.status,
                            type: inv.type,
                            due_date: inv.dueDate,
                            debt_type: inv.debtType,
                            notes: inv.notes,
                            date: inv.date
                        }, items);
                    })
                );

                // 6. Sync Daily Sales
                await Promise.allSettled(
                    storeData.dailySales.map(sale => upsertDailySale({
                        id: sale.id?.length === 36 ? sale.id : undefined,
                        date: sale.date,
                        total_sales: sale.totalSales || sale.total || 0,
                        product_id: sale.productId,
                        product_name: sale.productName,
                        product_code: sale.productCode,
                        quantity: sale.quantity,
                        total: sale.total,
                        unit_price: sale.unitPrice,
                        payment_method: sale.paymentMethod,
                        remaining_quantity: sale.remainingQuantity
                    }))
                );

                // 7. Sync Expenses
                await Promise.allSettled(
                    storeData.expenses.map(exp => upsertExpense({
                        id: exp.id.length === 36 ? exp.id : undefined,
                        description: exp.description,
                        amount: exp.amount,
                        category: exp.category,
                        date: exp.date,
                        notes: exp.notes,
                        payment_method: exp.paymentMethod,
                        reference: exp.reference
                    }))
                );

                // 8. Sync Creditors
                await Promise.allSettled(
                    storeData.creditors.map(c => upsertCreditor({
                        id: c.id.length === 36 ? c.id : undefined,
                        name: c.name,
                        customer_id: c.customer_id,
                        phone: c.phone,
                        email: c.email,
                        address: c.address,
                        amount: c.amount,
                        notes: c.notes,
                        product_code: c.productCode,
                        product_name: c.productName,
                        quantity: c.quantity,
                        price: c.price,
                        total: c.total,
                        date: c.date,
                        status: c.status
                    }))
                );

                // 9. Sync Debtors
                await Promise.allSettled(
                    storeData.debtors.map(d => upsertDebtor({
                        id: d.id.length === 36 ? d.id : undefined,
                        name: d.name,
                        customer_id: d.customer_id,
                        phone: d.phone,
                        total_amount: d.totalAmount,
                        products: d.products,
                        notes: d.notes,
                        date: d.date,
                        status: d.status
                    }))
                );

                // 10. Sync Returns
                await Promise.allSettled(
                    storeData.returns.map(r => upsertReturn({
                        id: r.id.length === 36 ? r.id : undefined,
                        return_number: r.returnNumber,
                        invoice_id: r.invoiceId,
                        customer_id: r.customerId,
                        customer_name: r.customerName,
                        products: r.products,
                        total: r.total,
                        reason: r.reason,
                        notes: r.notes,
                        status: r.status,
                        date: r.date,
                        invoice_number: r.invoiceNumber
                    }))
                );

                toast({
                    title: "اكتملت المزامنة",
                    description: "تم ترحيل جميع البيانات المحلية إلى السحابة بنجاح.",
                });

            } catch (error) {
                console.error("Auto sync failed:", error);
            } finally {
                isSyncing.current = false;
            }
        };

        // Run once on mount if online
        if (navigator.onLine) {
            // Small delay to let auth initialize
            setTimeout(handleSync, 2000);
        }

        // Listen for online event
        window.addEventListener('online', handleSync);

        return () => {
            window.removeEventListener('online', handleSync);
        };
    }, [isAuthenticated, toast]);
}
