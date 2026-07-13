import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Curated Ionicons offered when creating/editing a category (`icon` field,
 * for-frontend.md §5.3 — a free-form string the backend only validates as
 * non-empty, so this list is a client-side UX choice, not a server enum).
 * Kept to common everyday-finance glyphs rather than the full Ionicons set.
 */
export const CATEGORY_ICON_OPTIONS: IoniconName[] = [
  'cart-outline',
  'restaurant-outline',
  'fast-food-outline',
  'cafe-outline',
  'home-outline',
  'flash-outline',
  'water-outline',
  'wifi-outline',
  'call-outline',
  'car-outline',
  'bus-outline',
  'airplane-outline',
  'medkit-outline',
  'fitness-outline',
  'school-outline',
  'book-outline',
  'briefcase-outline',
  'cash-outline',
  'wallet-outline',
  'card-outline',
  'gift-outline',
  'shirt-outline',
  'game-controller-outline',
  'film-outline',
  'musical-notes-outline',
  'paw-outline',
  'basket-outline',
  'construct-outline',
  'people-outline',
  'heart-outline',
  'ellipsis-horizontal-outline',
];
