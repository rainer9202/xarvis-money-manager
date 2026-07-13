import { z } from 'zod';

// for-frontend.md doesn't document a `name` field on sign-up, but the live
// API's SignUpDto (GET /docs-json) requires it — confirmed against the
// running instance since the doc is a snapshot, not a live contract (see
// for-frontend.md §7).
export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    email: z.email('Ingresa un correo electrónico válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
