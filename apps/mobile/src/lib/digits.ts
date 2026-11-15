/**
 * Arabic keyboards type Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) or Persian ones
 * (۰۱۲۳۴۵۶۷۸۹), and "٫" as the decimal separator. Convert to ASCII before
 * parsing numbers or codes.
 */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.');
}

/** Parses a number typed by the user; undefined when empty or invalid. */
export function parseUserNumber(value: string): number | undefined {
  const normalized = normalizeDigits(value).trim();
  if (normalized === '') return undefined;
  const n = Number(normalized);
  return Number.isNaN(n) ? undefined : n;
}

/** Keeps only digits (after normalizing), e.g. for one-time codes. */
export const onlyDigits = (value: string) => normalizeDigits(value).replace(/[^0-9]/g, '');
