import { z } from 'zod';

export const BODY_METRIC_KINDS = ['weight', 'body_fat', 'waist', 'chest', 'hips', 'arm', 'thigh'] as const;
export type BodyMetricKind = (typeof BODY_METRIC_KINDS)[number];

/** Unit shown for each kind. */
export const BODY_METRIC_UNITS: Record<BodyMetricKind, 'kg' | '%' | 'cm'> = {
  weight: 'kg',
  body_fat: '%',
  waist: 'cm',
  chest: 'cm',
  hips: 'cm',
  arm: 'cm',
  thigh: 'cm',
};

const RANGES: Record<BodyMetricKind, [number, number]> = {
  weight: [25, 350],
  body_fat: [2, 70],
  waist: [30, 250],
  chest: [40, 250],
  hips: [40, 250],
  arm: [10, 80],
  thigh: [20, 120],
};

export function isValidMetric(kind: BodyMetricKind, value: number) {
  const [min, max] = RANGES[kind];
  return value >= min && value <= max;
}

export const bodyMetricEntrySchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(BODY_METRIC_KINDS),
    value: z.number(),
    loggedAt: z.iso.datetime(),
    clientUpdatedAt: z.iso.datetime(),
    deleted: z.boolean().default(false),
  })
  .refine((e) => e.deleted || isValidMetric(e.kind, e.value), { message: 'Value out of range', path: ['value'] });

export const bodyMetricSyncSchema = z.object({ entries: z.array(bodyMetricEntrySchema).min(1).max(100) });

export type BodyMetricEntry = z.input<typeof bodyMetricEntrySchema>;

export interface BodyMetricsPage {
  entries: Array<Omit<BodyMetricEntry, 'deleted'> & { deleted: boolean; updatedAt: string }>;
  nextSince: string | null;
}
