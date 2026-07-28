import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowUpdateBanner(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  if (isOnline && !showUpdateBanner) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center flex items-center justify-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('offlineMode')}
          </span>
        </div>
      )}

      {/* Update Available Banner */}
      {showUpdateBanner && isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white px-4 py-2 text-center flex items-center justify-center gap-3 shadow-lg">
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('updateAvailable')}
          </span>
          <button 
            onClick={handleUpdate}
            className="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            {t('updateNow')}
          </button>
        </div>
      )}

      {/* Online Status Indicator (when coming back online) */}
      {isOnline && !showUpdateBanner && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg animate-fade-in">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('backOnline')}
          </span>
        </div>
      )}
    </>
  );
}
