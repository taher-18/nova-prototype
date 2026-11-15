import { describe, expect, it } from 'vitest';
import { builtinAnswer, COACH_SUGGESTIONS, coachAskSchema, detectIntent, isEmergency, SAFETY_ANSWER } from './coach';
import { EXERCISES, getVariations } from './exercises/catalog';

describe('emergency check', () => {
  it('catches danger signs in English and Arabic', () => {
    for (const q of ['I have chest pain', 'feeling dizzy after squats', 'I almost fainted', "can't breathe properly",
      'عندي ألم في الصدر', 'حاسس إني دايخ', 'إيدي فيها تنميل', 'مش قادر اتنفس']) {
      expect(isEmergency(q), q).toBe(true);
    }
  });

  it('catches less obvious wording and Franco-Arabic', () => {
    for (const q of ['my chest feels tight and it hurts', 'my left arm is numb', 'حاسس صدري مقفول ومش عارف اخد نفسي', 'اغمى عليا في الجيم', '7asses b dowkha']) {
      expect(isEmergency(q), q).toBe(true);
    }
  });

  it('leaves normal questions alone', () => {
    for (const q of ['chest workout ideas', 'how many sets for chest', 'أرتاح قد إيه بين المجموعات؟', 'تمرين صدر',
      'chest and triceps day', 'how do i breathe on bench press', 'ازاي اتنفس في السكوات', 'my heart rate on cardio']) {
      expect(isEmergency(q), q).toBe(false);
    }
  });

  it('answers with the safety message first', () => {
    expect(builtinAnswer({ question: 'chest pain while running', lang: 'en' })).toBe(SAFETY_ANSWER.en);
  });
});

describe('detectIntent', () => {
  it('understands the suggested questions', () => {
    const expected = { en: ['rest', 'protein', 'eat', 'sore'], ar: ['rest', 'protein', 'eat', 'sore'] };
    for (const lang of ['en', 'ar'] as const) {
      expect(COACH_SUGGESTIONS[lang].general.map(detectIntent), lang).toEqual(expected[lang]);
      expect(COACH_SUGGESTIONS[lang].exercise.map(detectIntent), lang).toEqual(['swap', 'form', 'mistakes']);
    }
  });

  it('matches whole words, with Arabic prefixes', () => {
    expect(detectIntent('بين المجموعات')).toBe('sets'); // not "pain" (ألم)
    expect(detectIntent('عندي ألم في ركبتي')).toBe('pain');
    expect(detectIntent('إيه البديل؟')).toBe('swap');
    expect(detectIntent('my knee hurts')).toBe('pain');
    expect(detectIntent('what is the weather')).toBe(null);
  });

  it('understands everyday phrasing and Franco-Arabic', () => {
    const cases: Array<[string, string]> = [
      ["someone's on the leg press, what else works quads", 'swap'],
      ['حد واخد البنش اعمل ايه', 'swap'],
      ['a3mel eh badal el bench', 'swap'],
      ['كتفي بيطقطق في البنش', 'pain'],
      ['dahry bywga3ny', 'pain'],
      ['should i train when my muscles still ache', 'sore'],
      ['arta7 ad eh ben el sets', 'rest'],
      ['افطر ايه قبل الجيم', 'eat'],
      ['do i need whey', 'protein'],
      ['i havent been to the gym in 2 weeks', 'missed'],
    ];
    for (const [q, want] of cases) expect(detectIntent(q), q).toBe(want);
  });

  it('does not match look-alike words', () => {
    expect(detectIntent('what are the most popular exercises')).toBe(null); // not "pop" → pain
    expect(detectIntent('how do i achieve my goal faster')).not.toBe('sore'); // not "ache"
    expect(detectIntent('انا واخد مكملات')).not.toBe('swap');
  });
});

describe('builtinAnswer', () => {
  const bench = EXERCISES.find((e) => e.pattern === 'horizontal_press' && getVariations(e.id).length > 0)!;

  it('answers about the exercise being looked at', () => {
    const swap = builtinAnswer({ question: 'What can I do instead?', lang: 'en', exerciseId: bench.id });
    expect(swap).toContain(getVariations(bench.id)[0]!.nameEn);
    const howAr = builtinAnswer({ question: 'أعمله إزاي صح؟', lang: 'ar', exerciseId: bench.id });
    expect(howAr).toContain(bench.nameAr);
    expect(builtinAnswer({ question: 'mistakes?', lang: 'en', exerciseId: bench.id })).toContain('Common mistakes');
  });

  it('always returns something', () => {
    expect(builtinAnswer({ question: 'tell me a joke', lang: 'en' }).length).toBeGreaterThan(20);
    expect(builtinAnswer({ question: 'What can I do instead?', lang: 'ar' })).toMatch(/[؀-ۿ]/);
  });
});

describe('coachAskSchema', () => {
  it('limits question length and history', () => {
    expect(coachAskSchema.safeParse({ question: 'hi', lang: 'en' }).success).toBe(true);
    expect(coachAskSchema.safeParse({ question: 'x'.repeat(501), lang: 'en' }).success).toBe(false);
    expect(coachAskSchema.safeParse({ question: 'hi', lang: 'en', history: Array(7).fill({ role: 'user', text: 'a' }) }).success).toBe(false);
  });
});
