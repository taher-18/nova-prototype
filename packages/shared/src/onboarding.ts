import { z } from 'zod';
import { homeGymNameSchema } from './homeGym';
import { trainingDaysSchema } from './schedule';

export const GOALS = ['lose_fat', 'build_muscle', 'get_stronger', 'general_fitness'] as const;
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
/**
 * full_gym   – commercial gym
 * dumbbells  – dumbbells (+ bench) at home
 * bodyweight – bodyweight + a pull-up bar
 */
export const EQUIPMENT_SETUPS = ['full_gym', 'dumbbells', 'bodyweight'] as const;
export const GENDERS = ['male', 'female', 'prefer_not_to_say'] as const;
export const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;
export const SESSION_MINUTES = [30, 45, 60, 90] as const;

export type Goal = (typeof GOALS)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type EquipmentSetup = (typeof EQUIPMENT_SETUPS)[number];
export type Gender = (typeof GENDERS)[number];

const currentYear = new Date().getFullYear();

export const onboardingSchema = z.object({
  gender: z.enum(GENDERS),
  birthYear: z
    .number()
    .int()
    .min(currentYear - 90)
    .max(currentYear - 13)
    .optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(300).optional(),
  goal: z.enum(GOALS),
  experience: z.enum(EXPERIENCE_LEVELS),
  daysPerWeek: z.number().int().min(2).max(6),
  sessionMinutes: z.union(SESSION_MINUTES.map((m) => z.literal(m))),
  equipment: z.enum(EQUIPMENT_SETUPS),
  /** The weekdays the member picked (0 = Sunday). Optional: defaults come from daysPerWeek. */
  trainingDays: trainingDaysSchema.optional(),
  /** Where the member trains (optional). Left out = unchanged; null = cleared. */
  homeGym: homeGymNameSchema.nullable().optional(),
}).refine((a) => !a.trainingDays || a.trainingDays.length === a.daysPerWeek, {
  message: 'trainingDays must match daysPerWeek',
  path: ['trainingDays'],
});

export type OnboardingAnswers = z.infer<typeof onboardingSchema>;

/**
 * Workouts per week needed to keep the weekly streak. A little below the
 * plan's day count so one missed session doesn't break a streak.
 */
export function defaultWeeklyGoal(daysPerWeek: number): number {
  return daysPerWeek <= 3 ? daysPerWeek : daysPerWeek - 1;
}
