import { describe, expect, it } from 'vitest';
import { normalizeGymName, setHomeGymSchema } from './homeGym';

describe('normalizeGymName', () => {
  it('matches different spellings of the same gym', () => {
    const key = normalizeGymName("Gold's Gym");
    expect(normalizeGymName('golds  gym')).toBe(key);
    expect(normalizeGymName('GOLDS-GYM ')).toBe(key);
    expect(normalizeGymName('جيم الأبطال')).toBe(normalizeGymName('جيم الابطال'));
    expect(normalizeGymName('صالة القوة')).toBe(normalizeGymName('صاله القوه'));
    expect(normalizeGymName('Gym 21 - Nasr City')).toBe('gym 21 nasr city');
  });

  it('validates names and allows clearing', () => {
    expect(setHomeGymSchema.safeParse({ name: '  Smart Gym ' }).data).toEqual({ name: 'Smart Gym' });
    expect(setHomeGymSchema.safeParse({ name: null }).success).toBe(true);
    expect(setHomeGymSchema.safeParse({ name: 'x' }).success).toBe(false);
  });
});
