import {
  addDays,
  builtinAnswer,
  coachAskSchema,
  defaultTrainingDays,
  defaultWeeklyGoal,
  generatePlan,
  getExercise,
  isEmergency,
  onboardingSchema,
  SAFETY_ANSWER,
  setHomeGymSchema,
  toDateKey,
  type ActivePlan,
  type AuthTokens,
  type CoachAnswer,
  type OnboardingAnswers,
  type PublicUser,
  type ScheduleResponse,
} from '@gymapp/shared';
import Storage from 'expo-sqlite/kv-store';

/**
 * A stand-in for the Nova API that runs on the device (prototype mode).
 * It answers the same /v1 requests the app makes, from local storage, so
 * every screen works unchanged with no server and no account.
 */

const KEY = 'prototype.data';

interface Profile extends OnboardingAnswers {
  trainingDays: number[];
  weeklyGoal: number;
  homeGym: string | null;
}

interface Data {
  user: PublicUser;
  profile: Profile | null;
  plan: ActivePlan | null;
  overrides: Record<string, 'rest' | 'train'>;
}

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

function load(): Data {
  try {
    const raw = Storage.getItemSync(KEY);
    if (raw) return JSON.parse(raw) as Data;
  } catch {}
  const data: Data = {
    user: {
      id: uuid(),
      email: 'tester@nova.app',
      displayName: null,
      avatarUrl: null,
      locale: 'en',
      onboarded: false,
      createdAt: new Date().toISOString(),
    },
    profile: null,
    plan: null,
    overrides: {},
  };
  save(data);
  return data;
}

function save(data: Data) {
  Storage.setItemSync(KEY, JSON.stringify(data));
}

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const notFound = (code: string) => json(404, { error: { code } });
const badRequest = () => json(400, { error: { code: 'validation_error' } });

function buildPlan(answers: OnboardingAnswers): ActivePlan {
  const generated = generatePlan(answers);
  return {
    id: uuid(),
    templateId: generated.templateId,
    goal: answers.goal,
    experience: answers.experience,
    equipment: answers.equipment,
    daysPerWeek: answers.daysPerWeek,
    sessionMinutes: answers.sessionMinutes,
    createdAt: new Date().toISOString(),
    days: generated.days.map((day) => ({
      id: uuid(),
      dayIndex: day.dayIndex,
      key: day.key,
      exercises: day.exercises.map((ex, position) => {
        const info = getExercise(ex.exerciseId)!;
        return {
          id: uuid(),
          exerciseId: ex.exerciseId,
          position,
          role: ex.role,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          durationSec: ex.durationSec,
          restSec: ex.restSec,
          exercise: {
            nameEn: info.nameEn,
            nameAr: info.nameAr,
            equipment: info.equipment,
            tracking: info.tracking,
            primaryMuscles: info.primaryMuscles,
          },
        };
      }),
    })),
  };
}

function schedule(data: Data): ScheduleResponse {
  const today = toDateKey(new Date());
  const from = addDays(today, -120);
  const to = addDays(today, 120);
  return {
    trainingDays: data.profile?.trainingDays ?? [],
    weeklyGoal: data.profile?.weeklyGoal ?? 3,
    overrides: Object.entries(data.overrides)
      .filter(([date]) => date >= from && date <= to)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, kind]) => ({ date, kind })),
  };
}

type Handler = (data: Data, body: unknown, params: URLSearchParams, match: RegExpMatchArray) => Response;

const routes: Array<[string, RegExp, Handler]> = [
  ['GET', /^\/v1\/me$/, (d) => json(200, d.user)],
  [
    'PATCH',
    /^\/v1\/me$/,
    (d, body) => {
      const patch = body as { displayName?: string | null; locale?: 'en' | 'ar' };
      if (patch.displayName !== undefined) d.user.displayName = patch.displayName?.trim() || null;
      if (patch.locale) d.user.locale = patch.locale;
      save(d);
      return json(200, d.user);
    },
  ],
  ['GET', /^\/v1\/me\/profile$/, (d) => (d.profile ? json(200, d.profile) : notFound('profile_not_found'))],
  [
    'PUT',
    /^\/v1\/me\/profile$/,
    (d, body) => {
      const parsed = onboardingSchema.safeParse(body);
      if (!parsed.success) return badRequest();
      const answers = parsed.data;
      const keepDays =
        d.profile && d.profile.daysPerWeek === answers.daysPerWeek && d.profile.trainingDays.length > 0
          ? d.profile.trainingDays
          : defaultTrainingDays(answers.daysPerWeek);
      const trainingDays = answers.trainingDays ? [...answers.trainingDays].sort((a, b) => a - b) : keepDays;
      d.profile = {
        ...answers,
        trainingDays,
        weeklyGoal: defaultWeeklyGoal(trainingDays.length),
        homeGym: answers.homeGym !== undefined ? answers.homeGym : (d.profile?.homeGym ?? null),
      };
      d.plan = buildPlan(answers);
      d.user.onboarded = true;
      save(d);
      return json(200, { planId: d.plan.id, user: d.user });
    },
  ],
  [
    'PUT',
    /^\/v1\/me\/home-gym$/,
    (d, body) => {
      const parsed = setHomeGymSchema.safeParse(body);
      if (!parsed.success) return badRequest();
      if (!d.profile) return notFound('profile_not_found');
      d.profile.homeGym = parsed.data.name;
      save(d);
      return json(200, { homeGym: parsed.data.name });
    },
  ],
  ['GET', /^\/v1\/home-gyms\/suggestions$/, () => json(200, { suggestions: [] })],
  ['GET', /^\/v1\/plans\/active$/, (d) => (d.plan ? json(200, d.plan) : notFound('no_active_plan'))],
  ['GET', /^\/v1\/schedule$/, (d) => (d.profile ? json(200, schedule(d)) : notFound('profile_not_found'))],
  [
    'PUT',
    /^\/v1\/schedule\/training-days$/,
    (d, body) => {
      const days = (body as { trainingDays?: number[] }).trainingDays;
      if (!d.profile || !Array.isArray(days) || days.length === 0) return badRequest();
      d.profile.trainingDays = [...new Set(days)].sort((a, b) => a - b);
      d.profile.weeklyGoal = defaultWeeklyGoal(d.profile.trainingDays.length);
      save(d);
      return json(200, schedule(d));
    },
  ],
  [
    'PUT',
    /^\/v1\/schedule\/days\/(\d{4}-\d{2}-\d{2})$/,
    (d, body, _p, m) => {
      const kind = (body as { kind?: string }).kind;
      if (kind !== 'rest' && kind !== 'train') return badRequest();
      d.overrides[m[1]!] = kind;
      save(d);
      return json(200, schedule(d));
    },
  ],
  [
    'DELETE',
    /^\/v1\/schedule\/days\/(\d{4}-\d{2}-\d{2})$/,
    (d, _b, _p, m) => {
      delete d.overrides[m[1]!];
      save(d);
      return json(200, schedule(d));
    },
  ],
  [
    'POST',
    /^\/v1\/schedule\/move$/,
    (d, body) => {
      const { from, to } = body as { from?: string; to?: string };
      if (!from || !to) return badRequest();
      if (from === to) return json(400, { error: { code: 'same_day' } });
      d.overrides[from] = 'rest';
      d.overrides[to] = 'train';
      save(d);
      return json(200, schedule(d));
    },
  ],
  // Workouts and measurements are already kept in the on-device database.
  [
    'POST',
    /^\/v1\/sessions\/sync$/,
    (_d, body) => json(200, { results: ((body as { sessions?: { id: string }[] }).sessions ?? []).map((s) => ({ id: s.id, status: 'ok' })) }),
  ],
  ['GET', /^\/v1\/sessions$/, () => json(200, { sessions: [], nextSince: null })],
  [
    'POST',
    /^\/v1\/body-metrics\/sync$/,
    (_d, body) => json(200, { results: ((body as { entries?: { id: string }[] }).entries ?? []).map((e) => ({ id: e.id, status: 'ok' })) }),
  ],
  ['GET', /^\/v1\/body-metrics$/, () => json(200, { entries: [], nextSince: null })],
  ['GET', /^\/v1\/coach\/status$/, () => json(200, { ai: false, remaining: null, limit: 0 })],
  [
    'POST',
    /^\/v1\/coach\/ask$/,
    (_d, body) => {
      const parsed = coachAskSchema.safeParse(body);
      if (!parsed.success) return badRequest();
      const ask = parsed.data;
      const reply: CoachAnswer = isEmergency(ask.question)
        ? { answer: SAFETY_ANSWER[ask.lang], source: 'safety', remaining: null }
        : { answer: builtinAnswer(ask), source: 'builtin', remaining: null, reason: 'unavailable' };
      return json(200, reply);
    },
  ],
  ['POST', /^\/v1\/auth\/logout$/, () => json(204)],
];

/** A fetch() that answers API requests on the device. */
export const localFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://local');
  const method = (init?.method ?? 'GET').toUpperCase();
  let body: unknown;
  if (typeof init?.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {
      return badRequest();
    }
  }
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = url.pathname.match(re);
    if (match) return handler(load(), body ?? {}, url.searchParams, match);
  }
  return notFound('not_available_in_prototype');
};

/** Pretend tokens: the API client sends them, the local server ignores them. */
export const PROTOTYPE_TOKENS: AuthTokens = { accessToken: 'prototype', refreshToken: 'prototype', expiresIn: 31_536_000 };
