import { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  View,
  useWindowDimensions,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import {
  createGroup,
  updateGroup,
  type CreateGroupPayload,
  type Group,
  type UpdateGroupPayload,
} from '@/lib/api/groups';
import { showApiError } from '@/lib/api/show-api-error';
import { parseAmountInput } from '@/lib/format-money';
import { groupsQueryKey } from '@/lib/hooks/use-groups';
import { groupFormSchema, type GroupFormValues } from '@/lib/schemas/groups';

const DEFAULT_VALUES: GroupFormValues = { name: '', budgetCents: '' };

type GroupFormModalProps = {
  visible: boolean;
  /** When present, edits this group instead of creating a new one. */
  group?: Group;
  onClose: () => void;
};

/**
 * Bottom-sheet create/edit form for groups. Slides up from the bottom on
 * open and back down on close, matching AccountFormModal/CategoryFormModal
 * — `animationType="none"` + a manually driven `translateY`. `isRendered`
 * keeps the Modal mounted for the duration of the closing animation instead
 * of unmounting the instant `visible` flips false.
 */
export function GroupFormModal({ visible, group, onClose }: GroupFormModalProps) {
  const queryClient = useQueryClient();
  const [isRendered, setIsRendered] = useState(visible);
  const [sheetTranslateY] = useState(() => new Animated.Value(300));
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // insets.top can report 0 on Android when the edge-to-edge inset dispatch
  // hasn't kicked in yet — StatusBar.currentHeight is a reliable floor.
  const topInset =
    Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;
  const sheetMaxHeight = windowHeight - topInset - 24;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  if (visible && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (!visible) return;
    reset(
      group
        ? {
            name: group.name,
            budgetCents: group.budgetCents !== null ? (group.budgetCents / 100).toString() : '',
          }
        : DEFAULT_VALUES,
    );
  }, [visible, group, reset]);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(300);
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!isRendered) return;
    Animated.timing(sheetTranslateY, { toValue: 300, duration: 200, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setIsRendered(false);
      },
    );
  }, [visible, isRendered, sheetTranslateY]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: groupsQueryKey });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => showApiError(error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupPayload }) =>
      updateGroup(id, payload),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => showApiError(error),
  });

  const onSubmit = (values: GroupFormValues) => {
    if (group) {
      // Three-state PATCH rule (for-frontend.md §5.1): send a number when the
      // field has a value, `null` only when clearing a cap the group
      // currently has, otherwise omit the field entirely.
      const payload: UpdateGroupPayload = { name: values.name };
      if (values.budgetCents) {
        payload.budgetCents = Math.round(parseAmountInput(values.budgetCents) * 100);
      } else if (group.budgetCents !== null) {
        payload.budgetCents = null;
      }
      updateMutation.mutate({ id: group.id, payload });
    } else {
      const payload: CreateGroupPayload = { name: values.name };
      if (values.budgetCents) {
        payload.budgetCents = Math.round(parseAmountInput(values.budgetCents) * 100);
      }
      createMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal visible={isRendered} animationType="none" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          <Animated.View
            style={{ transform: [{ translateY: sheetTranslateY }], maxHeight: sheetMaxHeight }}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View className="rounded-t-lg border border-neutral-800 bg-neutral-900">
                <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
                  <Text className="text-2xl font-semibold text-neutral-50">
                    {group ? 'Editar grupo' : 'Agregar grupo'}
                  </Text>
                  <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                  >
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
                        placeholder="Casa"
                        error={errors.name?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="budgetCents"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextField
                        label="Presupuesto (opcional)"
                        keyboardType="decimal-pad"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        placeholder="500.00"
                        error={errors.budgetCents?.message}
                      />
                    )}
                  />

                  <Button
                    className="mt-4"
                    isLoading={isSubmitting}
                    onPress={handleSubmit(onSubmit)}
                  >
                    {group ? 'Guardar cambios' : 'Agregar grupo'}
                  </Button>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
