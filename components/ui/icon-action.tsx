import { ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type IconActionSize = 'sm' | 'lg';

type IconActionProps = {
  icon: IoniconName;
  label: string;
  color?: string;
  disabled?: boolean;
  isLoading?: boolean;
  /** 'sm' (36px, default) for Categories/Groups; 'lg' (44px, meets the
   * platform minimum touch-target size) for Accounts, whose row has a
   * fourth action (Principal) making the buttons feel cramped. */
  size?: IconActionSize;
  onPress: () => void;
};

const SIZE_STYLES: Record<IconActionSize, { container: string; icon: number }> = {
  sm: { container: 'h-9 w-9', icon: 16 },
  lg: { container: 'h-11 w-11', icon: 20 },
};

/** Compact icon-only row action — used by every Profile CRUD list
 * (accounts/categories/groups) instead of a row of full-width text Buttons
 * (Edit/Activate/Delete/...), which reads as a wall of buttons once an item
 * has three or four actions. */
export function IconAction({ icon, label, color = '#a3a3a3', disabled, isLoading, size = 'sm', onPress }: IconActionProps) {
  const sizeStyles = SIZE_STYLES[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`${sizeStyles.container} items-center justify-center rounded-full bg-neutral-800 active:bg-neutral-700 disabled:opacity-50`}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon} size={sizeStyles.icon} color={color} />
      )}
    </Pressable>
  );
}
