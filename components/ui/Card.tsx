import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from './cn';

type CardProps = {
  children: ReactNode;
  /** Overrides the default p-4 (16px) padding. Applied via inline style
   * (always wins over the className-based default) instead of a
   * conflicting `p-*` className — see cn.ts. */
  padding?: number;
} & ViewProps;

/**
 * Shared surface container for form sections and list rows: rounded
 * corners, a subtle border + shadow, consistent padding.
 */
export function Card({ children, className, padding, style, ...rest }: CardProps) {
  return (
    <View
      className={cn('rounded-2xl border border-card-border bg-card p-4', className)}
      style={padding !== undefined ? [{ padding }, style] : style}
      {...rest}
    >
      {children}
    </View>
  );
}
