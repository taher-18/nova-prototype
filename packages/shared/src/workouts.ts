import { z } from 'zod';

/** One completed set, as logged on the phone. */
export const syncSetSchema = z.object({
  id: z.uuid(),
  exerciseId: z.string().min(1).max(120),
  setIndex: z.number().int().min(0).max(100),
  reps: z.number().int().min(0).max(1000).nullable(),
  weightKg: z.number().min(0).max(1000).nullable(),
  durationSec: z.number().int().min(0).max(36_000).nullable(),
  isWarmup: z.boolean(),
  completedAt: z.iso.datetime(),
});

/** A whole workout. The phone sends it after the workout is finished. */
export const syncSessionSchema = z.object({
  id: z.uuid(),
  planDayId: z.uuid().nullable(),
  dayKey: z.string().max(60).nullable(),
  startedAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  notes: z.string().max(2000).nullable(),
  exerciseNotes: z.record(z.string().max(120), z.string().max(1000)).default({}),
  /** Last edit time on the device; the newer copy wins. */
  clientUpdatedAt: z.iso.datetime(),
  deleted: z.boolean().default(false),
  sets: z.array(syncSetSchema).max(300),
});

export const syncRequestSchema = z.object({
  sessions: z.array(syncSessionSchema).min(1).max(50),
});

export type SyncSet = z.infer<typeof syncSetSchema>;
export type SyncSession = z.input<typeof syncSessionSchema>;

export interface SyncResult {
  id: string;
  status: 'ok' | 'rejected';
  reason?: 'forbidden' | 'unknown_exercise' | 'error';
}

/** Response of GET /v1/sessions */
export interface SessionsPage {
  sessions: Array<Omit<SyncSession, 'deleted'> & { deleted: boolean; updatedAt: string }>;
  /** Pass as ?since= to get the next page; null when there are no more. */
  nextSince: string | null;
}
