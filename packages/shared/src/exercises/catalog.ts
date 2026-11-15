import data from './exercises.data.json';

/** Our equipment grouping (not the dataset's), used to match a member's setup. */
export type ExerciseEquipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'pullup_bar';

export type MovementPattern =
  | 'horizontal_press'
  | 'vertical_press'
  | 'chest_fly'
  | 'lateral_raise'
  | 'rear_delt'
  | 'vertical_pull'
  | 'row'
  | 'squat'
  | 'leg_press'
  | 'hinge'
  | 'lunge'
  | 'glute_bridge'
  | 'leg_curl'
  | 'leg_extension'
  | 'calf_raise'
  | 'back_extension'
  | 'biceps_curl'
  | 'triceps_extension'
  | 'dip'
  | 'core_plank'
  | 'core_crunch'
  | 'conditioning';

export type ExerciseLevel = 'beginner' | 'intermediate' | 'expert';
/** How a set is logged: reps (+ weight) or a duration in seconds. */
export type ExerciseTracking = 'reps' | 'time';

export interface Exercise {
  id: string;
  nameEn: string;
  nameAr: string;
  equipment: ExerciseEquipment;
  /** Movement pattern: groups variations and common mistakes. */
  pattern: MovementPattern;
  tracking: ExerciseTracking;
  level: ExerciseLevel;
  mechanic: string | null;
  force: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructionsEn: string[];
  instructionsAr: string[];
}

export const EXERCISES = data as Exercise[];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export function exerciseName(id: string, locale: string): string {
  const ex = byId.get(id);
  if (!ex) return id;
  return locale === 'ar' ? ex.nameAr : ex.nameEn;
}

/** Other exercises with the same movement pattern, easiest first. */
export function getVariations(id: string): Exercise[] {
  const ex = byId.get(id);
  if (!ex) return [];
  const rank = { beginner: 0, intermediate: 1, expert: 2 } as const;
  return EXERCISES.filter((e) => e.pattern === ex.pattern && e.id !== id).sort(
    (a, b) => rank[a.level] - rank[b.level],
  );
}

export function exerciseSteps(ex: Exercise, locale: string): string[] {
  return locale === 'ar' && ex.instructionsAr.length > 0 ? ex.instructionsAr : ex.instructionsEn;
}

/** Muscles that appear in the catalogue (i18n keys under `muscles.*`). */
export const MUSCLES = [
  'abdominals',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
] as const;
