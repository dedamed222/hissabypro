import { useRef } from 'react';
import { Plus, Upload, Printer, Download, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { loadStoreData, saveStoreData, generateId } from '@/utils/localStorage';
import type { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/hooks/useLocale';

interface ProductsActionBarProps {
  onAddNew: () => void;
  products: Product[];
  onProductsUpdate: (products: Product[]) => void;
  onImportProducts?: (newProducts: (Partial<Product> & { name: string; code: string })[]) => Promise<void>;
  onOpenReports?: () => void;
}

export default function ProductsActionBar({
  onAddNew,
  products,
  onProductsUpdate,
  onImportProducts,
  onOpenReports,
}: ProductsActionBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLocale();

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const storeData = loadStoreData();
      const existingCodes = new Set(products.map((p) => String(p.code).trim()));
      let importedCount = 0;
      let skippedCount = 0;
      const newProducts: Product[] = [];
      const now = new Date().toISOString();

      jsonData.forEach((rawRow: any) => {
        const row: any = {};
        Object.keys(rawRow).forEach((key) => {
          row[key.trim()] = rawRow[key];
        });

        const code = String(
          row['رمز المنتج'] ?? row['كود'] ?? row['الرمز'] ?? row['code'] ?? row['Code'] ?? row['الباركود'] ?? row['رقم الصنف'] ?? row['رقم'] ?? row['الرقم'] ?? row['barcode'] ?? row['id'] ?? row['Code produit'] ?? row['Référence'] ?? ''
        ).trim();
        const name = String(
          row['اسم المنتج'] ?? row['الاسم'] ?? row['name'] ?? row['Name'] ?? row['اسم الصنف'] ?? row['الصنف'] ?? row['البيان'] ?? row['المنتج'] ?? row['المادة'] ?? row['Nom'] ?? row['Nom du produit'] ?? row['Désignation'] ?? row['Article'] ?? ''
        ).trim();

        const rawPrice =
          row['سعر البيع'] ??
          row['سعر_البيع'] ??
          row['السعر'] ??
          row['سعر'] ??
          row['price'] ??
          row['Price'] ??
          row['price_sell'] ??
          row['sell_price'] ??
          row['Prix'] ??
          row['Prix de vente'] ??
          0;
        const price = parseFloat(String(rawPrice).replace(/[^\d.]/g, '')) || 0;

        const rawCost =
          row['سعر الشراء'] ??
          row['التكلفة'] ??
          row['تكلفة'] ??
          row['cost'] ??
          row['Cost'] ??
          row['Coût'] ??
          row['Prix d\'achat'] ??
          row['Prix de revient'] ??
          null;
        const cost =
          rawCost !== null
            ? parseFloat(String(rawCost).replace(/[^\d.]/g, '')) || 0
            : price * 0.7;

        const rawQty =
          row['الكمية'] ??
          row['كمية'] ??
          row['quantity'] ??
          row['Quantity'] ??
          row['Quantité'] ??
          row['Qte'] ??
          row['Qté'] ??
          0;
        const quantity = parseInt(String(rawQty).replace(/[^\d]/g, '')) || 0;

        const category = String(
          row['الفئة'] ?? row['فئة'] ?? row['التصنيف'] ?? row['category'] ?? row['Category'] ?? row['Catégorie'] ?? ''
        ).trim();

        if (name) {
          const finalCode = code || `P-${Date.now().toString().slice(-6)}-${importedCount}`;
          if (existingCodes.has(finalCode)) {
            skippedCount++;
            return;
          }
          existingCodes.add(finalCode);

          newProducts.push({
            id: generateId(),
            name,
            code: finalCode,
            price,
            cost,
            quantity,
            lowStockThreshold: 5,
            category: category || undefined,
            createdAt: now,
            updatedAt: now,
          });
          importedCount++;
        }
      });

      if (newProducts.length > 0) {
        if (onImportProducts) {
          await onImportProducts(newProducts);
        } else {
          const updated = [...products, ...newProducts];
          storeData.products = updated;
          saveStoreData(storeData);
          onProductsUpdate(updated);
        }

        toast({
          title: t('importSuccess'),
          description: `${t('importedProducts')}: ${importedCount}${skippedCount > 0 ? ` (${t('skippedDuplicates')}: ${skippedCount})` : ''}`,
        });
      } else {
        toast({
          title: t('error'),
          description: t('invalidData'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast({
        title: t('error'),
        description: t('operationFailed'),
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMigrate = async () => {
    const storeData = loadStoreData();
    const localProducts = storeData.products || [];
    
    if (localProducts.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد منتجات محلية لترحيلها",
      });
      return;
    }

    const existingCodes = new Set(products.map(p => String(p.code).trim()));
    const migratable = localProducts.filter(p => !existingCodes.has(String(p.code).trim()));

    if (migratable.length === 0) {
      toast({
        title: "تنبيه",
        description: "جميع المنتجات المحلية موجودة بالفعل في السحابة",
      });
      return;
    }

    if (!confirm(`هل تريد ترحيل ${migratable.length} منتج من الجهاز إلى السحابة؟`)) {
      return;
    }

    try {
      if (onImportProducts) {
        await onImportProducts(migratable);
        toast({
          title: "تم بنجاح",
          description: `تم ترحيل ${migratable.length} منتج بنجاح`,
        });
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء ترحيل المنتجات",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${t('products')}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; direction: rtl; }
          h1 { text-align: center; color: #0f172a; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; font-size: 13px; }
          th { background-color: #f8fafc; font-weight: bold; }
          .low-stock { color: #d97706; font-weight: bold; }
          .available { color: #059669; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>قائمة المنتجات والمخزون</h1>
        <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
        <table>
          <thead>
            <tr>
              <th>رمز المنتج</th>
              <th>اسم المنتج</th>
              <th>سعر الشراء</th>
              <th>سعر البيع</th>
              <th>الكمية المتوفرة</th>
              <th>الفئة</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (product) => `
              <tr>
                <td style="font-family: monospace;">${product.code || '---'}</td>
                <td style="font-weight: bold;">${product.name}</td>
                <td>${product.cost}</td>
                <td>${product.price}</td>
                <td class="${Number(product.quantity || 0) <= Number(product.lowStockThreshold || 5) ? 'low-stock' : 'available'}">${product.quantity}</td>
                <td>${product.category || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="gsc-card p-3.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">عمليات سريعة:</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImportExcel}
          className="hidden"
          title={t('import') as string || 'استيراد من Excel'}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
        >
          <Upload size={14} className="text-slate-500" />
          <span>{t('import') || 'استيراد Excel'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
          title={t('print')}
        >
          <Printer size={14} className="text-slate-500" />
          <span>{t('print') || 'طباعة'}</span>
        </button>

        <button
          onClick={handleMigrate}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100 transition-all flex items-center gap-1.5"
          title="ترحيل البيانات المحلية إلى السحابة"
        >
          <Download size={14} />
          <span>ترحيل سحابي</span>
        </button>

        {onOpenReports && (
          <button
            onClick={onOpenReports}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60 hover:bg-purple-100 transition-all flex items-center gap-1.5"
            title="تقارير حركة المنتجات"
          >
            <BarChart3 size={14} />
            <span>تقارير الحركة</span>
          </button>
        )}

        <button
          onClick={onAddNew}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
        >
          <Plus size={15} />
          <span>{t('addNewProduct') || 'إضافة منتج'}</span>
        </button>
      </div>
    </div>
  );
}
