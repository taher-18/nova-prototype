import type { ExerciseEquipment } from '@gymapp/shared';

export interface WarmupSet {
  weightKg: number;
  reps: number;
}

const roundTo = (kg: number, step: number) => Math.round(kg / step) * step;

/**
 * Warm-up sets before the first working set of a heavy exercise.
 * Barbell: empty bar, then ~50/70/85%. Dumbbells/machines: ~50/75%.
 * Nothing for light weights or bodyweight work.
 */
export function warmupSets(workingKg: number | null, equipment: ExerciseEquipment, barKg = 20): WarmupSet[] {
  if (!workingKg) return [];
  if (equipment === 'barbell') {
    if (workingKg < 40) return [];
    const steps: WarmupSet[] = [
      { weightKg: barKg, reps: 10 },
      { weightKg: roundTo(workingKg * 0.5, 2.5), reps: 5 },
      { weightKg: roundTo(workingKg * 0.7, 2.5), reps: 3 },
    ];
    if (workingKg >= 80) steps.push({ weightKg: roundTo(workingKg * 0.85, 2.5), reps: 1 });
    // Drop steps that aren't heavier than the previous one or reach the working weight.
    return steps.filter((s, i) => s.weightKg < workingKg && (i === 0 || s.weightKg > steps[i - 1]!.weightKg));
  }
  if (equipment === 'dumbbell' || equipment === 'machine' || equipment === 'cable') {
    if (workingKg < 15) return [];
    const step = equipment === 'dumbbell' ? 2 : 2.5;
    return [
      { weightKg: roundTo(workingKg * 0.5, step), reps: 8 },
      { weightKg: roundTo(workingKg * 0.75, step), reps: 4 },
    ].filter((s) => s.weightKg > 0 && s.weightKg < workingKg);
  }
  return [];
}
