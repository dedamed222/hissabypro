
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0f15d881b55d463a8a10d250a5dc02e4',
  appName: 'hissabypro',
  webDir: 'dist',
  server: {
    url: 'https://0f15d881-b55d-463a-8a10-d250a5dc02e4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  },
  android: {
    backgroundColor: '#ffffff'
  }
};

export default config;
