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
    upsertReturn,
    upsertStoreSettings,
    getProducts,
    getCustomers,
    getInvoices,
    getDailySales,
    getExpenses,
    getSuppliers,
    getCreditors,
    getDebtors,
    getReturns,
    getWarehouses,
    getStoreSettings
} from "@/lib/database";
import { saveStoreData } from "@/utils/localStorage";

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

                // We only want to push if there's actually data to sync
                const hasData =
                    storeData.products.length > 0 ||
                    storeData.customers.length > 0 ||
                    storeData.invoices.length > 0 ||
                    storeData.dailySales.length > 0;

                if (hasData) {
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

                    // 11. Sync Settings & Company Profile
                    if (storeData.storeInfo || storeData.settings) {
                        await upsertStoreSettings({
                            store_name: storeData.storeInfo?.name,
                            store_phone: storeData.storeInfo?.phone,
                            store_email: storeData.storeInfo?.email,
                            store_photo_url: storeData.storeInfo?.photoUrl,
                            currency: storeData.settings?.currency,
                            locale: storeData.settings?.locale,
                            custom_currencies: storeData.settings?.customCurrencies,
                            custom_payment_methods: storeData.settings?.customPaymentMethods,
                        });
                    }

                    // --- PULL DATA FROM CLOUD TO LOCAL ---
                    toast({
                        title: "تحديث البيانات",
                        description: "جاري جلب البيانات من السحابة...",
                    });

                    const [
                        dbProducts,
                        dbCustomers,
                        dbInvoices,
                        dbDailySales,
                        dbExpenses,
                        dbSuppliers,
                        dbCreditors,
                        dbDebtors,
                        dbReturns,
                        dbWarehouses,
                        dbSettings
                    ] = await Promise.all([
                        getProducts(),
                        getCustomers(),
                        getInvoices(),
                        getDailySales(),
                        getExpenses(),
                        getSuppliers(),
                        getCreditors(),
                        getDebtors(),
                        getReturns(),
                        getWarehouses(),
                        getStoreSettings()
                    ]);

                    // Map DB rows to local format
                    const mapProduct = (p: any) => ({
                        id: p.id,
                        code: p.code,
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        cost: p.cost,
                        quantity: p.quantity,
                        lowStockThreshold: p.low_stock_threshold,
                        category: p.category,
                        supplierId: p.supplier_id,
                        warehouseId: p.warehouse_id,
                        photoUrl: p.photo_url,
                        barcode: p.barcode,
                        sold: p.sold,
                        createdAt: p.created_at,
                        updatedAt: p.updated_at
                    });

                    const mapCustomer = (c: any) => ({
                        id: c.id,
                        name: c.name,
                        phone: c.phone,
                        email: c.email,
                        address: c.address,
                        company: c.company,
                        photoUrl: c.photo_url,
                        notes: c.notes,
                        createdAt: c.created_at,
                        updatedAt: c.updated_at
                    });

                    const mapInvoice = (inv: any) => ({
                        id: inv.id,
                        invoiceNumber: inv.invoice_number,
                        customerId: inv.customer_id,
                        customerName: inv.customer_name,
                        total: inv.total,
                        subtotal: inv.subtotal,
                        discount: inv.discount,
                        tax: inv.tax,
                        shippingCost: inv.shipping_cost,
                        paymentMethod: inv.payment_method,
                        status: inv.status,
                        type: inv.type,
                        dueDate: inv.due_date,
                        debtType: inv.debt_type,
                        notes: inv.notes,
                        date: inv.date,
                        createdAt: inv.created_at,
                        updatedAt: inv.updated_at,
                        items: inv.invoice_items?.map((item: any) => ({
                            productId: item.product_id,
                            productName: item.product_name,
                            quantity: item.quantity,
                            price: item.price,
                            total: item.total
                        })) || []
                    });

                    const mapDailySale = (sale: any) => ({
                        id: sale.id,
                        date: sale.date,
                        totalSales: sale.total_sales,
                        productId: sale.product_id,
                        productName: sale.product_name,
                        productCode: sale.product_code,
                        quantity: sale.quantity,
                        total: sale.total,
                        unitPrice: sale.unit_price,
                        paymentMethod: sale.payment_method,
                        remainingQuantity: sale.remaining_quantity,
                        createdAt: sale.created_at
                    });

                    const mapExpense = (exp: any) => ({
                        id: exp.id,
                        description: exp.description,
                        amount: exp.amount,
                        category: exp.category,
                        date: exp.date,
                        notes: exp.notes,
                        paymentMethod: exp.payment_method,
                        reference: exp.reference,
                        createdAt: exp.created_at,
                        updatedAt: exp.updated_at
                    });

                    const mapSupplier = (sup: any) => ({
                        id: sup.id,
                        name: sup.name,
                        phone: sup.phone,
                        email: sup.email,
                        address: sup.address,
                        photoUrl: sup.photo_url,
                        notes: sup.notes,
                        createdAt: sup.created_at,
                        updatedAt: sup.updated_at
                    });

                    const mapCreditor = (cred: any) => ({
                        id: cred.id,
                        name: cred.name,
                        customer_id: cred.customer_id,
                        phone: cred.phone,
                        email: cred.email,
                        address: cred.address,
                        amount: cred.amount,
                        notes: cred.notes,
                        productCode: cred.product_code,
                        productName: cred.product_name,
                        quantity: cred.quantity,
                        price: cred.price,
                        total: cred.total,
                        date: cred.date,
                        status: cred.status,
                        createdAt: cred.created_at,
                        updatedAt: cred.updated_at
                    });

                    const mapDebtor = (deb: any) => ({
                        id: deb.id,
                        name: deb.name,
                        customer_id: deb.customer_id,
                        phone: deb.phone,
                        totalAmount: deb.total_amount,
                        products: deb.products,
                        notes: deb.notes,
                        date: deb.date,
                        status: deb.status,
                        createdAt: deb.created_at,
                        updatedAt: deb.updated_at
                    });

                    const mapReturn = (ret: any) => ({
                        id: ret.id,
                        returnNumber: ret.return_number,
                        invoiceId: ret.invoice_id,
                        customerId: ret.customer_id,
                        customerName: ret.customer_name,
                        products: ret.products,
                        total: ret.total,
                        reason: ret.reason,
                        notes: ret.notes,
                        status: ret.status,
                        date: ret.date,
                        invoiceNumber: ret.invoice_number,
                        createdAt: ret.created_at,
                        updatedAt: ret.updated_at
                    });

                    const mapWarehouse = (wh: any) => ({
                        id: wh.id,
                        name: wh.name,
                        location: wh.location,
                        description: wh.description,
                        isActive: wh.is_active,
                        createdAt: wh.created_at,
                        updatedAt: wh.updated_at
                    });

                    // Update local storage with cloud data
                    const newStoreData = {
                        ...storeData,
                        products: dbProducts.map(mapProduct),
                        customers: dbCustomers.map(mapCustomer),
                        invoices: dbInvoices.map(mapInvoice),
                        dailySales: dbDailySales.map(mapDailySale),
                        expenses: dbExpenses.map(mapExpense),
                        suppliers: dbSuppliers.map(mapSupplier),
                        creditors: dbCreditors.map(mapCreditor),
                        debtors: dbDebtors.map(mapDebtor),
                        returns: dbReturns.map(mapReturn),
                        warehouses: dbWarehouses.map(mapWarehouse),
                    };

                    if (dbSettings) {
                        newStoreData.storeInfo = {
                            name: dbSettings.store_name || "",
                            phone: dbSettings.store_phone || "",
                            email: dbSettings.store_email || "",
                            photoUrl: dbSettings.store_photo_url || "",
                        };
                        newStoreData.settings = {
                            currency: dbSettings.currency || "MRU",
                            locale: (dbSettings.locale as "ar" | "fr") || "ar",
                            customCurrencies: dbSettings.custom_currencies || [],
                            customPaymentMethods: dbSettings.custom_payment_methods || [],
                        };
                    }

                    saveStoreData(newStoreData);

                    // Trigger a storage event to update UI components that rely on localStorage
                    window.dispatchEvent(new Event('storage'));

                    toast({
                        title: "اكتملت المزامنة",
                        description: "تم تحديث البيانات بنجاح.",
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
