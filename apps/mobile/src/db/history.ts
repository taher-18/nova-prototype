import type { SessionsPage, SyncSession } from '@gymapp/shared';
import type { ExerciseHistory } from '../features/workout/engine';
import { computeBests, estimateOneRepMax, type Bests } from '../features/workout/records';
import type { LocalDb } from './database';

interface SetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  is_warmup: number;
  completed_at: number;
}

interface SessionRow {
  id: string;
  plan_day_id: string | null;
  day_key: string | null;
  started_at: number;
  ended_at: number | null;
  exercise_notes: string;
  updated_at: number;
}

const setValues = (r: SetRow) => ({
  reps: r.reps,
  weightKg: r.weight_kg,
  durationSec: r.duration_sec,
  isWarmup: !!r.is_warmup,
});

/** Saves a finished workout (local copy; syncing happens separately). */
export async function saveSession(db: LocalDb, s: SyncSession) {
  const updatedAt = Date.parse(s.clientUpdatedAt);
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO sessions (id, plan_day_id, day_key, started_at, ended_at, exercise_notes, deleted, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET plan_day_id = excluded.plan_day_id, day_key = excluded.day_key,
         started_at = excluded.started_at, ended_at = excluded.ended_at, exercise_notes = excluded.exercise_notes,
         deleted = excluded.deleted, updated_at = excluded.updated_at`,
      s.id,
      s.planDayId,
      s.dayKey,
      Date.parse(s.startedAt),
      s.endedAt ? Date.parse(s.endedAt) : null,
      JSON.stringify(s.exerciseNotes ?? {}),
      s.deleted ? 1 : 0,
      updatedAt,
    );
    await tx.runAsync('DELETE FROM sets WHERE session_id = ?', s.id);
    for (const set of s.deleted ? [] : s.sets) {
      await tx.runAsync(
        `INSERT INTO sets (id, session_id, exercise_id, set_index, reps, weight_kg, duration_sec, is_warmup, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        set.id,
        s.id,
        set.exerciseId,
        set.setIndex,
        set.reps,
        set.weightKg,
        set.durationSec,
        set.isWarmup ? 1 : 0,
        Date.parse(set.completedAt),
      );
    }
  });
}

/** Merges history downloaded from the server. Local copies that are newer win. */
export async function applyRemoteSessions(db: LocalDb, page: SessionsPage) {
  for (const remote of page.sessions) {
    const local = await db.getFirstAsync<{ updated_at: number }>('SELECT updated_at FROM sessions WHERE id = ?', remote.id);
    if (local && local.updated_at >= Date.parse(remote.clientUpdatedAt)) continue;
    await saveSession(db, remote);
  }
}

/** Last time's sets and all-time bests, used when an exercise is added to a workout. */
export async function getExerciseHistory(db: LocalDb, exerciseId: string, excludeSessionId?: string): Promise<ExerciseHistory> {
  const rows = await db.getAllAsync<SetRow>(
    `SELECT sets.* FROM sets JOIN sessions ON sessions.id = sets.session_id
     WHERE sets.exercise_id = ? AND sessions.deleted = 0 AND sessions.id != ?
     ORDER BY sets.completed_at`,
    exerciseId,
    excludeSessionId ?? '',
  );
  const working = rows.filter((r) => !r.is_warmup);
  const lastSessionId = working[working.length - 1]?.session_id;
  const lastSets = working
    .filter((r) => r.session_id === lastSessionId)
    .sort((a, b) => a.set_index - b.set_index)
    .map((r) => ({ reps: r.reps, weightKg: r.weight_kg, durationSec: r.duration_sec }));
  return { lastSets, bests: computeBests(working.map(setValues)) };
}

export interface ExerciseProgressPoint {
  sessionId: string;
  date: number;
  /** Best e1RM (loaded), most reps (bodyweight) or longest hold (time) that session. */
  value: number;
  topSet: { reps: number | null; weightKg: number | null; durationSec: number | null };
}

export interface ExerciseProgress {
  bests: Bests;
  points: ExerciseProgressPoint[];
  metric: 'e1rm' | 'reps' | 'duration';
}

export async function getExerciseProgress(db: LocalDb, exerciseId: string): Promise<ExerciseProgress> {
  const rows = await db.getAllAsync<SetRow & { started_at: number }>(
    `SELECT sets.*, sessions.started_at FROM sets JOIN sessions ON sessions.id = sets.session_id
     WHERE sets.exercise_id = ? AND sessions.deleted = 0 AND sets.is_warmup = 0
     ORDER BY sessions.started_at, sets.set_index`,
    exerciseId,
  );
  const bests = computeBests(rows.map(setValues));
  const metric: ExerciseProgress['metric'] =
    bests.maxE1rm !== null ? 'e1rm' : bests.maxDurationSec !== null ? 'duration' : 'reps';
  const score = (r: SetRow) =>
    metric === 'e1rm' ? (estimateOneRepMax(r.weight_kg, r.reps) ?? 0) : metric === 'duration' ? (r.duration_sec ?? 0) : (r.reps ?? 0);

  const bySession = new Map<string, ExerciseProgressPoint>();
  for (const r of rows) {
    const value = score(r);
    const current = bySession.get(r.session_id);
    if (!current || value > current.value) {
      bySession.set(r.session_id, {
        sessionId: r.session_id,
        date: r.started_at,
        value,
        topSet: { reps: r.reps, weightKg: r.weight_kg, durationSec: r.duration_sec },
      });
    }
  }
  return { bests, metric, points: [...bySession.values()].filter((p) => p.value > 0) };
}

export interface SessionSummaryRow {
  id: string;
  planDayId: string | null;
  dayKey: string | null;
  startedAt: number;
  endedAt: number | null;
  setCount: number;
  volumeKg: number;
}

const SUMMARY_SQL = `SELECT sessions.*, COUNT(sets.id) AS set_count,
    SUM(CASE WHEN sets.is_warmup = 0 THEN COALESCE(sets.weight_kg, 0) * COALESCE(sets.reps, 0) ELSE 0 END) AS volume
  FROM sessions LEFT JOIN sets ON sets.session_id = sessions.id`;

type SummaryRow = SessionRow & { set_count: number; volume: number | null };

export async function listRecentSessions(db: LocalDb, limit = 10): Promise<SessionSummaryRow[]> {
  const rows = await db.getAllAsync<SummaryRow>(
    `${SUMMARY_SQL} WHERE sessions.deleted = 0 GROUP BY sessions.id ORDER BY sessions.started_at DESC LIMIT ?`,
    limit,
  );
  return rows.map(toSummary);
}

/** Workouts started in [fromMs, toMs), oldest first (calendar, week view, weekly summary). */
export async function sessionsBetween(db: LocalDb, fromMs: number, toMs: number): Promise<SessionSummaryRow[]> {
  const rows = await db.getAllAsync<SummaryRow>(
    `${SUMMARY_SQL} WHERE sessions.deleted = 0 AND sessions.started_at >= ? AND sessions.started_at < ?
     GROUP BY sessions.id ORDER BY sessions.started_at`,
    fromMs,
    toMs,
  );
  return rows.map(toSummary);
}

export interface SessionDetail extends SessionSummaryRow {
  exercises: Array<{
    exerciseId: string;
    note: string | null;
    sets: Array<{ reps: number | null; weightKg: number | null; durationSec: number | null }>;
  }>;
}

export async function getSessionDetail(db: LocalDb, id: string): Promise<SessionDetail | null> {
  const row = await db.getFirstAsync<SummaryRow>(`${SUMMARY_SQL} WHERE sessions.id = ? GROUP BY sessions.id`, id);
  if (!row) return null;
  const sets = await db.getAllAsync<SetRow>('SELECT * FROM sets WHERE session_id = ? ORDER BY completed_at, set_index', id);
  const notes = JSON.parse(row.exercise_notes || '{}') as Record<string, string>;
  const exercises: SessionDetail['exercises'] = [];
  for (const s of sets) {
    let ex = exercises.find((e) => e.exerciseId === s.exercise_id);
    if (!ex) {
      ex = { exerciseId: s.exercise_id, note: notes[s.exercise_id] ?? null, sets: [] };
      exercises.push(ex);
    }
    ex.sets.push({ reps: s.reps, weightKg: s.weight_kg, durationSec: s.duration_sec });
  }
  return { ...toSummary(row), exercises };
}

/** The most recent workout's plan day (by id, or key for older plans). */
export async function lastPlannedSession(db: LocalDb): Promise<{ planDayId: string | null; dayKey: string | null } | null> {
  const row = await db.getFirstAsync<{ plan_day_id: string | null; day_key: string | null }>(
    `SELECT plan_day_id, day_key FROM sessions WHERE deleted = 0 AND (plan_day_id IS NOT NULL OR day_key IS NOT NULL)
     ORDER BY started_at DESC LIMIT 1`,
  );
  return row ? { planDayId: row.plan_day_id, dayKey: row.day_key } : null;
}

function toSummary(r: SummaryRow): SessionSummaryRow {
  return {
    id: r.id,
    planDayId: r.plan_day_id,
    dayKey: r.day_key,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    setCount: r.set_count,
    volumeKg: Math.round((r.volume ?? 0) * 10) / 10,
  };
}

export async function workoutDates(db: LocalDb): Promise<Date[]> {
  const rows = await db.getAllAsync<{ started_at: number }>('SELECT started_at FROM sessions WHERE deleted = 0');
  return rows.map((r) => new Date(r.started_at));
}

/** The most recently trained plan day, to suggest the next one. */
export async function lastPlanDayId(db: LocalDb): Promise<string | null> {
  const row = await db.getFirstAsync<{ plan_day_id: string }>(
    'SELECT plan_day_id FROM sessions WHERE deleted = 0 AND plan_day_id IS NOT NULL ORDER BY started_at DESC LIMIT 1',
  );
  return row?.plan_day_id ?? null;
}
