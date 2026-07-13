import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:3000';

/**
 * Base URL for the Xarvis Brain API.
 *
 * Resolution order:
 * 1. `extra.apiUrl` from app.config.ts (computed at config-eval time from
 *    `EXPO_PUBLIC_API_URL`, falling back to localhost).
 * 2. `process.env.EXPO_PUBLIC_API_URL` directly (covers environments where
 *    `Constants.expoConfig.extra` isn't populated, e.g. some test runners).
 * 3. The hardcoded default.
 */
export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  DEFAULT_API_URL;
