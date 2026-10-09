// src/data/repositories/grammarLevels.ts — where each grammar idea (src/data/grammar/ladder.ts) stands for him: solid, at the
// frontier, or not yet, one row per idea. The placement, the idea sheet, the drills and the tutor write it; the Goal screen, the
// Weave and the picker read it. An idea he is drilling is an item of kind 'grammar' on the back-off schedule (reviews.ts), and its
// level follows its step; the row exists as well so a level can be set by hand.
import { db, type GrammarLevel, type GrammarLevelHow, type GrammarLevelName } from '../db';
import { publish } from '../../events/bus';
import { IDEA_KIND, LADDER } from '../grammar/ladder';
import { DAY, STEP_DAYS } from '../schedule';
import { announceDue, writeReview, writeScheduled } from './reviews';

export type { GrammarLevel, GrammarLevelHow, GrammarLevelName };

/** The first step at which an idea counts as solid (step 3: the 14-day gap, as FLASHCARD_STEP). PROVISIONAL, the Governor to confirm. */
export const SOLID_STEP = 3;

const SEEDED_KEY = 'grammarLevelsSeeded';
/** The step whose gap is 30 days: where an idea he already knows starts. */
const KNOWN_START_STEP = STEP_DAYS.indexOf(30);
/** Where an idea he already knows first comes up: the 30-day step, 30 days from now. */
const knownStart = (now: number) => ({ step: KNOWN_START_STEP, due: now + 30 * DAY });

/** The level an idea at `step` has: solid from SOLID_STEP up, frontier below it. */
export function levelFromStep(step: number): GrammarLevelName {
  return step >= SOLID_STEP ? 'solid' : 'frontier';
}

export async function getLevel(id: string): Promise<GrammarLevel | undefined> {
  return db.grammarLevels.get(id);
}

/** Every idea that has a level, by id. */
export async function listLevels(): Promise<Map<string, GrammarLevel>> {
  return new Map((await db.grammarLevels.toArray()).map((row) => [row.id, row]));
}

/** Sets an idea's level by hand and tells the bus. */
export async function setLevel(id: string, level: GrammarLevelName, how: GrammarLevelHow, now = Date.now()): Promise<void> {
  await db.grammarLevels.put({ id, level, since: now, how });
  publish({ kind: 'grammar-level-changed', id, level });
}

/**
 * Records one answer to an idea on the schedule, and moves its level from the new step in the same transaction: a right that
 * reaches SOLID_STEP makes a frontier or not-yet idea solid; a wrong that drops it below makes a solid idea frontier; an idea
 * with no level yet, or not yet, becomes frontier. A right never lowers a level he set to solid by hand, and a level that does
 * not change is left as it was (its `since` and `how` too). Returns the level after the answer.
 */
export async function recordGrammarAnswer(id: string, right: boolean, now = Date.now()): Promise<GrammarLevelName> {
  const { level, changed } = await db.transaction('rw', db.reviews, db.grammarLevels, async () => {
    const review = await writeReview(IDEA_KIND, id, right, now);
    const before = (await db.grammarLevels.get(id))?.level;
    const after = right && before === 'solid' ? 'solid' : levelFromStep(review.step);
    if (after === before) return { level: after, changed: false };
    await db.grammarLevels.put({ id, level: after, since: now, how: 'review' });
    return { level: after, changed: true };
  });
  if (changed) publish({ kind: 'grammar-level-changed', id, level });
  await announceDue(now);
  return level;
}

/**
 * Puts an idea on the schedule if it is not there: at step 0, due now, for a frontier idea; at the 30-day step, due in 30 days,
 * for a solid one (the 'I know this' jump). A not-yet idea is not drilled, so it is not scheduled. An idea already on the
 * schedule keeps its row. Returns how many rows it added.
 */
export async function scheduleIdea(id: string, level: GrammarLevelName, now = Date.now()): Promise<number> {
  if (level === 'notYet') return 0;
  const start = level === 'solid' ? () => knownStart(now) : undefined;
  const added = await db.transaction('rw', db.reviews, () => writeScheduled(IDEA_KIND, [id], now, start));
  if (added > 0) await announceDue(now);
  return added;
}

/** What he told the idea sheet: Got it (the idea is on the frontier) or I know this (it is solid). */
export type IdeaOutcome = 'got-it' | 'known';

/**
 * The idea sheet's two buttons (mw-hqd5bz.7), in one transaction. Got it makes the idea frontier, how 'sheet', and puts it on the
 * schedule at step 0, due tomorrow (the first gap); I know this makes it solid and puts it at the 30-day step, due in 30 days.
 * The row is put in place even when the idea is on the schedule already (he has just said where it stands), keeping its
 * lapses and rights. Publishes grammar-level-changed and idea-taught.
 */
export async function teachIdea(id: string, outcome: IdeaOutcome, now = Date.now()): Promise<void> {
  const level: GrammarLevelName = outcome === 'known' ? 'solid' : 'frontier';
  const start = outcome === 'known' ? knownStart(now) : { step: 0, due: now + STEP_DAYS[0] * DAY };
  await db.transaction('rw', db.reviews, db.grammarLevels, async () => {
    const there = await db.reviews.get([IDEA_KIND, id]);
    await db.reviews.put({ kind: IDEA_KIND, id, ...start, lastWhen: now, lapses: there?.lapses ?? 0, rights: there?.rights ?? 0 });
    await db.grammarLevels.put({ id, level, since: now, how: 'sheet' });
  });
  publish({ kind: 'grammar-level-changed', id, level });
  publish({ kind: 'idea-taught', id, outcome });
  await announceDue(now);
}

/**
 * Once (meta 'grammarLevelsSeeded'): every term he marked I know this makes every idea that covers it solid, how 'marked', and
 * puts it on the schedule at the 30-day step. An idea that already has a level keeps it. Returns whether it ran.
 */
export async function seedLevelsIfFirstOpen(now = Date.now()): Promise<boolean> {
  const solid = await db.transaction('rw', db.meta, db.grammarKnown, db.grammarLevels, db.reviews, async () => {
    if (await db.meta.get(SEEDED_KEY)) return undefined;
    const known = new Set((await db.grammarKnown.toArray()).map((row) => row.term));
    const ids = LADDER.filter((idea) => idea.terms.some((term) => known.has(term))).map((idea) => idea.id);
    const set = await db.grammarLevels.bulkGet(ids);
    const fresh = ids.filter((_, i) => set[i] === undefined);
    await db.grammarLevels.bulkPut(fresh.map((id): GrammarLevel => ({ id, level: 'solid', since: now, how: 'marked' })));
    await writeScheduled(IDEA_KIND, fresh, now, () => knownStart(now));
    await db.meta.put({ key: SEEDED_KEY, value: String(now) });
    return fresh;
  });
  if (solid === undefined) return false;
  for (const id of solid) publish({ kind: 'grammar-level-changed', id, level: 'solid' });
  if (solid.length > 0) await announceDue(now);
  return true;
}
