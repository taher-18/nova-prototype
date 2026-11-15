/** Plates per side to load a barbell (greedy works for standard plate sets). */
export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateLoad {
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** Weight actually loaded (bar + plates). */
  totalKg: number;
  /** What couldn't be matched with the available plates. */
  missingKg: number;
}

export function platesFor(targetKg: number, barKg = 20, plates = STANDARD_PLATES_KG): PlateLoad {
  if (targetKg <= barKg) return { perSide: [], totalKg: barKg, missingKg: Math.max(0, targetKg - barKg) };
  let side = Math.round(((targetKg - barKg) / 2) * 100) / 100;
  const perSide: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (side + 1e-9 >= plate) {
      perSide.push(plate);
      side = Math.round((side - plate) * 100) / 100;
    }
  }
  const loaded = perSide.reduce((s, p) => s + p, 0);
  return { perSide, totalKg: barKg + loaded * 2, missingKg: Math.round(side * 2 * 100) / 100 };
}
