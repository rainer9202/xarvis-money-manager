import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

/**
 * Single-screen stack for the Profile tab — Accounts/Categories/Groups/
 * Historic used to be separate pushed screens here, but that made the tab's
 * nested navigation state (which of those you last pushed) survive a tab
 * switch, so "go back to Profile" from the tab bar could land you back on
 * whichever one you'd left. They're now local-state subviews rendered
 * directly by index.tsx (see components/profile/) instead — nothing left
 * to push here. The native header stays off; index.tsx renders its own
 * `PageHeader` like every other screen.
 */
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
