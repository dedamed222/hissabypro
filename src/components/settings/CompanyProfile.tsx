import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Upload, Store, X, FileText, Image as ImageIcon } from "lucide-react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import { getStoreSettings, upsertStoreSettings } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const companySchema = z.object({
    name: z.string().min(2, { message: "اسم الشركة يجب أن يكون حرفين على الأقل" }),
    photoUrl: z.string().optional(),
});

export function CompanyProfile() {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    const form = useForm<z.infer<typeof companySchema>>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            name: "",
            photoUrl: "",
        },
    });

    const { isAuthenticated, user } = useAuth();

    const loadCompanyInfo = useCallback(async () => {
        try {
            const data = loadStoreData();

            // Default to local storage
            let name = data.storeInfo?.name || "";
            let photoUrl = data.storeInfo?.photoUrl || "";

            // Override with Supabase if authenticated
            if (isAuthenticated) {
                const dbSettings = await getStoreSettings();
                if (dbSettings) {
                    name = dbSettings.store_name || name;
                    photoUrl = dbSettings.store_photo_url || photoUrl;

                    // Update local storage
                    data.storeInfo = { ...data.storeInfo, name, photoUrl };
                    saveStoreData(data);
                }
            }

            form.reset({ name, photoUrl });
            setPreviewUrl(photoUrl);
        } catch (error) {
            console.error("Error loading company info:", error);
        }
    }, [isAuthenticated, form]);

    useEffect(() => {
        loadCompanyInfo();
    }, [loadCompanyInfo]);

    // Real-time sync: reload company info when changed on another device
    useRealtimeSync(['store_settings'], loadCompanyInfo, user?.id);

    const processPDF = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) throw new Error("Could not create canvas context");

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas
            }).promise;

            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error("Error processing PDF:", error);
            throw new Error("فشل في معالجة ملف PDF");
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "حجم الملف كبير جداً",
                description: "يرجى اختيار ملف بحجم أقل من 5 ميغابايت",
                variant: "destructive",
            });
            return;
        }

        setIsProcessingFile(true);

        try {
            let base64String = "";

            if (file.type === "application/pdf") {
                base64String = await processPDF(file);
            } else if (file.type.startsWith("image/")) {
                base64String = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            } else {
                throw new Error("نوع الملف غير مدعوم");
            }

            setPreviewUrl(base64String);
            form.setValue("photoUrl", base64String);

            toast({
                title: "تم رفع الملف بنجاح",
                description: "يمكنك الآن حفظ التغييرات.",
            });
        } catch (error: any) {
            toast({
                title: "خطأ في الرفع",
                description: error.message || "حدث خطأ أثناء معالجة الملف.",
                variant: "destructive",
            });
        } finally {
            setIsProcessingFile(false);
        }
    }, [form]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.svg'],
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        multiple: false
    });

    const handleRemoveLogo = () => {
        setPreviewUrl("");
        form.setValue("photoUrl", "");
        toast({
            title: "تم إزالة الشعار",
            description: "تمت إزالة الشعار. لا تنس حفظ التغييرات.",
        });
    };

    const onSubmit = async (values: z.infer<typeof companySchema>) => {
        setIsUpdating(true);

        try {
            const data = loadStoreData();
            data.storeInfo = {
                ...data.storeInfo,
                name: values.name,
                photoUrl: values.photoUrl || "",
            };
            saveStoreData(data);

            if (isAuthenticated) {
                await upsertStoreSettings({
                    store_name: values.name,
                    store_photo_url: values.photoUrl || "",
                });
            }

            toast({
                title: "تم التحديث بنجاح",
                description: "تم حفظ معلومات الشركة.",
            });
        } catch (error: any) {
            toast({
                title: "خطأ في التحديث",
                description: "حدث خطأ أثناء حفظ معلومات الشركة.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>ملف الشركة</CardTitle>
                <CardDescription>قم بتحديث اسم وشعار الشركة ليظهرا في الفواتير. يمكنك رفع صورة أو ملف PDF.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="flex flex-col space-y-4 mb-6">
                            <FormLabel>شعار الشركة / الترويسة</FormLabel>

                            {previewUrl ? (
                                <div className="relative w-full max-w-md mx-auto border rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 rounded-full w-8 h-8"
                                        onClick={handleRemoveLogo}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <img src={previewUrl} alt="Company Logo Preview" className="max-h-48 object-contain" />
                                    <p className="text-xs text-gray-500 mt-4 text-center">
                                        هذه هي المعاينة الحالية للشعار. سيتم عرضها في أعلى الفواتير.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[200px]
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'}
                    ${isProcessingFile ? 'opacity-50 pointer-events-none' : ''}
                  `}
                                >
                                    <input {...getInputProps()} />

                                    {isProcessingFile ? (
                                        <div className="flex flex-col items-center text-primary">
                                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                            <p className="font-medium">جاري معالجة الملف...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex gap-4 mb-4 text-gray-400">
                                                <ImageIcon className="w-10 h-10" />
                                                <FileText className="w-10 h-10" />
                                            </div>
                                            <p className="text-lg font-medium text-gray-700 mb-1">
                                                {isDragActive ? 'أفلت الملف هنا...' : 'اسحب وأفلت الشعار هنا، أو انقر للاختيار'}
                                            </p>
                                            <p className="text-sm text-gray-500 mb-4">
                                                يدعم الصور (PNG, JPG, SVG) وملفات PDF (سيتم استخراج الصفحة الأولى)
                                            </p>
                                            <Button type="button" variant="outline" className="pointer-events-none">
                                                <Upload className="w-4 h-4 mr-2" />
                                                تصفح الملفات
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-gray-500">الحد الأقصى للحجم: 5MB</p>
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>اسم الشركة</FormLabel>
                                    <FormControl>
                                        <Input placeholder="أدخل اسم الشركة" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isUpdating || isProcessingFile} className="w-full md:w-auto">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            حفظ التغييرات
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
