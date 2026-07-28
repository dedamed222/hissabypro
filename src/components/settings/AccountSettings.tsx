import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const usernameSchema = z.object({
    username: z.string().min(3, { message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" }),
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة" }),
    newPassword: z.string().min(6, { message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }),
    confirmPassword: z.string().min(1, { message: "تأكيد كلمة المرور مطلوب" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
});

export function AccountSettings() {
    const { user, profile } = useAuth();
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const profileForm = useForm<z.infer<typeof usernameSchema>>({
        resolver: zodResolver(usernameSchema),
        defaultValues: {
            username: "",
            name: "",
        },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (profile) {
            profileForm.reset({
                username: profile.username || "",
                name: profile.name || "",
            });
        }
    }, [profile, profileForm]);

    const onProfileSubmit = async (values: z.infer<typeof usernameSchema>) => {
        if (!profile) return;
        setIsUpdatingProfile(true);

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    username: values.username,
                    name: values.name,
                })
                .eq("id", profile.id);

            if (error) throw error;

            toast({
                title: "تم التحديث بنجاح",
                description: "تم تحديث معلومات الحساب.",
            });
        } catch (error: any) {
            toast({
                title: "خطأ في التحديث",
                description: error.message || "حدث خطأ أثناء تحديث معلومات الحساب.",
                variant: "destructive",
            });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        if (!user?.email) return;
        setIsUpdatingPassword(true);

        try {
            // Verify current password by attempting to sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: values.currentPassword,
            });

            if (signInError) {
                throw new Error("كلمة المرور الحالية غير صحيحة");
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: values.newPassword,
            });

            if (updateError) throw updateError;

            toast({
                title: "تم التحديث بنجاح",
                description: "تم تغيير كلمة المرور بنجاح.",
            });

            passwordForm.reset();
        } catch (error: any) {
            toast({
                title: "خطأ في التحديث",
                description: error.message || "حدث خطأ أثناء تغيير كلمة المرور.",
                variant: "destructive",
            });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>معلومات الحساب</CardTitle>
                    <CardDescription>قم بتحديث اسمك واسم المستخدم الخاص بك.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                            <FormField
                                control={profileForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الاسم الكامل</FormLabel>
                                        <FormControl>
                                            <Input placeholder="أدخل اسمك الكامل" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>اسم المستخدم</FormLabel>
                                        <FormControl>
                                            <Input placeholder="أدخل اسم المستخدم" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isUpdatingProfile}>
                                {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                حفظ التغييرات
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>تغيير كلمة المرور</CardTitle>
                    <CardDescription>قم بتحديث كلمة المرور الخاصة بحسابك.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>كلمة المرور الحالية</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="أدخل كلمة المرور الحالية" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>كلمة المرور الجديدة</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="أدخل كلمة المرور الجديدة" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>تأكيد كلمة المرور</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="أعد إدخال كلمة المرور الجديدة" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isUpdatingPassword}>
                                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                تحديث كلمة المرور
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
