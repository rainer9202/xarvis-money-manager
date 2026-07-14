import { z } from 'zod';

import { parseAmountInput } from '@/lib/format-money';

// Mirrors POST/PATCH /groups constraints (for-frontend.md §5.1).
// `budgetCents` is entered as a decimal string (same UX as the movement
// amount field, lib/schemas/movements.ts) and always optional — unlike
// Account's `creditLimitCents`, it isn't gated behind a type.
export const groupFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre debe tener como máximo 50 caracteres'),
  budgetCents: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value || (Number.isFinite(parseAmountInput(value)) && parseAmountInput(value) > 0),
      {
        message: 'Ingresa un presupuesto mayor a 0',
      },
    ),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;
