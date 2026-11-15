/**
 * Small fetch wrapper: JSON in/out, bearer auth, and automatic refresh of
 * expired access tokens. Kept free of React Native imports so it can be
 * unit-tested.
 */
import type { AuthTokens } from '@gymapp/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface TokenStore {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  /** Called when the refresh token is rejected; the app should sign out. */
  onSessionExpired?: () => void;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface RequestOptions {
  body?: unknown;
  /** Send the access token (default true). */
  auth?: boolean;
}

export function createApiClient(opts: ApiClientOptions) {
  const fetchFn = opts.fetchFn ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  let refreshing: Promise<string | null> | null = null;

  async function send(method: Method, path: string, body: unknown, token?: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // File uploads: let fetch set the multipart boundary itself.
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    try {
      return await fetchFn(`${opts.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, 'network_error');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Gets a new access token. Concurrent callers share one request, because
   * the server only accepts each refresh token once.
   * Returns null if the session is over; throws on network errors (offline
   * users keep their session).
   */
  function refreshAccessToken(): Promise<string | null> {
    refreshing ??= (async () => {
      const current = await opts.tokens.get();
      if (!current) return null;
      const res = await send('POST', '/v1/auth/refresh', { refreshToken: current.refreshToken });
      if (res.status === 401) {
        await opts.tokens.clear();
        opts.onSessionExpired?.();
        return null;
      }
      if (!res.ok) throw await toError(res);
      const data = (await res.json()) as { tokens: AuthTokens };
      await opts.tokens.set(data.tokens);
      return data.tokens.accessToken;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T>(method: Method, path: string, { body, auth = true }: RequestOptions = {}): Promise<T> {
    const token = auth ? (await opts.tokens.get())?.accessToken : undefined;
    let res = await send(method, path, body, token);

    if (res.status === 401 && auth && token) {
      const fresh = await refreshAccessToken();
      if (!fresh) throw new ApiError(401, 'session_expired');
      res = await send(method, path, body, fresh);
    }
    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    request,
    get: <T>(path: string, o?: RequestOptions) => request<T>('GET', path, o),
    post: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>('POST', path, { ...o, body }),
    put: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>('PUT', path, { ...o, body }),
    patch: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>('PATCH', path, { ...o, body }),
    delete: <T>(path: string, body?: unknown, o?: RequestOptions) => request<T>('DELETE', path, { ...o, body }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

async function toError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(res.status, data.error?.code ?? 'unknown', data.error?.message);
  } catch {
    return new ApiError(res.status, 'unknown');
  }
}

/** i18n key for an error, e.g. "errors.invalid_credentials". */
export function errorKey(err: unknown): string {
  const known = [
    'email_taken',
    'invalid_credentials',
    'invalid_reset_code',
    'invalid_password',
    'validation_error',
    'rate_limited',
    'network_error',
    'session_expired',
  ];
  const code = err instanceof ApiError ? err.code : 'unknown';
  return `errors.${known.includes(code) ? code : 'unknown'}`;
}
