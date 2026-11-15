import { z } from 'zod';
import { exerciseSteps, getExercise, getVariations, type Exercise } from './exercises/catalog';
import { COMMON_MISTAKES } from './exercises/mistakes';

/**
 * Nova Coach. Questions go to an AI model through the API when one is set
 * up; these built-in answers cover the common questions without any AI, so
 * the coach still works offline, over the daily limit, or when the AI is down.
 * The emergency check runs first, everywhere, and never reaches the AI.
 */

export const COACH_QUESTION_MAX = 500;
export const COACH_HISTORY_MAX = 6;

export const coachAskSchema = z.object({
  question: z.string().trim().min(1).max(COACH_QUESTION_MAX),
  lang: z.enum(['en', 'ar']),
  /** The exercise the member is looking at, if any. */
  exerciseId: z.string().max(120).optional(),
  /** The last few messages, oldest first, so follow-up questions make sense. */
  history: z
    .array(z.object({ role: z.enum(['user', 'coach']), text: z.string().max(1500) }))
    .max(COACH_HISTORY_MAX)
    .default([]),
});
export type CoachAsk = z.input<typeof coachAskSchema>;

export type CoachSource = 'ai' | 'builtin' | 'safety';
/** Why a built-in answer was given instead of the AI. */
export type CoachFallbackReason = 'limit' | 'unavailable' | 'offline';

export interface CoachAnswer {
  answer: string;
  source: CoachSource;
  /** AI questions left in the current 24 hours; null when there is no AI. */
  remaining: number | null;
  reason?: CoachFallbackReason;
}

type Lang = 'en' | 'ar';

/** Lowercase, Arabic letter variants unified, punctuation removed. */
export function normalizeForMatch(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/**
 * Word-boundary matching. A pattern matches a whole word or phrase, also with
 * the Arabic prefixes و/ب/ف/ل and ال in front ("البديل" matches "بديل").
 * A trailing * matches the start of a word ("injur*" matches "injury").
 */
function matcher(patterns: string[]): RegExp {
  const parts = patterns.map((p) => {
    const prefix = p.endsWith('*');
    const body = normalizeForMatch(prefix ? p.slice(0, -1) : p).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `${body}${prefix ? '' : '(?= )'}`;
  });
  return new RegExp(` (?:[وبفل])?(?:ال)?(?:${parts.join('|')})`, 'u');
}

// ───────────────────────────── Emergency check ─────────────────────────────

const RED_FLAGS = matcher([
  'chest pain', 'pain in my chest', 'chest hurts', 'cant breathe', 'can t breathe', 'cannot breathe',
  'short of breath', 'shortness of breath', 'trouble breathing', 'faint*', 'passed out', 'blacked out',
  'dizz*', 'heart racing', 'heart pain', 'numb*', 'tingling',
  'الم في الصدر', 'الم في صدري', 'وجع في صدري', 'صدري بيوجعني', 'صدري واجعني', 'ضيق تنفس', 'ضيق في التنفس',
  'مش قادر اتنفس', 'مش عارف اتنفس', 'اغمي*', 'اغمى*', 'دايخ*', 'دوخ*', 'تنميل', 'قلبي بيوجعني', 'قلبي بيدق جامد',
  'chest feels tight', 'tight chest', 'chest is tight', 'chest tightness', 'pressure in my chest', 'chest pressure',
  'صدري مقفول', 'صدري تقيل', 'ضغط على صدري', 'مش عارف اخد نفسي', 'مش قادر اخد نفسي',
  // Franco-Arabic
  'dow5a*', 'dowkha*', 'dokha*', 'dayekh*', 'dayi5*', 'dayekh', 'sadry bywga3ny', 'sadri bywga3ny', 'sadry wag3ny',
  'mesh 2ader atnafes', 'msh 2ader atnafes', 'mesh 3aref atnafes', 'oghma*', 'oghmy*', 'aghma*', 'tanmeel',
]);

/** Signs that need a doctor now, not a training tip. */
export function isEmergency(question: string): boolean {
  return RED_FLAGS.test(normalizeForMatch(question));
}

export const SAFETY_ANSWER: Record<Lang, string> = {
  en: 'Stop training now and rest. Chest pain, trouble breathing, fainting, dizziness or numbness can be serious. Get medical help right away (ambulance in Egypt: 123), and tell the gym staff.',
  ar: 'وقّف التمرين حالًا وارتاح. ألم الصدر أو صعوبة التنفس أو الإغماء أو الدوخة أو التنميل ممكن يكونوا خطر. اطلب مساعدة طبية فورًا (الإسعاف في مصر: 123)، وبلّغ حد من فريق الجيم.',
};

// ───────────────────────────── Built-in answers ─────────────────────────────

type Intent =
  | 'swap' | 'mistakes' | 'form' | 'pain' | 'sore' | 'rest' | 'sets' | 'warmup'
  | 'protein' | 'eat' | 'water' | 'sleep' | 'progress' | 'missed';

/** Checked in order; the first match wins (so "how to" questions come last). */
const INTENTS: Array<[Intent, RegExp]> = (
  [
    ['swap', ['instead', 'alternative*', 'replace*', 'swap*', 'substitut*', 'busy', 'taken', 'what else', 'something else', 'something easier', 'other exercise*',
      'بديل', 'بدايل', 'بدل', 'مشغول', 'حد واخد', 'اغير*', 'تغيير', 'حاجه تانيه', 'تمرين تاني',
      'badal', 'bedal', 'badeel', 'badil', 'a8ayar', 'aghayar', 'ghayar']],
    ['mistakes', ['mistake*', 'wrong', 'غلط', 'اخطاء', 'خطا']],
    ['sore', ['sore*', 'doms', 'ache', 'aches', 'aching', 'stiff', 'تكسير', 'متكسر*', 'مكسر*', 'شد عضلي', 'mekasar*', 'metkasar*']],
    ['pain', ['pain*', 'hurt*', 'injur*', 'click*', 'pops', 'popping', 'popped', 'pulled', 'strain*', 'sprain*',
      'الم', 'وجع*', 'بيوجع*', 'واجع*', 'اصاب*', 'مصاب*', 'بيطقطق', 'طقطق*', 'اتشد*', 'التوا*', 'اتلو*',
      'wag3*', 'waga3*', 'bywga3*', 'beywga3*', 'by wga3*', 'wage3*', 'esaba*', 'isaba*']],
    ['rest', ['rest', 'resting', 'راحه', 'ارتاح', 'استريح', 'arta7*', 'ra7a', 'raha']],
    ['sets', ['sets', 'set', 'reps', 'rep', 'كام مجموعه', 'مجموع*', 'عدات', 'عده', 'تكرار*', 'كام تمرين', 'kam 3ada', 'kam marra']],
    ['warmup', ['warm up', 'warmup', 'warm', 'احماء', 'تسخين', 'اسخن']],
    ['protein', ['protein*', 'whey', 'بروتين', 'واي']],
    ['eat', ['eat*', 'food', 'meal*', 'diet*', 'calori*', 'breakfast', 'lunch', 'dinner', 'snack*',
      'اكل*', 'وجب*', 'دايت', 'سعرات', 'رجيم', 'افطر', 'فطار', 'غدا', 'عشا', 'akl', 'akol', 'aakol', 'fetar', 'fotar']],
    ['water', ['water', 'drink*', 'hydrat*', 'مايه', 'ميه', 'مياه', 'ماء', 'اشرب']],
    ['sleep', ['sleep*', 'نوم', 'انام']],
    ['progress', ['plateau', 'stuck', 'progress*', 'increase', 'add weight', 'more weight', 'same weight', 'heavier', 'lift more', 'stronger',
      'ثابت', 'مش بتقدم', 'مش بزيد', 'ازود*', 'اتقدم']],
    ['missed', ['missed', 'miss', 'skip*', 'havent been', 'haven t been', 'been away', 'stopped going', 'فوت*', 'مروحتش', 'مرحتش', 'غبت']],
    ['form', ['how do i', 'how to', 'how should', 'form', 'technique', 'correct*', 'ازاي', 'طريق*', 'اداء', 'صح']],
  ] as Array<[Intent, string[]]>
).map(([intent, words]) => [intent, matcher(words)]);

export function detectIntent(question: string): Intent | null {
  const text = normalizeForMatch(question);
  return INTENTS.find(([, re]) => re.test(text))?.[0] ?? null;
}

const GENERAL: Record<Exclude<Intent, 'swap' | 'mistakes' | 'form'>, Record<Lang, string>> = {
  pain: {
    en: "Stop the exercise that hurts. Muscle burn during a set is normal; sharp pain, pain in a joint, or pain that lasts after training is not. Have it checked by a doctor or a physiotherapist. Meanwhile you can swap to an exercise that doesn't hurt (⋯ → Replace).",
    ar: 'وقّف التمرين اللي بيوجعك. الحرقان في العضلة أثناء المجموعة طبيعي، لكن الألم الحاد أو الألم في المفصل أو الألم اللي بيفضل بعد التمرين مش طبيعي. اكشف عند دكتور أو أخصائي علاج طبيعي. ولحد ما تطمّن، بدّل لتمرين مش بيوجعك (⋯ ← استبدال).',
  },
  sore: {
    en: 'Muscle soreness 1–3 days after training is normal, especially after new exercises. Light movement, sleep, water and enough protein help. You can still train; it gets less as your body gets used to it. Joint pain or swelling is different: rest it and get it checked.',
    ar: 'تكسير العضلات من يوم لـ 3 أيام بعد التمرين طبيعي، خصوصًا بعد تمارين جديدة. الحركة الخفيفة والنوم والمية والبروتين بيساعدوا. تقدر تكمّل تمرين، والتكسير بيقل لما جسمك يتعوّد. أما ألم أو ورم في المفصل فده مختلف: ريّحه واكشف عليه.',
  },
  rest: {
    en: 'Big lifts (squat, bench press, deadlift, rows): 2–3 minutes between sets. Smaller exercises (curls, raises, machines): 60–90 seconds. Nova starts the rest timer for you after each set, using your plan.',
    ar: 'التمارين الكبيرة (سكوات، بنش، ديدلفت، سحب): من دقيقتين لـ 3 بين المجموعات. التمارين الصغيرة (بايسبس، رفرفة، أجهزة): من 60 لـ 90 ثانية. نوفا بيشغّل مؤقت الراحة لوحده بعد كل مجموعة حسب خطتك.',
  },
  sets: {
    en: 'To build muscle: about 10–20 hard sets per muscle each week, 6–12 reps, stopping 1–3 reps before you can’t do another. For strength: 3–6 reps with longer rest. Your plan already sets this for your goal and level.',
    ar: 'لبناء العضل: حوالي 10–20 مجموعة قوية لكل عضلة في الأسبوع، من 6 لـ 12 عدة، وتقف قبل ما توصل لآخر عدة تقدر عليها بـ 1–3 عدات. للقوة: من 3 لـ 6 عدات مع راحة أطول. خطتك محسوبة بالفعل على هدفك ومستواك.',
  },
  warmup: {
    en: '5 minutes of light cardio, then 2–3 lighter sets of your first exercise with fewer reps. For barbell lifts Nova shows you the warm-up weights before your first working set.',
    ar: '5 دقايق كارديو خفيف، وبعدها 2–3 مجموعات أخف من أول تمرين بعدات أقل. في تمارين البار، نوفا بيوريك أوزان الإحماء قبل أول مجموعة أساسية.',
  },
  protein: {
    en: 'Aim for about 1.6–2 g of protein per kg of body weight a day, spread over 3–4 meals. Good everyday sources: eggs, chicken, fish, tuna, Greek yogurt, cottage cheese, foul and lentils. A supplement is optional, not required.',
    ar: 'حاول تاخد حوالي 1.6–2 جرام بروتين لكل كيلو من وزنك في اليوم، مقسمين على 3–4 وجبات. مصادر سهلة: بيض، فراخ، سمك، تونة، زبادي يوناني، جبنة قريش، فول وعدس. المكملات اختيارية مش ضرورية.',
  },
  eat: {
    en: 'Eat a normal meal 2–3 hours before training, or a light snack 30–60 minutes before (a banana, dates, yogurt). After training, have a meal with protein and carbs. For losing fat, eat a little less than you burn, but keep protein high. For a full diet plan, see a nutritionist.',
    ar: 'كُل وجبة عادية قبل التمرين بساعتين لـ 3، أو سناك خفيف قبلها بنص ساعة لساعة (موزة، بلح، زبادي). بعد التمرين، وجبة فيها بروتين وكربوهيدرات. لو عايز تخس، كُل أقل شوية من اللي بتحرقه بس خلّي البروتين عالي. لنظام أكل كامل، استشير أخصائي تغذية.',
  },
  water: {
    en: 'Drink water regularly through the day and sip during training, more in hot weather or when you sweat a lot. Pale yellow urine is a good sign you are drinking enough.',
    ar: 'اشرب مية على مدار اليوم وخد رشفات أثناء التمرين، وزوّد في الجو الحر أو لما تعرق كتير. لون البول الأصفر الفاتح علامة إنك بتشرب كفاية.',
  },
  sleep: {
    en: 'Aim for 7–9 hours. Muscles recover and grow while you sleep, and poor sleep makes workouts feel harder. A regular bedtime helps more than anything else.',
    ar: 'حاول تنام من 7 لـ 9 ساعات. العضلات بتتعافى وتكبر وانت نايم، وقلة النوم بتخلي التمرين أصعب. ميعاد نوم ثابت بيفرق جدًا.',
  },
  progress: {
    en: 'When you reach the top of your rep range on all sets, add weight next time: 2.5 kg on big lifts, 1–2 kg on small ones. If you are stuck for 3 weeks, check your sleep and protein, then take one lighter week and build up again.',
    ar: 'لما توصل لأعلى عدد عدات في كل المجموعات، زوّد الوزن المرة الجاية: 2.5 كيلو في التمارين الكبيرة، و1–2 كيلو في الصغيرة. لو ثابت 3 أسابيع، راجع نومك والبروتين، وبعدين خد أسبوع أخف وارجع تزوّد تاني.',
  },
  missed: {
    en: "No problem. Just do your next planned workout; don't try to do two in one day. Your weekly streak only needs your weekly goal, so you can still make it.",
    ar: 'ولا يهمك. اعمل التمرين الجاي في خطتك عادي، ومتحاولش تعمل تمرينين في يوم واحد. السلسلة الأسبوعية محتاجة بس هدفك الأسبوعي، فلسه تقدر تحققه.',
  },
};

const UNKNOWN: Record<Lang, string> = {
  en: 'I can help with exercise swaps, how to do an exercise, common mistakes, rest, sets and reps, warming up, soreness, food and protein. Try one of the suggestions below.',
  ar: 'أقدر أساعدك في بدائل التمارين، طريقة أداء التمرين، الأخطاء الشائعة، الراحة، المجموعات والعدات، الإحماء، تكسير العضلات، الأكل والبروتين. جرّب سؤال من الاقتراحات تحت.',
};

const OPEN_EXERCISE: Record<Lang, string> = {
  en: 'Ask me from the exercise itself (during your workout tap ⋯ → Ask the coach) and I can answer for that exercise. To swap during a workout: ⋯ → Replace shows the best alternatives first.',
  ar: 'اسألني من التمرين نفسه (أثناء التمرين اضغط ⋯ ← اسأل المدرب) وأرد عليك عن التمرين ده بالذات. ولو عايز تبدّل أثناء التمرين: ⋯ ← استبدال بيوريك أنسب البدائل الأول.',
};

const exName = (e: Exercise, lang: Lang) => (lang === 'ar' ? e.nameAr : e.nameEn);

function exerciseAnswer(intent: Intent | null, ex: Exercise, lang: Lang): string {
  const name = exName(ex, lang);
  const mistakes = COMMON_MISTAKES[ex.pattern][lang];
  if (intent === 'swap') {
    const alts = getVariations(ex.id).slice(0, 4).map((e) => `• ${exName(e, lang)}`);
    if (alts.length === 0) {
      return lang === 'ar'
        ? `مفيش بديل قريب لـ ${name} في القائمة. جرّب ⋯ ← استبدال واختار تمرين لنفس العضلة.`
        : `There is no close alternative to ${name} in the list. Try ⋯ → Replace and pick an exercise for the same muscle.`;
    }
    return lang === 'ar'
      ? `بدائل لـ ${name} بتشغّل نفس العضلات:\n${alts.join('\n')}\nللتبديل في تمرين النهارده: ⋯ ← استبدال.`
      : `Alternatives to ${name} that work the same muscles:\n${alts.join('\n')}\nTo swap it in today's workout: ⋯ → Replace.`;
  }
  if (intent === 'mistakes') {
    return lang === 'ar'
      ? `أخطاء شائعة في ${name}:\n${mistakes.map((m) => `• ${m}`).join('\n')}`
      : `Common mistakes on ${name}:\n${mistakes.map((m) => `• ${m}`).join('\n')}`;
  }
  if (intent === 'form' || intent === null) {
    const steps = exerciseSteps(ex, lang).slice(0, 5).map((s, i) => `${i + 1}. ${s}`);
    const head = lang === 'ar' ? `طريقة أداء ${name}:` : `How to do ${name}:`;
    const tip = lang === 'ar' ? `انتبه: ${mistakes[0]}` : `Watch out: ${mistakes[0]}`;
    return [head, ...steps, tip].join('\n');
  }
  return GENERAL[intent][lang];
}

/** An answer without any AI. Always returns something useful. */
export function builtinAnswer(input: { question: string; lang: Lang; exerciseId?: string }): string {
  if (isEmergency(input.question)) return SAFETY_ANSWER[input.lang];
  const intent = detectIntent(input.question);
  const ex = input.exerciseId ? getExercise(input.exerciseId) : undefined;
  if (ex && (intent === null || intent === 'swap' || intent === 'mistakes' || intent === 'form')) {
    return exerciseAnswer(intent, ex, input.lang);
  }
  if (intent === 'swap' || intent === 'mistakes' || intent === 'form') return OPEN_EXERCISE[input.lang];
  return intent ? GENERAL[intent][input.lang] : UNKNOWN[input.lang];
}

/** Starter questions shown in the coach screen. */
export const COACH_SUGGESTIONS: Record<Lang, { general: string[]; exercise: string[] }> = {
  en: {
    general: ['How long should I rest between sets?', 'How much protein do I need?', 'What should I eat before training?', 'My muscles are sore, can I train?'],
    exercise: ['What can I do instead?', 'How do I do it correctly?', 'What are common mistakes?'],
  },
  ar: {
    general: ['أرتاح قد إيه بين المجموعات؟', 'محتاج بروتين قد إيه؟', 'آكل إيه قبل التمرين؟', 'عضلاتي متكسرة، أتمرن؟'],
    exercise: ['إيه البديل للتمرين ده؟', 'أعمله إزاي صح؟', 'إيه الأخطاء الشائعة؟'],
  },
};
