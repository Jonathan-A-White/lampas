// src/data/repositories/rusty.ts — the solid items with their place on the schedule (what src/data/rusty.ts works rust out from), and moving rusty ones back to Frontier
// (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'). A word is solid when its state is; an idea when its level is.
import { db } from '../db';
import { IDEA_KIND, LADDER } from '../grammar/ladder';
import type { RustyCandidate } from '../rusty';
import { announceDue, writeRestart } from './reviews';
import { setLevel } from './grammarLevels';

/** An item the tutor names: a word (its lemma) or a grammar idea (its ladder id). */
export interface ItemRef {
  kind: 'word' | 'idea';
  id: string;
}

const reviewKind = (kind: ItemRef['kind']): string => (kind === 'word' ? 'word' : IDEA_KIND);

/** Every solid word and idea that is on the schedule, with its row. A solid item with no row has never been asked, so it cannot be rusty. */
export async function solidCandidates(): Promise<RustyCandidate[]> {
  const [words, levels] = await Promise.all([db.words.where('state').equals('solid').toArray(), db.grammarLevels.where('level').equals('solid').toArray()]);
  const titles = new Map(LADDER.map((idea) => [idea.id, idea.title]));
  const wanted: Omit<RustyCandidate, 'review'>[] = [
    ...words.map((w) => ({ kind: 'word' as const, id: w.lemma, title: w.lemma })),
    ...levels.flatMap((l) => (titles.has(l.id) ? [{ kind: 'idea' as const, id: l.id, title: titles.get(l.id) as string }] : [])),
  ];
  const rows = await Promise.all(wanted.map((w) => db.reviews.get([reviewKind(w.kind), w.id])));
  return wanted.flatMap((w, i) => (rows[i] ? [{ ...w, review: rows[i] }] : []));
}

/**
 * Moves these items back to Frontier and puts them at the start of the schedule, due now, so a Review round asks them: a word becomes learning, an idea frontier (how 'tutor').
 * Returns the ones that moved; an item that is not solid any more (or not there) is left alone.
 */
export async function moveToFrontier(items: readonly ItemRef[], now = Date.now()): Promise<ItemRef[]> {
  const moved: ItemRef[] = [];
  for (const item of items) {
    if (item.kind === 'word') {
      const done = await db.transaction('rw', db.words, db.reviews, async () => {
        const word = await db.words.get(item.id);
        if (word?.state !== 'solid') return false;
        await db.words.update(item.id, { state: 'learning', since: now });
        await writeRestart('word', item.id, now);
        return true;
      });
      if (done) moved.push(item);
    } else {
      if ((await db.grammarLevels.get(item.id))?.level !== 'solid') continue;
      await setLevel(item.id, 'frontier', 'tutor', now);
      await db.transaction('rw', db.reviews, () => writeRestart(IDEA_KIND, item.id, now));
      moved.push(item);
    }
  }
  if (moved.length > 0) await announceDue(now);
  return moved;
}
