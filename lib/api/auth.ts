import { apiClient } from './client';
import type { SignInFormValues, SignUpFormValues } from '@/lib/schemas/auth';

export type AuthResponse = {
  accessToken: string;
  id: string;
};

// Both routes are unauthenticated (auth: false — there is no token to send
// yet) and neither accepts/needs a userId (for-frontend.md §2.7).
// `confirmPassword` only exists for client-side validation — the SignUpDto
// has no such field.
export function signUp({ name, email, password }: SignUpFormValues) {
  return apiClient.post<AuthResponse>('/auth/sign-up', { name, email, password }, { auth: false });
}

export function signIn(payload: SignInFormValues) {
  return apiClient.post<AuthResponse>('/auth/sign-in', payload, { auth: false });
}
