import { z } from 'zod';

// Mirrors POST/PATCH /groups constraints (for-frontend.md §5.1).
export const groupFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50, 'El nombre debe tener como máximo 50 caracteres'),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;
