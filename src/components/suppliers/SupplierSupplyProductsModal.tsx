import React, { useState, useRef, useMemo } from "react";
import {
  X,
  Upload,
  Plus,
  Trash2,
  Package,
  Boxes,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Download,
  Info,
  ArrowRight,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import * as XLSX from "xlsx";
import { Supplier, Product, Creditor, ProductMovement, Warehouse } from "@/types";
import { loadStoreData, saveStoreData, generateId } from "@/utils/localStorage";
import { upsertProduct, insertProducts, upsertCreditor, upsertProductMovementDB } from "@/lib/database";
import { formatCurrency, normalizeArabic } from "@/utils/formatters";
import { useLocale } from "@/hooks/useLocale";

export interface SupplyItemRow {
  id: string;
  name: string;
  code: string;
  quantity: number;
  cost: number;
  price: number;
  category?: string;
  isExisting?: boolean;
  existingProductId?: string;
}

interface SupplierSupplyProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  suppliers: Supplier[];
  products: Product[];
  onSuccess: (addedProducts: Product[], totalCost: number, supplierId: string) => void;
}

export default function SupplierSupplyProductsModal({
  isOpen,
  onClose,
  supplier: initialSupplier,
  suppliers,
  products,
  onSuccess
}: SupplierSupplyProductsModalProps) {
  const { locale, isRTL } = useLocale();
  const isFr = locale === "fr";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplier?.id || (suppliers[0]?.id || "")
  );

  // Active Tab: manual | excel | restock
  const [activeTab, setActiveTab] = useState<"manual" | "excel" | "restock">("manual");

  // Options
  const [recordCreditorDebt, setRecordCreditorDebt] = useState<boolean>(true);
  const [recordProductMovement, setRecordProductMovement] = useState<boolean>(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(() => {
    try {
      const store = loadStoreData();
      return store.warehouses?.[0]?.id || "WH-MAIN";
    } catch {
      return "WH-MAIN";
    }
  });

  // Manual rows
  const [manualRows, setManualRows] = useState<SupplyItemRow[]>([
    {
      id: generateId(),
      name: "",
      code: `P-${Date.now().toString().slice(-6)}-1`,
      quantity: 1,
      cost: 0,
      price: 0,
      category: ""
    }
  ]);

  // Excel parsed rows
  const [excelRows, setExcelRows] = useState<SupplyItemRow[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState<number>(25);

  // Restock existing product mode
  const [restockSearch, setRestockSearch] = useState<string>("");
  const [selectedProductToRestock, setSelectedProductToRestock] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockCost, setRestockCost] = useState<number>(0);
  const [restockPrice, setRestockPrice] = useState<number>(0);

  // Status
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successInfo, setSuccessInfo] = useState<{
    count: number;
    totalCost: number;
    supplierName: string;
  } | null>(null);

  // Update selected supplier if initialSupplier changes
  React.useEffect(() => {
    if (initialSupplier?.id) {
      setSelectedSupplierId(initialSupplier.id);
    } else if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [initialSupplier, suppliers]);

  const currentSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || initialSupplier || null;
  }, [suppliers, selectedSupplierId, initialSupplier]);

  // Handle adding a manual row
  const handleAddManualRow = () => {
    const nextIdx = manualRows.length + 1;
    setManualRows(prev => [
      ...prev,
      {
        id: generateId(),
        name: "",
        code: `P-${Date.now().toString().slice(-6)}-${nextIdx}`,
        quantity: 1,
        cost: 0,
        price: 0,
        category: ""
      }
    ]);
  };

  // Handle removing a manual row
  const handleRemoveManualRow = (id: string) => {
    if (manualRows.length <= 1) return;
    setManualRows(prev => prev.filter(r => r.id !== id));
  };

  // Handle updating a manual row
  const handleUpdateManualRow = (id: string, field: keyof SupplyItemRow, val: any) => {
    setManualRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        // If cost changes and price is 0 or less, auto-suggest a 25% profit margin price
        if (field === "cost" && Number(val) > 0 && (!r.price || r.price === 0)) {
          updated.price = Math.round(Number(val) * 1.25 * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Handle Excel parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!rawRows || rawRows.length === 0) {
        setError(isFr ? "Le fichier Excel est vide" : "ملف الإكسل فارغ ولا يحتوي على بيانات");
        return;
      }

      const parsed: SupplyItemRow[] = [];
      const existingProductMap = new Map<string, Product>();
      products.forEach(p => {
        if (p.code) existingProductMap.set(p.code.trim().toLowerCase(), p);
        if (p.name) existingProductMap.set(normalizeArabic(p.name).toLowerCase(), p);
      });

      rawRows.forEach((rawRow, idx) => {
        const row: any = {};
        Object.keys(rawRow).forEach(key => {
          row[key.trim()] = rawRow[key];
        });

        // Name
        const name = String(
          row["اسم المنتج"] ??
            row["اسم_المنتج"] ??
            row["الاسم"] ??
            row["الصنف"] ??
            row["البيان"] ??
            row["المادة"] ??
            row["Nom"] ??
            row["Nom du produit"] ??
            row["Désignation"] ??
            row["Designation"] ??
            row["Article"] ??
            row["name"] ??
            row["Name"] ??
            row["Description"] ??
            ""
        ).trim();

        if (!name) return; // skip row without product name

        // Code
        const code = String(
          row["رمز المنتج"] ??
            row["كود"] ??
            row["الرمز"] ??
            row["الباركود"] ??
            row["رقم الصنف"] ??
            row["Code"] ??
            row["code"] ??
            row["barcode"] ??
            row["Barcode"] ??
            row["Référence"] ??
            row["Reference"] ??
            ""
        ).trim();

        // Quantity
        const rawQty =
          row["الكمية"] ??
          row["كمية"] ??
          row["العدد"] ??
          row["Quantité"] ??
          row["Quantite"] ??
          row["Qte"] ??
          row["Qté"] ??
          row["quantity"] ??
          row["Quantity"] ??
          row["Qty"] ??
          1;
        const quantity = Math.max(1, parseInt(String(rawQty).replace(/[^\d]/g, "")) || 1);

        // Cost (purchase price)
        const rawCost =
          row["سعر الشراء"] ??
          row["سعر_الشراء"] ??
          row["التكلفة"] ??
          row["تكلفة"] ??
          row["Prix d'achat"] ??
          row["Prix achat"] ??
          row["Coût"] ??
          row["Cout"] ??
          row["cost"] ??
          row["Cost"] ??
          0;
        const cost = Math.max(0, parseFloat(String(rawCost).replace(/[^\d.]/g, "")) || 0);

        // Selling Price
        const rawPrice =
          row["سعر البيع"] ??
          row["سعر_البيع"] ??
          row["السعر"] ??
          row["سعر"] ??
          row["Prix de vente"] ??
          row["Prix vente"] ??
          row["Prix"] ??
          row["price"] ??
          row["Price"] ??
          row["sell_price"] ??
          0;
        let price = Math.max(0, parseFloat(String(rawPrice).replace(/[^\d.]/g, "")) || 0);

        // If price is 0, auto calculate from cost + default markup
        if (price === 0 && cost > 0) {
          price = Math.round(cost * (1 + defaultMarkupPercent / 100) * 100) / 100;
        }

        // Category
        const category = String(
          row["الفئة"] ??
            row["التصنيف"] ??
            row["فئة"] ??
            row["تصنيف"] ??
            row["Catégorie"] ??
            row["Categorie"] ??
            row["category"] ??
            row["Category"] ??
            ""
        ).trim();

        // Check if existing in stock
        const matched =
          (code && existingProductMap.get(code.toLowerCase())) ||
          existingProductMap.get(normalizeArabic(name).toLowerCase());

        parsed.push({
          id: generateId(),
          name,
          code: code || matched?.code || `P-${Date.now().toString().slice(-6)}-${idx + 1}`,
          quantity,
          cost: cost || (matched?.cost || 0),
          price: price || (matched?.price || (cost > 0 ? cost * 1.25 : 0)),
          category: category || matched?.category || "",
          isExisting: !!matched,
          existingProductId: matched?.id
        });
      });

      if (parsed.length === 0) {
        setError(
          isFr
            ? "Aucune ligne valide n'a été détectée dans le fichier. Veuillez vérifier les en-têtes."
            : "لم يتم العثور على صفوف صالحة بالملف. تأكد من وجود عمود لاسم المنتج والكمية والتكلفة."
        );
        return;
      }

      setExcelRows(parsed);
      setActiveTab("excel");
    } catch (err: any) {
      console.error("Error parsing Excel:", err);
      setError(
        isFr
          ? "Erreur lors de la lecture du fichier Excel: " + err.message
          : "حدث خطأ أثناء قراءة ملف الإكسل: " + err.message
      );
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "اسم المنتج": "شاشة كمبيوتر 24 بوصة FHD",
        "كود الصنف": "SCR-24-FHD",
        "الكمية": 10,
        "سعر الشراء": 3500,
        "سعر البيع": 4500,
        "التصنيف": "إلكترونيات"
      },
      {
        "اسم المنتج": "لوحة مفاتيح لاسلكية RGB",
        "كود الصنف": "KB-WL-RGB",
        "الكمية": 25,
        "سعر الشراء": 450,
        "سعر البيع": 650,
        "التصنيف": "ملحقات"
      },
      {
        "اسم المنتج": "ماوس ألعاب بصري 3200DPI",
        "كود الصنف": "MS-GM-3200",
        "الكمية": 30,
        "سعر الشراء": 220,
        "سعر البيع": 350,
        "التصنيف": "ملحقات"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نموذج توريد منتجات");
    XLSX.writeFile(wb, "نموذج_توريد_منتجات_الموردين.xlsx");
  };

  // Re-calculate prices in excelRows if defaultMarkupPercent changes
  const applyMarkupToExcelRows = (markup: number) => {
    setDefaultMarkupPercent(markup);
    setExcelRows(prev =>
      prev.map(r => ({
        ...r,
        price: r.cost > 0 ? Math.round(r.cost * (1 + markup / 100) * 100) / 100 : r.price
      }))
    );
  };

  // Select product for restock mode
  const handleSelectProductToRestock = (p: Product) => {
    setSelectedProductToRestock(p);
    setRestockCost(p.cost || 0);
    setRestockPrice(p.price || 0);
    setRestockQty(10);
  };

  // Totals calculations
  const currentItems = useMemo(() => {
    if (activeTab === "manual") {
      return manualRows.filter(r => r.name.trim().length > 0);
    }
    if (activeTab === "excel") {
      return excelRows;
    }
    if (activeTab === "restock" && selectedProductToRestock) {
      return [
        {
          id: generateId(),
          name: selectedProductToRestock.name,
          code: selectedProductToRestock.code,
          quantity: restockQty,
          cost: restockCost,
          price: restockPrice,
          category: selectedProductToRestock.category,
          isExisting: true,
          existingProductId: selectedProductToRestock.id
        }
      ];
    }
    return [];
  }, [
    activeTab,
    manualRows,
    excelRows,
    selectedProductToRestock,
    restockQty,
    restockCost,
    restockPrice
  ]);

  const summary = useMemo(() => {
    const totalCount = currentItems.length;
    const totalUnits = currentItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const totalCost = currentItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.cost) || 0),
      0
    );
    const expectedRevenue = currentItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0),
      0
    );
    const expectedProfit = expectedRevenue - totalCost;

    return { totalCount, totalUnits, totalCost, expectedRevenue, expectedProfit };
  }, [currentItems]);

  // Main Submit: Add products to stock & optional creditor / movement
  const handleSubmit = async () => {
    setError("");

    if (!selectedSupplierId) {
      setError(isFr ? "Veuillez choisir un fournisseur" : "يرجى تحديد المورد أولاً");
      return;
    }

    if (currentItems.length === 0) {
      setError(
        isFr
          ? "Veuillez saisir au moins un produit avec son nom"
          : "يرجى إضافة منتج واحد على الأقل مع الاسم والكمية"
      );
      return;
    }

    // Validate that items have price > 0 so they can be sold again
    const itemsWithoutPrice = currentItems.filter(it => !it.price || it.price <= 0);
    if (itemsWithoutPrice.length > 0) {
      const confirmNoPrice = window.confirm(
        isFr
          ? `Attention : ${itemsWithoutPrice.length} article(s) n'ont pas de prix de vente défini. Voulez-vous continuer quand même ?`
          : `تنبيه: يوجد ${itemsWithoutPrice.length} منتج بدون سعر بيع محدد. هل تريد المتابعة وإضافتها للمخزن؟`
      );
      if (!confirmNoPrice) return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      const storeData = loadStoreData();
      const existingProducts: Product[] = storeData.products || [];
      const updatedProductsList: Product[] = [...existingProducts];
      const newlyAddedProducts: Product[] = [];
      const movementsToCreate: ProductMovement[] = [];

      currentItems.forEach(item => {
        const itemCode = (item.code || "").trim();
        const itemNormName = normalizeArabic(item.name).trim();

        // Check if product already exists in stock
        const existingIdx = updatedProductsList.findIndex(p => {
          if (item.existingProductId && p.id === item.existingProductId) return true;
          if (itemCode && p.code && p.code.trim().toLowerCase() === itemCode.toLowerCase())
            return true;
          if (itemNormName && normalizeArabic(p.name).trim().toLowerCase() === itemNormName.toLowerCase())
            return true;
          return false;
        });

        if (existingIdx >= 0) {
          // UPDATE EXISTING PRODUCT STOCK
          const oldProd = updatedProductsList[existingIdx];
          const newQty = (oldProd.quantity || 0) + (Number(item.quantity) || 0);

          const updatedProd: Product = {
            ...oldProd,
            quantity: newQty,
            cost: item.cost > 0 ? Number(item.cost) : oldProd.cost,
            price: item.price > 0 ? Number(item.price) : oldProd.price,
            supplierId: selectedSupplierId,
            warehouseId: selectedWarehouseId || oldProd.warehouseId,
            category: item.category?.trim() || oldProd.category,
            updatedAt: now
          };

          updatedProductsList[existingIdx] = updatedProd;
          newlyAddedProducts.push(updatedProd);

          // Movement
          if (recordProductMovement) {
            movementsToCreate.push({
              id: generateId(),
              productId: updatedProd.id,
              productName: updatedProd.name,
              productCode: updatedProd.code,
              customerId: selectedSupplierId,
              customerName: currentSupplier?.name || "المورد",
              invoiceNumber: `SUPP-${Date.now().toString().slice(-6)}`,
              date: now.split("T")[0],
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.price) || 0,
              costPrice: Number(item.cost) || 0,
              total: (Number(item.quantity) || 0) * (Number(item.cost) || 0),
              type: "manual_adjustment",
              isManualItem: false,
              notes: `توريد واستيراد بضاعة من المورد: ${currentSupplier?.name || ""}`,
              createdAt: now,
              updatedAt: now
            });
          }
        } else {
          // INSERT NEW PRODUCT TO STOCK
          const finalCode = itemCode || `P-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
          const newProd: Product = {
            id: generateId(),
            code: finalCode,
            name: item.name.trim(),
            quantity: Number(item.quantity) || 0,
            cost: Number(item.cost) || 0,
            price: Number(item.price) || 0,
            lowStockThreshold: 5,
            supplierId: selectedSupplierId,
            warehouseId: selectedWarehouseId,
            category: item.category?.trim() || undefined,
            sold: 0,
            createdAt: now,
            updatedAt: now
          };

          updatedProductsList.unshift(newProd);
          newlyAddedProducts.push(newProd);

          // Movement
          if (recordProductMovement) {
            movementsToCreate.push({
              id: generateId(),
              productId: newProd.id,
              productName: newProd.name,
              productCode: newProd.code,
              customerId: selectedSupplierId,
              customerName: currentSupplier?.name || "المورد",
              invoiceNumber: `SUPP-${Date.now().toString().slice(-6)}`,
              date: now.split("T")[0],
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.price) || 0,
              costPrice: Number(item.cost) || 0,
              total: (Number(item.quantity) || 0) * (Number(item.cost) || 0),
              type: "manual_adjustment",
              isManualItem: false,
              notes: `توريد واستيراد منتج جديد للمخزن من المورد: ${currentSupplier?.name || ""}`,
              createdAt: now,
              updatedAt: now
            });
          }
        }
      });

      // 1. Save Products Locally
      storeData.products = updatedProductsList;

      // 2. Add movements locally
      if (movementsToCreate.length > 0) {
        storeData.productMovements = [
          ...movementsToCreate,
          ...(storeData.productMovements || [])
        ];
      }

      // 3. Optional: Register Creditor Payable for the Supplier
      if (recordCreditorDebt && summary.totalCost > 0) {
        const itemSummaryText =
          currentItems.length === 1
            ? `${currentItems[0].name} (الكمية: ${currentItems[0].quantity})`
            : `توريد بضاعة للمخزن: ${currentItems.length} صنف (${summary.totalUnits} قطعة)`;

        const newCreditor: Creditor = {
          id: generateId(),
          name: currentSupplier?.name || "مورد",
          customer_id: selectedSupplierId,
          phone: currentSupplier?.phone || "",
          amount: summary.totalCost,
          total: summary.totalCost,
          price: summary.totalCost,
          quantity: summary.totalUnits,
          productName: itemSummaryText,
          productCode: currentItems[0]?.code || "",
          notes: `فاتورة توريد بضاعة واردة للمخزن من المورد ${currentSupplier?.name || ""}`,
          date: now.split("T")[0],
          createdAt: now,
          status: "pending"
        };

        storeData.creditors = [newCreditor, ...(storeData.creditors || [])];

        // Cloud sync for creditor
        try {
          await upsertCreditor({
            name: newCreditor.name,
            phone: newCreditor.phone,
            amount: newCreditor.amount,
            customer_id: selectedSupplierId,
            product_name: newCreditor.productName,
            product_code: newCreditor.productCode,
            quantity: newCreditor.quantity,
            price: newCreditor.price,
            total: newCreditor.total,
            notes: newCreditor.notes,
            status: "pending"
          });
        } catch (credErr) {
          console.warn("Could not sync creditor to cloud:", credErr);
        }
      }

      // Save all updated store data to localStorage
      saveStoreData(storeData);

      // Trigger cloud sync for products in background
      try {
        await insertProducts(
          newlyAddedProducts.map(p => ({
            id: p.id.length === 36 ? p.id : undefined,
            code: p.code,
            name: p.name,
            price: p.price,
            cost: p.cost,
            quantity: p.quantity,
            low_stock_threshold: p.lowStockThreshold || 5,
            category: p.category,
            supplier_id: selectedSupplierId.length === 36 ? selectedSupplierId : undefined,
            warehouse_id: p.warehouseId && p.warehouseId.length === 36 ? p.warehouseId : undefined,
            sold: p.sold || 0
          }))
        );
      } catch (cloudErr) {
        console.warn("Could not batch insert products to cloud:", cloudErr);
      }

      // Sync movements to cloud in background
      if (movementsToCreate.length > 0) {
        for (const mov of movementsToCreate) {
          try {
            await upsertProductMovementDB({
              id: mov.id,
              product_id: mov.productId,
              product_name: mov.productName,
              product_code: mov.productCode,
              customer_id: mov.customerId,
              customer_name: mov.customerName,
              invoice_number: mov.invoiceNumber,
              date: mov.date,
              quantity: mov.quantity,
              unit_price: mov.unitPrice,
              total: mov.total,
              cost_price: mov.costPrice,
              type: mov.type,
              is_manual_item: false,
              notes: mov.notes
            });
          } catch {
            // ignore
          }
        }
      }

      // Notify parent & trigger storage event
      window.dispatchEvent(new Event("storage"));
      onSuccess(newlyAddedProducts, summary.totalCost, selectedSupplierId);

      setSuccessInfo({
        count: currentItems.length,
        totalCost: summary.totalCost,
        supplierName: currentSupplier?.name || ""
      });

      // Reset form states
      setManualRows([
        {
          id: generateId(),
          name: "",
          code: `P-${Date.now().toString().slice(-6)}-1`,
          quantity: 1,
          cost: 0,
          price: 0,
          category: ""
        }
      ]);
      setExcelRows([]);
      setSelectedProductToRestock(null);
    } catch (err: any) {
      console.error("Error supplying products to inventory:", err);
      setError(
        isFr
          ? "Une erreur est survenue lors de l'enregistrement des produits : " + err.message
          : "حدث خطأ أثناء إضافة المنتجات للمخزون: " + (err.message || "")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Boxes size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {isFr
                    ? "Approvisionnement & Importation de Produits au Stock"
                    : "توريد واستيراد منتجات للمخزون للبيع من جديد"}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {isFr ? "Stock & Vente" : "مخزون ومبيعات جاهزة"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isFr
                  ? "Ajoutez des articles fournis par ce fournisseur directement dans votre inventaire pour les vendre"
                  : "إدخال بضائع المورد إلى المخزن وتحديد سعر التكلفة وسعر البيع لتباع في الفواتير فوراً"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Modal State */}
        {successInfo ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900">
                {isFr
                  ? "Produits ajoutés au stock avec succès !"
                  : "تمت إضافة المنتجات المستوردة للمخزون بنجاح!"}
              </h4>
              <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                {isFr
                  ? `Félicitations, ${successInfo.count} article(s) ont été enregistrés dans votre inventaire sous le fournisseur "${successInfo.supplierName}". Vous pouvez maintenant les facturer et les vendre immédiatement.`
                  : `تم تسجيل ${successInfo.count} صنف بمخزونك بنجاح تحت حساب المورد "${successInfo.supplierName}". أصبحت جميع المنتجات مجهزة بأسعار البيع والتكلفة ومتاحة للبيع الفوري في الفواتير.`}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-flex items-center gap-6 text-xs font-bold text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {isFr ? "Articles importés" : "عدد الأصناف"}
                </span>
                <span className="text-base font-black text-blue-600 font-sans">
                  {successInfo.count}
                </span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {isFr ? "Valeur d'achat totale" : "إجمالي تكلفة البضاعة"}
                </span>
                <span className="text-base font-black text-emerald-600 font-sans">
                  {formatCurrency(successInfo.totalCost)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setSuccessInfo(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isFr ? "Ajouter un autre lot" : "توريد دفعة أخرى"}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {isFr ? "Terminer et Fermer" : "تم وإنهاء"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Config Row: Supplier selection, Warehouse, and Integration Checkboxes */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3.5 shrink-0">
              {/* Supplier Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isFr ? "Fournisseur d'Origine *" : "المورد صاحب البضاعة *"}
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="" disabled>
                    {isFr ? "-- Choisir un fournisseur --" : "-- اختر المورد --"}
                  </option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isFr ? "Entrepôt / Dépôt de destination" : "المستودع / المخزن المستلم"}
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={e => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  {(() => {
                    const store = loadStoreData();
                    const warehouses: Warehouse[] = store.warehouses || [
                      { id: "WH-MAIN", name: "المخزن الرئيسي", isActive: true, createdAt: "" }
                    ];
                    return warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* Accounting Checkboxes */}
              <div className="flex flex-col justify-center space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={recordCreditorDebt}
                    onChange={e => setRecordCreditorDebt(e.target.checked)}
                    className="rounded accent-emerald-600 cursor-pointer"
                  />
                  <span>
                    {isFr
                      ? "Enregistrer la dette au fournisseur (Dû à lui)"
                      : "تسجيل الفاتورة كمستحق مالي للمورد (دائن)"}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={recordProductMovement}
                    onChange={e => setRecordProductMovement(e.target.checked)}
                    className="rounded accent-blue-600 cursor-pointer"
                  />
                  <span>
                    {isFr
                      ? "Tracer le mouvement d'entrée en stock"
                      : "تسجيل حركة وارد في سجل حركات المخزن"}
                  </span>
                </label>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100/60 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
              <button
                onClick={() => setActiveTab("manual")}
                className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "manual"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Plus size={14} />
                <span>{isFr ? "Saisie Manuelle / Rapide" : "إدخال يدوي وسريع للأصناف"}</span>
              </button>

              <button
                onClick={() => setActiveTab("excel")}
                className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "excel"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileSpreadsheet size={14} />
                <span>
                  {isFr
                    ? `Importer depuis Excel (${excelRows.length})`
                    : `استيراد بضاعة من ملف إكسل (${excelRows.length})`}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("restock")}
                className={`py-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "restock"
                    ? "border-blue-600 text-blue-700 bg-white rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Package size={14} />
                <span>
                  {isFr
                    ? "Réapprovisionner un Produit Existant"
                    : "زيادة كمية منتج موجود في المخزن"}
                </span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
                <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-700">
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Modal Body Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* ── TAB 1: MANUAL ENTRY ── */}
              {activeTab === "manual" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {isFr
                        ? "Saisissez les produits importés. Le prix de vente est celui auquel le produit sera proposé aux clients lors de la facturation."
                        : "أدخل المنتجات الموردة مع الكمية وتكلفة الشراء وسعر البيع الذي ستباع به للعملاء."}
                    </p>
                    <button
                      type="button"
                      onClick={handleAddManualRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>{isFr ? "+ Ajouter une ligne" : "+ إضافة صنف آخر"}</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className={`w-full ${isRTL ? "text-right" : "text-left"} text-xs`}>
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5 w-10 text-center">#</th>
                            <th className="p-2.5 min-w-[200px]">
                              {isFr ? "Nom du Produit *" : "اسم المنتج المستورد *"}
                            </th>
                            <th className="p-2.5 min-w-[120px]">
                              {isFr ? "Code / Réf" : "الكود / الباركود"}
                            </th>
                            <th className="p-2.5 w-24 text-center">
                              {isFr ? "Quantité *" : "الكمية *"}
                            </th>
                            <th className="p-2.5 min-w-[110px] text-center">
                              {isFr ? "Prix Achat (Coût) *" : "سعر الشراء (التكلفة) *"}
                            </th>
                            <th className="p-2.5 min-w-[110px] text-center bg-blue-50/50 text-blue-900">
                              {isFr ? "Prix de Vente *" : "سعر البيع (للعميل) *"}
                            </th>
                            <th className="p-2.5 min-w-[100px] text-center">
                              {isFr ? "Catégorie" : "التصنيف"}
                            </th>
                            <th className="p-2.5 w-24 text-center">
                              {isFr ? "Total Achat" : "إجمالي الشراء"}
                            </th>
                            <th className="p-2.5 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {manualRows.map((row, idx) => {
                            const subtotal = (Number(row.quantity) || 0) * (Number(row.cost) || 0);
                            return (
                              <tr key={row.id} className="hover:bg-slate-50/60">
                                <td className="p-2 text-center text-slate-400 font-sans font-bold">
                                  {idx + 1}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder={
                                      isFr
                                        ? "Ex: Imprimante HP LaserJet"
                                        : "مثال: زيت محرك 5W30 أصلي"
                                    }
                                    value={row.name}
                                    onChange={e =>
                                      handleUpdateManualRow(row.id, "name", e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                                    required
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="كود الصنف"
                                    value={row.code}
                                    onChange={e =>
                                      handleUpdateManualRow(row.id, "code", e.target.value)
                                    }
                                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.quantity}
                                    onChange={e =>
                                      handleUpdateManualRow(
                                        row.id,
                                        "quantity",
                                        Math.max(1, parseInt(e.target.value) || 1)
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold font-sans text-slate-900 outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    value={row.cost || ""}
                                    onChange={e =>
                                      handleUpdateManualRow(
                                        row.id,
                                        "cost",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-lg text-xs font-bold font-sans text-slate-800 outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="p-2 bg-blue-50/30">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    value={row.price || ""}
                                    onChange={e =>
                                      handleUpdateManualRow(
                                        row.id,
                                        "price",
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-center bg-white border border-blue-300 rounded-lg text-xs font-black font-sans text-blue-700 outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="عام"
                                    value={row.category || ""}
                                    onChange={e =>
                                      handleUpdateManualRow(row.id, "category", e.target.value)
                                    }
                                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-500"
                                  />
                                </td>
                                <td className="p-2 text-center font-bold font-sans text-slate-900">
                                  {formatCurrency(subtotal)}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveManualRow(row.id)}
                                    disabled={manualRows.length <= 1}
                                    className={`p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ${
                                      manualRows.length <= 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                    }`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: EXCEL IMPORT ── */}
              {activeTab === "excel" && (
                <div className="space-y-4">
                  {/* Upload Dropzone */}
                  <div className="p-6 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl text-center space-y-3 transition-colors">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />

                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                      <FileSpreadsheet size={24} />
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {excelFileName ? (
                          <span className="text-indigo-600">{excelFileName}</span>
                        ) : isFr ? (
                          "Sélectionnez ou glissez votre fichier Excel de marchandises"
                        ) : (
                          "اختر أو اسحب ملف إكسل (Excel) الخاص ببضاعة المورد المستوردة"
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                        {isFr
                          ? "Le système identifie automatiquement les colonnes : Nom du produit, Code, Quantité, Prix d'achat et Prix de vente."
                          : "يتعرف النظام تلقائياً على الأعمدة: اسم المنتج، الكود، الكمية، سعر الشراء وسعر البيع والتصنيف."}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>{isFr ? "Parcourir le fichier..." : "استعراض واختيار الملف..."}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Download size={14} />
                        <span>{isFr ? "Télécharger Modèle" : "تحميل نموذج Excel جاهز"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Excel Rows Preview */}
                  {excelRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>
                            {isFr
                              ? `${excelRows.length} produit(s) prêt(s) à être intégrés dans le stock`
                              : `تم التعرف على ${excelRows.length} منتج جاهز للإدراج في المخزن`}
                          </span>
                        </div>

                        {/* Automatic Markup setting */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 font-medium">
                            {isFr ? "Marge de vente par défaut :" : "هامش ربح البيع التلقائي:"}
                          </span>
                          <div className="flex items-center gap-1">
                            {[15, 20, 25, 30, 40].map(pct => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => applyMarkupToExcelRows(pct)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold font-sans cursor-pointer transition-colors ${
                                  defaultMarkupPercent === pct
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                +{pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                        <table className={`w-full ${isRTL ? "text-right" : "text-left"} text-xs`}>
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="p-2.5 w-10 text-center">#</th>
                              <th className="p-2.5">{isFr ? "Produit" : "اسم الصنف"}</th>
                              <th className="p-2.5">{isFr ? "Code" : "الكود"}</th>
                              <th className="p-2.5 text-center">{isFr ? "Quantité" : "الكمية"}</th>
                              <th className="p-2.5 text-center">{isFr ? "Prix Achat" : "سعر الشراء"}</th>
                              <th className="p-2.5 text-center bg-blue-50/50 text-blue-900">
                                {isFr ? "Prix de Vente" : "سعر البيع المقترح"}
                              </th>
                              <th className="p-2.5 text-center">{isFr ? "État" : "الحالة"}</th>
                              <th className="p-2.5 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {excelRows.map((row, idx) => (
                              <tr key={row.id} className="hover:bg-slate-50">
                                <td className="p-2 text-center text-slate-400 font-sans font-bold">
                                  {idx + 1}
                                </td>
                                <td className="p-2 font-bold text-slate-900">{row.name}</td>
                                <td className="p-2 font-mono text-slate-600">{row.code}</td>
                                <td className="p-2 text-center font-bold font-sans text-slate-800">
                                  {row.quantity}
                                </td>
                                <td className="p-2 text-center font-bold font-sans text-slate-700">
                                  {formatCurrency(row.cost)}
                                </td>
                                <td className="p-2 text-center font-black font-sans text-blue-700 bg-blue-50/30">
                                  {formatCurrency(row.price)}
                                </td>
                                <td className="p-2 text-center">
                                  {row.isExisting ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                      {isFr ? "Stock existant (+)" : "موجود مسبقاً (زيادة كمية)"}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      {isFr ? "Nouveau produit" : "صنف جديد كلياً"}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExcelRows(prev => prev.filter(r => r.id !== row.id))
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: RESTOCK EXISTING PRODUCT ── */}
              {activeTab === "restock" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isFr
                        ? "Rechercher un produit déjà dans l'inventaire :"
                        : "ابحث عن منتج موجود مسبقاً في المخزن لتوريد دفعة إضافية منه:"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        isFr
                          ? "Rechercher par nom ou code..."
                          : "اكتب اسم المنتج أو الكود للبحث في المخزون..."
                      }
                      value={restockSearch}
                      onChange={e => setRestockSearch(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold"
                    />
                  </div>

                  {/* Filtered Products List */}
                  {restockSearch.trim() && !selectedProductToRestock && (
                    <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {products
                        .filter(
                          p =>
                            normalizeArabic(p.name).includes(normalizeArabic(restockSearch)) ||
                            (p.code && p.code.toLowerCase().includes(restockSearch.toLowerCase()))
                        )
                        .slice(0, 10)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProductToRestock(p)}
                            className="p-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-xs text-slate-900">{p.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {p.code || "بدون كود"} | المخزون الحالي: {p.quantity || 0}
                              </p>
                            </div>
                            <div className="text-right text-xs">
                              <span className="font-bold text-slate-700 block">
                                بيع: {formatCurrency(p.price || 0)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                شراء: {formatCurrency(p.cost || 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Selected Product Restock Form */}
                  {selectedProductToRestock && (
                    <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {isFr ? "Produit sélectionné" : "المنتج المحدد للدفعة"}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">
                            {selectedProductToRestock.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {selectedProductToRestock.code} | {isFr ? "Stock actuel :" : "المخزون الحالي قبل التوريد:"}{" "}
                            <span className="font-bold text-slate-800 font-sans">
                              {selectedProductToRestock.quantity || 0}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProductToRestock(null)}
                          className="text-xs text-slate-400 hover:text-slate-700 underline cursor-pointer"
                        >
                          {isFr ? "Changer de produit" : "تغيير المنتج"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isFr ? "Quantité à ajouter *" : "الكمية الموردة الجديدة *"}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={restockQty}
                            onChange={e => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-sans text-slate-900 outline-none focus:border-blue-500"
                          />
                          <p className="text-[10px] text-emerald-600 font-bold mt-1">
                            {isFr ? "Nouveau stock total :" : "إجمالي المخزون بعد التوريد:"}{" "}
                            {(selectedProductToRestock.quantity || 0) + restockQty}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isFr ? "Prix d'achat unitaire (Coût)" : "سعر الشراء للوحدة (التكلفة)"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={restockCost}
                            onChange={e => setRestockCost(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-sans text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isFr ? "Prix de vente unitaire (Client)" : "سعر البيع للعميل (لكي يباع به)"}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={restockPrice}
                            onChange={e => setRestockPrice(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-blue-400 rounded-xl text-xs font-black font-sans text-blue-700 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Summary Bar & Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isFr ? "Nombre d'articles" : "الأصناف"}
                  </span>
                  <span className="font-bold text-slate-900 font-sans">
                    {summary.totalCount} {isFr ? "art." : "صنف"} ({summary.totalUnits} {isFr ? "unités" : "قطعة"})
                  </span>
                </div>

                <div className="h-6 w-px bg-slate-200" />

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isFr ? "Total Coût d'Achat" : "إجمالي تكلفة الشراء"}
                  </span>
                  <span className="font-black text-slate-900 font-sans">
                    {formatCurrency(summary.totalCost)}
                  </span>
                </div>

                <div className="h-6 w-px bg-slate-200" />

                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isFr ? "Revenu de Vente Prévu" : "قيمة البيع المتوقعة"}
                  </span>
                  <span className="font-black text-blue-600 font-sans">
                    {formatCurrency(summary.expectedRevenue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isFr ? "Annuler" : "إلغاء"}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || currentItems.length === 0}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                    loading || currentItems.length === 0
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 cursor-pointer"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{isFr ? "Enregistrement en stock..." : "جاري الإدخال للمخزون..."}</span>
                    </>
                  ) : (
                    <>
                      <Boxes size={15} />
                      <span>
                        {isFr
                          ? "Ajouter au Stock & Prêt à Vendre"
                          : "إضافة للمخزون واعتماد البيع"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
