import dayjs from 'dayjs';
import { z } from 'zod';

import { parseAmountInput } from '@/lib/format-money';
import { MOVEMENT_TYPES } from '@/lib/movement-type';

// Mirrors POST/PATCH /movements constraints (for-frontend.md §5.4). The
// transfer branch (toAccountId required + must differ from accountId) is
// driven directly off the hardcoded `"MT03"` code (§6) — no runtime lookup
// needed, so this is a plain schema, not a factory. Compare against the
// code, never the display label.
export const movementFormSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'El monto es obligatorio')
      .refine((value) => Number.isFinite(parseAmountInput(value)) && parseAmountInput(value) > 0, {
        message: 'Ingresa un monto mayor a 0',
      }),
    date: z
      .string()
      .min(1, 'La fecha es obligatoria')
      .refine((value) => dayjs(value, 'YYYY-MM-DD', true).isValid(), {
        message: 'Ingresa una fecha válida (YYYY-MM-DD)',
      }),
    note: z.string().max(255, 'La nota debe tener como máximo 255 caracteres').optional(),
    accountId: z.string().min(1, 'Selecciona una cuenta'),
    categoryId: z.string().min(1, 'Selecciona una categoría'),
    movementType: z.enum(MOVEMENT_TYPES, { message: 'Selecciona un tipo de movimiento' }),
    toAccountId: z.string().optional(),
    groupId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isTransfer = data.movementType === 'MT03';
    if (!isTransfer) return;

    if (!data.toAccountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'La cuenta destino es obligatoria para transferencias',
      });
      return;
    }
    if (data.toAccountId === data.accountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'La cuenta destino debe ser distinta de la cuenta de origen',
      });
    }
  });

export type MovementFormValues = z.infer<typeof movementFormSchema>;
