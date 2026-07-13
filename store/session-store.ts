import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store is backed by Keychain (iOS) / Keystore (Android) — this
// is the only place the JWT is persisted. Never move this to AsyncStorage.
//
// expo-secure-store has no web implementation (there is no Keychain
// equivalent in a browser — its web module is an empty stub). Rather than
// weaken the security posture with an unencrypted localStorage fallback,
// the web target simply doesn't persist the session: the token lives only
// in memory (this Zustand store) and is lost on refresh. Native
// (iOS/Android) is unaffected and remains the only persisted target.
const TOKEN_KEY = 'xarvis_access_token';
const USER_ID_KEY = 'xarvis_user_id';
const NAME_KEY = 'xarvis_user_name';
const EMAIL_KEY = 'xarvis_user_email';
const isWeb = Platform.OS === 'web';

type SessionState = {
  /** JWT from POST /auth/sign-up | /auth/sign-in, or null if signed out. */
  token: string | null;
  /** `data.id` from the same auth response. */
  userId: string | null;
  /** Captured from the sign-up/sign-in *form values* at submit time — the
   * API has no GET /me route and neither auth response returns name/email
   * (confirmed live), so this is the only source. Sign-in only collects
   * email, so `name` simply keeps whatever was last persisted (or null)
   * until the user goes through sign-up again. */
  name: string | null;
  email: string | null;
  /** True once the initial secure-store read has completed (splash gate). */
  isHydrated: boolean;
  /** Reads token/userId/name/email from secure storage. Call once on app boot. */
  hydrate: () => Promise<void>;
  /** Persists a new session (post sign-up/sign-in) to secure storage + state.
   * `name`/`email` are optional — omit whatever the calling form doesn't
   * collect and the previously persisted value is kept. */
  setSession: (session: { token: string; userId: string; name?: string; email?: string }) => Promise<void>;
  /** Clears secure storage + state. Used for logout and for a 401 response
   * (no refresh token exists per the API contract, so a 401 always means
   * "force re-authentication"). */
  clearSession: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null,
  userId: null,
  name: null,
  email: null,
  isHydrated: false,

  hydrate: async () => {
    if (isWeb) {
      set({ isHydrated: true });
      return;
    }
    const [token, userId, name, email] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_ID_KEY),
      SecureStore.getItemAsync(NAME_KEY),
      SecureStore.getItemAsync(EMAIL_KEY),
    ]);
    set({ token, userId, name, email, isHydrated: true });
  },

  setSession: async ({ token, userId, name, email }) => {
    const nextName = name ?? get().name;
    const nextEmail = email ?? get().email;
    if (!isWeb) {
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, token),
        SecureStore.setItemAsync(USER_ID_KEY, userId),
        nextName ? SecureStore.setItemAsync(NAME_KEY, nextName) : SecureStore.deleteItemAsync(NAME_KEY),
        nextEmail ? SecureStore.setItemAsync(EMAIL_KEY, nextEmail) : SecureStore.deleteItemAsync(EMAIL_KEY),
      ]);
    }
    set({ token, userId, name: nextName, email: nextEmail });
  },

  clearSession: async () => {
    if (!isWeb) {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_ID_KEY),
        SecureStore.deleteItemAsync(NAME_KEY),
        SecureStore.deleteItemAsync(EMAIL_KEY),
      ]);
    }
    set({ token: null, userId: null, name: null, email: null });
  },
}));

/**
 * Non-hook accessor for use outside React components/render — e.g. the API
 * client needs to read the current token and clear the session on 401
 * without being a hook itself.
 */
export const sessionStore = {
  getToken: (): string | null => useSessionStore.getState().token,
  clearSession: (): Promise<void> => useSessionStore.getState().clearSession(),
};
