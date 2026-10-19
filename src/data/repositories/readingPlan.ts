// src/data/repositories/readingPlan.ts — the reading plan on this phone (mw-umv8sp.1): the plan he chose (src/data/plans/), where he started, the chapters done and the
// one listening session left open with its start time. One JSON object in the settings store under 'readingPlanState', like paradigmsOpened.ts; no Dexie version, and
// outside the settings registry (the switch 'readingPlan' is the registry's, src/settings/definitions/readingPlan.ts). A plan is a straight line of chapters, so what is
// done is kept as the keys 'gen.1' of the chapters marked.
import { AUDIO_BIBLES } from '../../resources/audioBible';
import { audioBibleSetting } from '../../settings/definitions';
import { readingPlanSetting } from '../../settings/definitions/readingPlan';
import { getSetting, setSetting } from '../../settings/store';
import { localDate } from '../daily/dailyStore';
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
  /** the local date ('2026-10-19') each chapter was marked done on, by key (mw-5r3p30.630); only chapters he marked by listening or by a tick, so a chapter with no entry (done before this, or filled in by starting the plan or Set here) is never 'read today'. Absent when none. */
  doneOn?: Record<string, string>;
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
    const { planId, start, done, doneOn, session } = kept as Partial<ReadingPlanState>;
    if (typeof planId !== 'string' || !planOf(planId) || !isChapter(start) || !Array.isArray(done)) return undefined;
    const keys = done.filter((k): k is string => typeof k === 'string');
    return {
      planId,
      start: { code: start.code, chapter: start.chapter },
      done: keys,
      ...datesOf(keys, doneOn),
      ...(isSession(session) ? { session: { code: session.code, chapter: session.chapter, startedAt: session.startedAt } } : {}),
    };
  } catch {
    return undefined;
  }
}

/** The dates kept for the chapters in `keys` (a date for a chapter not done, or not a string, is dropped), in the order of `keys`, as the `doneOn` property, or nothing when none is left. */
function datesOf(keys: readonly string[], doneOn: unknown): { doneOn?: Record<string, string> } {
  if (typeof doneOn !== 'object' || doneOn === null) return {};
  const dates = doneOn as Record<string, unknown>;
  const kept: Record<string, string> = {};
  for (const key of keys) {
    const date = dates[key];
    if (typeof date === 'string') kept[key] = date;
  }
  return Object.keys(kept).length > 0 ? { doneOn: kept } : {};
}

const write = (state: ReadingPlanState): Promise<unknown> => {
  const { doneOn, ...rest } = state;
  return db.settings.put({ key: KEY, value: JSON.stringify({ ...rest, ...datesOf(state.done, doneOn) }) });
};

/** The chapters of the plan that were marked done on this local date, in plan order (none for a plan from before dates were kept). */
export function readOn(state: ReadingPlanState, date: string): PlanChapter[] {
  const on = state.doneOn;
  return on ? (planOf(state.planId)?.chapters() ?? []).filter((c) => on[keyOf(c)] === date) : [];
}

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

/** The Developer row's Reset the listening plan, for the demo: the plan, its done chapters and any open session are forgotten and the Reading plan setting is Off, so Start a listening plan runs again. */
export async function resetReadingPlan(): Promise<void> {
  await db.settings.delete(KEY);
  await setSetting(readingPlanSetting, 'off');
}

/** The first chapter of the plan not done, or undefined with no plan or when every chapter is done. */
export async function nextChapter(): Promise<PlanChapter | undefined> {
  const state = await read();
  if (!state) return undefined;
  const done = new Set(state.done);
  return planOf(state.planId)?.chapters().find((c) => !done.has(keyOf(c)));
}

/** What he heard of a chapter: all of it to its end ('finished'), or he stopped inside it ('stopped-in'), so his next listen starts at its beginning. */
export type Heard = 'stopped-in' | 'finished';

/** Marks the first `count(at)` chapters of the plan done, `at` being the chapter's place in the plan (never un-marks), the ones newly done as read on `date`. Nothing happens without a plan or for a chapter it does not hold. */
function markFirst(chapter: PlanChapter, count: (at: number) => number, date: string): Promise<void> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    const chapters = state && planOf(state.planId)?.chapters();
    const at = chapters?.findIndex((c) => c.code === chapter.code && c.chapter === chapter.chapter) ?? -1;
    if (!state || !chapters || at < 0) return;
    const was = new Set(state.done);
    const now = chapters.slice(0, count(at)).map(keyOf);
    const done = new Set([...state.done, ...now]);
    const doneOn = { ...state.doneOn, ...Object.fromEntries(now.filter((k) => !was.has(k)).map((k) => [k, date])) };
    await write({ ...state, done: chapters.map(keyOf).filter((k) => done.has(k)), doneOn });
  });
}

/** Marks this chapter and every chapter before it in the plan done (never un-marks): he heard it to its end. Nothing happens without a plan or for a chapter it does not hold. */
export const markDoneThrough = (chapter: PlanChapter, date: string = localDate(new Date())): Promise<void> => markFirst(chapter, (at) => at + 1, date);

/** Marks every chapter before this one done and leaves it next: he stopped inside it, and the next listen starts at its beginning (mw-umv8sp.7). */
export const markDoneBefore = (chapter: PlanChapter, date: string = localDate(new Date())): Promise<void> => markFirst(chapter, (at) => at, date);

/** The one rule for what an answer about a chapter does to the plan: 'finished' marks it done through the chapter, 'stopped-in' only the chapters before it, the chapters newly done counting as read on `date` (the local date, today by default). The return sheet, the picker and the screenshot read all answer through it. */
export const markHeard = (chapter: PlanChapter, heard: Heard, date: string = localDate(new Date())): Promise<void> =>
  heard === 'finished' ? markDoneThrough(chapter, date) : markDoneBefore(chapter, date);

/**
 * Today's tick on Next (mw-5r3p30.630): this one chapter is done, read on `date`; nothing else changes (a chapter already done keeps its date). Returns the state it replaced (for
 * restorePlan, Undo), or undefined, changing nothing, without a plan, for a chapter the plan does not hold or one already done.
 */
export function markChapterRead(chapter: PlanChapter, date: string): Promise<ReadingPlanState | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    const chapters = state && planOf(state.planId)?.chapters();
    const found = chapters?.find((c) => c.code === chapter.code && c.chapter === chapter.chapter);
    if (!state || !chapters || !found || state.done.includes(keyOf(found))) return undefined;
    const done = new Set([...state.done, keyOf(found)]);
    await write({ ...state, done: chapters.map(keyOf).filter((k) => done.has(k)), doneOn: { ...state.doneOn, [keyOf(found)]: date } });
    return state;
  });
}

/** Un-marks these chapters (his untick in Read today): they are not done, and the earliest of them is next again. Returns the state it replaced (for restorePlan, Undo), or undefined, changing nothing, without a plan or when none was done. */
export function unmarkChaptersRead(chapters: readonly PlanChapter[]): Promise<ReadingPlanState | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    const gone = new Set(chapters.map(keyOf));
    if (!state || !state.done.some((k) => gone.has(k))) return undefined;
    await write({ ...state, done: state.done.filter((k) => !gone.has(k)) });
    return state;
  });
}

/**
 * Moves his place (mw-5r3p30.623): the chapter at `at` of the plan becomes the next one (at `chapters.length`, the plan is finished). Everything before it is done and what was
 * done stays done, except the chapter itself, so a place behind what he has done is next again while the chapters done beyond it are not forgotten. The open session is kept.
 * Returns the state it replaced (for restorePlan, Undo), or undefined, changing nothing, without a plan or for a chapter the plan does not hold.
 */
function moveTo(chapter: PlanChapter, after: boolean): Promise<ReadingPlanState | undefined> {
  return db.transaction('rw', db.settings, async () => {
    const state = await read();
    const chapters = state && planOf(state.planId)?.chapters();
    const found = chapters?.findIndex((c) => c.code === chapter.code && c.chapter === chapter.chapter) ?? -1;
    if (!state || !chapters || found < 0) return undefined;
    const at = after ? found + 1 : found;
    const done = new Set([...state.done, ...chapters.slice(0, at).map(keyOf)]);
    if (at < chapters.length) done.delete(keyOf(chapters[at]!));
    await write({ ...state, done: chapters.map(keyOf).filter((k) => done.has(k)) });
    return state;
  });
}

/** He is about to read this chapter: it is the plan's next, the chapters before it are done. Returns the state it replaced, to hand restorePlan. */
export const setPlace = (chapter: PlanChapter): Promise<ReadingPlanState | undefined> => moveTo(chapter, false);

/** "I'm at 1 John 2": he is in this chapter now, so it counts as done and the next is the chapter after it (the plan is finished after its last). Returns the state it replaced. */
export const setPlaceAfter = (chapter: PlanChapter): Promise<ReadingPlanState | undefined> => moveTo(chapter, true);

/** Undo: puts back the state setPlace or setPlaceAfter returned, the place, the done list and the open session exactly as they were. */
export const restorePlan = (previous: ReadingPlanState): Promise<unknown> => write(previous);

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
