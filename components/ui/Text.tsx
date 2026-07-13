import { Text as RNText, type TextProps } from 'react-native';

import { cn } from './cn';

/**
 * Drop-in replacement for RN's `Text` that defaults to the Poppins regular
 * weight (see app/_layout.tsx's useFonts + tailwind.config.js's fontFamily
 * map). React Native has no CSS-style font inheritance, so every screen must
 * render through this wrapper (not the raw `react-native` Text) to pick up
 * the app's typeface. An explicit `font-bold`/`font-semibold`/`font-medium`
 * className still wins — it's appended after `font-sans` in the class list,
 * and NativeWind resolves conflicting classes by source order.
 */
export function Text({ className, ...rest }: TextProps) {
  return <RNText className={cn('font-sans', className)} {...rest} />;
}
