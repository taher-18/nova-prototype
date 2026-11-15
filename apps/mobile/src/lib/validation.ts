import { emailSchema, PASSWORD_MIN_LENGTH } from '@gymapp/shared';

export const isValidEmail = (email: string) => emailSchema.safeParse(email).success;
export const isValidPassword = (password: string) => password.length >= PASSWORD_MIN_LENGTH;
export { PASSWORD_MIN_LENGTH };
