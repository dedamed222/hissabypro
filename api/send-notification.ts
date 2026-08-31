import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VAPID_EMAIL = 'mailto:admin@hissabypro.com';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, title, body, icon, url } = req.body;

    if (!userId || !title) {
        return res.status(400).json({ error: 'userId and title are required' });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'No subscription found for this user' });
        }

        const payload = JSON.stringify({
            title,
            body: body || '',
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            url: url || '/',
        });

        await webpush.sendNotification(data.subscription as webpush.PushSubscription, payload);

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('Push notification error:', err);
        return res.status(500).json({ error: err.message });
    }
}
