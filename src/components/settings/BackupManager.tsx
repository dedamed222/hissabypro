import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Save, 
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
import { useLocale } from "@/hooks/useLocale";

export function BackupManager() {
  const { locale, isRTL } = useLocale();
  const isFr = locale === 'fr';

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
          title: isFr ? "Sauvegarde créée" : "تم إنشاء النسخة الاحتياطية",
          description: isFr ? "Une sauvegarde de vos données a été enregistrée avec succès." : "تم حفظ نسخة احتياطية من بياناتك بنجاح",
        });
        loadBackups();
      } else {
        throw new Error(isFr ? "Échec de la création de la sauvegarde" : "فشل في إنشاء النسخة الاحتياطية");
      }
    } catch (error) {
      toast({
        title: isFr ? "Erreur" : "خطأ",
        description: isFr ? "Échec de la création de la sauvegarde." : "فشل في إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (backupKey: string) => {
    const confirmMsg = isFr
      ? "Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Les données actuelles seront remplacées."
      : "هل أنت متأكد من استرداد هذه النسخة الاحتياطية؟ ستفقد البيانات الحالية.";
    const confirmed = window.confirm(confirmMsg);
    
    if (confirmed) {
      setIsLoading(true);
      try {
        const success = restoreBackup(backupKey);
        if (success) {
          toast({
            title: isFr ? "Restauration terminée" : "تم الاسترداد",
            description: isFr ? "La sauvegarde a été restaurée avec succès." : "تم استرداد النسخة الاحتياطية بنجاح",
          });
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error(isFr ? "Échec de la restauration" : "فشل في الاسترداد");
        }
      } catch (error) {
        toast({
          title: isFr ? "Erreur" : "خطأ",
          description: isFr ? "Échec de la restauration de la sauvegarde." : "فشل في استرداد النسخة الاحتياطية",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteBackup = async (backupKey: string) => {
    const confirmMsg = isFr
      ? "Êtes-vous sûr de vouloir supprimer cette sauvegarde ?"
      : "هل أنت متأكد من حذف هذه النسخة الاحتياطية؟";
    const confirmed = window.confirm(confirmMsg);
    
    if (confirmed) {
      try {
        const success = deleteBackup(backupKey);
        if (success) {
          toast({
            title: isFr ? "Supprimé" : "تم الحذف",
            description: isFr ? "La sauvegarde a été supprimée avec succès." : "تم حذف النسخة الاحتياطية بنجاح",
          });
          loadBackups();
        } else {
          throw new Error(isFr ? "Échec de la suppression" : "فشل في الحذف");
        }
      } catch (error) {
        toast({
          title: isFr ? "Erreur" : "خطأ",
          description: isFr ? "Échec de la suppression de la sauvegarde." : "فشل في حذف النسخة الاحتياطية",
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
      a.download = `hissabypro-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: isFr ? "Exportation réussie" : "تم التصدير",
        description: isFr ? "Vos données ont été exportées avec succès." : "تم تصدير البيانات بنجاح",
      });
    } catch (error) {
      toast({
        title: isFr ? "Erreur" : "خطأ",
        description: isFr ? "Échec de l'exportation des données." : "فشل في تصدير البيانات",
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
            title: isFr ? "Importation réussie" : "تم الاستيراد",
            description: isFr ? "Les données ont été importées avec succès." : "تم استيراد البيانات بنجاح",
          });
          setTimeout(() => window.location.reload(), 1000);
        } else {
          throw new Error(isFr ? "Échec de l'importation" : "فشل في الاستيراد");
        }
      } catch (error) {
        toast({
          title: isFr ? "Erreur" : "خطأ",
          description: isFr ? "Échec de l'importation. Veuillez vérifier le fichier." : "فشل في استيراد البيانات. تأكد من صحة الملف.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(isFr ? 'fr-FR' : 'en-GB') + ' ' + date.toLocaleTimeString(isFr ? 'fr-FR' : 'en-GB');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600" />
            <span>{isFr ? "Gestion des Sauvegardes" : "إدارة النسخ الاحتياطية"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleCreateBackup} 
              disabled={isLoading}
              className="flex items-center gap-2 cursor-pointer font-bold"
            >
              <Save className="h-4 w-4" />
              <span>{isFr ? "Créer une sauvegarde" : "إنشاء نسخة احتياطية"}</span>
            </Button>
            
            <Button 
              onClick={handleExportData}
              variant="outline"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{isFr ? "Exporter les données" : "تصدير البيانات"}</span>
            </Button>
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>{isFr ? "Importer des données" : "استيراد البيانات"}</span>
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
              title={isFr ? "Importer le fichier de sauvegarde" : "استيراد ملف البيانات"}
              aria-label={isFr ? "Importer le fichier de sauvegarde" : "استيراد ملف النسخة الاحتياطية"}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="font-bold">{isFr ? "Sauvegarde automatique" : "النسخ الاحتياطي التلقائي"}</span>
            </div>
            <p className="text-blue-600 text-sm">
              {isFr
                ? "Une sauvegarde est créée automatiquement toutes les heures après modification des données."
                : "يتم إنشاء نسخة احتياطية تلقائياً كل ساعة بعد تحديث البيانات"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isFr ? "Sauvegardes Enregistrées" : "النسخ الاحتياطية المحفوظة"}</CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length > 0 ? (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div 
                  key={backup.key}
                  className="flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-800">
                      {formatDate(backup.date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isFr ? "Taille : " : "الحجم: "}{backup.size}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestoreBackup(backup.key)}
                      disabled={isLoading}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{isFr ? "Restaurer" : "استرداد"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBackup(backup.key)}
                      disabled={isLoading}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{isFr ? "Supprimer" : "حذف"}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Save className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-slate-600">{isFr ? "Aucune sauvegarde enregistrée" : "لا توجد نسخ احتياطية محفوظة"}</p>
              <p className="text-sm mt-1">{isFr ? "Cliquez sur 'Créer une sauvegarde' pour commencer" : "اضغط على \"إنشاء نسخة احتياطية\" لبدء الحفظ"}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
