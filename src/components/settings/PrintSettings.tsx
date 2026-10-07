import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, FileText, X, ImageIcon } from "lucide-react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import { getStoreSettings, upsertStoreSettings } from "@/lib/database";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PrintSettingsFormValues {
    letterheadUrl: string;
    paperSize: string;
    orientation: string;
    printWithLetterhead: boolean;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
}

export function PrintSettings() {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    const form = useForm<PrintSettingsFormValues>({
        defaultValues: {
            letterheadUrl: "",
            paperSize: "A4",
            orientation: "portrait",
            printWithLetterhead: true,
            marginTop: 0,
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
        },
    });

    const { isAuthenticated, user } = useAuth();

    // Watch fields to instantly update layout logic
    const { watch } = form;
    const paperSize = watch("paperSize");
    const orientation = watch("orientation");

    const loadPrintInfo = useCallback(async () => {
        try {
            const data = loadStoreData();

            let lp = {
                letterheadUrl: data.storeInfo?.letterheadUrl || "",
                paperSize: (data.storeInfo?.printSettings?.paperSize || "A4") as "A3" | "A4" | "A5" | "A6",
                orientation: (data.storeInfo?.printSettings?.orientation || "portrait") as "portrait" | "landscape",
                printWithLetterhead: data.storeInfo?.printSettings?.printWithLetterhead ?? true,
                marginTop: data.storeInfo?.printSettings?.margins?.top || 0,
                marginBottom: data.storeInfo?.printSettings?.margins?.bottom || 0,
                marginLeft: data.storeInfo?.printSettings?.margins?.left || 0,
                marginRight: data.storeInfo?.printSettings?.margins?.right || 0,
            };

            if (isAuthenticated) {
                const dbSettings = await getStoreSettings();
                if (dbSettings) {
                    const marginsData = dbSettings.print_margins ? (typeof dbSettings.print_margins === 'string' ? JSON.parse(dbSettings.print_margins) : dbSettings.print_margins) : {};
                    lp = {
                        letterheadUrl: dbSettings.letterhead_url || lp.letterheadUrl,
                        paperSize: (dbSettings.print_paper_size || lp.paperSize) as "A3" | "A4" | "A5" | "A6",
                        orientation: (dbSettings.print_orientation || lp.orientation) as "portrait" | "landscape",
                        printWithLetterhead: dbSettings.print_with_letterhead ?? lp.printWithLetterhead,
                        marginTop: marginsData?.top ?? lp.marginTop,
                        marginBottom: marginsData?.bottom ?? lp.marginBottom,
                        marginLeft: marginsData?.left ?? lp.marginLeft,
                        marginRight: marginsData?.right ?? lp.marginRight,
                    };

                    data.storeInfo.letterheadUrl = lp.letterheadUrl;
                    data.storeInfo.printSettings = {
                        paperSize: lp.paperSize as "A3" | "A4" | "A5" | "A6",
                        orientation: lp.orientation as "portrait" | "landscape",
                        printWithLetterhead: lp.printWithLetterhead,
                        margins: {
                            top: lp.marginTop,
                            bottom: lp.marginBottom,
                            left: lp.marginLeft,
                            right: lp.marginRight
                        }
                    };
                    saveStoreData(data);
                }
            }

            form.reset(lp);
            setPreviewUrl(lp.letterheadUrl);
        } catch (error) {
            console.error("Error loading print info:", error);
        }
    }, [isAuthenticated, form]);

    useEffect(() => {
        loadPrintInfo();
    }, [loadPrintInfo]);

    useRealtimeSync(['store_settings'], loadPrintInfo, user?.id);

    const processPDF = async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 2.0 });
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

    const getRecommendedResolution = (size: string, isPortrait: boolean) => {
        let text = "";
        switch (size) {
            case "A3": text = "3508 × 4961"; break;
            case "A4": text = "2480 × 3508"; break;
            case "A5": text = "1748 × 2480"; break;
            case "A6": text = "1240 × 1748"; break;
            default: text = "2480 × 3508"; break;
        }
        if (!isPortrait) {
            return text.split(' × ').reverse().join(' × ');
        }
        return text;
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

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
            form.setValue("letterheadUrl", base64String);

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

    const handleRemoveLetterhead = () => {
        setPreviewUrl("");
        form.setValue("letterheadUrl", "");
        toast({
            title: "تم إزالة الراسية",
            description: "تمت إزالة الراسية. لا تنس حفظ التغييرات.",
        });
    };

    const onSubmit = async (values: PrintSettingsFormValues) => {
        setIsUpdating(true);

        try {
            const margins = {
                top: Number(values.marginTop) || 0,
                bottom: Number(values.marginBottom) || 0,
                left: Number(values.marginLeft) || 0,
                right: Number(values.marginRight) || 0
            };

            const data = loadStoreData();
            data.storeInfo = {
                ...data.storeInfo,
                letterheadUrl: values.letterheadUrl,
                printSettings: {
                    paperSize: values.paperSize as any,
                    orientation: values.orientation as any,
                    printWithLetterhead: values.printWithLetterhead,
                    margins
                }
            };
            saveStoreData(data);

            if (isAuthenticated) {
                await upsertStoreSettings({
                    letterhead_url: values.letterheadUrl,
                    print_paper_size: values.paperSize,
                    print_orientation: values.orientation,
                    print_with_letterhead: values.printWithLetterhead,
                    print_margins: margins,
                });
            }

            toast({
                title: "تم التحديث بنجاح",
                description: "تم حفظ إعدادات الطباعة.",
            });
        } catch (error: any) {
            toast({
                title: "خطأ في التحديث",
                description: "حدث خطأ أثناء حفظ الإعدادات.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const aspectRatioStyle =
        paperSize === 'A4' || paperSize === 'A3' ? (orientation === 'portrait' ? 'aspect-[1/1.414]' : 'aspect-[1.414/1]') :
            (orientation === 'portrait' ? 'aspect-[1/1.414]' : 'aspect-[1.414/1]');

    let paperDimsText = "";
    if (paperSize === "A4") paperDimsText = "210×297 مم";
    if (paperSize === "A3") paperDimsText = "297×420 مم";
    if (paperSize === "A5") paperDimsText = "148×210 مم";
    if (paperSize === "A6") paperDimsText = "105×148 مم";

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات الفواتير والطباعة</CardTitle>
                <CardDescription>قم بضبط راسية الشركة الخاصة بك ومقاسات الأوراق وهوامش الطباعة.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="printWithLetterhead"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">تفعيل الطباعة مع الراسية</FormLabel>
                                            <div className="text-sm text-gray-500">
                                                سيتم إدراج صورة الراسية كخلفية لكامل الصفحة أثناء الطباعة
                                            </div>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="paperSize"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>مقاس الورق</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="اختر مقاس الورق" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="A3">A3 (297×420 مم)</SelectItem>
                                                    <SelectItem value="A4">A4 (210×297 مم)</SelectItem>
                                                    <SelectItem value="A5">A5 (148×210 مم)</SelectItem>
                                                    <SelectItem value="A6">A6 (105×148 مم)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="orientation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>اتجاه الورق</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="اختر الاتجاه" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="portrait">طولي (Portrait)</SelectItem>
                                                    <SelectItem value="landscape">عرضي (Landscape)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col space-y-4 mb-6">
                            <FormLabel>الراسية (Letterhead)</FormLabel>

                            <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-md mb-2">
                                <strong>توصية: </strong> للحصول على دقة طباعة ممتازة لمقاس {paperSize} {orientation === 'portrait' ? 'طولي' : 'عرضي'} ({paperDimsText})،
                                يفضل استخدام صورة بدقة جودة عالية (300 DPI) وبأبعاد: <span className="font-bold">{getRecommendedResolution(paperSize, orientation === 'portrait')} بكسل</span>.
                            </div>

                            {previewUrl ? (
                                <div className="relative w-full mx-auto border rounded-lg bg-gray-50 flex flex-col items-center justify-center p-2">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-4 right-4 rounded-full w-8 h-8 z-10 shadow-lg"
                                        onClick={handleRemoveLetterhead}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <div
                                        className={`relative ${aspectRatioStyle} w-full max-w-[500px] border shadow-sm overflow-hidden`}
                                        style={{
                                            backgroundImage: `url(${previewUrl})`,
                                            backgroundSize: '100% 100%',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'top center',
                                        }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="border border-dashed border-gray-500 bg-white/60 px-4 py-2 font-bold text-gray-600 rounded backdrop-blur-sm">
                                                مساحة محتوى الفاتورة
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[250px]
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
                                                {isDragActive ? 'أفلت الملف هنا...' : 'اسحب وأفلت الراسية الكاملة هنا'}
                                            </p>
                                            <p className="text-sm text-gray-500 mb-4">
                                                يدعم PDF, PNG, JPG (مساحة خلفية بحجم الصفحة كاملة)
                                            </p>
                                            <Button type="button" variant="outline" className="pointer-events-none">
                                                <Upload className="w-4 h-4 mr-2" />
                                                تصفح ملفات الراسية
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-medium text-gray-900 mb-4">هوامش أمان محتوى الفاتورة (بالميليمتر)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField
                                    control={form.control}
                                    name="marginTop"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الهامش العلوي (Top)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="marginBottom"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الهامش السفلي (Bottom)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="marginRight"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الهامش الأيمن (Right)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="marginLeft"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الهامش الأيسر (Left)</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={isUpdating || isProcessingFile} className="w-full md:w-auto mt-4">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            حفظ إعدادات الطباعة
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

