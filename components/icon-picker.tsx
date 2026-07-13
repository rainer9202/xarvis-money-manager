import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { Text } from '@/components/ui/Text';
import { CATEGORY_ICON_OPTIONS } from '@/lib/category-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type IconPickerProps = {
  value: string;
  onChange: (icon: IoniconName) => void;
  error?: string;
};

/** Grid of the curated category icon set — tap a glyph to select it. Used
 * by the category create/edit form (`icon` is now a required field,
 * for-frontend.md §5.3). */
export function IconPicker({ value, onChange, error }: IconPickerProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-sm font-semibold uppercase tracking-wider text-neutral-500">Ícono</Text>
      <View
        className={
          error
            ? 'flex-row flex-wrap gap-2 rounded-2xl border border-red-500 bg-neutral-900 p-3'
            : 'flex-row flex-wrap gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-3'
        }
      >
        {CATEGORY_ICON_OPTIONS.map((icon) => {
          const isSelected = icon === value;
          return (
            <Pressable
              key={icon}
              onPress={() => onChange(icon)}
              className={
                isSelected
                  ? 'h-11 w-11 items-center justify-center rounded-xl bg-amber-400'
                  : 'h-11 w-11 items-center justify-center rounded-xl bg-neutral-800'
              }
              accessibilityRole="button"
              accessibilityLabel={icon}
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons name={icon} size={20} color={isSelected ? '#0a0a0a' : '#d4d4d4'} />
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="mt-1 text-base text-red-500">{error}</Text> : null}
    </View>
  );
}
