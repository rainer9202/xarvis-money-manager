import { Pressable, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MovementDetailModal } from '@/components/movement-detail-modal';
import {
  ChartsTabIcon,
  HomeTabIcon,
  ProfileTabIcon,
  ReportsTabIcon,
} from '@/components/ui/tab-icons';
import { colors } from '@/lib/theme';

const ACTIVE_COLOR = colors.accent;
const INACTIVE_COLOR = '#737373'; // neutral-500
const TAB_BAR_COLOR = colors.nav;
// Matches every screen's own bg, avoids a flash of mismatched color during
// nav transitions.
const SCREEN_BACKGROUND_COLOR = colors.background;
const BORDER_COLOR = colors.navBorder;

/**
 * Home | Charts | (+ FAB) | Reports | Profile.
 *
 * Routing-mechanics call: the FAB is an absolutely-positioned Pressable
 * overlaid on top of <Tabs>, not a Tabs.Screen. The alternative — a
 * dedicated non-navigable Tabs.Screen with a custom tabBarButton and a
 * tabPress listener that calls preventDefault() — requires a matching dummy
 * route file purely so Expo Router has something to resolve the screen
 * name against, and it makes the tab bar auto-space 5 items instead of 4.
 * The overlay avoids both: 4 real tabs stay evenly spaced (matching the
 * reference layout), and the raised gold circle floats independently in the
 * gap, its own Pressable capturing taps in that zone.
 *
 * The FAB pushes the "select category" page (app/select-category.tsx, view 1
 * of the create/edit flow) at the root Stack — reachable from any tab
 * regardless of which one is active. Viewing an existing movement
 * (`MovementDetailModal`, a bottom sheet) is mounted once here too, driven
 * by `useMovementModalStore` instead of route params since it's local UI
 * state, not navigation.
 */
export default function AppLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND_COLOR }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: {
            backgroundColor: TAB_BAR_COLOR,
            borderTopColor: BORDER_COLOR,
            height: 64 + insets.bottom,
            paddingBottom: 10 + insets.bottom,
          },
          tabBarLabelStyle: { fontSize: 12 },
          tabBarItemStyle: { paddingTop: 8 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, focused }) => <HomeTabIcon color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="charts"
          options={{
            title: 'Gráficos',
            tabBarIcon: ({ color, focused }) => <ChartsTabIcon color={color} focused={focused} />,
            tabBarItemStyle: { paddingTop: 8, marginRight: 40 },
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reportes',
            tabBarIcon: ({ color, focused }) => <ReportsTabIcon color={color} focused={focused} />,
            tabBarItemStyle: { paddingTop: 8, marginLeft: 40 },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, focused }) => <ProfileTabIcon color={color} focused={focused} />,
          }}
        />
      </Tabs>

      <Pressable
        onPress={() => router.push('/select-category')}
        accessibilityRole="button"
        accessibilityLabel="Agregar movimiento"
        className="absolute h-16 w-16 items-center justify-center rounded-full bg-amber-400 active:bg-amber-500"
        style={{
          left: '50%',
          bottom: 28 + insets.bottom,
          marginLeft: -32,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        }}
      >
        <Ionicons name="add" size={30} color={colors.background} />
      </Pressable>

      <MovementDetailModal />
    </View>
  );
}
