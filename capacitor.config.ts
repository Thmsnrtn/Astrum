import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.astrum.app',
  appName: 'Astrum',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#040410',
    preferredContentMode: 'mobile',
  },
  plugins: {
    // StatusBar is the only plugin config we ship: @capacitor/status-bar is
    // installed. (SplashScreen/Keyboard config was removed — those plugins
    // were configured but never installed, so the blocks were dead. Install
    // @capacitor/splash-screen or @capacitor/keyboard before re-adding.)
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#040410',
      overlaysWebView: true,
    },
  }
};

export default config;
