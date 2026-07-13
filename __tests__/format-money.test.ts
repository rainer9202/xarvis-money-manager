import { formatCents } from '../lib/format-money';

// Derive expected output the same way lib/format-money.ts does, instead of
// hardcoding an assumed string — locale-specific formatting (thin space vs.
// non-breaking space, symbol placement, etc.) is easy to get subtly wrong by
// hand.
const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

describe('formatCents', () => {
  it('formats zero', () => {
    expect(formatCents(0)).toBe(formatter.format(0));
  });

  it('formats a positive value', () => {
    expect(formatCents(1099)).toBe(formatter.format(10.99));
  });

  it('formats a negative value', () => {
    expect(formatCents(-1099)).toBe(formatter.format(-10.99));
  });

  it('formats a large value', () => {
    expect(formatCents(123456789)).toBe(formatter.format(1234567.89));
  });

  it('formats a small sub-euro value', () => {
    expect(formatCents(5)).toBe(formatter.format(0.05));
  });
});
