// src/review/round.ts — a Review round: the exact gaps of the letters, sounds and marks first (mw-hqd5bz.18), then the ideas with items kept from the mill (mw-hqd5bz.36), then the due items (grammar ideas before words, the longest overdue first within a kind), then other words up to ten.
import { ROUND_SIZE, type Random } from '../data/quiz';
import { gapsOf } from '../data/grammar/inference';
import { IDEA_KIND } from '../data/grammar/ladder';
import { levelsOf } from '../data/grammar/goalProgress';
import { LESSON_KIND, listDue, listFetchedIdeas, listLevels, listWords, reviewsOf, type ItemRef, type Review } from '../data/repositories';
import { languageOfWord, reviewLanguages } from '../data/studyLanguage';
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

/** How many ideas with items kept from the mill (src/review/moreItems.ts) head a round, due or not (mw-hqd5bz.36, PROVISIONAL): he just missed them, and fresh material is waiting. */
export const FETCHED_IDEAS = 2;

/** The schedule rows of the ideas with kept items, due or not; one never scheduled is drawn as a row at step 0, due now. */
async function fetchedRows(now: number): Promise<Review[]> {
  const ids = (await listFetchedIdeas()).slice(0, FETCHED_IDEAS);
  const rows = new Map((await reviewsOf(ids.map((id) => ({ kind: IDEA_KIND, id })))).map((r) => [r.id, r]));
  return ids.map((id) => rows.get(id) ?? { kind: IDEA_KIND, id, step: 0, due: now, lastWhen: 0, lapses: 0, rights: 0 });
}

/** A round of just these items, in the order given (the rusty ones he moved back to Frontier, or the ones Welcome back names, mw-1vuvq6.6), due or not; none of the rest of a round. Empty when none of them can be asked. */
async function chosenRound(chosen: readonly ItemRef[], random: Random, size: number): Promise<ReviewRound> {
  const rows = (await reviewsOf(chosen.map((c) => ({ kind: c.kind === 'word' ? 'word' : IDEA_KIND, id: c.id })))).filter((r) => kindRank(r.kind) >= 0).slice(0, size);
  const order = new Map(chosen.map((c, i) => [`${c.kind === 'word' ? 'word' : IDEA_KIND}\0${c.id}`, i]));
  rows.sort((a, b) => (order.get(`${a.kind}\0${a.id}`) ?? 0) - (order.get(`${b.kind}\0${b.id}`) ?? 0));
  const drawn = (await Promise.all(KINDS.map((k) => k.draw(rows.filter((r) => r.kind === k.kind), random)))).flat();
  drawn.sort((a, b) => (order.get(`${a.kind}\0${a.id}`) ?? 0) - (order.get(`${b.kind}\0${b.id}`) ?? 0));
  return { items: drawn, due: drawn.length };
}

export async function drawReviewRound(random: Random, now = Date.now(), size = ROUND_SIZE, chosen?: readonly ItemRef[]): Promise<ReviewRound> {
  if (chosen && chosen.length > 0) {
    const round = await chosenRound(chosen, random, size);
    if (round.items.length > 0) return round;
  }
  // listDue has them longest overdue first and the sort is stable, so ranking by kind keeps that order within a kind
  // a due passage lesson is not asked in a round (Review's start screen opens it, src/review/kinds.ts LESSON)
  const asked = (await listDue(undefined, now)).filter((r) => kindRank(r.kind) >= 0 && r.kind !== LESSON_KIND);
  // a word is asked in a language he chose (the segment's alone where both are); the others stay due for the other segment
  const play = new Set(await reviewLanguages());
  const lang = new Map((await listWords()).map((w) => [w.lemma, languageOfWord(w)]));
  const owed = asked.filter((r) => r.kind !== 'word' || play.has(lang.get(r.id) ?? 'grc')).sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
  // the exact gaps of the letters, sounds and marks come first, due or not
  const gaps = await gapRows(now);
  // then the ideas the mill wrote more items for, which he missed in the round before
  const more = (await fetchedRows(now)).filter((r) => !gaps.some((g) => g.id === r.id));
  const named = new Set([...gaps, ...more].map((r) => r.id));
  const due = [...gaps, ...more, ...owed.filter((r) => !(r.kind === IDEA_KIND && named.has(r.id)))].slice(0, size);
  const drawn = (await Promise.all(KINDS.map((k) => k.draw(due.filter((r) => r.kind === k.kind), random)))).flat();
  // Back into the order they were listed: grammar ideas, then words.
  const order = new Map(due.map((r, i) => [`${r.kind}\0${r.id}`, i]));
  drawn.sort((a, b) => (order.get(`${a.kind}\0${a.id}`) ?? 0) - (order.get(`${b.kind}\0${b.id}`) ?? 0));
  const fill = await fillWords(new Set(drawn.filter((i) => i.kind === 'word').map((i) => i.id)), size - drawn.length, random);
  return { items: [...drawn, ...fill], due: drawn.length };
}
