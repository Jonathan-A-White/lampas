// src/data/repositories/reviews.ts — the back-off schedule's rows (src/data/schedule.ts holds the rule). An item is
// {kind, id}: kind 'word' with the NFC headword as id, 'grammar' with a ladder idea's id, 'paradigm' with a table's id (mw-svw421.6), 'sound' and 'drill-plan'.
import { db, type Review } from '../db';
import { publish } from '../../events/bus';
import { PLAN_KIND, parseRowId } from '../grammar/drillPlan';
import { IDEA_KIND, ideaOf } from '../grammar/ladder';
import { ideaOfStored, storedId } from '../grammar/soundScope';
import { availableCount, paradigmById } from '../paradigms';
import { PARADIGM_KIND } from '../paradigms/cells';
import { parseReviewId } from '../readingDrill';
import { RECENT_ANSWERS } from '../rusty';
import { DAY, KNOWN_STEP, isDue, nextReview, startSchedule } from '../schedule';
import { getDrillPlan } from './drillPlans';
import { listLevels } from './grammarLevels';
import { planFacetQuestions } from './reviewPassage';
import { getGreekPronunciation } from './settings';

export type { Review };

const SEEDED_KEY = 'reviewsSeeded';
/** His solid words come due one by one over this many days after the upgrade, so he is not flooded. */
const SPREAD_DAYS = 30;

/** The kind of a drilled sound (Greek) or word (English): the reading drill's reviews (src/ReadingDrill.tsx, src/review/kinds.ts SOUND). */
export const SOUND_KIND = 'sound';

/**
 * Puts drilled sounds (ids like 'el:diphthong-ou') or words ('en:blessed') on the schedule: at step 0, due after the first gap (startSchedule). A unit that is
 * on the schedule already starts again from step 0 (he missed it again), keeping its lapses. Publishes the new count of what is due.
 */
export async function scheduleSounds(ids: string[], now = Date.now()): Promise<void> {
  await db.transaction('rw', db.reviews, async () => {
    for (const id of ids) {
      const there = await db.reviews.get([SOUND_KIND, id]);
      await db.reviews.put({ kind: SOUND_KIND, id, ...startSchedule(now), lapses: there?.lapses ?? 0 });
    }
  });
  await announceDue(now);
}

/** Which of the items {kind, id} are on the schedule already, as 'kind\0id'. */
async function scheduled(items: Array<Pick<Review, 'kind' | 'id'>>): Promise<Set<string>> {
  const keys = await db.reviews.where('[kind+id]').anyOf(items.map((r) => [r.kind, r.id])).primaryKeys();
  return new Set(keys.map(([kind, id]) => `${kind}\0${id}`));
}

/** Tells the bus how many items are due at `now`. Best effort: the write it follows is already kept. */
export async function announceDue(now = Date.now()): Promise<void> {
  try {
    publish({ kind: 'review-due-changed', due: await countDue(now) });
  } catch (error) {
    console.error('could not count the reviews due', error);
  }
}

/** Writes one answer for an item inside the caller's transaction (which must include db.reviews); recordReview is the whole of it. */
export async function writeReview(kind: string, id: string, right: boolean, now: number): Promise<Review> {
  const before = await db.reviews.get([kind, id]);
  // the last few answers are kept beside the schedule, so the tutor can tell a solid item he now slips on from one he never missed (src/data/rusty.ts)
  const recent = [...(before?.recent ?? []), { when: now, right }].slice(-RECENT_ANSWERS);
  const next: Review = { kind, id, ...nextReview(before, right, now), recent };
  await db.reviews.put(next);
  return next;
}

/**
 * Puts an item back at the start of the schedule (step 0, due now, no rights in a row) because it has gone rusty and he is moving it back to Frontier (mw-1vuvq6.6): its
 * lapses, last answer and recent answers stay as they were. An item that is not on the schedule yet is put there. Inside the caller's transaction (which must include db.reviews).
 */
export async function writeRestart(kind: string, id: string, now: number): Promise<void> {
  const before = await db.reviews.get([kind, id]);
  await db.reviews.put({ kind, id, step: 0, due: now, lastWhen: before?.lastWhen ?? now, lapses: before?.lapses ?? 0, rights: 0, ...(before?.recent ? { recent: before.recent } : {}) });
}

/** Records one answer for an item: a new item starts at step 0, then the rule of schedule.ts moves it. */
export async function recordReview(kind: string, id: string, right: boolean, now = Date.now()): Promise<Review> {
  const review = await db.transaction('rw', db.reviews, () => writeReview(kind, id, right, now));
  await announceDue(now);
  return review;
}

/**
 * A miss in a drill of his own (a paradigm table's Drill, mw-irpgqi.2): the item's row takes a wrong answer as a missed Review cell does (the step drops, a lapse is
 * counted, the rights in a row go), and the item is due now rather than tomorrow: he has just shown he does not have it, and Review should ask it today. An item not on
 * the schedule is put there by it (step 0, a lapse). The screen writes one miss a run (src/data/paradigms/drill.ts missWritten).
 */
export async function recordDrillMiss(kind: string, id: string, now = Date.now()): Promise<Review> {
  const review = await db.transaction('rw', db.reviews, async () => {
    const missed = { ...(await writeReview(kind, id, false, now)), due: now };
    await db.reviews.put(missed);
    return missed;
  });
  await announceDue(now);
  return review;
}

/** Whether a ladder idea with this id exists (Review leaves out a row of one the ladder no longer has). */
function ideaExists(id: string): boolean {
  try {
    ideaOf(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a drill plan row names an item still to do: its plan is open and not replaced, the item is not done and, for Prove it, every short drill is; a short drill must also
 * have a question to ask (reviewPassage.ts planFacetQuestions: the draw falls back to the same one), or Start would promise a drill nothing can ask (mw-svw421.42).
 */
async function planRowAskable(id: string): Promise<boolean> {
  const at = parseRowId(id);
  const plan = at ? await getDrillPlan(at.ideaId) : undefined;
  const item = plan?.items.find((i) => i.id === at?.itemId);
  if (!at || !plan || !item || item.done || !ideaExists(at.ideaId)) return false;
  if (item.kind === 'prove') return !plan.items.some((i) => i.kind === 'facet' && !i.done);
  return (await planFacetQuestions(at.ideaId, item)).length > 0;
}

/**
 * Whether each row is of something Review can ask (mw-svw421.28): a word that is listed and not dropped, a table with a form available to him, a ladder idea the ladder
 * still has, a sound or word whose id reads, a step of an open drill plan. The row of something it cannot ask is kept (it is asked again when he can: a table once a form
 * opens, a dropped word taken up again) but it is not due, so the Reader's count, Review's line and a round always agree. A passage lesson has rows and no item: always live.
 * (A grammar idea and a sound are tested in namesSomething, once their ids are plain.) This is the one source of "what is due" the strip, Review's cards and the round share.
 */
async function live(rows: Review[]): Promise<Review[]> {
  const words = rows.filter((r) => r.kind === 'word');
  const found = await db.words.bulkGet(words.map((r) => r.id));
  const liveWords = new Set(words.filter((_, i) => found[i] !== undefined && found[i]?.state !== 'dropped').map((r) => r.id));
  const levels = rows.some((r) => r.kind === PARADIGM_KIND) ? await listLevels() : undefined;
  const plans = await Promise.all(rows.map((r) => (r.kind === PLAN_KIND ? planRowAskable(r.id) : true)));
  return rows.filter((r, i) => {
    switch (r.kind) {
      case 'word':
        return liveWords.has(r.id);
      case PARADIGM_KIND: {
        const table = paradigmById(r.id);
        return table !== undefined && levels !== undefined && availableCount(table, levels).available > 0;
      }
      case PLAN_KIND:
        return plans[i];
      default:
        return true;
    }
  });
}

/**
 * The rows of grammar ideas are kept under the pronunciation they were learned in when the idea is about sound (src/data/grammar/soundScope.ts, mw-5r3p30.231): this
 * leaves out the rows of another scheme (kept, but not due here) and gives the rest their plain idea ids. Rows of other kinds are as they were.
 */
async function inScheme(rows: Review[]): Promise<Review[]> {
  if (!rows.some((r) => r.kind === IDEA_KIND)) return rows;
  const scheme = await getGreekPronunciation();
  return rows.flatMap((r): Review[] => {
    if (r.kind !== IDEA_KIND) return [r];
    const id = ideaOfStored(r.id, scheme);
    return id === undefined ? [] : [{ ...r, id }];
  });
}

/** Whether a row (its grammar idea id plain) names an idea the ladder has, or a sound or English word whose id reads and, for a sound, whose idea is a sound of the ladder. */
function namesSomething(r: Review): boolean {
  if (r.kind === IDEA_KIND) return ideaExists(r.id);
  if (r.kind !== SOUND_KIND) return true;
  const at = parseReviewId(r.id);
  if (!at) return false;
  return at.lang === 'en' || (ideaExists(at.unit) && ideaOf(at.unit).parent !== undefined);
}

/** The items due at `now` (of `kind`, or of every kind), the longest overdue first. A word he dropped is not due. */
export async function listDue(kind?: string, now = Date.now()): Promise<Review[]> {
  const due = await db.reviews.where('due').belowOrEqual(now).toArray();
  const wanted = due.filter((r) => isDue(r, now) && (kind === undefined || r.kind === kind));
  return (await inScheme(await live(wanted))).filter(namesSomething).sort((a, b) => a.due - b.due);
}

/** The schedule rows of these items, for the ones that have one (a grammar idea's row is the selected pronunciation's, with the idea's plain id). */
export async function reviewsOf(items: Array<Pick<Review, 'kind' | 'id'>>): Promise<Review[]> {
  const scheme = items.some((r) => r.kind === IDEA_KIND) ? await getGreekPronunciation() : undefined;
  const rows = await Promise.all(items.map((r) => db.reviews.get([r.kind, r.kind === IDEA_KIND && scheme !== undefined ? storedId(r.id, scheme) : r.id])));
  return inScheme(rows.filter((r): r is Review => r !== undefined));
}

/** How many items are due at `now`, of `kind` or of every kind. */
export async function countDue(now = Date.now(), kind?: string): Promise<number> {
  return (await listDue(kind, now)).length;
}

/**
 * Puts the ids that are not on the schedule yet on it, at step 0 and due now (or where `start` says), and leaves
 * the ones already there alone. Returns how many it added.
 */
export async function ensureScheduled(
  kind: string,
  ids: string[],
  now = Date.now(),
  start?: (id: string, index: number) => Pick<Review, 'step' | 'due'>,
): Promise<number> {
  const added = await db.transaction('rw', db.reviews, () => writeScheduled(kind, ids, now, start));
  if (added > 0) await announceDue(now);
  return added;
}

/** ensureScheduled inside the caller's transaction (which must include db.reviews), without announcing; the caller calls announceDue. */
export async function writeScheduled(
  kind: string,
  ids: string[],
  now: number,
  start?: (id: string, index: number) => Pick<Review, 'step' | 'due'>,
): Promise<number> {
  const there = await scheduled(ids.map((id) => ({ kind, id })));
  const missing = ids
    .map((id, index): Review => ({ kind, id, ...(start?.(id, index) ?? { step: 0, due: now }), lastWhen: now, lapses: 0, rights: 0 }))
    .filter((r) => !there.has(`${r.kind}\0${r.id}`));
  await db.reviews.bulkAdd(missing);
  return missing.length;
}

/**
 * Once, for a store that was seeded the old way (it holds the 'wordsSeeded' flag) and has no schedule yet (the upgrade to v10): puts every solid or
 * learning word on the schedule. A new install is never seeded (mw-5r3p30.385), has no flag, and gets nothing. A solid word starts at the 30-day step, due on one of the next 30 days in turn (he is not
 * flooded); a learning word starts at step 0, due now. Returns whether it ran. A dropped word is left off.
 */
export async function seedScheduleIfFirstOpen(now = Date.now()): Promise<boolean> {
  const seeded = await db.transaction('rw', db.words, db.meta, db.reviews, async () => {
    if (await db.meta.get(SEEDED_KEY)) return false;
    // Before the words are seeded there is nothing to schedule and nothing to mark.
    if (!(await db.meta.get('wordsSeeded'))) return false;
    const words = await db.words.toArray();
    const solid = words.filter((w) => w.state === 'solid').sort((a, b) => a.lesson - b.lesson || a.lemma.localeCompare(b.lemma));
    const learning = words.filter((w) => w.state === 'learning');
    const rows: Review[] = [
      ...solid.map((w, i): Review => ({ kind: 'word', id: w.lemma, step: KNOWN_STEP, due: now + ((i % SPREAD_DAYS) + 1) * DAY, lastWhen: now, lapses: 0, rights: 0 })),
      ...learning.map((w): Review => ({ kind: 'word', id: w.lemma, step: 0, due: now, lastWhen: now, lapses: 0, rights: 0 })),
    ];
    // A word that already has a review (answered before the seed ran) keeps it.
    const there = await scheduled(rows);
    await db.reviews.bulkAdd(rows.filter((r) => !there.has(`${r.kind}\0${r.id}`)));
    await db.meta.put({ key: SEEDED_KEY, value: String(now) });
    return true;
  });
  if (!seeded) return false;
  await announceDue(now);
  return true;
}
