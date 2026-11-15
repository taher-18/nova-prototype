import { getExercise, type Exercise, type ExerciseEquipment } from '../exercises/catalog';
import type { EquipmentSetup, ExperienceLevel, Goal, OnboardingAnswers } from '../onboarding';
import { SLOT_CANDIDATES, type Slot } from './slots';
import { selectTemplate, type PlanTemplate, type SlotRole, type TemplateSlot } from './templates';

export interface PlannedExercise {
  exerciseId: string;
  slot: Slot;
  role: SlotRole;
  sets: number;
  /** null for time-based exercises */
  repsMin: number | null;
  repsMax: number | null;
  /** Seconds per set for time-based exercises, otherwise null. */
  durationSec: number | null;
  restSec: number;
}

export interface PlannedDay {
  dayIndex: number;
  key: string;
  exercises: PlannedExercise[];
}

export interface GeneratedPlan {
  templateId: string;
  templateVersion: number;
  days: PlannedDay[];
}

export type PlanInput = Pick<
  OnboardingAnswers,
  'gender' | 'goal' | 'experience' | 'daysPerWeek' | 'sessionMinutes' | 'equipment'
>;

const EQUIPMENT_BY_SETUP: Record<EquipmentSetup, ReadonlySet<ExerciseEquipment>> = {
  full_gym: new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'pullup_bar']),
  dumbbells: new Set(['dumbbell', 'bodyweight']),
  bodyweight: new Set(['bodyweight', 'pullup_bar']),
};

const EXERCISES_PER_SESSION: Record<number, number> = { 30: 4, 45: 5, 60: 6, 90: 8 };
const MAX_EXERCISES_BY_EXPERIENCE: Record<ExperienceLevel, number> = {
  beginner: 6,
  intermediate: 7,
  advanced: 8,
};

type Scheme = { sets: number; repsMin: number; repsMax: number; restSec: number };
type StrengthRole = 'main' | 'secondary' | 'accessory';

const SCHEMES: Record<Goal, Record<StrengthRole, Scheme>> = {
  get_stronger: {
    main: { sets: 4, repsMin: 4, repsMax: 6, restSec: 180 },
    secondary: { sets: 3, repsMin: 6, repsMax: 8, restSec: 120 },
    accessory: { sets: 3, repsMin: 8, repsMax: 12, restSec: 75 },
  },
  build_muscle: {
    main: { sets: 4, repsMin: 6, repsMax: 10, restSec: 120 },
    secondary: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
    accessory: { sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
  },
  lose_fat: {
    main: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
    secondary: { sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
    accessory: { sets: 3, repsMin: 12, repsMax: 15, restSec: 45 },
  },
  general_fitness: {
    main: { sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
    secondary: { sets: 3, repsMin: 10, repsMax: 12, restSec: 75 },
    accessory: { sets: 2, repsMin: 12, repsMax: 15, restSec: 60 },
  },
};

const HOLD_SECONDS: Record<ExperienceLevel, number> = { beginner: 30, intermediate: 45, advanced: 60 };
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2, expert: 2 } as const;

const isLoaded = (ex: Exercise) => ex.equipment !== 'bodyweight' && ex.equipment !== 'pullup_bar';

/** Exercises the member can do, in preference order (own level first). */
export function availableCandidates(
  slot: Slot,
  equipment: EquipmentSetup,
  experience: ExperienceLevel,
): Exercise[] {
  const allowed = EQUIPMENT_BY_SETUP[equipment];
  const userRank = LEVEL_RANK[experience];
  const usable = SLOT_CANDIDATES[slot]
    .map((id) => getExercise(id))
    .filter((ex): ex is Exercise => {
      if (!ex || !allowed.has(ex.equipment)) return false;
      // Beginners never get expert-level exercises.
      return !(experience === 'beginner' && ex.level === 'expert');
    });
  // Stable sort: exercises at or below the member's level first.
  return [
    ...usable.filter((ex) => LEVEL_RANK[ex.level] <= userRank),
    ...usable.filter((ex) => LEVEL_RANK[ex.level] > userRank),
  ];
}

function prescribe(ex: Exercise, role: SlotRole, input: PlanInput): Omit<PlannedExercise, 'exerciseId' | 'slot' | 'role'> {
  if (role === 'conditioning') {
    return { sets: 3, repsMin: null, repsMax: null, durationSec: 30, restSec: 30 };
  }
  if (role === 'core') {
    if (ex.tracking === 'time') {
      return { sets: 3, repsMin: null, repsMax: null, durationSec: HOLD_SECONDS[input.experience], restSec: 45 };
    }
    return { sets: 3, repsMin: 10, repsMax: 15, durationSec: null, restSec: 45 };
  }

  const scheme = { ...SCHEMES[input.goal][role] };
  if (input.experience === 'beginner') scheme.sets = Math.min(scheme.sets, 3);
  if (input.experience === 'advanced' && role === 'secondary') scheme.sets = Math.min(scheme.sets + 1, 5);

  if (ex.tracking === 'time') {
    return { sets: scheme.sets, repsMin: null, repsMax: null, durationSec: HOLD_SECONDS[input.experience], restSec: scheme.restSec };
  }
  // Without external load, very low rep ranges make little sense.
  if (ex.equipment === 'bodyweight' || ex.equipment === 'pullup_bar') {
    scheme.repsMin = Math.max(scheme.repsMin, 6);
    scheme.repsMax = Math.max(scheme.repsMax, 12);
  }
  return { sets: scheme.sets, repsMin: scheme.repsMin, repsMax: scheme.repsMax, durationSec: null, restSec: scheme.restSec };
}

export function exercisesPerSession(input: Pick<PlanInput, 'sessionMinutes' | 'experience'>): number {
  const bySession = EXERCISES_PER_SESSION[input.sessionMinutes] ?? 6;
  return Math.min(bySession, MAX_EXERCISES_BY_EXPERIENCE[input.experience]);
}

export function generatePlan(input: PlanInput, template?: PlanTemplate): GeneratedPlan {
  const chosen = template ?? selectTemplate(input.daysPerWeek, input.gender);
  const limit = exercisesPerSession(input);
  /** How many times each slot has been filled this week, for rotation. */
  const slotUses = new Map<Slot, number>();

  const days = chosen.days.map((day, dayIndex): PlannedDay => {
    const usedToday = new Set<string>();
    const picked: PlannedExercise[] = [];
    const slots: TemplateSlot[] = [...day.slots];
    if (input.goal === 'lose_fat') {
      // Keep room for a short conditioning finisher.
      slots.splice(limit - 1, 0, { slot: 'conditioning', role: 'conditioning' });
    }

    for (const { slot, role } of slots) {
      if (picked.length >= limit) break;
      const candidates = availableCandidates(slot, input.equipment, input.experience).filter(
        (ex) => !usedToday.has(ex.id),
      );
      if (candidates.length === 0) continue; // e.g. no lateral raise without dumbbells
      // Rotate for variety, but never from a loaded exercise to a bodyweight fallback.
      const pool = isLoaded(candidates[0]!) ? candidates.filter(isLoaded) : candidates;
      const uses = slotUses.get(slot) ?? 0;
      slotUses.set(slot, uses + 1);
      const ex = pool[uses % pool.length]!;
      usedToday.add(ex.id);
      picked.push({ exerciseId: ex.id, slot, role, ...prescribe(ex, role, input) });
    }

    // Core and conditioning go last in the session.
    const isFinisher = (p: PlannedExercise) => p.role === 'core' || p.role === 'conditioning';
    const exercises = [
      ...picked.filter((p) => !isFinisher(p)),
      ...picked.filter((p) => p.role === 'core'),
      ...picked.filter((p) => p.role === 'conditioning'),
    ];
    return { dayIndex, key: day.key, exercises };
  });

  return { templateId: chosen.id, templateVersion: chosen.version, days };
}
