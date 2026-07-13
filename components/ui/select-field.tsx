import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';

export type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

/**
 * Minimal modal-based picker shared by every screen that needs a fixed-list
 * select (account type, movementType, accountId, categoryId, toAccountId
 * ...). No picker library is in package.json, so this is built on RN's
 * built-in Modal/FlatList rather than adding a new dependency.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar…',
  error,
  disabled,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="mb-3">
      <Text className="mb-1 text-base font-medium text-neutral-400">{label}</Text>
      <Pressable
        className={
          error
            ? 'rounded-2xl border border-red-500 bg-neutral-900 px-4 py-3 disabled:opacity-50'
            : 'rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 disabled:opacity-50'
        }
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text className={selected ? 'text-lg text-neutral-50' : 'text-lg text-neutral-500'}>
          {selected ? selected.label : placeholder}
        </Text>
      </Pressable>
      {error ? <Text className="mt-1 text-base text-red-500">{error}</Text> : null}

      <Modal visible={isOpen} animationType="none" transparent onRequestClose={() => setIsOpen(false)}>
        <Pressable className="flex-1 justify-end" onPress={() => setIsOpen(false)}>
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
          <View className="max-h-[30rem] rounded-t-2xl border border-neutral-800 bg-neutral-900">
            <View className="flex-row items-center justify-between border-b border-neutral-800 px-4 py-5">
              <Text className="text-2xl font-semibold text-neutral-50">{label}</Text>
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={28} color="#fafafa" />
              </Pressable>
            </View>
            <View className="px-4 py-6">
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                ListEmptyComponent={<Text className="py-4 text-lg text-neutral-500">No hay opciones disponibles</Text>}
                renderItem={({ item }) => (
                  <Pressable
                    className="border-b border-neutral-800 py-4 active:bg-neutral-800"
                    onPress={() => {
                      onChange(item.value);
                      setIsOpen(false);
                    }}
                  >
                    <Text
                      className={
                        item.value === value ? 'text-xl font-semibold text-amber-400' : 'text-xl text-neutral-50'
                      }
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
