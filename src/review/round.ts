// src/review/round.ts — a Review round: the due items first (grammar ideas before words, the longest overdue first within a kind), then other words up to ten.
import { ROUND_SIZE, type Random } from '../data/quiz';
import { listDue } from '../data/repositories';
import { KINDS, fillWords, kindRank, type ReviewItem } from './kinds';

export interface ReviewRound {
  items: ReviewItem[];
  /** how many of the items were due; the rest fill the round */
  due: number;
}

export async function drawReviewRound(random: Random, now = Date.now(), size = ROUND_SIZE): Promise<ReviewRound> {
  // listDue has them longest overdue first and the sort is stable, so ranking by kind keeps that order within a kind
  const due = (await listDue(undefined, now)).filter((r) => kindRank(r.kind) >= 0).sort((a, b) => kindRank(a.kind) - kindRank(b.kind)).slice(0, size);
  const drawn = (await Promise.all(KINDS.map((k) => k.draw(due.filter((r) => r.kind === k.kind), random)))).flat();
  // Back into the order they were listed: grammar ideas, then words.
  const order = new Map(due.map((r, i) => [`${r.kind}\0${r.id}`, i]));
  drawn.sort((a, b) => (order.get(`${a.kind}\0${a.id}`) ?? 0) - (order.get(`${b.kind}\0${b.id}`) ?? 0));
  const fill = await fillWords(new Set(drawn.filter((i) => i.kind === 'word').map((i) => i.id)), size - drawn.length, random);
  return { items: [...drawn, ...fill], due: drawn.length };
}
