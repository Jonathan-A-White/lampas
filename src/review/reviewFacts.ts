// src/review/reviewFacts.ts — what Review's Ask the tutor tells the tutor (src/ReviewScreen.tsx reports it as the screen's facts).
import { ideaOfAny as ideaOf } from '../data/grammar/ladders';
import { wordHeart } from '../data/wordHeart';
import type { ScreenFact } from '../tutor/screen';
import type { ReviewItem } from './kinds';

/** The part of Review's round the facts read. */
export type FactsRound =
  | { status: 'start' }
  | { status: 'loading' }
  | { status: 'done'; right: number; total: number }
  | { status: 'running'; items: ReviewItem[]; index: number; picked: string | null };

/** What the Ask the tutor control tells the tutor about Review: the due line, or the item in hand (its answer only once he has answered), or the score. */
export function reviewFacts(round: FactsRound, dueLine: string | undefined): ScreenFact[] {
  if (round.status === 'start') return [{ label: 'Due today', value: dueLine ?? '' }];
  if (round.status === 'done') return [{ label: 'Round', value: `Finished: ${round.right} of ${round.total} right` }];
  if (round.status === 'loading') return [];
  const item = round.items[round.index];
  const kind = item.kind === 'word' ? 'a word' : item.kind === 'sound' ? 'a sound or word he drilled' : item.kind === 'drill-plan' ? 'a step of his drill plan' : item.kind === 'paradigm' ? 'a cell of a table' : 'a grammar idea';
  const question =
    item.kind === 'word'
      ? item.question.prompt
      : item.kind === 'drill-plan'
        ? item.item.kind === 'prove'
          ? `Prove it: a full Drill it of ${ideaOf(item.ideaId).title}`
          : `A short drill on ${item.item.facet?.label ?? ''} in ${ideaOf(item.ideaId).title}`
        : item.kind === 'sound' && !item.question
          ? `Say the word ${item.word ?? ''}`
          : [item.question?.prompt, item.question?.form].filter(Boolean).join(' ');
  const facts: ScreenFact[] = [
    { label: 'Question', value: `${round.index + 1} of ${round.items.length}, ${kind}` },
    { label: 'In hand', value: question },
  ];
  if (round.picked !== null) {
    facts.push({ label: 'He chose', value: round.picked });
    if (item.kind !== 'drill-plan') facts.push({ label: 'Right answer', value: item.kind === 'word' ? item.question.gloss : (item.question?.right ?? '') });
    // the note he is shown after a miss (src/HeartOfWord.tsx) is told to the tutor too, so its answer agrees with it (mw-bsf54t.14); it explains the answer, so it waits for the answer as 'Right answer' does
    const heart = item.kind === 'word' ? wordHeart(item.question.lemma) : undefined;
    if (heart) facts.push({ label: 'Heart of the word', value: heart });
  }
  return facts;
}
