import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AccountFormModal } from '@/components/account-form-modal';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-state';
import { IconAction } from '@/components/ui/icon-action';
import { Text } from '@/components/ui/Text';
import { deleteAccount, updateAccount, type Account } from '@/lib/api/accounts';
import { getAccountTypeColor, getAccountTypeIcon } from '@/lib/account-color';
import { showApiError } from '@/lib/api/show-api-error';
import { confirmDestructive } from '@/lib/confirm';
import { formatCents } from '@/lib/format-money';
import { accountsQueryKey, useAccounts } from '@/lib/hooks/use-accounts';

export default function AccountsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: accounts, isLoading, isError, refetch } = useAccounts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: accountsQueryKey });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAccount(id, { isActive }),
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  // Deliberately no client-side "unset the others" logic — the backend
  // atomically swaps `isPrincipal` off the previous account in the same
  // PATCH (for-frontend.md §5.2), same as every other exclusivity rule in
  // this app being server-owned.
  const setPrincipalMutation = useMutation({
    mutationFn: (id: string) => updateAccount(id, { isPrincipal: true }),
    onSuccess: invalidate,
    onError: (error) => showApiError(error),
  });

  const openCreate = () => {
    setEditingAccount(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const confirmDelete = (account: Account) => {
    confirmDestructive(
      'Eliminar cuenta',
      `¿Eliminar "${account.name}"? Esta acción no se puede deshacer.`,
      () => deleteMutation.mutate(account.id),
    );
  };

  return (
    <View className="flex-1 bg-background">
      <PageHeader title="Cuentas" onBack={() => router.back()} />
      <View className="flex-1 px-4 pt-4">
        <Button className="mb-4" onPress={openCreate}>
          Agregar cuenta
        </Button>

        {isLoading ? (
          <ActivityIndicator color="#fbbf24" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={accounts ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text className="text-lg text-neutral-500">Todavía no tienes cuentas.</Text>}
            renderItem={({ item }) => (
              <Card
                padding={20}
                className="mb-4"
                style={{
                  borderColor:
                    item.isPrincipal === true ? '#fbbf24' : !item.isActive ? '#525252' : undefined,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: getAccountTypeColor(item.type) }}
                  >
                    <Ionicons name={getAccountTypeIcon(item.type)} size={20} color="#fafafa" />
                  </View>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="shrink text-base font-semibold text-neutral-50"
                    >
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-sm text-neutral-500">
                      {item.typeLabel} · {item.isActive ? 'Activa' : 'Inactiva'}
                    </Text>
                    {item.type === 'AT03' && item.creditLimitCents !== null ? (
                      <Text className="mt-0.5 text-sm text-neutral-500">
                        Disponible: {formatCents(item.creditLimitCents + item.balanceCents)} de{' '}
                        {formatCents(item.creditLimitCents)}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className={
                      item.balanceCents < 0
                        ? 'text-lg font-semibold text-red-500'
                        : 'text-lg font-semibold text-emerald-500'
                    }
                  >
                    {formatCents(item.balanceCents)}
                  </Text>
                </View>

                <View className="mt-4 flex-row items-center gap-3 border-t border-neutral-800 pt-4">
                  <IconAction size="lg" icon="create-outline" label="Editar" onPress={() => openEdit(item)} />
                  <IconAction
                    size="lg"
                    icon={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    label={item.isActive ? 'Desactivar' : 'Activar'}
                    isLoading={
                      toggleActiveMutation.isPending &&
                      toggleActiveMutation.variables?.id === item.id
                    }
                    onPress={() =>
                      toggleActiveMutation.mutate({ id: item.id, isActive: !item.isActive })
                    }
                  />
                  <Button
                    size="sm"
                    variant={item.isPrincipal === true ? 'primary' : 'secondary'}
                    disabled={item.isPrincipal === true}
                    isLoading={
                      setPrincipalMutation.isPending && setPrincipalMutation.variables === item.id
                    }
                    onPress={() => setPrincipalMutation.mutate(item.id)}
                  >
                    Principal
                  </Button>
                  <View className="flex-1" />
                  <IconAction
                    size="lg"
                    icon="trash-outline"
                    label="Eliminar"
                    color="#ef4444"
                    isLoading={deleteMutation.isPending && deleteMutation.variables === item.id}
                    onPress={() => confirmDelete(item)}
                  />
                </View>
              </Card>
            )}
          />
        )}

        <AccountFormModal
          visible={isFormOpen}
          account={editingAccount}
          onClose={() => setIsFormOpen(false)}
        />
      </View>
    </View>
  );
}
