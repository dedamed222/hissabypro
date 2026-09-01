const fs = require('fs');

let content = fs.readFileSync('useAutoSync.bak.ts', 'utf8');

// 1. Import useRealtimeSync
if (!content.includes('useRealtimeSync')) {
    content = content.replace(
        'import { saveStoreData } from "@/utils/localStorage";',
        'import { saveStoreData } from "@/utils/localStorage";\nimport { useRealtimeSync } from "./useRealtimeSync";'
    );
}

// Extract push logic and pull logic
const pushStart = content.indexOf('try {');
const pullStart = content.indexOf('// --- PULL DATA FROM CLOUD TO LOCAL ---');
const pullEnd = content.lastIndexOf('} catch (error) {');

const pushLogic = content.substring(pushStart, pullStart);
const pullLogic = content.substring(pullStart, pullEnd);

const newHook = `
export const pushToCloud = async (toast: any) => {
    if (!navigator.onLine) return;
    ${pushLogic}
    } catch (error) {
        console.error("Push to cloud failed:", error);
    }
};

export const pullFromCloud = async (toast: any) => {
    if (!navigator.onLine) return;
    try {
        ${pullLogic}
    } catch (error) {
        console.error("Pull from cloud failed:", error);
    }
};

export function useAutoSync() {
    const { isAuthenticated, user } = useAuth();
    const { toast } = useToast();
    const isSyncing = useRef(false);

    // Real-time sync listener
    useRealtimeSync(
        ['products', 'customers', 'invoices', 'daily_sales', 'expenses', 'suppliers', 'creditors', 'debtors', 'returns', 'warehouses', 'store_settings'],
        () => {
            if (!isSyncing.current && isAuthenticated) {
                isSyncing.current = true;
                pullFromCloud(toast).finally(() => {
                    isSyncing.current = false;
                });
            }
        },
        user?.id
    );

    useEffect(() => {
        const handleSync = async () => {
            if (!isAuthenticated || !navigator.onLine || isSyncing.current) return;

            try {
                isSyncing.current = true;
                await pushToCloud(toast);
                await pullFromCloud(toast);
            } finally {
                isSyncing.current = false;
            }
        };

        // Run once on mount if online
        if (navigator.onLine) {
            // Small delay to let auth initialize
            setTimeout(handleSync, 2000);
        }

        // Listen for online event
        window.addEventListener('online', handleSync);

        return () => {
            window.removeEventListener('online', handleSync);
        };
    }, [isAuthenticated, toast]);
}
`;

const handleSyncStart = content.indexOf('export function useAutoSync() {');
content = content.substring(0, handleSyncStart) + newHook;

fs.writeFileSync('src/hooks/useAutoSync.ts', content);
console.log('Refactored useAutoSync.ts');
