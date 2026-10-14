// src/data/repositories/grammarLevels.ts — where each grammar idea (src/data/grammar/ladder.ts) stands for him: solid, at the
// frontier, or not yet, one row per idea. The placement, the idea sheet, the drills and the tutor write it; the Goal screen, the
// Weave and the picker read it. An idea he is drilling is an item of kind 'grammar' on the back-off schedule (reviews.ts), and its
// level follows its step; the row exists as well so a level can be set by hand.
// The ideas of the letters, sounds and marks tiers are learned in a pronunciation (mw-5r3p30.231): their level rows and schedule rows are stored under
// '<scheme>:<id>' (src/data/grammar/soundScope.ts) and every function here reads and writes the SELECTED scheme's; the other schemes' rows are kept as they were.
// The ideas it is given and returns are plain ids.
import { db, type GrammarLevel, type GrammarLevelHow, type GrammarLevelName } from '../db';
import { publish } from '../../events/bus';
import type { DrillResult } from '../grammar/drillIt';
import { planFrom } from '../grammar/drillPlan';
import { groupIsSolid } from '../grammar/inference';
import { IDEA_KIND, ITEM_GROUPS, LADDER, itemsOf } from '../grammar/ladder';
import { ideaOfStored, storedId } from '../grammar/soundScope';
import { DAY, STEP_DAYS } from '../schedule';
import { closeDrillPlan, saveDrillPlan } from './drillPlans';
import { saveDrillRun } from './drillRuns';
import { getGreekPronunciation } from './settings';
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

/** The pronunciation scheme the sound ideas are being learned in now. */
const schemeNow = getGreekPronunciation;

/** The row of an idea in `scheme`, with the idea's plain id; inside the caller's transaction when it has one. */
async function rowOf(id: string, scheme: string): Promise<GrammarLevel | undefined> {
  const row = await db.grammarLevels.get(storedId(id, scheme));
  return row && { ...row, id };
}

/** Writes an idea's row in `scheme` (the row's id is the idea's plain id). */
const putRow = (row: GrammarLevel, scheme: string) => db.grammarLevels.put({ ...row, id: storedId(row.id, scheme) });

export async function getLevel(id: string): Promise<GrammarLevel | undefined> {
  return rowOf(id, await schemeNow());
}

/** Every idea that has a level, by id: the grammar ideas' and the sound ideas' in the selected scheme (a sound idea he proved in another scheme is not here). */
export async function listLevels(): Promise<Map<string, GrammarLevel>> {
  const scheme = await schemeNow();
  const rows = await db.grammarLevels.toArray();
  return new Map(rows.flatMap((row): [string, GrammarLevel][] => {
    const id = ideaOfStored(row.id, scheme);
    return id === undefined ? [] : [[id, { ...row, id }]];
  }));
}

/** A group idea whose level moved because its items did. */
export interface GroupMoved {
  id: string;
  level: GrammarLevelName;
}

/**
 * Keeps each group idea in step with its items (mw-hqd5bz.17, .18, PROVISIONAL): 'alphabet' is solid, how 'inferred', once all 24 letters are, however
 * each got there, and an alphabet that was solid only by that falls back to the frontier when a letter is not; 'diphthongs', 'consonant-pairs' and
 * 'breathings' become solid, how 'inferred', when every one of their items is (they never fall back: they may be solid by his own say). Runs inside the
 * caller's transaction (which must include db.grammarLevels and db.reviews); the caller publishes what this returns and announces the schedule.
 */
export async function syncAlphabet(now: number, scheme: string): Promise<GroupMoved[]> {
  const moved: GroupMoved[] = [];
  for (const group of ITEM_GROUPS) {
    const items = itemsOf(group).map((i) => i.id);
    const rows = await db.grammarLevels.bulkGet(items.map((id) => storedId(id, scheme)));
    const solid = groupIsSolid(new Map(rows.flatMap((row, i) => (row ? [[items[i], row.level] as const] : []))), group);
    const parent = await db.grammarLevels.get(storedId(group, scheme));
    if (solid && parent?.level !== 'solid') {
      await putRow({ id: group, level: 'solid', since: now, how: 'inferred' }, scheme);
      await writeScheduled(IDEA_KIND, [storedId(group, scheme)], now, () => knownStart(now));
      moved.push({ id: group, level: 'solid' });
    } else if (!solid && group === 'alphabet' && parent?.how === 'inferred' && parent.level === 'solid') {
      await putRow({ id: group, level: 'frontier', since: now, how: 'inferred' }, scheme);
      moved.push({ id: group, level: 'frontier' });
    }
  }
  return moved;
}

/** Tells the bus the group ideas moved, when syncAlphabet says they did. */
export async function announceAlphabet(moved: readonly GroupMoved[], now: number): Promise<void> {
  if (moved.length === 0) return;
  for (const { id, level } of moved) publish({ kind: 'grammar-level-changed', id, level });
  await announceDue(now);
}

/** Sets an idea's level by hand and tells the bus. */
export async function setLevel(id: string, level: GrammarLevelName, how: GrammarLevelHow, now = Date.now()): Promise<void> {
  const scheme = await schemeNow();
  const alphabet = await db.transaction('rw', db.grammarLevels, db.reviews, async () => {
    await putRow({ id, level, since: now, how }, scheme);
    return syncAlphabet(now, scheme);
  });
  publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(alphabet, now);
}

/**
 * Records one answer to an idea on the schedule, and moves its level from the new step in the same transaction: a right that
 * reaches SOLID_STEP makes a frontier or not-yet idea solid; a wrong that drops it below makes a solid idea frontier; an idea
 * with no level yet, or not yet, becomes frontier. A right never lowers a level he set to solid by hand, and a level that does
 * not change is left as it was (its `since` and `how` too). Returns the level after the answer.
 */
export async function recordGrammarAnswer(id: string, right: boolean, now = Date.now()): Promise<GrammarLevelName> {
  const scheme = await schemeNow();
  const { level, changed, alphabet } = await db.transaction('rw', db.reviews, db.grammarLevels, async () => {
    const review = await writeReview(IDEA_KIND, storedId(id, scheme), right, now);
    const before = (await rowOf(id, scheme))?.level;
    const after = right && before === 'solid' ? 'solid' : levelFromStep(review.step);
    if (after === before) return { level: after, changed: false, alphabet: [] as GroupMoved[] };
    await putRow({ id, level: after, since: now, how: 'review' }, scheme);
    return { level: after, changed: true, alphabet: await syncAlphabet(now, scheme) };
  });
  if (changed) publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(alphabet, now);
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
  const key = storedId(id, await schemeNow());
  const added = await db.transaction('rw', db.reviews, () => writeScheduled(IDEA_KIND, [key], now, start));
  if (added > 0) await announceDue(now);
  return added;
}

/** What he told the idea sheet: Learning (the idea is on the frontier), I know it (it is solid) or Not yet. */
export type IdeaOutcome = 'got-it' | 'known' | 'not-yet';

/**
 * The idea sheet's level slider and its Mark known without a drill (mw-hqd5bz.7, mw-i7xe0n.3), in one transaction. Got it (Learning) makes the idea
 * frontier and puts it on the schedule at step 0, due tomorrow (the first gap); known makes it solid and puts it at the 30-day step, due in 30 days;
 * not-yet makes it not yet and takes it off the schedule (a not-yet idea is not drilled). `how` says what set it: 'sheet' for his own say, 'drill'
 * for a run of Drill it. The row is put in place even when the idea is on the schedule already (he has just said where it stands), keeping its
 * lapses and rights. Publishes grammar-level-changed and idea-taught.
 */
export async function teachIdea(id: string, outcome: IdeaOutcome, now = Date.now(), how: GrammarLevelHow = 'sheet'): Promise<void> {
  const level: GrammarLevelName = outcome === 'known' ? 'solid' : outcome === 'got-it' ? 'frontier' : 'notYet';
  const scheme = await schemeNow();
  const key = storedId(id, scheme);
  const alphabet = await db.transaction('rw', db.reviews, db.grammarLevels, async () => {
    if (outcome === 'not-yet') {
      await db.reviews.where('[kind+id]').equals([IDEA_KIND, key]).delete();
    } else {
      const start = outcome === 'known' ? knownStart(now) : { step: 0, due: now + STEP_DAYS[0] * DAY };
      const there = await db.reviews.get([IDEA_KIND, key]);
      await db.reviews.put({ kind: IDEA_KIND, id: key, ...start, lastWhen: now, lapses: there?.lapses ?? 0, rights: there?.rights ?? 0 });
    }
    await putRow({ id, level, since: now, how }, scheme);
    return syncAlphabet(now, scheme);
  });
  publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(alphabet, now);
  publish({ kind: 'idea-taught', id, outcome });
  await announceDue(now);
}

/** Why Drill it was run: 'prove' (he slid to I know it: a pass makes the idea solid, a failure puts it on the frontier) or 'practice' (the Drill it button: a pass makes it solid, a failure changes nothing). */
export type DrillMode = 'prove' | 'practice';

/**
 * What a finished run of Drill it does (mw-i7xe0n.3): the run is kept; a proof makes the idea solid, how 'drill' (the 30-day step); a run in 'prove' mode that
 * did not prove it puts the idea on the frontier, how 'drill', unless it is there already (its schedule is left alone); a run in 'practice' mode that did not
 * prove it changes no level. Returns the idea's level after.
 */
export async function recordDrill(result: DrillResult, mode: DrillMode, now = Date.now()): Promise<GrammarLevelName> {
  await saveDrillRun(result, now);
  const before = (await getLevel(result.ideaId))?.level;
  const level = await moveLevel(result, mode, before, now);
  // a proof closes the plan the idea had; a run that did not prove it makes its weak facets a plan (src/data/grammar/drillPlan.ts)
  const plan = planFrom(result, now);
  if (result.proved) await closeDrillPlan(result.ideaId, now);
  else if (plan) await saveDrillPlan(plan, now);
  return level;
}

/** The level change of recordDrill, apart from the plan. */
async function moveLevel(result: DrillResult, mode: DrillMode, before: GrammarLevelName | undefined, now: number): Promise<GrammarLevelName> {
  if (result.proved) {
    await teachIdea(result.ideaId, 'known', now, 'drill');
    return 'solid';
  }
  if (mode === 'prove' && before !== 'frontier') {
    await teachIdea(result.ideaId, 'got-it', now, 'drill');
    return 'frontier';
  }
  return before ?? 'notYet';
}

/**
 * Once (meta 'grammarLevelsSeeded'): every term he marked I know this makes every idea that covers it solid, how 'marked', and
 * puts it on the schedule at the 30-day step. An idea that already has a level keeps it. Returns whether it ran.
 */
export async function seedLevelsIfFirstOpen(now = Date.now()): Promise<boolean> {
  const scheme = await schemeNow();
  const solid = await db.transaction('rw', db.meta, db.grammarKnown, db.grammarLevels, db.reviews, async () => {
    if (await db.meta.get(SEEDED_KEY)) return undefined;
    const known = new Set((await db.grammarKnown.toArray()).map((row) => row.term));
    const ids = LADDER.filter((idea) => idea.terms.some((term) => known.has(term))).map((idea) => idea.id);
    const set = await db.grammarLevels.bulkGet(ids.map((id) => storedId(id, scheme)));
    const fresh = ids.filter((_, i) => set[i] === undefined);
    await db.grammarLevels.bulkPut(fresh.map((id): GrammarLevel => ({ id: storedId(id, scheme), level: 'solid', since: now, how: 'marked' })));
    await writeScheduled(IDEA_KIND, fresh.map((id) => storedId(id, scheme)), now, () => knownStart(now));
    await db.meta.put({ key: SEEDED_KEY, value: String(now) });
    return fresh;
  });
  if (solid === undefined) return false;
  for (const id of solid) publish({ kind: 'grammar-level-changed', id, level: 'solid' });
  if (solid.length > 0) await announceDue(now);
  return true;
}
