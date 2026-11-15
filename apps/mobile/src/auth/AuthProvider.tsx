import type { AuthResponse, AuthTokens, OnboardingAnswers, PublicUser } from '@gymapp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { API_URL } from '../config';
import { currentLanguage } from '../i18n/language';
import { ApiError, createApiClient, type ApiClient, type TokenStore } from '../lib/api';
import { KEYS, storage } from '../lib/storage';
import { rememberGender } from '../features/profile/gender';
import { PROTOTYPE } from '../prototype/config';
import { localFetch, PROTOTYPE_TOKENS } from '../prototype/localServer';
import { track } from '../prototype/tracking';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: PublicUser | null;
  api: ApiClient;
  login(email: string, password: string): Promise<void>;
  signup(input: { email: string; password: string; displayName?: string }): Promise<void>;
  /** Used after password reset, which also signs the user in. */
  completeAuth(res: AuthResponse): Promise<void>;
  saveOnboarding(answers: OnboardingAnswers): Promise<PublicUser>;
  setUser(user: PublicUser): Promise<void>;
  updateProfile(patch: { displayName?: string | null; locale?: 'en' | 'ar' }): Promise<void>;
  /** Uploads a local image file (already cropped/compressed). */
  uploadAvatar(fileUri: string): Promise<void>;
  removeAvatar(): Promise<void>;
  logout(): Promise<void>;
  /** `beforeSignOut` runs after the server deleted the account (e.g. wipe local data). */
  deleteAccount(password: string, beforeSignOut?: () => Promise<void>): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Prototype mode: always "signed in" as the local tester; there is no server to check tokens. */
const prototypeTokens: TokenStore = {
  get: async () => PROTOTYPE_TOKENS,
  set: async () => {},
  clear: async () => {},
};

const tokenStore: TokenStore = PROTOTYPE ? prototypeTokens : {
  async get() {
    const raw = await storage.get(KEYS.tokens);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  },
  set: (tokens) => storage.set(KEYS.tokens, JSON.stringify(tokens)),
  clear: () => storage.remove(KEYS.tokens),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<PublicUser | null>(null);

  const clearSession = useCallback(async () => {
    await Promise.all([tokenStore.clear(), storage.remove(KEYS.user)]);
    queryClient.clear();
    rememberGender(null);
    setUserState(null);
    setStatus('signedOut');
  }, [queryClient]);

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: PROTOTYPE ? '' : API_URL,
        tokens: tokenStore,
        fetchFn: PROTOTYPE ? localFetch : undefined,
        onSessionExpired: () => void clearSession(),
      }),
    [clearSession],
  );

  const setUser = useCallback(async (next: PublicUser) => {
    await storage.set(KEYS.user, JSON.stringify(next));
    setUserState(next);
    setStatus('signedIn');
  }, []);

  // Restore the session. The cached user lets the app open offline;
  // /me refreshes it in the background when the network is available.
  useEffect(() => {
    (async () => {
      const [tokens, cached] = await Promise.all([tokenStore.get(), storage.get(KEYS.user)]);
      if (!tokens) return setStatus('signedOut');
      if (cached) {
        setUserState(JSON.parse(cached) as PublicUser);
        setStatus('signedIn');
      }
      try {
        await setUser(await api.get<PublicUser>('/v1/me'));
      } catch (err) {
        const sessionOver = err instanceof ApiError && (err.status === 401 || err.status === 404);
        if (sessionOver || !cached) await clearSession();
      }
    })();
  }, [api, clearSession, setUser]);

  const completeAuth = useCallback(
    async (res: AuthResponse) => {
      await tokenStore.set(res.tokens);
      await setUser(res.user);
    },
    [setUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      api,
      completeAuth,
      setUser,
      async login(email, password) {
        await completeAuth(await api.post<AuthResponse>('/v1/auth/login', { email, password }, { auth: false }));
      },
      async signup(input) {
        const res = await api.post<AuthResponse>(
          '/v1/auth/signup',
          { ...input, locale: currentLanguage() },
          { auth: false },
        );
        await completeAuth(res);
      },
      async saveOnboarding(answers) {
        const res = await api.put<{ user: PublicUser }>('/v1/me/profile', answers);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['plan'] }),
          queryClient.invalidateQueries({ queryKey: ['profile'] }),
          queryClient.invalidateQueries({ queryKey: ['schedule'] }),
        ]);
        track('plan_created');
        return res.user;
      },
      async logout() {
        const tokens = await tokenStore.get();
        if (tokens) {
          // Best effort: still sign out locally when offline.
          await api.post('/v1/auth/logout', { refreshToken: tokens.refreshToken }, { auth: false }).catch(() => {});
        }
        await clearSession();
      },
      async updateProfile(patch) {
        await setUser(await api.patch<PublicUser>('/v1/me', patch));
      },
      async uploadAvatar(fileUri) {
        const form = new FormData();
        // React Native's FormData accepts a { uri, name, type } file descriptor.
        form.append('file', { uri: fileUri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
        await setUser(await api.post<PublicUser>('/v1/me/avatar', form));
      },
      async removeAvatar() {
        await setUser(await api.delete<PublicUser>('/v1/me/avatar'));
      },
      async deleteAccount(password, beforeSignOut) {
        await api.delete('/v1/me', { password });
        await beforeSignOut?.().catch(() => {});
        await clearSession();
      },
    }),
    [status, user, api, completeAuth, setUser, clearSession, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
