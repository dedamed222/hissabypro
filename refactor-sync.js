const fs = require('fs');

let content = fs.readFileSync('src/hooks/useAutoSync.ts', 'utf8');

// 1. Import useRealtimeSync
if (!content.includes('useRealtimeSync')) {
    content = content.replace(
        'import { saveStoreData } from "@/utils/localStorage";',
        'import { saveStoreData } from "@/utils/localStorage";\nimport { useRealtimeSync } from "./useRealtimeSync";'
    );
}

// 2. Split handleSync into pushToCloud and pullFromCloud
// We will replace the whole handleSync function.
// First, find the start of handleSync
const handleSyncStart = content.indexOf('const handleSync = async () => {');
const handleSyncEnd = content.indexOf('// Run once on mount if online');

if (handleSyncStart !== -1 && handleSyncEnd !== -1) {
    const originalHandleSync = content.substring(handleSyncStart, handleSyncEnd);

    // Extract push logic
    const pushStart = originalHandleSync.indexOf('try {');
    const pullStart = originalHandleSync.indexOf('// --- PULL DATA FROM CLOUD TO LOCAL ---');
    const pullEnd = originalHandleSync.lastIndexOf('} catch (error) {');

    const pushLogic = originalHandleSync.substring(pushStart, pullStart);
    const pullLogic = originalHandleSync.substring(pullStart, pullEnd);

    const newHandleSync = `
        const pushToCloud = async () => {
            if (!isAuthenticated || !navigator.onLine) return;
            ${pushLogic}
            } catch (error) {
                console.error("Push to cloud failed:", error);
            }
        };

        const pullFromCloud = async () => {
            if (!isAuthenticated || !navigator.onLine) return;
            try {
                ${pullLogic}
            } catch (error) {
                console.error("Pull from cloud failed:", error);
            }
        };

        const handleSync = async () => {
            if (isSyncing.current) return;
            isSyncing.current = true;
            try {
                await pushToCloud();
                await pullFromCloud();
            } finally {
                isSyncing.current = false;
            }
        };

        // Real-time sync listener
        useRealtimeSync(
            ['products', 'customers', 'invoices', 'daily_sales', 'expenses', 'suppliers', 'creditors', 'debtors', 'returns', 'warehouses'],
            () => {
                if (!isSyncing.current) {
                    pullFromCloud();
                }
            }
        );
    `;

    content = content.substring(0, handleSyncStart) + newHandleSync + content.substring(handleSyncEnd);
}

fs.writeFileSync('src/hooks/useAutoSync.ts', content);
console.log('Refactored useAutoSync.ts');
