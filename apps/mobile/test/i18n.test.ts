import { EXPERIENCE_LEVELS, EQUIPMENT_SETUPS, GENDERS, GOALS, PLAN_TEMPLATES } from '@gymapp/shared';
import { describe, expect, it } from 'vitest';
import ar from '../src/i18n/ar';
import en from '../src/i18n/en';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const flatEn = flatten(en);
const flatAr = flatten(ar);
const placeholders = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort();

describe('translations', () => {
  it('has the same keys in English and Arabic', () => {
    expect(Object.keys(flatAr).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it('has no empty strings and Arabic text in every Arabic string', () => {
    for (const [key, value] of Object.entries(flatAr)) {
      expect(value.trim(), key).not.toBe('');
      // Strings that are only placeholders/numbers are fine.
      if (/[A-Za-z]{3,}/.test(value.replace(/{{\w+}}/g, ''))) {
        expect(value, key).toMatch(/[؀-ۿ]/);
      }
    }
  });

  it('uses the same placeholders in both languages', () => {
    for (const key of Object.keys(flatEn)) {
      expect(placeholders(flatAr[key]!), key).toEqual(placeholders(flatEn[key]!));
    }
  });

  it('covers every onboarding option and plan day', () => {
    for (const g of GENDERS) expect(flatEn[`onboarding.gender.${g}`]).toBeDefined();
    for (const g of GOALS) expect(flatEn[`onboarding.goal.${g}`]).toBeDefined();
    for (const e of EXPERIENCE_LEVELS) expect(flatEn[`onboarding.experience.${e}`]).toBeDefined();
    for (const e of EQUIPMENT_SETUPS) expect(flatEn[`onboarding.equipment.${e}`]).toBeDefined();
    for (const day of PLAN_TEMPLATES.flatMap((t) => t.days)) {
      expect(flatEn[`plan.day.${day.key}`], day.key).toBeDefined();
    }
  });
});
