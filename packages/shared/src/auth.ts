import { z } from 'zod';

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const PASSWORD_MIN_LENGTH = 8;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email());

export const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(128);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(60).optional(),
  locale: z.enum(LOCALES).default('en'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
  newPassword: passwordSchema,
});

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });

export const deleteAccountSchema = z.object({
  /** Required for accounts that have a password. */
  password: z.string().max(128).optional(),
});

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  /** Absolute, or relative to the API URL (local storage). Null = default avatar. */
  avatarUrl: string | null;
  locale: Locale;
  onboarded: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}
