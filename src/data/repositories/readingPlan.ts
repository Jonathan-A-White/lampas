// src/data/repositories/readingPlan.ts — the reading plan on this phone (mw-umv8sp.1): the plan he chose (src/data/plans/), where he started, the chapters done and the
// one listening session left open with its start time. One JSON object in the settings store under 'readingPlanState', like paradigmsOpened.ts; no Dexie version, and
// outside the settings registry (the switch 'readingPlan' is the registry's, src/settings/definitions/readingPlan.ts). A plan is a straight line of chapters, so what is
// done is kept as the keys 'gen.1' of the chapters marked.
import { AUDIO_BIBLES } from '../../resources/audioBible';
import { audioBibleSetting } from '../../settings/definitions';
import { readingPlanSetting } from '../../settings/definitions/readingPlan';
import { getSetting, setSetting } from '../../settings/store';
import { db } from '../db';
import { planOf, type PlanChapter } from '../plans';

const KEY = 'readingPlanState';

export interface ListeningSession extends PlanChapter {
  /** when the session began (ms since the epoch) */
  startedAt: number;
}

export interface EndedSession extends ListeningSession {
  endedAt: number;
}

export interface ReadingPlanState {
  planId: string;
  start: PlanChapter;
  /** the keys ('gen.1') of the chapters done, in plan order */
  done: string[];
  session?: ListeningSession;
}

/** The key a done chapter is kept under: 'gen.1'. */
export const keyOf = (c: PlanChapter): string => `${c.code}.${c.chapter}`;

const isChapter = (v: unknown): v is PlanChapter =>
  typeof v === 'object' && v !== null && typeof (v as PlanChapter).code === 'string' && Number.isInteger((v as PlanChapter).chapter);

const isSession = (v: unknown): v is ListeningSession => isChapter(v) && typeof (v as ListeningSession).startedAt === 'number';

async function read(): Promise<ReadingPlanState | undefined> {
  const row = await db.settings.get(KEY);
  if (typeof row?.value !== 'string') return undefined;
  try {
    const kept: unknown = JSON.parse(row.value);
    if (typeof kept !== 'object' || kept === null) return undefined;
    const { planId, start, done, session } = kept as Partial<ReadingPlanState>;
    if (typeof planId !== 'string' || !planOf(planId) || !isChapter(start) || !Array.isArray(done)) return undefined;
    return {
      planId,
      start: { code: start.code, chapter: start.chapter },
      done: done.filter((k): k is string => typeof k === 'string'),
      ...(isSession(session) ? { session: { code: session.code, chapter: session.chapter, startedAt: session.startedAt } } : {}),
    };
  } catch {
    return undefined;
  }
}

const write = (state: ReadingPlanState): Promise<unknown> => db.settings.put({ key: KEY, value: JSON.stringify(state) });

/** The plan he is on, or undefined when none is started (or the saved one is no longer a plan). */
export const getReadingPlan = (): Promise<ReadingPlanState | undefined> => read();

/**
 * Starts the plan at `start`: every chapter before it is done, nothing else, and no session is open. Turns the Reading plan setting On, and the Audio Bible on when it
 * was Off. False, changing nothing, for a plan or a chapter the registry does not hold.
 */
export async function startPlan(planId: string, start: PlanChapter): Promise<boolean> {
  const chapters = planOf(planId)?.chapters();
  const at = chapters?.findIndex((c) => c.code === start.code && c.chapter === start.chapter) ?? -1;
  if (!chapters || at < 0) return false;
  await write({ planId, start: { code: start.code, chapter: start.chapter }, done: chapters.slice(0, at).map(keyOf) });
  await setSetting(readingPlanSetting, 'on');
  if ((await getSetting(audioBibleSetting)) === 'off' && AUDIO_BIBLES[0]) await setSetting(audioBibleSetting, AUDIO_BIBLES[0].id);
  return true;
}

/** The first chapter of the plan not done, or undefined with no plan or when every chapter is done. */
export async function nextChapter(): Promise<PlanChapter | undefined> {
  const state = await read();
  if (!state) return undefined;
  const done = new Set(state.done);
  return planOf(state.planId)?.chapters().find((c) => !done.has(keyOf(c)));
}

/** Marks this chapter and every chapter before it in the plan done (never un-marks). Nothing happens without a plan or for a chapter it does not hold. */
export function markDoneThrough(chapter: PlanChapter): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    const chapters = state && planOf(state.planId)?.chapters();
    const at = chapters?.findIndex((c) => c.code === chapter.code && c.chapter === chapter.chapter) ?? -1;
    if (!state || !chapters || at < 0) return;
    const done = new Set([...state.done, ...chapters.slice(0, at + 1).map(keyOf)]);
    await write({ ...state, done: chapters.map(keyOf).filter((k) => done.has(k)) });
  });
}

/** How many chapters are done and how many the plan has; both 0 with no plan. */
export async function progress(): Promise<{ done: number; total: number }> {
  const state = await read();
  const chapters = state && planOf(state.planId)?.chapters();
  if (!state || !chapters) return { done: 0, total: 0 };
  const done = new Set(state.done);
  return { done: chapters.filter((c) => done.has(keyOf(c))).length, total: chapters.length };
}

/** The listening session left open, or undefined. */
export async function openSession(): Promise<ListeningSession | undefined> {
  return (await read())?.session;
}

/** Opens a listening session at this chapter; there is only ever one, so it replaces an open one. Kept only inside a plan. */
export function beginSession(session: ListeningSession): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    if (state) await write({ ...state, session: { code: session.code, chapter: session.chapter, startedAt: session.startedAt } });
  });
}

/** Closes the open session at `endedAt` and returns it, or undefined when none was open. */
export function endSession(endedAt: number): Promise<EndedSession | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    if (!state?.session) return undefined;
    const { session, ...rest } = state;
    await write(rest);
    return { ...session, endedAt };
  });
}
