import { z } from 'zod';

import { ACCOUNT_TYPES } from '@/lib/api/accounts';
import { parseAmountInput } from '@/lib/format-money';

// Mirrors POST/PATCH /accounts constraints (for-frontend.md §5.2). `type` is
// a closed enum — never a free-text field. `creditLimitCents` is entered as
// a decimal string (same UX as the movement amount field,
// lib/schemas/movements.ts) and only required/read when the effective type
// is "AT03" (Crédito) — driven directly off the hardcoded code, never the
// display label.
export const accountFormSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').max(50, 'El nombre debe tener como máximo 50 caracteres'),
    type: z.enum(ACCOUNT_TYPES, { message: 'Selecciona un tipo de cuenta' }),
    creditLimitCents: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'AT03') return;
    if (
      !data.creditLimitCents ||
      !Number.isFinite(parseAmountInput(data.creditLimitCents)) ||
      parseAmountInput(data.creditLimitCents) <= 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['creditLimitCents'],
        message: 'Ingresa un límite mayor a 0',
      });
    }
  });

export type AccountFormValues = z.infer<typeof accountFormSchema>;
