import { describe, expect, it } from 'vitest';
import { normalizeDigits, onlyDigits, parseUserNumber } from '../src/lib/digits';

describe('digits', () => {
  it('converts Arabic-Indic and Persian digits', () => {
    expect(normalizeDigits('١٩٩٨')).toBe('1998');
    expect(normalizeDigits('۱۲۳')).toBe('123');
  });

  it('parses decimals typed with Arabic or comma separators', () => {
    expect(parseUserNumber('٧٢٫٥')).toBe(72.5);
    expect(parseUserNumber('72,5')).toBe(72.5);
    expect(parseUserNumber(' 80 ')).toBe(80);
    expect(parseUserNumber('')).toBeUndefined();
    expect(parseUserNumber('abc')).toBeUndefined();
  });

  it('extracts one-time codes', () => {
    expect(onlyDigits('١٢٣ ٤٥٦')).toBe('123456');
  });
});
