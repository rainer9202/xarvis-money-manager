import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { IconPicker } from '@/components/icon-picker';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/select-field';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { createCategory, updateCategory, type Category } from '@/lib/api/categories';
import { showApiError } from '@/lib/api/show-api-error';
import { categoriesQueryKey } from '@/lib/hooks/use-categories';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPES } from '@/lib/movement-type';
import { categoryFormSchema, type CategoryFormValues } from '@/lib/schemas/categories';

// Picker options aren't tied to a fetched category, so there's no server
// `movementTypeLabel` to prefer here — the fallback label map is the right
// source for option text.
const MOVEMENT_TYPE_OPTIONS = MOVEMENT_TYPES.map((type) => ({ label: MOVEMENT_TYPE_LABELS[type], value: type }));
const DEFAULT_VALUES: CategoryFormValues = { name: '', icon: 'pricetag-outline', movementType: MOVEMENT_TYPES[0] };

type CategoryFormModalProps = {
  visible: boolean;
  /** When present, edits this category instead of creating a new one. */
  category?: Category;
  onClose: () => void;
};

/**
 * Bottom-sheet create/edit form for categories. Slides up from the bottom on
 * open and back down on close, matching MonthPickerModal/AccountPickerModal
 * — `animationType="none"` + a manually driven `translateY`.
 * `isRendered` keeps the Modal mounted for the duration of the closing
 * animation instead of unmounting the instant `visible` flips false.
 */
export function CategoryFormModal({ visible, category, onClose }: CategoryFormModalProps) {
  const queryClient = useQueryClient();
  const [isRendered, setIsRendered] = useState(visible);
  const [sheetTranslateY] = useState(() => new Animated.Value(300));

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  if (visible && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (!visible) return;
    reset(category ? { name: category.name, icon: category.icon, movementType: category.movementType } : DEFAULT_VALUES);
  }, [visible, category, reset]);

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: categoriesQueryKey });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => showApiError(error),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryFormValues }) => updateCategory(id, payload),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (error) => showApiError(error),
  });

  const onSubmit = (values: CategoryFormValues) => {
    if (category) {
      updateMutation.mutate({ id: category.id, payload: values });
    } else {
      createMutation.mutate(values);
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
                <Text className="text-2xl font-semibold text-neutral-50">{category ? 'Editar categoría' : 'Agregar categoría'}</Text>
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
                      placeholder="Supermercado"
                      error={errors.name?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="icon"
                  render={({ field: { onChange, value } }) => (
                    <IconPicker value={value} onChange={onChange} error={errors.icon?.message} />
                  )}
                />

                <Controller
                  control={control}
                  name="movementType"
                  render={({ field: { onChange, value } }) => (
                    <SelectField
                      label="Tipo de movimiento"
                      value={value}
                      options={MOVEMENT_TYPE_OPTIONS}
                      onChange={onChange}
                      error={errors.movementType?.message}
                    />
                  )}
                />

                <Button className="mt-4" isLoading={isSubmitting} onPress={handleSubmit(onSubmit)}>
                  {category ? 'Guardar cambios' : 'Agregar categoría'}
                </Button>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
