// إعداد Capacitor — سراج القرآن
// التطبيق يحمّل الواجهة محلياً والبيانات من السيرفر مباشرة
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sirajalquran.app',
  appName: 'سِرَاجُ الْقُرْآنِ',
  webDir: 'dist/public',
  server: {
    // لا server.url — الواجهة تُحمّل محلياً من assets الجهاز
    androidScheme: 'https',
    hostname: 'sirajalquran.org', // مهم: يجعل origin = https://sirajalquran.org لتعمل cookies
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
