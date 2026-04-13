// إعداد Capacitor — سراج القرآن
// Production: https://sirajalquran.org
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sirajalquran.app',
  appName: 'سِرَاجُ الْقُرْآنِ',
  webDir: 'dist/public',
  server: {
    url: 'https://sirajalquran.org',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a5c2e',
      showSpinner: true,
      spinnerColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      backgroundColor: '#1a5c2e',
      style: 'LIGHT',
    },
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a5c2e',
    webContentsDebuggingEnabled: false,
    overrideUserAgent: 'SirajAlQuran-Android/1.0',
  },
};

export default config;
