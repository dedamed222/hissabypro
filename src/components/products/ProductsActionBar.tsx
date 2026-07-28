import { useRef } from 'react';
import { Plus, Upload, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

export default function ProductsActionBar({
  onAddNew,
  products,
  onProductsUpdate,
  onImportProducts,
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
        // تطبيع مفاتيح الصف: إزالة المسافات الزائدة لتجنب عدم التطابق
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

        // سعر البيع: يدعم أسماء أعمدة متعددة
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

        // سعر الشراء / التكلفة: يدعم أسماء أعمدة متعددة
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

        // الكمية: يدعم أسماء أعمدة متعددة
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
          row['الفئة'] ?? row['category'] ?? row['Category'] ?? row['Catégorie'] ?? row['Famille'] ?? ''
        ).trim();
        const lowStockThreshold =
          parseInt(
            row['الحد الأدنى'] ??
              row['حد الإنذار'] ??
              row['lowStockThreshold'] ??
              row['Seuil minimum'] ??
              row['Alerte stock'] ??
              5
          ) || 5;

        if (code && name) {
          if (!existingCodes.has(code)) {
            const newProduct: Product = {
              id: generateId(),
              code,
              name,
              price,
              cost,
              quantity,
              lowStockThreshold,
              category: category || 'عام',
              createdAt: now,
              updatedAt: now,
            };
            newProducts.push(newProduct);
            existingCodes.add(code);
            importedCount++;
          } else {
            skippedCount++;
          }
        }
      });

      if (newProducts.length > 0) {
        if (onImportProducts) {
          await onImportProducts(newProducts);
        } else {
          storeData.products = [...storeData.products, ...newProducts];
          saveStoreData(storeData);
          onProductsUpdate(storeData.products);
        }
        toast({
          title: t('success'),
          description: t('updateSuccess'),
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
      <html dir={t('ar') === 'العربية' ? 'rtl' : 'ltr'} lang={t('ar') === 'العربية' ? 'ar' : 'fr'}>
      <head>
        <meta charset="UTF-8">
        <title>${t('products')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
          h1 { text-align: center; color: #333; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .low-stock { color: #d97706; font-weight: bold; }
          .available { color: #059669; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${t('products')}</h1>
        <p>${t('date')}: ${new Date().toLocaleDateString(t('ar') === 'العربية' ? 'en-GB' : 'fr-FR')}</p>
        <table>
          <thead>
            <tr>
              <th>${t('code')}</th>
              <th>${t('name')}</th>
              <th>${t('costPrice')}</th>
              <th>${t('sellingPrice')}</th>
              <th>${t('quantityColumn')}</th>
              <th>${t('productCategory')}</th>
              <th>${t('stockStatus')}</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (product) => `
              <tr>
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.cost}</td>
                <td>${product.price}</td>
                <td>${product.quantity}</td>
                <td>${product.category || '-'}</td>
                <td class="${
                  product.quantity <= product.lowStockThreshold
                    ? 'low-stock'
                    : 'available'
                }">
                  ${product.quantity <= product.lowStockThreshold ? t('lowStock') : t('available')}
                </td>
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
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold mx-[20px]">{t('products')}</h1>
      <div className="flex items-center gap-3 mx-[10px] px-0 py-[10px] my-[10px]">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImportExcel}
          className="hidden"
          title={t('import') as string || 'استيراد من Excel'}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Upload size={18} />
          <span>{t('import') as string || 'استيراد من Excel'}</span>
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex items-center gap-2"
          title={t('print')}
        >
          <Printer size={18} />
          <span>{t('print')}</span>
        </Button>
        <Button
          onClick={handleMigrate}
          variant="outline"
          className="flex items-center gap-2 text-arab-blue border-arab-blue hover:bg-blue-50"
          title="ترحيل البيانات المحلية"
        >
          <Download size={18} />
          <span>ترحيل</span>
        </Button>
        <Button
          onClick={onAddNew}
          className="bg-arab-blue text-white px-4 py-2 rounded-md hover:bg-arab-blue-dark transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          <span>{t('addNewProduct')}</span>
        </Button>
      </div>
    </div>
  );
}
