import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AccountsView } from '@/components/profile/accounts-view';
import { CategoriesView } from '@/components/profile/categories-view';
import { GroupsView } from '@/components/profile/groups-view';
import { HistoricView } from '@/components/profile/historic-view';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useCategories } from '@/lib/hooks/use-categories';
import { useGroups } from '@/lib/hooks/use-groups';
import { useSessionStore } from '@/store/session-store';

type ProfileSubview = 'accounts' | 'categories' | 'groups' | 'historic';

type ProfileRow = {
  view: ProfileSubview;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MANAGEMENT_ROWS: ProfileRow[] = [
  { view: 'accounts', label: 'Cuentas', icon: 'wallet-outline' },
  { view: 'categories', label: 'Categorías', icon: 'pricetags-outline' },
  { view: 'groups', label: 'Grupos', icon: 'albums-outline' },
];

const REPORT_ROWS: ProfileRow[] = [{ view: 'historic', label: 'Histórico', icon: 'time-outline' }];

function ProfileRowsCard({
  rows,
  onSelect,
}: {
  rows: ProfileRow[];
  onSelect: (view: ProfileSubview) => void;
}) {
  return (
    <Card padding={0} className="mb-4 overflow-hidden">
      {rows.map((row, index) => (
        <Pressable
          key={row.view}
          onPress={() => onSelect(row.view)}
          className={
            index === rows.length - 1
              ? 'flex-row items-center justify-between px-5 py-5 active:bg-neutral-800'
              : 'flex-row items-center justify-between border-b border-neutral-800 px-5 py-5 active:bg-neutral-800'
          }
        >
          <View className="flex-row items-center gap-3.5">
            <Ionicons name={row.icon} size={22} color="#fbbf24" />
            <Text className="text-lg font-medium text-neutral-50">{row.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#737373" />
        </Pressable>
      ))}
    </Card>
  );
}

/**
 * Accounts/Categories/Groups/Historic used to be pushed screens on a nested
 * Stack navigator (app/(app)/profile/accounts.tsx etc.). That meant this
 * tab preserved whatever screen you'd last pushed even after switching away
 * and back — fixing "always land on Profile's root" required either an
 * extra pop transition (visible flash) or hijacking the tab navigator's own
 * `navigate` call (which broke every other tab). Local state sidesteps the
 * navigation-hijacking risk, but the tab navigator still doesn't unmount an
 * inactive tab's screen, so `activeView` alone would carry the same
 * "restores whatever you left" behavior over to React state instead of
 * navigation state. The `useFocusEffect` below closes that gap: its cleanup
 * runs on blur (switching to another tab), resetting `activeView` to null
 * purely as local state — no navigation call involved, so there's nothing
 * to hijack.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const name = useSessionStore((state) => state.name);
  const email = useSessionStore((state) => state.email);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [activeView, setActiveView] = useState<ProfileSubview | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => setActiveView(null);
    }, []),
  );

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: groups } = useGroups();

  const handleLogout = async () => {
    // Purely client-side — the API has no logout/revocation endpoint
    // (for-frontend.md §2.5). Discarding the token here is the whole story.
    await clearSession();
    router.replace('/');
  };

  const goHome = () => setActiveView(null);

  if (activeView === 'accounts') return <AccountsView onBack={goHome} />;
  if (activeView === 'categories') return <CategoriesView onBack={goHome} />;
  if (activeView === 'groups') return <GroupsView onBack={goHome} />;
  if (activeView === 'historic') return <HistoricView onBack={goHome} />;

  return (
    <View className="flex-1 bg-background">
      <PageHeader title="Perfil" />

      <View className="flex-1 px-4 pt-4">
        <Card padding={20} className="mb-4 flex-row items-center">
          <View className="mr-4 h-16 w-16 items-center justify-center rounded-full bg-amber-400">
            <Ionicons name="person" size={28} color="#0a0a0a" />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-xl font-semibold text-neutral-50">
              {name || 'Usuario de Xarvis'}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-lg text-neutral-400">
              {email || 'Sin correo registrado'}
            </Text>
          </View>
          <Pressable
            onPress={() => void handleLogout()}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full bg-neutral-800 active:bg-neutral-700"
          >
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </Pressable>
        </Card>

        <View className="mb-4 flex-row gap-4">
          <Card padding={20} className="flex-1 items-center">
            <Text
              numberOfLines={1}
              className="w-full text-center text-base font-medium text-neutral-400"
            >
              Cuentas
            </Text>
            <Text
              numberOfLines={1}
              className="mt-1.5 w-full text-center text-3xl font-bold text-neutral-50"
            >
              {accounts?.length ?? 0}
            </Text>
          </Card>
          <Card padding={20} className="flex-1 items-center">
            <Text
              numberOfLines={1}
              className="w-full text-center text-base font-medium text-neutral-400"
            >
              Categorías
            </Text>
            <Text
              numberOfLines={1}
              className="mt-1.5 w-full text-center text-3xl font-bold text-neutral-50"
            >
              {categories?.length ?? 0}
            </Text>
          </Card>
          <Card padding={20} className="flex-1 items-center">
            <Text
              numberOfLines={1}
              className="w-full text-center text-base font-medium text-neutral-400"
            >
              Grupos
            </Text>
            <Text
              numberOfLines={1}
              className="mt-1.5 w-full text-center text-3xl font-bold text-neutral-50"
            >
              {groups?.length ?? 0}
            </Text>
          </Card>
        </View>

        <ProfileRowsCard rows={REPORT_ROWS} onSelect={setActiveView} />
        <ProfileRowsCard rows={MANAGEMENT_ROWS} onSelect={setActiveView} />
      </View>
    </View>
  );
}
