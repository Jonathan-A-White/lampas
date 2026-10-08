// src/data/quiz.ts — the pure parts of the Quick test: the state rule, the drawing of a round, the option
// builder and the question. Nothing here touches the store or the screen; the random source is passed in.
import { wordLemma, type Chapter, type GreekWord } from './chapter';
import type { Word, WordState } from './db';
import { normaliseLemma } from './lemma';
import { SEED_WORDS } from './seed-words';

/** A source of numbers in [0, 1), like Math.random; tests pass a seeded one. */
export type Random = () => number;

export const ROUND_SIZE = 10;
/** A round asks this many learning words, or all it has when it has fewer: the bias towards what he is learning. */
const LEARNING_SHARE = 5;
const OPTION_COUNT = 4;

/** A small seeded generator (mulberry32) for tests. */
export function mulberry32(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher-Yates). */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The state rule. `answers` are the word's answers since it last got its state, oldest first, the one just
 * given last. Two misses in a row move a solid word to learning; two rights in a row move a learning word to
 * solid; a dropped word never moves.
 */
export function nextState(state: WordState, answers: readonly boolean[]): WordState {
  const [prev, last] = answers.slice(-2);
  if (state === 'solid' && prev === false && last === false) return 'learning';
  if (state === 'learning' && prev === true && last === true) return 'solid';
  return state;
}

/** Draws a round: different words, never a dropped one, at least 3 learning when he has that many. */
export function drawWords(words: readonly Word[], random: Random, size = ROUND_SIZE): Word[] {
  const learning = shuffle(words.filter((w) => w.state === 'learning'), random);
  const solid = shuffle(words.filter((w) => w.state === 'solid'), random);
  const fromLearning = Math.min(learning.length, LEARNING_SHARE);
  const fromSolid = Math.min(solid.length, size - fromLearning);
  // When the solid words run short, learning ones fill the rest.
  const extra = Math.min(learning.length - fromLearning, size - fromLearning - fromSolid);
  return shuffle([...learning.slice(0, fromLearning + extra), ...solid.slice(0, fromSolid)], random);
}

/** A seed word offered as a wrong gloss. */
export interface Distractor {
  lemma: string;
  gloss: string;
  pos: string;
}

let seedPool: Distractor[] | undefined;
/** The seed words as distractors, keyed by the headword the store uses. */
export function seedDistractors(): Distractor[] {
  seedPool ??= SEED_WORDS.map((s) => ({ lemma: normaliseLemma(s.lemma).headword, gloss: s.gloss, pos: s.pos }));
  return seedPool;
}

/** The right gloss and three others, shuffled: from seed words of the same part of speech where possible. */
export function buildOptions(
  gloss: string,
  pos: string | undefined,
  lemma: string,
  candidates: readonly Distractor[],
  random: Random,
): string[] {
  const others = candidates.filter((c) => c.lemma !== lemma && c.gloss !== gloss);
  const wrong: string[] = [];
  for (const c of [...shuffle(others.filter((o) => o.pos === pos), random), ...shuffle(others.filter((o) => o.pos !== pos), random)]) {
    if (wrong.length === OPTION_COUNT - 1) break;
    if (!wrong.includes(c.gloss)) wrong.push(c.gloss);
  }
  return shuffle([gloss, ...wrong], random);
}

/** One occurrence of a word in a chapter. */
export interface Occurrence {
  form: string;
  /** 'Romans 8:1' */
  reference: string;
}

const nfc = (s: string) => s.normalize('NFC');

/** The lexicon lemmas a word is found by (NFC), less any that one of `others` owns: μου also lists ἐγώ, which is the word 'I'. */
export function lemmasOf(word: Word, others: ReadonlySet<string> = new Set()): Set<string> {
  return new Set(word.lemmas.map(nfc).filter((l) => !others.has(l)));
}

/**
 * Whether a Greek word of a chapter is a form of the word whose lemmas these are. A form that is another of
 * his words (ἡμεῖς has the lexicon lemma ἐγώ, but asking it for 'I' would teach the wrong gloss) is not.
 */
export function isFormOf(g: GreekWord, lemmas: ReadonlySet<string>, others: ReadonlySet<string> = new Set()): boolean {
  return lemmas.has(nfc(wordLemma(g))) && !others.has(nfc(g.t));
}

/**
 * Every place the chapter has a word, found by any of its lexicon lemmas. `others` are the headwords of his
 * other words: a lemma one of them owns is left out, and so is a form that is another of them (see lemmasOf, isFormOf).
 */
export function formsOf(chapter: Chapter, word: Word, others: ReadonlySet<string> = new Set()): Occurrence[] {
  const lemmas = lemmasOf(word, others);
  return chapter.verses.flatMap((v) =>
    v.g
      .filter((g) => isFormOf(g, lemmas, others))
      .map((g) => ({ form: g.t, reference: `${chapter.book} ${chapter.chapter}:${v.n}` })),
  );
}

export interface Question {
  /** The store's key for the word. */
  lemma: string;
  /** What is shown in Greek: the lemma, or its form from the chapter. */
  prompt: string;
  /** Under the prompt when it is a form: 'Romans 8:1'. */
  reference?: string;
  gloss: string;
  options: string[];
}

export function buildQuestion(word: Word, pool: readonly Distractor[], chapter: Chapter | null, random: Random): Question {
  const others = new Set(pool.filter((p) => p.lemma !== word.lemma).map((p) => nfc(p.lemma)));
  const forms = chapter ? formsOf(chapter, word, others) : [];
  const occurrence = forms.length > 0 ? forms[Math.floor(random() * forms.length)] : undefined;
  const pos = pool.find((p) => p.lemma === word.lemma)?.pos;
  return {
    lemma: word.lemma,
    prompt: occurrence?.form ?? word.lemma,
    reference: occurrence?.reference,
    gloss: word.gloss,
    options: buildOptions(word.gloss, pos, word.lemma, pool, random),
  };
}
