const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/**
 * Formats integer cents (the only money shape the API ever sends/accepts,
 * for-frontend.md §4/§6) as a display currency string. Never feed this a
 * dollar float back into a request body.
 */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Parses a user-typed amount string into a number, tolerating a comma
 * decimal separator — `decimal-pad` keyboards on es-* locales often produce
 * "10,50" instead of "10.50", which `Number()` alone would read as NaN.
 */
export function parseAmountInput(value: string): number {
  return Number(value.replace(',', '.'));
}
