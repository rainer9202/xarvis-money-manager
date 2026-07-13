import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useAccounts } from '@/lib/hooks/use-accounts';
import { useCategories } from '@/lib/hooks/use-categories';
import { useGroups } from '@/lib/hooks/use-groups';
import { useSessionStore } from '@/store/session-store';

type ProfileRow = {
  href: '/(app)/profile/accounts' | '/(app)/profile/categories' | '/(app)/profile/groups';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ROWS: ProfileRow[] = [
  { href: '/(app)/profile/accounts', label: 'Cuentas', icon: 'wallet-outline' },
  { href: '/(app)/profile/categories', label: 'Categorías', icon: 'pricetags-outline' },
  { href: '/(app)/profile/groups', label: 'Grupos', icon: 'albums-outline' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const name = useSessionStore((state) => state.name);
  const email = useSessionStore((state) => state.email);
  const clearSession = useSessionStore((state) => state.clearSession);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: groups } = useGroups();

  const handleLogout = async () => {
    // Purely client-side — the API has no logout/revocation endpoint
    // (for-frontend.md §2.5). Discarding the token here is the whole story.
    await clearSession();
    router.replace('/');
  };

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
            <Text numberOfLines={1} className="w-full text-center text-base font-medium text-neutral-400">
              Cuentas
            </Text>
            <Text numberOfLines={1} className="mt-1.5 w-full text-center text-3xl font-bold text-neutral-50">
              {accounts?.length ?? 0}
            </Text>
          </Card>
          <Card padding={20} className="flex-1 items-center">
            <Text numberOfLines={1} className="w-full text-center text-base font-medium text-neutral-400">
              Categorías
            </Text>
            <Text numberOfLines={1} className="mt-1.5 w-full text-center text-3xl font-bold text-neutral-50">
              {categories?.length ?? 0}
            </Text>
          </Card>
          <Card padding={20} className="flex-1 items-center">
            <Text numberOfLines={1} className="w-full text-center text-base font-medium text-neutral-400">
              Grupos
            </Text>
            <Text numberOfLines={1} className="mt-1.5 w-full text-center text-3xl font-bold text-neutral-50">
              {groups?.length ?? 0}
            </Text>
          </Card>
        </View>

        <Card padding={0} className="overflow-hidden">
          {ROWS.map((row, index) => (
            <Link key={row.href} href={row.href} asChild>
              <Pressable
                className={
                  index === ROWS.length - 1
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
            </Link>
          ))}
        </Card>
      </View>
    </View>
  );
}
