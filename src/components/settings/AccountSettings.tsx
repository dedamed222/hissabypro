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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

export function AccountSettings() {
    const { locale, isRTL } = useLocale();
    const isFr = locale === 'fr';

    const usernameSchema = z.object({
        username: z.string().min(3, {
            message: isFr ? "L'identifiant doit contenir au moins 3 caractères" : "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"
        }),
        name: z.string().min(2, {
            message: isFr ? "Le nom doit contenir au moins 2 caractères" : "الاسم يجب أن يكون حرفين على الأقل"
        }),
    });

    const passwordSchema = z.object({
        currentPassword: z.string().min(1, {
            message: isFr ? "Le mot de passe actuel est requis" : "كلمة المرور الحالية مطلوبة"
        }),
        newPassword: z.string().min(6, {
            message: isFr ? "Le nouveau mot de passe doit contenir au moins 6 caractères" : "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
        }),
        confirmPassword: z.string().min(1, {
            message: isFr ? "La confirmation du mot de passe est requise" : "تأكيد كلمة المرور مطلوب"
        }),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: isFr ? "Les mots de passe ne correspondent pas" : "كلمات المرور غير متطابقة",
        path: ["confirmPassword"],
    });

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
                title: isFr ? "Mise à jour réussie" : "تم التحديث بنجاح",
                description: isFr ? "Vos informations de compte ont été mises à jour." : "تم تحديث معلومات الحساب.",
            });
        } catch (error: any) {
            toast({
                title: isFr ? "Erreur de mise à jour" : "خطأ في التحديث",
                description: error.message || (isFr ? "Une erreur s'est produite lors de la mise à jour." : "حدث خطأ أثناء تحديث معلومات الحساب."),
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
                throw new Error(isFr ? "Mot de passe actuel incorrect" : "كلمة المرور الحالية غير صحيحة");
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: values.newPassword,
            });

            if (updateError) throw updateError;

            toast({
                title: isFr ? "Mise à jour réussie" : "تم التحديث بنجاح",
                description: isFr ? "Le mot de passe a été modifié avec succès." : "تم تغيير كلمة المرور بنجاح.",
            });

            passwordForm.reset();
        } catch (error: any) {
            toast({
                title: isFr ? "Erreur de mise à jour" : "خطأ في التحديث",
                description: error.message || (isFr ? "Une erreur s'est produite lors du changement de mot de passe." : "حدث خطأ أثناء تغيير كلمة المرور."),
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
                    <CardTitle>{isFr ? "Informations du Compte" : "معلومات الحساب"}</CardTitle>
                    <CardDescription>
                        {isFr ? "Mettez à jour votre nom complet et votre identifiant de connexion." : "قم بتحديث اسمك واسم المستخدم الخاص بك."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                            <FormField
                                control={profileForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isFr ? "Nom complet" : "الاسم الكامل"}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={isFr ? "Entrez votre nom complet" : "أدخل اسمك الكامل"} {...field} />
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
                                        <FormLabel>{isFr ? "Nom d'utilisateur" : "اسم المستخدم"}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={isFr ? "Entrez votre nom d'utilisateur" : "أدخل اسم المستخدم"} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isUpdatingProfile} className="cursor-pointer">
                                {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isFr ? "Enregistrer les modifications" : "حفظ التغييرات"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{isFr ? "Modifier le Mot de Passe" : "تغيير كلمة المرور"}</CardTitle>
                    <CardDescription>
                        {isFr ? "Mettez à jour le mot de passe de votre compte pour plus de sécurité." : "قم بتحديث كلمة المرور الخاصة بحسابك."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <FormField
                                control={passwordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isFr ? "Mot de passe actuel" : "كلمة المرور الحالية"}</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder={isFr ? "Entrez le mot de passe actuel" : "أدخل كلمة المرور الحالية"} {...field} />
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
                                        <FormLabel>{isFr ? "Nouveau mot de passe" : "كلمة المرور الجديدة"}</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder={isFr ? "Entrez le nouveau mot de passe" : "أدخل كلمة المرور الجديدة"} {...field} />
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
                                        <FormLabel>{isFr ? "Confirmer le mot de passe" : "تأكيد كلمة المرور"}</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder={isFr ? "Confirmez le nouveau mot de passe" : "أعد إدخال كلمة المرور الجديدة"} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isUpdatingPassword} className="cursor-pointer">
                                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isFr ? "Mettre à jour le mot de passe" : "تحديث كلمة المرور"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
