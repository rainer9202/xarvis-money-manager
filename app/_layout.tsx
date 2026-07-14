import '../global.css';

import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { ConfirmModal } from '@/components/confirm-modal';
import { colors } from '@/lib/theme';
import { useAccountFilterStore } from '@/store/account-filter-store';
import { useMonthFilterStore } from '@/store/month-filter-store';
import { useSessionStore } from '@/store/session-store';

const queryClient = new QueryClient();

// App-wide Spanish locale — every `dayjs(...).format(...)` call across the
// app (weekday/month names on Home, Charts, Reports, the date pickers, ...)
// picks this up automatically, no per-call-site changes needed.
dayjs.locale('es');

void SplashScreen.preventAutoHideAsync();

// Sets the native root view's background color (Android's windowBackground)
// once, app-wide — without this, any screen transition can flash the OS
// default white for a frame before React paints, since contentStyle on
// Stack.screenOptions only covers React's own render, not the native
// window underneath it. Fixing this here (not per-screen) is deliberate:
// every current and future screen gets it for free.
void SystemUI.setBackgroundColorAsync(colors.background);

export default function RootLayout() {
  const router = useRouter();
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const token = useSessionStore((state) => state.token);
  const hydrate = useSessionStore((state) => state.hydrate);
  const previousTokenRef = useRef<string | null>(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Read the persisted token from expo-secure-store once on boot, before
  // deciding whether to render the auth stack or the app shell.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [isHydrated, fontsLoaded]);

  // Whenever the session goes from present to absent — logout, or the API
  // client clearing it after a 401 (there is no refresh token, see
  // lib/api/client.ts) — force navigation back through "/" so it re-resolves
  // to the sign-in route instead of leaving the router pointed at a screen
  // that Stack.Protected just hid.
  useEffect(() => {
    if (isHydrated && previousTokenRef.current && !token) {
      // Wipe cross-user state along with the session — otherwise a second
      // user signing in on the same device would inherit the previous
      // user's selected account/month and cached accounts/movements data.
      queryClient.clear();
      useAccountFilterStore.getState().setSelectedAccountId(null);
      useMonthFilterStore.getState().setMonth(dayjs().startOf('month'));
      router.replace('/');
    }
    previousTokenRef.current = token;
  }, [token, isHydrated, router]);

  if (!isHydrated || !fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected guard={!token}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={!!token}>
            <Stack.Screen name="(app)" />
            {/* Regular page pushes (default presentation, not `modal`) — the
             * two-view create/edit movement flow. select-category (view 1:
             * pick type + category) is reached from the FAB (create) or the
             * movement-detail sheet's Edit button (edit, via the `id` param);
             * it then pushes add-movement (view 2: amount/account/date).
             * Hosted at the root Stack so the FAB can reach them from any
             * tab, same reasoning as (app)'s other root-level screens. */}
            <Stack.Screen name="select-category" />
            <Stack.Screen name="add-movement" />
          </Stack.Protected>
        </Stack>
        <StatusBar style="light" />
        <ConfirmModal />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
