import { z } from 'zod';

import { MOVEMENT_TYPES } from '@/lib/movement-type';

// Mirrors POST/PATCH /categories constraints (for-frontend.md §5.3).
export const categoryFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50, 'El nombre debe tener como máximo 50 caracteres'),
  icon: z.string().min(1, 'Selecciona un ícono').max(50, 'El ícono debe tener como máximo 50 caracteres'),
  movementType: z.enum(MOVEMENT_TYPES, { message: 'Selecciona un tipo de movimiento' }),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
