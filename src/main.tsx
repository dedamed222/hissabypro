import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/serviceWorker'

// Set mobile viewport
if (document.head.querySelector('meta[name="viewport"]') === null) {
  const metaTag = document.createElement('meta');
  metaTag.name = 'viewport';
  metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(metaTag);
}

// Create content-scale meta for iOS
if (document.head.querySelector('meta[name="apple-mobile-web-app-capable"]') === null) {
  const appleMetaTag = document.createElement('meta');
  appleMetaTag.name = 'apple-mobile-web-app-capable';
  appleMetaTag.content = 'yes';
  document.head.appendChild(appleMetaTag);
}

// Register service worker outside React to avoid hook conflicts
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
