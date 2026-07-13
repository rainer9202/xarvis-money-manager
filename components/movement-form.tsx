import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { Button } from '@/components/ui/Button';
import { DateRow } from '@/components/ui/date-row';
import { DropdownRow } from '@/components/ui/dropdown-row';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { createMovement, updateMovement, type Movement, type UpdateMovementPayload } from '@/lib/api/movements';
import { getApiErrorMessage } from '@/lib/api/show-api-error';
import { getMovementTypeColor } from '@/lib/category-color';
import { formatCents, parseAmountInput } from '@/lib/format-money';
import { accountsQueryKey, useAccounts } from '@/lib/hooks/use-accounts';
import { useGroups } from '@/lib/hooks/use-groups';
import { movementsQueryKey } from '@/lib/hooks/use-movements';
import { MOVEMENT_TYPES, type MovementType } from '@/lib/movement-type';
import { movementFormSchema, type MovementFormValues } from '@/lib/schemas/movements';
import { useAccountFilterStore } from '@/store/account-filter-store';

const TODAY = dayjs().format('YYYY-MM-DD');
const DEFAULT_VALUES: MovementFormValues = {
  amount: '',
  date: TODAY,
  note: '',
  accountId: '',
  categoryId: '',
  movementType: MOVEMENT_TYPES[0],
  toAccountId: '',
  groupId: '',
};

type MovementFormProps = {
  /** When present, the form edits this movement instead of creating a new
   * one — every field is preloaded from it. */
  movement?: Movement;
  /** Fixed for this screen — chosen on view 1 (app/select-category.tsx),
   * not editable here. "Change category" navigates back to view 1 instead
   * of overriding it in place. */
  movementType: MovementType;
  categoryId: string;
  /** Called after a successful create/update mutation (e.g. to close the
   * modal). Not called on error — the form stays open so the user can retry. */
  onDone?: () => void;
};

/**
 * Shared create/edit movement form — extracted from the old inline
 * movements.tsx screen so both the "Add movement" page and the "Edit
 * movement" flow (same page, preloaded) reuse one implementation. Every
 * business rule is unchanged: transfer detection off the hardcoded `"MT03"`
 * code, toAccountId omitted entirely for non-transfers, the same Zod
 * schema, the same mutation + query invalidation.
 *
 * `movementType`/`categoryId` are fixed props, not form controls — view 1
 * (select-category) decides those; this view only handles amount/account/
 * date/note. Going back to view 1 is the page's own back button
 * (app/add-movement.tsx), not a control inside this form.
 */
export function MovementForm({ movement, movementType, categoryId, onDone }: MovementFormProps) {
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts();
  const { data: groups } = useGroups();
  const homeSelectedAccountId = useAccountFilterStore((state) => state.selectedAccountId);
  const isTransfer = movementType === 'MT03';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accountOptions = (accounts ?? []).map((account) => ({ label: account.name, value: account.id }));
  // "No group" first — Group is optional (for-frontend.md §5.1), and this
  // list needs an explicit way to clear a previously-set group, not just a
  // placeholder that's unreachable once something is selected. Its `value`
  // is `''`, same as "nothing chosen" — DropdownRow always shows the muted
  // placeholder for an empty value, never this row's label, so picking it
  // reads as clearing the field rather than selecting a real option.
  const groupOptions = [
    { label: 'Sin grupo', value: '' },
    ...(groups ?? []).map((group) => ({ label: group.name, value: group.id })),
  ];

  // New movements default to whichever account Home is currently filtered
  // to (the FAB is reached from Home, so this avoids a redundant re-pick for
  // the common "add to the account I'm looking at" case). Editing an
  // existing movement always preloads its own accountId instead.
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: movement
      ? {
          amount: (movement.amountCents / 100).toString(),
          date: dayjs(movement.date).format('YYYY-MM-DD'),
          note: movement.note ?? '',
          accountId: movement.accountId,
          categoryId,
          movementType,
          toAccountId: movement.toAccountId ?? '',
          groupId: movement.groupId ?? '',
        }
      : { ...DEFAULT_VALUES, accountId: homeSelectedAccountId ?? '', categoryId, movementType },
  });

  // `useWatch` (not `form.watch`) — the compiler-friendly subscription API,
  // avoids the "incompatible library" memoization warning from watch().
  const selectedAccountId = useWatch({ control, name: 'accountId' });
  const toAccountOptions = accountOptions.filter((option) => option.value !== selectedAccountId);

  const selectedAccount = (accounts ?? []).find((account) => account.id === selectedAccountId);
  const availableCreditCents =
    selectedAccount?.type === 'AT03' ? selectedAccount.creditLimitCents! + selectedAccount.balanceCents : null;

  // `refetchType: 'all'` (not the default 'active') — this form is reached
  // via router.back()/close() right after a successful mutation, and which
  // queries count as "currently active" at that exact instant is a race;
  // force every matching movements query to refetch regardless. Also
  // invalidates accounts — every movement type changes at least one
  // account's live `balanceCents` (computed server-side on every read), so
  // Accounts/the navbar would otherwise keep showing a stale balance until
  // that query's own staleTime lapses.
  const invalidateMovements = () => {
    queryClient.invalidateQueries({ queryKey: movementsQueryKey, refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: accountsQueryKey, refetchType: 'all' });
  };

  const buildPayload = (values: MovementFormValues) => ({
    amountCents: Math.round(parseAmountInput(values.amount) * 100),
    date: dayjs(values.date, 'YYYY-MM-DD').toISOString(),
    note: values.note ? values.note : undefined,
    accountId: values.accountId,
    categoryId: values.categoryId,
    movementType: values.movementType,
    toAccountId: isTransfer ? values.toAccountId : undefined,
    groupId: values.groupId ? values.groupId : undefined,
  });

  const createMutation = useMutation({
    mutationFn: createMovement,
    onSuccess: () => {
      invalidateMovements();
      reset(DEFAULT_VALUES);
      onDone?.();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMovementPayload }) => updateMovement(id, payload),
    onSuccess: () => {
      invalidateMovements();
      onDone?.();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const onSubmit = (values: MovementFormValues) => {
    setErrorMessage(null);
    const payload = buildPayload(values);
    if (movement) {
      // Explicit `null` (not omitted) clears a previously-set group — the
      // 3-state PATCH rule from for-frontend.md §5.4; every other field
      // keeps the plain "send it or don't" semantics.
      updateMutation.mutate({ id: movement.id, payload: { ...payload, groupId: values.groupId ? values.groupId : null } });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <View>
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="mb-6 items-center">
            <View className="flex-row items-baseline">
              <Text className="mr-1 text-3xl font-semibold" style={{ color: getMovementTypeColor(movementType) }}>
                €
              </Text>
              <TextInput
                className="min-w-[64px] text-center text-5xl font-bold"
                style={{ color: getMovementTypeColor(movementType) }}
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="0.00"
                placeholderTextColor="#404040"
                autoFocus={!movement}
              />
            </View>
            {errors.amount ? <Text className="mt-2 text-sm text-red-500">{errors.amount.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="accountId"
        render={({ field: { onChange, value } }) => (
          <DropdownRow
            icon="wallet-outline"
            label="Cuenta"
            value={value}
            options={accountOptions}
            onChange={onChange}
            error={errors.accountId?.message}
          />
        )}
      />

      {availableCreditCents !== null ? (
        <Text className="mb-3 -mt-1 text-xs text-neutral-500">Disponible: {formatCents(availableCreditCents)}</Text>
      ) : null}

      {isTransfer ? (
        <Controller
          control={control}
          name="toAccountId"
          render={({ field: { onChange, value } }) => (
            <DropdownRow
              icon="swap-horizontal-outline"
              label="Cuenta destino"
              value={value}
              options={toAccountOptions}
              onChange={onChange}
              error={errors.toAccountId?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, value } }) => (
          <View className="mb-3">
            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">Fecha</Text>
            <View className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4">
              <DateRow value={value} onChange={onChange} error={errors.date?.message} />
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="groupId"
        render={({ field: { onChange, value } }) => (
          <DropdownRow
            icon="albums-outline"
            label="Grupo (opcional)"
            value={value}
            options={groupOptions}
            onChange={onChange}
            placeholder="Sin grupo"
            error={errors.groupId?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nota (opcional)"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Compras de la semana"
            error={errors.note?.message}
          />
        )}
      />

      {errorMessage ? <Text className="mb-3 text-base text-red-500">{errorMessage}</Text> : null}

      <Button className="mt-4" isLoading={isSubmitting} onPress={handleSubmit(onSubmit)}>
        {movement ? 'Guardar cambios' : 'Agregar movimiento'}
      </Button>
    </View>
  );
}
