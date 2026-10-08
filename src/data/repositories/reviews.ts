// src/data/repositories/reviews.ts — the back-off schedule's rows (src/data/schedule.ts holds the rule). An item is
// {kind, id}: kind 'word' with the NFC headword as id today; the course epic adds its own kinds.
import { db, type Review } from '../db';
import { publish } from '../../events/bus';
import { DAY, STEP_DAYS, isDue, nextReview } from '../schedule';

export type { Review };

const SEEDED_KEY = 'reviewsSeeded';
/** The step whose gap is 30 days: where his solid words start. */
const SOLID_START_STEP = STEP_DAYS.indexOf(30);
/** His solid words come due one by one over this many days after the upgrade, so he is not flooded. */
const SPREAD_DAYS = 30;

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
  const next: Review = { kind, id, ...nextReview(await db.reviews.get([kind, id]), right, now) };
  await db.reviews.put(next);
  return next;
}

/** Records one answer for an item: a new item starts at step 0, then the rule of schedule.ts moves it. */
export async function recordReview(kind: string, id: string, right: boolean, now = Date.now()): Promise<Review> {
  const review = await db.transaction('rw', db.reviews, () => writeReview(kind, id, right, now));
  await announceDue(now);
  return review;
}

/** The items due at `now` (of `kind`, or of every kind), the longest overdue first. */
export async function listDue(kind?: string, now = Date.now()): Promise<Review[]> {
  const due = await db.reviews.where('due').belowOrEqual(now).toArray();
  return due.filter((r) => isDue(r, now) && (kind === undefined || r.kind === kind)).sort((a, b) => a.due - b.due);
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
  const added = await db.transaction('rw', db.reviews, async () => {
    const there = await scheduled(ids.map((id) => ({ kind, id })));
    const missing = ids
      .map((id, index): Review => ({ kind, id, ...(start?.(id, index) ?? { step: 0, due: now }), lastWhen: now, lapses: 0, rights: 0 }))
      .filter((r) => !there.has(`${r.kind}\0${r.id}`));
    await db.reviews.bulkAdd(missing);
    return missing.length;
  });
  if (added > 0) await announceDue(now);
  return added;
}

/**
 * Once, after the words are seeded (a first open) or the store is upgraded to v10: puts every solid or learning
 * word on the schedule. A solid word starts at the 30-day step, due on one of the next 30 days in turn (he is not
 * flooded); a learning word starts at step 0, due now. Returns whether it ran. A dropped word is left off.
 */
export async function seedScheduleIfFirstOpen(now = Date.now()): Promise<boolean> {
  const due = await db.transaction('rw', db.words, db.meta, db.reviews, async () => {
    if (await db.meta.get(SEEDED_KEY)) return null;
    // Before the words are seeded there is nothing to schedule and nothing to mark.
    if (!(await db.meta.get('wordsSeeded'))) return null;
    const words = await db.words.toArray();
    const solid = words.filter((w) => w.state === 'solid').sort((a, b) => a.lesson - b.lesson || a.lemma.localeCompare(b.lemma));
    const learning = words.filter((w) => w.state === 'learning');
    const rows: Review[] = [
      ...solid.map((w, i): Review => ({ kind: 'word', id: w.lemma, step: SOLID_START_STEP, due: now + ((i % SPREAD_DAYS) + 1) * DAY, lastWhen: now, lapses: 0, rights: 0 })),
      ...learning.map((w): Review => ({ kind: 'word', id: w.lemma, step: 0, due: now, lastWhen: now, lapses: 0, rights: 0 })),
    ];
    // A word that already has a review (answered before the seed ran) keeps it.
    const there = await scheduled(rows);
    await db.reviews.bulkAdd(rows.filter((r) => !there.has(`${r.kind}\0${r.id}`)));
    await db.meta.put({ key: SEEDED_KEY, value: String(now) });
    return db.reviews.where('due').belowOrEqual(now).count();
  });
  if (due === null) return false;
  publish({ kind: 'review-due-changed', due });
  return true;
}
