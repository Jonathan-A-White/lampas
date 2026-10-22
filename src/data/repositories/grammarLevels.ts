// src/data/repositories/grammarLevels.ts — where each grammar idea (src/data/grammar/ladder.ts) stands for him: solid, at the
// frontier, or not yet, one row per idea. The placement, the idea sheet, the drills and the tutor write it; the Goal screen, the
// Weave and the picker read it. An idea he is drilling is an item of kind 'grammar' on the back-off schedule (reviews.ts), and its
// level follows its step; the row exists as well so a level can be set by hand.
// The ideas of the letters, sounds and marks tiers are learned in a pronunciation (mw-5r3p30.231): their level rows and schedule rows are stored under
// '<scheme>:<id>' (src/data/grammar/soundScope.ts) and every function here reads and writes the SELECTED scheme's; the other schemes' rows are kept as they were.
// The ideas it is given and returns are plain ids.
import { frontierOf, levelFromStep } from 'learn-kit/graph';
import { db, type GrammarLevel, type GrammarLevelHow, type GrammarLevelName } from '../db';
import { publish } from '../../events/bus';
import type { DrillResult } from '../grammar/drillIt';
import { planFrom } from '../grammar/drillPlan';
import { groupIsSolid, isSolid } from '../grammar/inference';
import { IDEA_KIND, ITEM_GROUPS, LADDER, LADDER_PATH, itemsOf } from '../grammar/ladder';
import { ideaOfStored, isItemId, storedId } from '../grammar/soundScope';
import { knownSchedule, startSchedule } from '../schedule';
import { closeDrillPlan, saveDrillPlan } from './drillPlans';
import { saveDrillRun } from './drillRuns';
import { getGreekPronunciation } from './settings';
import { announceDue, writeReview, writeScheduled } from './reviews';

export type { GrammarLevel, GrammarLevelHow, GrammarLevelName };

/** The first step at which an idea counts as solid (step 3: the 14-day gap, as FLASHCARD_STEP), and the level an idea at a step has: learn-kit's, `learn-kit/graph`. PROVISIONAL, the Governor to confirm. */
export { SOLID_STEP, levelFromStep } from 'learn-kit/graph';

const SEEDED_KEY = 'grammarLevelsSeeded';
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

// ---- One idea at the frontier at a time (mw-i7xe0n.6, PROVISIONAL, the Governor to confirm) ----
// An idea at the frontier is the one he is learning now. Every path that writes a level keeps to that: the idea sheet asks him to choose (teachIdea), a review answer
// and the tutor never make a second one (recordGrammarAnswer, setLevel), the placement and what his right answers show leave the lowest unproved idea on the ladder
// (lowestFrontier), and proving the frontier moves it to the next idea (advanceFrontier). The letters, pairs and breathings are items of a group, not ideas he
// learns one at a time, so they are never counted and may be frontier together.

const RUNG = new Map(LADDER.map((idea) => [idea.id, idea.rung]));
/** Lower on the ladder first; an id the ladder does not have comes last, by name. */
const byLadder = (a: string, b: string): number => (RUNG.get(a) ?? Infinity) - (RUNG.get(b) ?? Infinity) || a.localeCompare(b);

/** The ideas he is learning now (at the frontier) in `scheme`, lowest first, the items of a group left out. Reads the table: inside the caller's transaction when it has one. */
export async function learningIdeas(scheme: string): Promise<string[]> {
  const rows = await db.grammarLevels.where('level').equals('frontier').toArray();
  return rows.flatMap((row) => {
    const id = ideaOfStored(row.id, scheme);
    return id === undefined || isItemId(id) ? [] : [id];
  }).sort(byLadder);
}

/** The idea he is learning now other than `id`, the one a second frontier would have to replace; none for an item of a group. */
export async function otherFrontier(id: string): Promise<string | undefined> {
  if (isItemId(id)) return undefined;
  return (await learningIdeas(await schemeNow())).find((other) => other !== id);
}

/** Starts an idea's schedule at the first gap (step 0, due after it) unless it has a row already, which keeps its steps, lapses and rights. */
async function startLearning(id: string, now: number, scheme: string): Promise<void> {
  const key = storedId(id, scheme);
  if (await db.reviews.get([IDEA_KIND, key])) return;
  await db.reviews.put({ kind: IDEA_KIND, id: key, ...startSchedule(now) });
}

/**
 * The lowest unproved idea on the ladder is the frontier (the placement, and what his right answers show): of the ideas that `wanting` the frontier and the ones there
 * now, the lowest is the frontier, put on the schedule if it is not, and the others are put back to not yet, their schedule rows and drill runs kept. Runs inside the
 * caller's transaction (rw over db.grammarLevels and db.reviews); returns the levels it changed for the caller to announce.
 */
export async function lowestFrontier(wanting: readonly string[], how: GrammarLevelHow, now: number, scheme: string): Promise<GroupMoved[]> {
  const there = await learningIdeas(scheme);
  const [winner, ...rest] = [...new Set([...there, ...wanting])].sort(byLadder);
  if (winner === undefined) return [];
  const moved: GroupMoved[] = [];
  if (!there.includes(winner)) {
    await putRow({ id: winner, level: 'frontier', since: now, how }, scheme);
    await startLearning(winner, now, scheme);
    moved.push({ id: winner, level: 'frontier' });
  }
  for (const id of rest) {
    if ((await rowOf(id, scheme))?.level === 'notYet') continue;
    await putRow({ id, level: 'notYet', since: now, how }, scheme);
    moved.push({ id, level: 'notYet' });
  }
  return moved;
}

/**
 * Proving the frontier moves it on (mw-i7xe0n.6): when `before` (the ideas at the frontier when the write began) held an idea that is solid now and no idea is at the
 * frontier, the lowest idea on the ladder that is not yet and whose prerequisites are all solid becomes the frontier, how 'next', on the schedule. An idea with no row
 * is not yet. Inside the caller's transaction (rw over db.grammarLevels and db.reviews); returns what it changed.
 */
export async function advanceFrontier(before: readonly string[], now: number, scheme: string): Promise<GroupMoved[]> {
  if (before.length === 0 || (await learningIdeas(scheme)).length > 0) return [];
  const levels = new Map((await db.grammarLevels.toArray()).flatMap((row): [string, GrammarLevelName][] => {
    const id = ideaOfStored(row.id, scheme);
    return id === undefined ? [] : [[id, row.level]];
  }));
  if (!before.some((id) => levels.get(id) === 'solid')) return [];
  // the ideas he has solid as he is held to them (isSolid: a letter of a group he made solid is), and of the ideas ready to learn the lowest not yet
  const solid = new Set(LADDER.filter((idea) => isSolid(levels, idea.id)).map((idea) => idea.id));
  const next = frontierOf(LADDER_PATH, solid).find((idea) => !isItemId(idea.id) && (levels.get(idea.id) ?? 'notYet') === 'notYet');
  if (!next) return [];
  await putRow({ id: next.id, level: 'frontier', since: now, how: 'next' }, scheme);
  await startLearning(next.id, now, scheme);
  return [{ id: next.id, level: 'frontier' }];
}

/**
 * Keeps each group idea in step with its items (mw-hqd5bz.17, .18, PROVISIONAL): 'alphabet' is solid, how 'inferred', once all 24 letters are, however
 * each got there, and an alphabet that was solid only by that falls back to the frontier (or, with a lower idea at the frontier, to not yet) when a letter is not; 'diphthongs', 'consonant-pairs' and
 * 'breathings' become solid, how 'inferred', when every one of their items is (they never fall back: they may be solid by his own say). Runs inside the
 * caller's transaction (which must include db.grammarLevels and db.reviews); the caller publishes what this returns and announces the schedule.
 */
export async function syncAlphabet(now: number, scheme: string): Promise<GroupMoved[]> {
  const moved: GroupMoved[] = [];
  const fellBack: string[] = [];
  for (const group of ITEM_GROUPS) {
    const items = itemsOf(group).map((i) => i.id);
    const rows = await db.grammarLevels.bulkGet(items.map((id) => storedId(id, scheme)));
    const solid = groupIsSolid(new Map(rows.flatMap((row, i) => (row ? [[items[i], row.level] as const] : []))), group);
    const parent = await db.grammarLevels.get(storedId(group, scheme));
    if (solid && parent?.level !== 'solid') {
      await putRow({ id: group, level: 'solid', since: now, how: 'inferred' }, scheme);
      await writeScheduled(IDEA_KIND, [storedId(group, scheme)], now, () => knownSchedule(now));
      moved.push({ id: group, level: 'solid' });
    } else if (!solid && group === 'alphabet' && parent?.how === 'inferred' && parent.level === 'solid') {
      fellBack.push(group);
    }
  }
  // the alphabet falls back to the frontier only as the lowest unproved idea: he is learning one idea at a time
  if (fellBack.length > 0) moved.push(...(await lowestFrontier(fellBack, 'inferred', now, scheme)));
  return moved;
}

/** Tells the bus the group ideas moved, when syncAlphabet says they did. */
export async function announceAlphabet(moved: readonly GroupMoved[], now: number): Promise<void> {
  if (moved.length === 0) return;
  for (const { id, level } of moved) publish({ kind: 'grammar-level-changed', id, level });
  await announceDue(now);
}

/**
 * Sets an idea's level and tells the bus. One idea at the frontier at a time (mw-i7xe0n.6): the placement leaves the lowest unproved idea the frontier and the ideas above it
 * not yet (its solid ones stay solid), and a level written by anything else that would make a second idea the frontier is refused, nothing written. Returns whether it wrote.
 * The bus hears of every level the rule changed besides the one written.
 */
export async function setLevel(id: string, level: GrammarLevelName, how: GrammarLevelHow, now = Date.now()): Promise<boolean> {
  const scheme = await schemeNow();
  const moved = await db.transaction('rw', db.grammarLevels, db.reviews, async () => {
    const before = await learningIdeas(scheme);
    const idea = !isItemId(id);
    if (idea && level === 'frontier' && how !== 'placement' && how !== 'inferred' && before.some((other) => other !== id)) return undefined;
    await putRow({ id, level, since: now, how }, scheme);
    const changed: GroupMoved[] = [];
    if (idea && (how === 'placement' || how === 'inferred') && level !== 'solid') changed.push(...(await lowestFrontier([id], how, now, scheme)));
    changed.push(...(await syncAlphabet(now, scheme)));
    // the placement settles the whole frontier once it is over; a proof anywhere else moves it on
    if (how !== 'placement') changed.push(...(await advanceFrontier(before, now, scheme)));
    return changed;
  });
  if (moved === undefined) return false;
  publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(moved, now);
  return true;
}

/**
 * Records one answer to an idea on the schedule, and moves its level from the new step in the same transaction: a right that
 * reaches SOLID_STEP makes a frontier or not-yet idea solid; a wrong that drops it below makes a solid idea frontier; an idea
 * with no level yet, or not yet, becomes frontier, unless another idea is the frontier (one idea at a time, mw-i7xe0n.6: the answer is kept, the level is not
 * changed). A right never lowers a level he set to solid by hand, and a level that does not change is left as it was (its `since` and `how` too). Proving the
 * frontier moves it on to the next idea. Returns the level after the answer.
 */
export async function recordGrammarAnswer(id: string, right: boolean, now = Date.now()): Promise<GrammarLevelName> {
  const scheme = await schemeNow();
  const { level, changed, moved } = await db.transaction('rw', db.reviews, db.grammarLevels, async () => {
    const learning = await learningIdeas(scheme);
    const review = await writeReview(IDEA_KIND, storedId(id, scheme), right, now);
    const before = (await rowOf(id, scheme))?.level;
    const after = right && before === 'solid' ? 'solid' : levelFromStep(review.step);
    // Review never makes a second idea the frontier: the answer is on the schedule, the level stays where it was
    if (after === 'frontier' && before !== 'frontier' && !isItemId(id) && learning.some((other) => other !== id)) return { level: before ?? 'notYet', changed: false, moved: [] as GroupMoved[] };
    if (after === before) return { level: after, changed: false, moved: [] as GroupMoved[] };
    await putRow({ id, level: after, since: now, how: 'review' }, scheme);
    const alphabet = await syncAlphabet(now, scheme);
    return { level: after, changed: true, moved: [...alphabet, ...(await advanceFrontier(learning, now, scheme))] };
  });
  if (changed) publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(moved, now);
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
  const start = level === 'solid' ? () => knownSchedule(now) : undefined;
  const key = storedId(id, await schemeNow());
  const added = await db.transaction('rw', db.reviews, () => writeScheduled(IDEA_KIND, [key], now, start));
  if (added > 0) await announceDue(now);
  return added;
}

/** What he told the idea sheet: Learning (the idea is on the frontier), I know it (it is solid) or Not yet. */
export type IdeaOutcome = 'got-it' | 'known' | 'not-yet';

/** What he chose when making the idea Learning would put a second idea at the frontier: put the other back to not yet, or keep it. */
export type FrontierChoice = 'switch' | 'keep';

/** What teachIdea did: 'taught'; 'busy' (he is learning `other` and has not chosen: nothing was written); 'kept' (he chose to keep `other`: nothing was written). */
export type TeachResult = { status: 'taught' } | { status: 'busy'; other: string } | { status: 'kept'; other: string };

/**
 * The idea sheet's level slider and its Mark known without a drill (mw-hqd5bz.7, mw-i7xe0n.3), in one transaction. Got it (Learning) makes the idea
 * frontier and puts it on the schedule at step 0, due tomorrow (the first gap); known makes it solid and puts it at the 30-day step, due in 30 days;
 * not-yet makes it not yet and takes it off the schedule (a not-yet idea is not drilled). `how` says what set it: 'sheet' for his own say, 'drill'
 * for a run of Drill it. The row is put in place even when the idea is on the schedule already (he has just said where it stands), keeping its
 * lapses and rights. Publishes grammar-level-changed and idea-taught.
 * One idea at the frontier at a time (mw-i7xe0n.6): when another idea is the frontier, Got it writes nothing and says 'busy' until `choice` is given; 'switch' puts the
 * other back to not yet (its rows and runs kept, so it comes back quickly) and teaches this one, 'keep' leaves everything as it was ('kept'). Proving the frontier
 * (known) moves it on to the next idea.
 */
export async function teachIdea(id: string, outcome: IdeaOutcome, now = Date.now(), how: GrammarLevelHow = 'sheet', choice?: FrontierChoice): Promise<TeachResult> {
  const level: GrammarLevelName = outcome === 'known' ? 'solid' : outcome === 'got-it' ? 'frontier' : 'notYet';
  const scheme = await schemeNow();
  const key = storedId(id, scheme);
  const done = await db.transaction('rw', db.reviews, db.grammarLevels, async () => {
    const learning = await learningIdeas(scheme);
    const other = outcome === 'got-it' && !isItemId(id) ? learning.find((idea) => idea !== id) : undefined;
    if (other !== undefined && choice !== 'switch') return { status: choice === 'keep' ? ('kept' as const) : ('busy' as const), other };
    const moved: GroupMoved[] = [];
    if (other !== undefined) {
      await putRow({ id: other, level: 'notYet', since: now, how }, scheme);
      moved.push({ id: other, level: 'notYet' });
    }
    if (outcome === 'not-yet') {
      await db.reviews.where('[kind+id]').equals([IDEA_KIND, key]).delete();
    } else {
      const there = await db.reviews.get([IDEA_KIND, key]);
      const schedule = outcome === 'known' ? knownSchedule(now, there) : { ...startSchedule(now), lapses: there?.lapses ?? 0, rights: there?.rights ?? 0 };
      await db.reviews.put({ kind: IDEA_KIND, id: key, ...schedule });
    }
    await putRow({ id, level, since: now, how }, scheme);
    moved.push(...(await syncAlphabet(now, scheme)), ...(await advanceFrontier(learning, now, scheme)));
    return { status: 'taught' as const, moved };
  });
  if (done.status !== 'taught') return done;
  publish({ kind: 'grammar-level-changed', id, level });
  await announceAlphabet(done.moved, now);
  publish({ kind: 'idea-taught', id, outcome });
  await announceDue(now);
  return { status: 'taught' };
}

/** Why Drill it was run: 'prove' (he slid to I know it: a pass makes the idea solid, a failure puts it on the frontier) or 'practice' (the Drill it button: a pass makes it solid, a failure changes nothing). */
export type DrillMode = 'prove' | 'practice';

/**
 * What a finished run of Drill it does (mw-i7xe0n.3): the run is kept; a proof makes the idea solid, how 'drill' (the 30-day step); a run in 'prove' mode that
 * did not prove it puts the idea on the frontier, how 'drill', unless it is there already (its schedule is left alone) or another idea is the frontier (one at a time, mw-i7xe0n.6); a run in 'practice' mode that did not
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
    // another idea at the frontier keeps it: he is learning one at a time
    const taught = await teachIdea(result.ideaId, 'got-it', now, 'drill', 'keep');
    return taught.status === 'taught' ? 'frontier' : (before ?? 'notYet');
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
    await writeScheduled(IDEA_KIND, fresh.map((id) => storedId(id, scheme)), now, () => knownSchedule(now));
    await db.meta.put({ key: SEEDED_KEY, value: String(now) });
    return fresh;
  });
  if (solid === undefined) return false;
  for (const id of solid) publish({ kind: 'grammar-level-changed', id, level: 'solid' });
  if (solid.length > 0) await announceDue(now);
  return true;
}
