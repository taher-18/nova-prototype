import type { AuthTokens } from '@gymapp/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, errorKey, type TokenStore } from '../src/lib/api';

function memoryTokens(initial: AuthTokens | null): TokenStore & { value: AuthTokens | null } {
  const store = {
    value: initial,
    get: async () => store.value,
    set: async (t: AuthTokens) => {
      store.value = t;
    },
    clear: async () => {
      store.value = null;
    },
  };
  return store;
}

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const tokens = (n: number): AuthTokens => ({ accessToken: `access-${n}`, refreshToken: `refresh-${n}`, expiresIn: 900 });

describe('api client', () => {
  it('sends the bearer token and parses JSON', async () => {
    const fetchFn = vi.fn(async () => json(200, { ok: true }));
    const api = createApiClient({ baseUrl: 'http://api', tokens: memoryTokens(tokens(1)), fetchFn });
    expect(await api.get('/v1/me')).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api/v1/me');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
  });

  it('refreshes once for concurrent 401s and retries', async () => {
    const store = memoryTokens(tokens(1));
    let refreshCalls = 0;
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v1/auth/refresh')) {
        refreshCalls++;
        expect(JSON.parse(init!.body as string)).toEqual({ refreshToken: 'refresh-1' });
        return json(200, { tokens: tokens(2) });
      }
      const auth = (init!.headers as Record<string, string>).Authorization;
      return auth === 'Bearer access-2' ? json(200, { url }) : json(401, { error: { code: 'invalid_token' } });
    });
    const api = createApiClient({ baseUrl: 'http://api', tokens: store, fetchFn });

    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(results).toEqual([{ url: 'http://api/a' }, { url: 'http://api/b' }, { url: 'http://api/c' }]);
    expect(refreshCalls).toBe(1);
    expect(store.value).toEqual(tokens(2));
  });

  it('ends the session when the refresh token is rejected', async () => {
    const store = memoryTokens(tokens(1));
    const onSessionExpired = vi.fn();
    const fetchFn = vi.fn(async () => json(401, { error: { code: 'invalid_refresh_token' } }));
    const api = createApiClient({ baseUrl: 'http://api', tokens: store, fetchFn, onSessionExpired });

    await expect(api.get('/v1/me')).rejects.toMatchObject({ status: 401, code: 'session_expired' });
    expect(onSessionExpired).toHaveBeenCalledOnce();
    expect(store.value).toBeNull();
  });

  it('keeps the session when offline', async () => {
    const store = memoryTokens(tokens(1));
    const onSessionExpired = vi.fn();
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const api = createApiClient({ baseUrl: 'http://api', tokens: store, fetchFn, onSessionExpired });

    await expect(api.get('/v1/me')).rejects.toMatchObject({ code: 'network_error' });
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(store.value).toEqual(tokens(1));
  });

  it('turns API errors into ApiError with the server code', async () => {
    const fetchFn = vi.fn(async () => json(409, { error: { code: 'email_taken', message: 'taken' } }));
    const api = createApiClient({ baseUrl: 'http://api', tokens: memoryTokens(null), fetchFn });
    const err = await api.post('/v1/auth/signup', {}, { auth: false }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'email_taken' });
    expect(errorKey(err)).toBe('errors.email_taken');
    expect(errorKey(new ApiError(500, 'internal_error'))).toBe('errors.unknown');
  });

  it('returns undefined for 204 responses', async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: 'http://api', tokens: memoryTokens(tokens(1)), fetchFn });
    expect(await api.delete('/v1/me', { password: 'x' })).toBeUndefined();
  });
});
