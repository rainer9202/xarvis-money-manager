import { Redirect } from 'expo-router';

import { useSessionStore } from '@/store/session-store';

/**
 * Unconditional entry route (outside both Stack.Protected groups in
 * app/_layout.tsx) — always resolvable, and forwards to whichever group is
 * currently visible based on session state.
 */
export default function Index() {
  const token = useSessionStore((state) => state.token);

  return <Redirect href={token ? '/(app)' : '/(auth)/sign-in'} />;
}
