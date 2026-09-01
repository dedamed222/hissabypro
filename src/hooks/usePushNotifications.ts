import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ─── VAPID Public Key (safe to put in client code) ─────────────────────────────
// This is a public key only; the private key lives securely in Vercel env vars.
const VAPID_PUBLIC_KEY =
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    'BCnH2QDp1fwycbALBYSU_AnD_qcteFNFcGgIh_gasAihY4XqXnkvjE5EN5WCKIVF3elFDlMEgCVkBnibrDeHRew';


function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData.split(''), (c) => c.charCodeAt(0));
}

export function usePushNotifications() {
    const { user } = useAuth();

    const isSupported = () =>
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

    const getPermissionState = async (): Promise<NotificationPermission> => {
        if (!isSupported()) return 'denied';
        return Notification.permission;
    };

    const subscribe = async (): Promise<boolean> => {
        if (!isSupported()) {
            toast({
                title: 'غير مدعوم',
                description: 'متصفحك لا يدعم الإشعارات.',
                variant: 'destructive',
            });
            return false;
        }

        if (!user) {
            toast({
                title: 'يجب تسجيل الدخول',
                description: 'يرجى تسجيل الدخول أولاً لتفعيل الإشعارات.',
                variant: 'destructive',
            });
            return false;
        }

        try {
            // Ask for permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast({
                    title: 'تم رفض الإذن',
                    description:
                        'يرجى السماح بالإشعارات يدوياً من إعدادات المتصفح (أيقونة القفل بجانب الرابط).',
                    variant: 'destructive',
                });
                return false;
            }

            // Wait for service worker
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // Save subscription to Supabase
            const { error } = await (supabase.from('push_subscriptions') as any).upsert(
                { user_id: user.id, subscription: subscription.toJSON() },
                { onConflict: 'user_id' }
            );

            if (error) {
                console.error('Supabase upsert error:', error);
                // Still return true — the subscription is registered in the browser
                // even if Supabase save failed (non-critical for local notifications)
            }

            return true;
        } catch (err: any) {
            console.error('Push subscription failed:', err);
            toast({
                title: 'فشل تفعيل الإشعارات',
                description: err?.message || 'حدث خطأ غير متوقع.',
                variant: 'destructive',
            });
            return false;
        }
    };

    const unsubscribe = async (): Promise<void> => {
        if (!isSupported() || !user) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
            await (supabase.from('push_subscriptions') as any)
                .delete()
                .eq('user_id', user.id);
        } catch (err) {
            console.error('Unsubscribe failed:', err);
        }
    };

    const sendNotification = async (title: string, body: string, url = '/') => {
        if (!user) return;
        try {
            await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, title, body, url }),
            });
        } catch (err) {
            console.error('sendNotification failed:', err);
        }
    };

    return { subscribe, unsubscribe, sendNotification, isSupported, getPermissionState };
}
