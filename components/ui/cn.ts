type ClassValue = string | false | null | undefined;

/**
 * Tiny className joiner (no tailwind-merge in package.json). Every ui
 * component only ever composes static, non-conflicting utility classes, so a
 * plain filter+join is enough — no need for conflict-resolution logic.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
