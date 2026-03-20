import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.estudio.gradu',
  appName: 'Gradu',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#E3C39D",
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: "res://ic_stat_graduation", 
      iconColor: "#E3C39D",
    }
  }
};

export default config;