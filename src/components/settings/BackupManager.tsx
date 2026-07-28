
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Save,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { 
  createBackup, 
  getBackupsList, 
  restoreBackup, 
  deleteBackup,
  exportAllData,
  importData 
} from "@/utils/backupManager";
import { toast } from "@/hooks/use-toast";
import { useRef } from "react";

export function BackupManager() {
  const [backups, setBackups] = useState<Array<{key: string, date: string, size: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    const backupsList = getBackupsList();
    setBackups(backupsList);
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const success = createBackup();
      if (success) {
        toast({
          title: "تم إنشاء النسخة الاحتياطية",
          description: "تم حفظ نسخة احتياطية من بياناتك بنجاح",
        });
        loadBackups();
      } else {
        throw new Error("فشل في إنشاء النسخة الاحتياطية");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (backupKey: string) => {
    const confirmed = window.confirm("هل أنت متأكد من استرداد هذه النسخة الاحتياطية؟ ستفقد البيانات الحالية.");
    
    if (confirmed) {
      setIsLoading(true);
      try {
        const success = restoreBackup(backupKey);
        if (success) {
          toast({
            title: "تم الاسترداد",
            description: "تم استrداد النسخة الاحتياطية بنجاح",
          });
          // إعادة تحميل الصفحة لتطبيق التغييرات
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error("فشل في الاسترداد");
        }
      } catch (error) {
        toast({
          title: "خطأ",
          description: "فشل في استرداد النسخة الاحتياطية",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteBackup = async (backupKey: string) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه النسخة الاحتياطية؟");
    
    if (confirmed) {
      try {
        const success = deleteBackup(backupKey);
        if (success) {
          toast({
            title: "تم الحذف",
            description: "تم حذف النسخة الاحتياطية بنجاح",
          });
          loadBackups();
        } else {
          throw new Error("فشل في الحذف");
        }
      } catch (error) {
        toast({
          title: "خطأ",
          description: "فشل في حذف النسخة الاحتياطية",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportData = () => {
    try {
      const data = exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arab-business-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "تم التصدير",
        description: "تم تصدير البيانات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تصدير البيانات",
        variant: "destructive",
      });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const success = importData(jsonData);
        
        if (success) {
          toast({
            title: "تم الاستيراد",
            description: "تم استيراد البيانات بنجاح",
          });
          // إعادة تحميل الصفحة لتطبيق التغييرات
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error("فشل في الاستيراد");
        }
      } catch (error) {
        toast({
          title: "خطأ",
          description: "فشل في استيراد البيانات. تأكد من صحة الملف.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // إعادة تعيين قيمة input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            إدارة النسخ الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleCreateBackup} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              إنشاء نسخة احتياطية
            </Button>
            
            <Button 
              onClick={handleExportData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير البيانات
            </Button>
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              استيراد البيانات
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
              title="استيراد ملف البيانات"
              aria-label="استيراد ملف النسخة الاحتياطية"
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">النسخ الاحتياطي التلقائي</span>
            </div>
            <p className="text-blue-600 text-sm">
              يتم إنشاء نسخة احتياطية تلقائياً كل ساعة بعد تحديث البيانات
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطية المحفوظة</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length > 0 ? (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div 
                  key={backup.key}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      {formatDate(backup.date)}
                    </p>
                    <p className="text-sm text-gray-500">
                      الحجم: {backup.size}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreBackup(backup.key)}
                      disabled={isLoading}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      استرداد
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBackup(backup.key)}
                      disabled={isLoading}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Save className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد نسخ احتياطية محفوظة</p>
              <p className="text-sm">اضغط على "إنشاء نسخة احتياطية" لبدء الحفظ</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
