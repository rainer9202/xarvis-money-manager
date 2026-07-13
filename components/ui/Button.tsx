import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { cn } from './cn';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'sm';

type ButtonProps = {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
} & Omit<PressableProps, 'disabled' | 'children'>;

const VARIANT_STYLES: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: 'bg-amber-400 active:bg-amber-500',
    text: 'text-neutral-950',
    spinner: '#0a0a0a',
  },
  secondary: {
    container: 'border border-neutral-700 bg-neutral-800 active:bg-neutral-700',
    text: 'text-neutral-100',
    spinner: '#e5e5e5',
  },
  ghost: {
    container: 'bg-transparent active:bg-neutral-800',
    text: 'text-amber-400',
    spinner: '#fbbf24',
  },
  destructive: {
    container: 'bg-red-600 active:bg-red-700',
    text: 'text-white',
    spinner: '#ffffff',
  },
};

const SIZE_STYLES: Record<ButtonSize, { container: string; text: string }> = {
  md: { container: 'px-4 py-3', text: 'text-lg' },
  sm: { container: 'px-3 py-1.5', text: 'text-base' },
};

/**
 * Shared action button. Owns the isLoading -> ActivityIndicator swap and the
 * disabled/opacity state internally so screens never re-implement it.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      disabled={isDisabled}
      className={cn(
        'items-center justify-center rounded-2xl disabled:opacity-50',
        variantStyles.container,
        sizeStyles.container,
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={variantStyles.spinner} />
      ) : (
        <Text className={cn('font-semibold', variantStyles.text, sizeStyles.text)}>{children}</Text>
      )}
    </Pressable>
  );
}
