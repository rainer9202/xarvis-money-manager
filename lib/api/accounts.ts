import { apiClient } from './client';

// Closed enum of stable, opaque codes per for-frontend.md §5.2/§6 — never
// render this as free text. The server resolves each code to a display
// label (`typeLabel`) independently, so this list is for validation/picker
// values only, never for display text. AT02/AT03's labels changed (Banco →
// Débito, Tarjeta → Crédito) and AT04 (Ahorro) was added server-side without
// changing any existing code — only the label map below needed updating.
export const ACCOUNT_TYPES = ['AT01', 'AT02', 'AT03', 'AT04'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Fallback display labels for the create-account picker only, where there's
// no fetched `Account` yet to read a server-resolved `typeLabel` from. Any
// screen displaying an already-fetched account must render that account's
// own `typeLabel` instead — the label can be edited independently of the
// code server-side, so this map is not a source of truth for display.
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  AT01: 'Efectivo',
  AT02: 'Débito',
  AT03: 'Crédito',
  AT04: 'Ahorro',
};

export type Account = {
  id: string;
  name: string;
  /** Stable opaque code — what you send back on create/update. */
  type: AccountType;
  /** Server-resolved display text for `type`. Always render this for
   * display; never derive it from `type` client-side. */
  typeLabel: string;
  isActive: boolean;
  /** Computed live from the account's movements on every read (not stored). */
  balanceCents: number;
  /** Only meaningful for AT03 (Crédito) accounts — `null` for every other
   * type (for-frontend.md §5.2). For a Crédito account, `balanceCents` is
   * debt-signed (negative = owed) and is never clamped by this limit; the
   * backend rejects (400) any movement that would push `balanceCents` past
   * `-creditLimitCents`. */
  creditLimitCents: number | null;
  createdAt: string;
  isPrincipal: boolean;
};

export type CreateAccountPayload = {
  name: string;
  type: AccountType;
  /** Required when `type` is `"AT03"`, must be omitted for every other type
   * (for-frontend.md §5.2). */
  creditLimitCents?: number;
};

// All fields optional/independent — PATCH sends only what changed.
export type UpdateAccountPayload = Partial<{
  name: string;
  type: AccountType;
  isActive: boolean;
  isPrincipal: boolean;
  /** Three-state per for-frontend.md §5.2: omit → unchanged, a number → sets
   * the cap (rejected if the effective type isn't AT03), `null` → clears it
   * (required when switching `type` away from AT03 on an account that
   * currently has a cap set). */
  creditLimitCents: number | null;
}>;

export function listAccounts() {
  return apiClient.get<Account[]>('/accounts');
}

export function createAccount(payload: CreateAccountPayload) {
  return apiClient.post<{ id: string }>('/accounts', payload);
}

export function updateAccount(id: string, payload: UpdateAccountPayload) {
  return apiClient.patch<{ id: string }>(`/accounts/${id}`, payload);
}

export function deleteAccount(id: string) {
  return apiClient.delete<{ id: string }>(`/accounts/${id}`);
}
