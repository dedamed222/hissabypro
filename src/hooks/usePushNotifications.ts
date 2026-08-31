import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData.split(''), c => c.charCodeAt(0));
}

export function usePushNotifications() {
    const { user } = useAuth();

    const isSupported = () => 'serviceWorker' in navigator && 'PushManager' in window;

    const getPermissionState = async (): Promise<NotificationPermission> => {
        if (!isSupported()) return 'denied';
        return Notification.permission;
    };

    const subscribe = async (): Promise<boolean> => {
        if (!isSupported() || !user) return false;
        if (!VAPID_PUBLIC_KEY) {
            console.error('VITE_VAPID_PUBLIC_KEY is not set');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // Save subscription to Supabase
            await (supabase.from('push_subscriptions') as any).upsert(
                { user_id: user.id, subscription: subscription.toJSON() },
                { onConflict: 'user_id' }
            );

            return true;
        } catch (err) {
            console.error('Push subscription failed:', err);
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
                await (supabase.from('push_subscriptions') as any)
                    .delete()
                    .eq('user_id', user.id);
            }
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
