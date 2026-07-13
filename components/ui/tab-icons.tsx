import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

/**
 * Bottom tab bar glyphs for the Home | Charts | Reports | Profile tabs (the
 * center "+" is a floating action button overlaid on the tab bar, not a real
 * tab — see app/(app)/_layout.tsx). @expo/vector-icons is installed
 * (node_modules/@expo/vector-icons), so these render as real vector icons
 * that follow the `color` prop for the active/inactive tint.
 */
type TabIconProps = {
  color: ColorValue;
  focused?: boolean;
};

export function HomeTabIcon({ color, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />;
}

export function ChartsTabIcon({ color, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} size={24} color={color} />;
}

export function ReportsTabIcon({ color, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />;
}

export function ProfileTabIcon({ color, focused }: TabIconProps) {
  return <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />;
}
