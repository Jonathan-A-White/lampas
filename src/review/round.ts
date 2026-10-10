// src/review/round.ts — a Review round: the exact gaps of the letters, sounds and marks first (mw-hqd5bz.18), then the due items (grammar ideas before words, the longest overdue first within a kind), then other words up to ten.
import { ROUND_SIZE, type Random } from '../data/quiz';
import { gapsOf } from '../data/grammar/inference';
import { IDEA_KIND } from '../data/grammar/ladder';
import { levelsOf } from '../data/grammar/goalProgress';
import { listDue, listLevels, reviewsOf, type Review } from '../data/repositories';
import { KINDS, fillWords, kindRank, type ReviewItem } from './kinds';

export interface ReviewRound {
  items: ReviewItem[];
  /** how many of the items were due; the rest fill the round */
  due: number;
}

/** How many of the exact gaps (letters, pairs and breathings he missed) head a round (mw-hqd5bz.18, PROVISIONAL). */
export const GAP_QUESTIONS = 4;

/**
 * The schedule rows of the gaps the end card and Learn next name, in the order they are named, missed or never asked, due or not. A gap never asked
 * has no row yet: it is drawn as one at step 0, due now (mw-hqd5bz.23).
 */
async function gapRows(now: number): Promise<Review[]> {
  const gaps = gapsOf(levelsOf(await listLevels())).slice(0, GAP_QUESTIONS);
  const rows = new Map((await reviewsOf(gaps.map((i) => ({ kind: IDEA_KIND, id: i.id })))).map((r) => [r.id, r]));
  return gaps.map((i) => rows.get(i.id) ?? { kind: IDEA_KIND, id: i.id, step: 0, due: now, lastWhen: 0, lapses: 0, rights: 0 });
}

export async function drawReviewRound(random: Random, now = Date.now(), size = ROUND_SIZE): Promise<ReviewRound> {
  // listDue has them longest overdue first and the sort is stable, so ranking by kind keeps that order within a kind
  const owed = (await listDue(undefined, now)).filter((r) => kindRank(r.kind) >= 0).sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
  // the exact gaps of the letters, sounds and marks come first, due or not
  const gaps = await gapRows(now);
  const named = new Set(gaps.map((r) => r.id));
  const due = [...gaps, ...owed.filter((r) => !(r.kind === IDEA_KIND && named.has(r.id)))].slice(0, size);
  const drawn = (await Promise.all(KINDS.map((k) => k.draw(due.filter((r) => r.kind === k.kind), random)))).flat();
  // Back into the order they were listed: grammar ideas, then words.
  const order = new Map(due.map((r, i) => [`${r.kind}\0${r.id}`, i]));
  drawn.sort((a, b) => (order.get(`${a.kind}\0${a.id}`) ?? 0) - (order.get(`${b.kind}\0${b.id}`) ?? 0));
  const fill = await fillWords(new Set(drawn.filter((i) => i.kind === 'word').map((i) => i.id)), size - drawn.length, random);
  return { items: [...drawn, ...fill], due: drawn.length };
}
