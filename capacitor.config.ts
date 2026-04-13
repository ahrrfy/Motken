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
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a5c2e',
  },
};

export default config;
