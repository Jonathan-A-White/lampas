// src/review/kinds.ts — what Review asks, as items of a kind. A kind knows how to turn its due reviews into questions,
// how to count itself in words ('3 words'), and where an answer goes. Grammar ideas (mw-hqd5bz.6) and words are the kinds today, in the
// order Review counts and asks them; the course epic adds paradigms as one more entry of KINDS, each with a renderer in src/review/ItemCard.tsx.
import { BOOK_INDEX } from '../data/bookIndex';
import { loadChapter, type Chapter } from '../data/chapter';
import { parseGoal } from '../data/goal';
import { goalChapterNumbers } from '../data/grammar/needs';
import { ideaOf, IDEA_KIND, type GrammarIdea } from '../data/grammar/ladder';
import { buildIdeaQuestion, type GrammarQuestion } from '../data/grammar/questions';
import { getOpenChapter } from '../data/readerChapter';
import { modeFor, type QuestionMode } from '../data/schedule';
import { buildQuestion, drawWords, mulberry32, seedDistractors, shuffle, type Question, type Random } from '../data/quiz';
import { chosenPronunciation, speakWord } from '../speech/greek';
import {
  getGoal,
  listWords,
  recordAnswer,
  recordGrammarAnswer,
  reviewsOf,
  seedWordsIfFirstOpen,
  type Review,
} from '../data/repositories';

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

/** A grammar idea asked as a question about the passage of his goal (src/data/grammar/questions.ts). */
export interface GrammarItem {
  kind: 'grammar';
  /** the ladder idea's id, the same as the review's id */
  id: string;
  question: GrammarQuestion;
  /** multiple choice while the idea is weak, a flashcard once it is strong (data/schedule.ts modeFor, from the idea's step) */
  mode: QuestionMode;
}

/** One thing Review asks; a new kind of item is one more member here. */
export type ReviewItem = GrammarItem | WordItem;

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

/** The chapter the inflected forms come from: the one the Reader has open. A phone that cannot load it is asked the plain lemmas. */
const loadForms = (): Promise<Chapter | null> => {
  const open = getOpenChapter();
  return loadChapter(open.book, open.chapter).catch(() => null);
};

export const WORDS: ReviewKind = {
  kind: 'word',
  count: (n) => `${n} ${n === 1 ? 'word' : 'words'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
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
  isRight: (item, picked) => item.kind === 'word' && (item.mode === 'flashcard' ? picked === KNEW_IT : picked === item.question.gloss),
  hear: (item) => {
    if (item.kind === 'word') speakWord(item.question.prompt, 'greek');
  },
  record: async (item, right) => {
    if (item.kind === 'word') await recordAnswer(item.id, right);
  },
};

/** The most chapters of a whole-book goal that a round reads questions from (one request each). */
const MAX_CHAPTERS = 6;

/** The seed a round's grammar questions are drawn from: one number taken from the round's random, so the words drawn beside them cannot shift it. */
const grammarSeed = (random: Random): number => Math.floor(random() * 0x100000000);

/** The random the grammar questions of a round use, from the round's own (tests find the seed that gives the question they need through it). */
export const grammarRandom = (random: Random): Random => mulberry32(grammarSeed(random));

/**
 * The passage grammar questions are about: the chapters of his goal (up to MAX_CHAPTERS of a whole book's) or, with no goal, the chapter the Reader has
 * open. A chapter that cannot be loaded is left out, and a phone that cannot load any is asked questions that need no passage.
 */
async function loadPassage(chooser: Random): Promise<Chapter[]> {
  const goal = parseGoal(await getGoal(), BOOK_INDEX);
  const open = getOpenChapter();
  const wanted = goal
    ? shuffle(goalChapterNumbers(goal, BOOK_INDEX), chooser).slice(0, MAX_CHAPTERS).sort((a, b) => a - b).map((n) => [goal.book, n] as const)
    : [[open.book, open.chapter] as const];
  const loaded = await Promise.all(wanted.map(([book, n]) => loadChapter(book, n).catch(() => null)));
  return loaded.filter((c): c is Chapter => c !== null);
}

/** The ladder's idea with this id; undefined for one the ladder no longer has, which Review leaves out. */
function ideaIfAny(id: string): GrammarIdea | undefined {
  try {
    return ideaOf(id);
  } catch {
    return undefined;
  }
}

export const GRAMMAR: ReviewKind = {
  kind: IDEA_KIND,
  count: (n) => `${n} ${n === 1 ? 'idea' : 'ideas'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
    const seed = grammarSeed(random);
    const own = mulberry32(seed);
    const passage = await loadPassage(mulberry32(seed ^ 0x5bd1e995));
    const { respell } = chosenPronunciation();
    return due.flatMap((r): GrammarItem[] => {
      const idea = ideaIfAny(r.id);
      return idea ? [{ kind: 'grammar', id: idea.id, question: buildIdeaQuestion(idea, passage, own, respell), mode: modeFor(r.step) }] : [];
    });
  },
  isRight: (item, picked) => item.kind === 'grammar' && (item.mode === 'flashcard' ? picked === KNEW_IT : picked === item.question.right),
  hear: (item) => {
    if (item.kind === 'grammar' && item.question.say) speakWord(item.question.say, 'greek');
  },
  record: async (item, right) => {
    if (item.kind === 'grammar') await recordGrammarAnswer(item.id, right);
  },
};

/** Every kind Review knows, in the order its counts are written and its due items asked. */
export const KINDS: readonly ReviewKind[] = [GRAMMAR, WORDS];

export const kindOf = (kind: ReviewItem['kind']): ReviewKind => KINDS.find((k) => k.kind === kind) ?? WORDS;

/** Where a kind stands in the order due items are asked: grammar ideas before words (PROVISIONAL). */
export const kindRank = (kind: string): number => KINDS.findIndex((k) => k.kind === kind);

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
