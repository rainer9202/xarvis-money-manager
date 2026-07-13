import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

/**
 * Nested stack for the Profile tab: Profile home pushes to Accounts,
 * Categories, and Groups. The native header is off — each screen renders
 * its own `PageHeader` (components/page-header.tsx) instead, matching the
 * rest of the app's navbar look instead of Expo Router's default.
 */
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="groups" />
    </Stack>
  );
}
