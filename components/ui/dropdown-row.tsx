import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { Text } from './Text';
import type { SelectOption } from './select-field';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type DropdownRowProps = {
  icon: IoniconName;
  label: string;
  value: string | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
};

/**
 * Inline expanding select — tapping the row opens the option list directly
 * beneath it (pushes the rest of the form down), never an overlay/Modal.
 * Replaces an earlier attempt using @react-native-picker/picker: that
 * delegates its open dropdown to the OS/browser, which can't be themed
 * (Android renders it with system light chrome, ignoring the app's dark
 * theme) and rendered unreliably. This is fully custom-styled so it always
 * matches the app and never depends on native/browser popup chrome.
 */
export function DropdownRow({
  icon,
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar…',
  error,
}: DropdownRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  // An empty `value` always reads as "nothing chosen" — even if the option
  // list has its own `value: ''` entry (e.g. a "No group" clear option, see
  // components/movement-form.tsx) — so the closed row shows the muted
  // placeholder instead of that entry's label styled like a real selection.
  const selected = value ? options.find((option) => option.value === value) : undefined;

  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</Text>
      <View
        className={
          error
            ? 'overflow-hidden rounded-2xl border border-red-500 bg-neutral-900'
            : 'overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900'
        }
      >
        <Pressable
          className="flex-row items-center justify-between px-4 py-3.5"
          onPress={() => setIsOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: isOpen }}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name={icon} size={18} color="#a3a3a3" />
            <Text className={selected ? 'text-base text-neutral-50' : 'text-base text-neutral-600'}>
              {selected ? selected.label : placeholder}
            </Text>
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#737373" />
        </Pressable>

        {isOpen ? (
          <View className="border-t border-neutral-800">
            {options.length === 0 ? (
              <Text className="px-4 py-3 text-sm text-neutral-600">No hay opciones disponibles</Text>
            ) : (
              options.map((option) => (
                <Pressable
                  key={option.value}
                  className="px-4 py-3 active:bg-neutral-800"
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                >
                  <Text
                    className={
                      option.value === value
                        ? 'text-base font-semibold text-amber-400'
                        : 'text-base text-neutral-300'
                    }
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>
      {error ? <Text className="mt-1 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
