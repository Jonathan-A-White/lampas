// src/data/repositories/rusty.ts — the solid items with their place on the schedule (what src/data/rusty.ts works rust out from), and moving rusty ones back to Frontier
// (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'). A word is solid when its state is; an idea when its level is.
import { db } from '../db';
import { IDEA_KIND } from '../grammar/ladder';
import { ideaOfAny } from '../grammar/ladders';
import { isHebrewIdeaId } from '../grammar/hebrew/ladder';
import type { RustyCandidate } from '../rusty';
import { storedId } from '../grammar/soundScope';
import { announceDue, writeRestart } from './reviews';
import { getLevel, listLevels, setLevel } from './grammarLevels';
import { getGreekPronunciation } from './settings';

/** An item the tutor names: a word (its lemma) or a grammar idea (its ladder id). */
export interface ItemRef {
  kind: 'word' | 'idea';
  id: string;
}

const reviewKind = (kind: ItemRef['kind']): string => (kind === 'word' ? 'word' : IDEA_KIND);

/** The title of an idea of either ladder (Greek or Hebrew), or undefined for an id neither has. */
function ideaTitle(id: string): string | undefined {
  try {
    return ideaOfAny(id).title;
  } catch {
    return undefined;
  }
}

/** When he last met a Hebrew word or idea (a review row of a Hebrew word, or of an idea whose id starts 'he-'), or undefined when he has met none. */
export async function lastHebrewSeen(): Promise<number | undefined> {
  const [words, ideaRows] = await Promise.all([db.words.toArray(), db.reviews.where('kind').equals(IDEA_KIND).filter((r) => isHebrewIdeaId(r.id)).toArray()]);
  const wordRows = await Promise.all(words.filter((w) => w.lang === 'hbo').map((w) => db.reviews.get(['word', w.lemma])));
  const seen = [...ideaRows, ...wordRows].flatMap((r) => (r && r.lastWhen > 0 ? [r.lastWhen] : []));
  return seen.length > 0 ? Math.max(...seen) : undefined;
}

/** Every solid word and idea that is on the schedule, with its row. A solid item with no row has never been asked, so it cannot be rusty. */
export async function solidCandidates(): Promise<RustyCandidate[]> {
  const [words, allLevels, scheme] = await Promise.all([db.words.where('state').equals('solid').toArray(), listLevels(), getGreekPronunciation()]);
  const levels = [...allLevels.values()].filter((l) => l.level === 'solid');
  const wanted: Omit<RustyCandidate, 'review'>[] = [
    ...words.map((w) => ({ kind: 'word' as const, id: w.lemma, title: w.lemma })),
    ...levels.flatMap((l) => {
      const title = ideaTitle(l.id);
      return title === undefined ? [] : [{ kind: 'idea' as const, id: l.id, title }];
    }),
  ];
  const rows = await Promise.all(wanted.map((w) => db.reviews.get([reviewKind(w.kind), w.kind === 'idea' ? storedId(w.id, scheme) : w.id])));
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
      if ((await getLevel(item.id))?.level !== 'solid') continue;
      // he is learning one idea at a time: a rusty one waits while another is the frontier
      if (!(await setLevel(item.id, 'frontier', 'tutor', now))) continue;
      const key = storedId(item.id, await getGreekPronunciation());
      await db.transaction('rw', db.reviews, () => writeRestart(IDEA_KIND, key, now));
      moved.push(item);
    }
  }
  if (moved.length > 0) await announceDue(now);
  return moved;
}
