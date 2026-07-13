import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/select-field';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  createAccount,
  updateAccount,
  type Account,
  type CreateAccountPayload,
  type UpdateAccountPayload,
} from '@/lib/api/accounts';
import { getApiErrorMessage } from '@/lib/api/show-api-error';
import { parseAmountInput } from '@/lib/format-money';
import { accountsQueryKey } from '@/lib/hooks/use-accounts';
import { accountFormSchema, type AccountFormValues } from '@/lib/schemas/accounts';

// Picker options aren't tied to a fetched account, so there's no server
// `typeLabel` to prefer here — the fallback label map is the right source
// for option text.
const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({ label: ACCOUNT_TYPE_LABELS[type], value: type }));
const DEFAULT_VALUES: AccountFormValues = { name: '', type: 'AT01', creditLimitCents: '' };

type AccountFormModalProps = {
  visible: boolean;
  /** When present, edits this account instead of creating a new one. */
  account?: Account;
  onClose: () => void;
};

/**
 * Bottom-sheet create/edit form for accounts. Slides up from the bottom on
 * open and back down on close, matching MonthPickerModal/AccountPickerModal
 * — `animationType="none"` + a manually driven `translateY`. `isRendered`
 * keeps the Modal mounted for the duration of the closing animation instead
 * of unmounting the instant `visible` flips false. Self-contained: owns its
 * own form state and create/update mutations, same as
 * components/movement-form.tsx.
 */
export function AccountFormModal({ visible, account, onClose }: AccountFormModalProps) {
  const queryClient = useQueryClient();
  const [isRendered, setIsRendered] = useState(visible);
  const [sheetTranslateY] = useState(() => new Animated.Value(300));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const type = useWatch({ control, name: 'type' });
  const isCredit = type === 'AT03';

  if (visible && !isRendered) {
    setIsRendered(true);
    // `account` only ever changes together with `visible` flipping true (the
    // parent screen always sets both in the same tap handler — see
    // app/(app)/profile/accounts.tsx), so this render-time check is the one
    // place a stale error from a previous open needs clearing. Adjusting
    // state here (not in the effect below) avoids the extra cascading
    // render `react-hooks/set-state-in-effect` warns about.
    setErrorMessage(null);
  }

  useEffect(() => {
    if (!visible) return;
    reset(
      account
        ? {
            name: account.name,
            type: account.type,
            creditLimitCents: account.creditLimitCents !== null ? (account.creditLimitCents / 100).toString() : '',
          }
        : DEFAULT_VALUES,
    );
  }, [visible, account, reset]);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(300);
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      return;
    }
    if (!isRendered) return;
    Animated.timing(sheetTranslateY, { toValue: 300, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setIsRendered(false);
    });
  }, [visible, isRendered, sheetTranslateY]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: accountsQueryKey });

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAccountPayload }) => updateAccount(id, payload),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const onSubmit = (values: AccountFormValues) => {
    setErrorMessage(null);

    if (account) {
      // `creditLimitCents` three-state PATCH rule (for-frontend.md §5.2):
      // send a number whenever the effective type is AT03 (always required
      // by the schema in that case, so this never omits it), send `null`
      // only when leaving AT03 on an account that currently has a cap set
      // (the one case the backend requires an explicit clear), otherwise
      // omit the field entirely.
      const payload: UpdateAccountPayload = { name: values.name, type: values.type };
      if (values.type === 'AT03') {
        // Non-null: the schema's superRefine requires a non-empty
        // creditLimitCents whenever type is AT03 (see lib/schemas/accounts.ts).
        payload.creditLimitCents = Math.round(parseAmountInput(values.creditLimitCents!) * 100);
      } else if (account.creditLimitCents !== null) {
        payload.creditLimitCents = null;
      }
      updateMutation.mutate({ id: account.id, payload });
    } else {
      const payload: CreateAccountPayload = { name: values.name, type: values.type };
      if (values.type === 'AT03') {
        // Non-null: the schema's superRefine requires a non-empty
        // creditLimitCents whenever type is AT03 (see lib/schemas/accounts.ts).
        payload.creditLimitCents = Math.round(parseAmountInput(values.creditLimitCents!) * 100);
      }
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal visible={isRendered} animationType="none" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" onPress={onClose}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        />
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }], maxHeight: '85%' }}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View className="rounded-t-lg border border-neutral-800 bg-neutral-900">
              <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
                <Text className="text-2xl font-semibold text-neutral-50">{account ? 'Editar cuenta' : 'Agregar cuenta'}</Text>
                <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <Ionicons name="close" size={28} color="#fafafa" />
                </Pressable>
              </View>

              <View className="px-4 py-6">
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextField
                      label="Nombre"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="Cuenta principal"
                      error={errors.name?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <SelectField
                      label="Tipo"
                      value={value}
                      options={ACCOUNT_TYPE_OPTIONS}
                      onChange={onChange}
                      error={errors.type?.message}
                    />
                  )}
                />

                {isCredit ? (
                  <Controller
                    control={control}
                    name="creditLimitCents"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label="Límite de crédito"
                        keyboardType="decimal-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="500.00"
                        error={errors.creditLimitCents?.message}
                      />
                    )}
                  />
                ) : null}

                {errorMessage ? <Text className="mb-3 text-base text-red-500">{errorMessage}</Text> : null}

                <Button className="mt-4" isLoading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                  {account ? 'Guardar cambios' : 'Agregar cuenta'}
                </Button>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
