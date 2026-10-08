// src/review/kinds.ts — what Review asks, as items of a kind. A kind knows how to turn its due reviews into questions,
// how to count itself in words ('3 words'), and where an answer goes. Words are the only kind today; the course epic adds
// grammar ideas and paradigms as more entries of KINDS, each with a renderer in src/review/ItemCard.tsx.
import { loadChapter, type Chapter } from '../data/chapter';
import { modeFor, type QuestionMode } from '../data/schedule';
import { buildQuestion, drawWords, seedDistractors, type Question, type Random } from '../data/quiz';
import { speakWord } from '../speech/greek';
import { listWords, recordAnswer, reviewsOf, seedWordsIfFirstOpen, type Review } from '../data/repositories';

/** A word asked as a Quick test question. */
export interface WordItem {
  kind: 'word';
  /** the store's key for the word, the same as the review's id */
  id: string;
  question: Question;
  /** how it is asked: multiple choice, or a flashcard (data/schedule.ts modeFor, from the word's step) */
  mode: QuestionMode;
}

/** What he taps on a flashcard to grade himself; isRight reads them. */
export const KNEW_IT = 'I knew it';
export const NOT_YET = 'Not yet';

/** One thing Review asks; a new kind of item is one more member here. */
export type ReviewItem = WordItem;

export interface ReviewKind {
  kind: ReviewItem['kind'];
  /** 'N words' */
  count: (n: number) => string;
  /** The items for the due reviews of this kind (an item that no longer exists is left out). */
  draw: (due: Review[], random: Random) => Promise<ReviewItem[]>;
  /** Whether the option he tapped is the right one. */
  isRight: (item: ReviewItem, picked: string) => boolean;
  /** Says the item aloud once it is answered, if it can be heard. */
  hear?: (item: ReviewItem) => void;
  /** Puts one answer on the schedule. */
  record: (item: ReviewItem, right: boolean) => Promise<void>;
}

/** The chapter the inflected forms come from. A phone that cannot load it is asked the plain lemmas. */
const loadForms = (): Promise<Chapter | null> => loadChapter('rom', 8).catch(() => null);

export const WORDS: ReviewKind = {
  kind: 'word',
  count: (n) => `${n} ${n === 1 ? 'word' : 'words'}`,
  async draw(due, random) {
    await seedWordsIfFirstOpen();
    const [words, chapter] = await Promise.all([listWords(), loadForms()]);
    const byLemma = new Map(words.filter((w) => w.state !== 'dropped').map((w) => [w.lemma, w]));
    const pool = seedDistractors();
    return due.flatMap((r): WordItem[] => {
      const word = byLemma.get(r.id);
      return word
        ? [{ kind: 'word', id: word.lemma, question: buildQuestion(word, pool, chapter, random), mode: modeFor(r.step) }]
        : [];
    });
  },
  isRight: (item, picked) => (item.mode === 'flashcard' ? picked === KNEW_IT : picked === item.question.gloss),
  hear: (item) => speakWord(item.question.prompt, 'greek'),
  record: async (item, right) => void (await recordAnswer(item.id, right)),
};

/** Every kind Review knows, in the order its counts are written. */
export const KINDS: readonly ReviewKind[] = [WORDS];

export const kindOf = (kind: ReviewItem['kind']): ReviewKind => KINDS.find((k) => k.kind === kind) ?? WORDS;

/** Words that are not due, to fill a round up, drawn as the Quick test draws (the learning ones favoured). */
export async function fillWords(exclude: ReadonlySet<string>, size: number, random: Random): Promise<WordItem[]> {
  if (size <= 0) return [];
  await seedWordsIfFirstOpen();
  const [words, chapter] = await Promise.all([listWords(), loadForms()]);
  const pool = seedDistractors();
  const drawn = drawWords(words.filter((w) => !exclude.has(w.lemma)), random, size);
  // a word that is on the schedule but not due is asked in the mode its step gives; one not scheduled yet is at step 0
  const steps = new Map((await reviewsOf(drawn.map((w) => ({ kind: 'word', id: w.lemma })))).map((r) => [r.id, r.step]));
  return drawn.map(
    (w): WordItem => ({ kind: 'word', id: w.lemma, question: buildQuestion(w, pool, chapter, random), mode: modeFor(steps.get(w.lemma) ?? 0) }),
  );
}
