/**
 * useRealtimeSync — subscribes to Supabase Realtime changes on one or more tables
 * and calls `onRefresh` whenever an INSERT, UPDATE, or DELETE event arrives.
 *
 * Usage:
 *   useRealtimeSync(['invoices', 'products'], loadData, userId);
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = string;

export function useRealtimeSync(
    tables: TableName[],
    onRefresh: () => void,
    userId?: string
) {
    // Keep a stable ref to the callback so we don't recreate the channel on re-renders
    const onRefreshRef = useRef(onRefresh);
    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        if (!tables || tables.length === 0) return;

        const channelName = `realtime-sync-${tables.join("-")}-${Date.now()}`;
        let channel = supabase.channel(channelName);

        tables.forEach((table) => {
            const filter = userId ? `user_id=eq.${userId}` : undefined;

            const config: any = {
                event: "*",
                schema: "public",
                table,
            };
            if (filter) config.filter = filter;

            channel = channel.on("postgres_changes", config, () => {
                onRefreshRef.current();
            });
        });

        channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
                console.log(`[Realtime] Subscribed to: ${tables.join(", ")}`);
            }
        });

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tables.join(","), userId]);
}
