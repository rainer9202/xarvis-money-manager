const { colors } = require('./lib/theme');

const DEFAULT_API_URL = 'http://localhost:3000';

// EXPO_PUBLIC_* env vars are inlined at build time by Expo. We resolve the
// default here (once) and expose it through `extra.apiUrl` so the rest of the
// app has a single source of truth (see lib/config.ts) instead of every
// call site re-implementing the same fallback.
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

module.exports = ({ config }) => ({
  ...config,
  name: 'Xarvis Cuartos',
  slug: 'xarvis-money-manager',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'xarvismoneymanager',
  userInterfaceStyle: 'automatic',
  backgroundColor: colors.background,
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.xarvis.moneymanager',
    backgroundColor: colors.background,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-system-ui',
    [
      'expo-splash-screen',
      {
        image: './assets/android-icon-monochrome.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: colors.background,
      },
    ],
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          buildArchs: ['arm64-v8a'],
        },
      },
    ],
  ],
  extra: {
    apiUrl,
    eas: {
      projectId: '2efe8ac6-e1ba-431b-b592-b5df7d137e63',
    },
  },
});
