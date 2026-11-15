import type { ExpoConfig } from 'expo/config';
// Single source for the app name and identifiers (rename the app there).
import brand from '../../packages/shared/src/brand.json';

/** Prototype mode (web user test): no backend, served from GitHub Pages under /nova-prototype. */
const PROTOTYPE = process.env.EXPO_PUBLIC_PROTOTYPE === '1';

const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // The app picks dark (default) or light itself; see src/theme.ts.
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: brand.iosBundleId,
    supportsTablet: false,
  },
  android: {
    package: brand.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#0E0F13',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    // Arabic needs right-to-left layout.
    ['expo-localization', { supportsRTL: true }],
    'expo-font',
    'expo-sqlite',
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow $(PRODUCT_NAME) to use your photos for your profile picture.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 200, backgroundColor: '#0E0F13' },
    ],
  ],
  web: {
    bundler: 'metro',
    // One index.html for every route (GitHub Pages serves 404.html for deep links).
    output: 'single',
    name: brand.name,
    shortName: brand.name,
    themeColor: '#0E0F13',
    backgroundColor: '#0E0F13',
    favicon: './assets/favicon.png',
  },
  experiments: {
    typedRoutes: true,
    ...(PROTOTYPE ? { baseUrl: '/nova-prototype' } : {}),
  },
};

export default config;
