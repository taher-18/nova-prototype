import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../exercises/catalog';
import {
  DAYS_PER_WEEK,
  EQUIPMENT_SETUPS,
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
  SESSION_MINUTES,
} from '../onboarding';
import { exercisesPerSession, generatePlan, type PlanInput } from './generator';
import { SLOT_CANDIDATES } from './slots';
import { PLAN_TEMPLATES, selectTemplate, type PlanTemplate } from './templates';

const base: PlanInput = {
  gender: 'male',
  goal: 'build_muscle',
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: 'full_gym',
};

const SETUP_EQUIPMENT = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'pullup_bar'],
  dumbbells: ['dumbbell', 'bodyweight'],
  bodyweight: ['bodyweight', 'pullup_bar'],
} as const;

function allInputs(): PlanInput[] {
  const inputs: PlanInput[] = [];
  for (const daysPerWeek of DAYS_PER_WEEK)
    for (const experience of EXPERIENCE_LEVELS)
      for (const equipment of EQUIPMENT_SETUPS)
        for (const goal of GOALS)
          for (const sessionMinutes of SESSION_MINUTES)
            for (const gender of GENDERS)
              inputs.push({ daysPerWeek, experience, equipment, goal, sessionMinutes, gender });
  return inputs;
}

describe('exercise catalog', () => {
  it('has an English and Arabic name for every exercise', () => {
    for (const ex of EXERCISES) {
      expect(ex.nameEn.length).toBeGreaterThan(0);
      expect(ex.nameAr).toMatch(/[؀-ۿ]/);
    }
  });

  it('contains every exercise referenced by a slot', () => {
    for (const ids of Object.values(SLOT_CANDIDATES)) {
      for (const id of ids) expect(getExercise(id), id).toBeDefined();
    }
  });
});

describe('generatePlan', () => {
  it('produces a valid plan for every combination of answers', () => {
    for (const input of allInputs()) {
      const plan = generatePlan(input);
      const label = JSON.stringify(input);
      expect(plan.days, label).toHaveLength(input.daysPerWeek);

      for (const day of plan.days) {
        expect(day.exercises.length, label).toBeGreaterThanOrEqual(3);
        expect(day.exercises.length, label).toBeLessThanOrEqual(exercisesPerSession(input));
        const ids = day.exercises.map((e) => e.exerciseId);
        expect(new Set(ids).size, `duplicate in ${day.key} ${label}`).toBe(ids.length);

        for (const pe of day.exercises) {
          const ex = getExercise(pe.exerciseId)!;
          expect(SETUP_EQUIPMENT[input.equipment], label).toContain(ex.equipment);
          if (input.experience === 'beginner') expect(ex.level).not.toBe('expert');
          expect(pe.sets).toBeGreaterThanOrEqual(2);
          expect(pe.restSec).toBeGreaterThan(0);
          if (pe.durationSec === null) {
            expect(pe.repsMin).not.toBeNull();
            expect(pe.repsMin!).toBeLessThanOrEqual(pe.repsMax!);
          } else {
            expect(pe.repsMin).toBeNull();
          }
        }
      }
    }
  });

  it('starts each day with a compound lift and ends with core/conditioning', () => {
    const plan = generatePlan(base);
    for (const day of plan.days) {
      expect(day.exercises[0]!.role).toBe('main');
      expect(['core', 'conditioning']).toContain(day.exercises.at(-1)!.role);
    }
  });

  it('adds a conditioning finisher for fat loss', () => {
    const plan = generatePlan({ ...base, goal: 'lose_fat' });
    for (const day of plan.days) {
      expect(day.exercises.at(-1)!.role).toBe('conditioning');
    }
  });

  it('uses heavier, lower-rep work for strength than for fat loss', () => {
    const strength = generatePlan({ ...base, goal: 'get_stronger' }).days[0]!.exercises[0]!;
    const fatLoss = generatePlan({ ...base, goal: 'lose_fat' }).days[0]!.exercises[0]!;
    expect(strength.repsMax!).toBeLessThan(fatLoss.repsMax!);
    expect(strength.restSec).toBeGreaterThan(fatLoss.restSec);
  });

  it('fits fewer exercises into shorter sessions', () => {
    const short = generatePlan({ ...base, sessionMinutes: 30 });
    const long = generatePlan({ ...base, sessionMinutes: 90, experience: 'advanced' });
    expect(short.days[0]!.exercises.length).toBe(4);
    expect(long.days[0]!.exercises.length).toBe(8);
  });

  it('rotates exercises when a slot repeats in the week', () => {
    const plan = generatePlan({ ...base, daysPerWeek: 6 });
    const pushA = plan.days.find((d) => d.key === 'push_a')!;
    const pushB = plan.days.find((d) => d.key === 'push_b')!;
    expect(pushA.exercises[0]!.exerciseId).not.toBe(pushB.exercises[0]!.exerciseId);
  });

  it('only uses dumbbells and bodyweight for home dumbbell setups', () => {
    const plan = generatePlan({ ...base, equipment: 'dumbbells' });
    const equipment = new Set(
      plan.days.flatMap((d) => d.exercises.map((e) => getExercise(e.exerciseId)!.equipment)),
    );
    expect([...equipment].every((e) => e === 'dumbbell' || e === 'bodyweight')).toBe(true);
  });

  it('is deterministic', () => {
    expect(generatePlan(base)).toEqual(generatePlan(base));
  });
});

describe('selectTemplate', () => {
  it('uses the neutral template when no audience-specific one exists', () => {
    expect(selectTemplate(3, 'female').id).toBe('full_body_3');
  });

  it('prefers an audience-specific template when one is added', () => {
    const neutral = PLAN_TEMPLATES.find((t) => t.daysPerWeek === 3)!;
    const womens: PlanTemplate = { ...neutral, id: 'womens_3', audience: 'female' };
    const templates = [...PLAN_TEMPLATES, womens];
    expect(selectTemplate(3, 'female', templates).id).toBe('womens_3');
    expect(selectTemplate(3, 'male', templates).id).toBe('full_body_3');
    expect(selectTemplate(3, 'prefer_not_to_say', templates).id).toBe('full_body_3');
  });

  it('throws for unsupported day counts', () => {
    expect(() => selectTemplate(7, 'male')).toThrow();
  });
});

describe('exercise content', () => {
  it('has a pattern, Arabic steps and common mistakes for every exercise', async () => {
    const { COMMON_MISTAKES } = await import('../exercises/mistakes');
    const { MUSCLES } = await import('../exercises/catalog');
    for (const ex of EXERCISES) {
      expect(COMMON_MISTAKES[ex.pattern], ex.id).toBeDefined();
      expect(ex.instructionsAr.length, ex.id).toBeGreaterThan(0);
      for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
        expect(MUSCLES as readonly string[], `${ex.id}: ${m}`).toContain(m);
      }
    }
    for (const m of Object.values(COMMON_MISTAKES)) expect(m.ar).toHaveLength(m.en.length);
  });

  it('lists variations with the same pattern', async () => {
    const { getVariations } = await import('../exercises/catalog');
    const ids = getVariations('Barbell_Bench_Press_-_Medium_Grip').map((e) => e.id);
    expect(ids).toContain('Incline_Dumbbell_Press');
    expect(ids).not.toContain('Barbell_Bench_Press_-_Medium_Grip');
  });
});
