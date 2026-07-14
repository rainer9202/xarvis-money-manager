import { Platform, Pressable, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';

type PageHeaderProps = {
  title: string;
  /** Omit on a tab root (Profile itself) — there's nothing to go back to
   * within that stack. Present on every screen pushed on top of it
   * (Accounts/Categories/Groups). */
  onBack?: () => void;
};

/**
 * Minimal "back + title" navbar — same dark bar language as
 * MovementsSummaryHeader (bg-neutral-900, border-b, px-6 py-5) but without
 * the menu/month/balance row, for screens that don't need that context
 * (Profile and its Accounts/Categories/Groups sub-screens). Replaces the
 * native Expo Router Stack header for those screens so every tab reads as
 * the same app instead of Profile's stack looking like a different app.
 */
export function PageHeader({ title, onBack }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  // insets.top can report 0 on Android when the edge-to-edge inset dispatch
  // hasn't kicked in yet — StatusBar.currentHeight reads the real native bar
  // height directly, so it's a reliable floor for the same value.
  const topInset = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;
  return (
    <View
      className="flex-row items-center gap-3 border-b border-nav-border bg-nav px-6 py-5"
      style={{ paddingTop: topInset + 20 }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color="#fafafa" />
        </Pressable>
      ) : null}
      <Text className="text-xl font-bold text-neutral-50">{title}</Text>
    </View>
  );
}
