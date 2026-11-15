import type { ExerciseEquipment, ExerciseTracking } from '../exercises/catalog';
import type { EquipmentSetup, ExperienceLevel, Goal } from '../onboarding';
import type { SlotRole } from './templates';

/** Response of GET /v1/plans/active */
export interface ActivePlan {
  id: string;
  templateId: string;
  goal: Goal;
  experience: ExperienceLevel;
  equipment: EquipmentSetup;
  daysPerWeek: number;
  sessionMinutes: number;
  createdAt: string;
  days: ActivePlanDay[];
}

export interface ActivePlanDay {
  id: string;
  dayIndex: number;
  key: string;
  exercises: ActivePlanExercise[];
}

export interface ActivePlanExercise {
  id: string;
  exerciseId: string;
  position: number;
  role: SlotRole;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  durationSec: number | null;
  restSec: number;
  exercise: {
    nameEn: string;
    nameAr: string;
    equipment: ExerciseEquipment;
    tracking: ExerciseTracking;
    primaryMuscles: string[];
  };
}
