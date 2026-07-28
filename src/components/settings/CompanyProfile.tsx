import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Upload, Store } from "lucide-react";
import { loadStoreData, saveStoreData } from "@/utils/localStorage";

const companySchema = z.object({
    name: z.string().min(2, { message: "اسم الشركة يجب أن يكون حرفين على الأقل" }),
    photoUrl: z.string().optional(),
});

export function CompanyProfile() {
    const [isUpdating, setIsUpdating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    const form = useForm<z.infer<typeof companySchema>>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            name: "",
            photoUrl: "",
        },
    });

    useEffect(() => {
        const data = loadStoreData();
        if (data.storeInfo) {
            form.reset({
                name: data.storeInfo.name || "",
                photoUrl: data.storeInfo.photoUrl || "",
            });
            setPreviewUrl(data.storeInfo.photoUrl || "");
        }
    }, [form]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast({
                title: "حجم الصورة كبير جداً",
                description: "يرجى اختيار صورة بحجم أقل من 2 ميغابايت",
                variant: "destructive",
            });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setPreviewUrl(base64String);
            form.setValue("photoUrl", base64String);
        };
        reader.readAsDataURL(file);
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
                <CardDescription>قم بتحديث اسم وشعار الشركة ليظهرا في الفواتير.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="flex flex-col items-center justify-center space-y-4 mb-6">
                            <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Company Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-12 h-12 text-gray-400" />
                                )}
                            </div>
                            <div className="flex items-center justify-center w-full">
                                <Label htmlFor="logo-upload" className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                                    <Upload className="w-4 h-4 mr-2" />
                                    رفع الشعار
                                </Label>
                                <Input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            <p className="text-xs text-gray-500">الحد الأقصى للحجم: 2MB (يفضل صورة مربعة)</p>
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

                        <Button type="submit" disabled={isUpdating} className="w-full md:w-auto">
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            حفظ التغييرات
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
