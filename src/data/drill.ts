// src/data/drill.ts — the pure parts of the Parsing drill: an RP code split into steps of four choices, and a round of up
// to ten words drawn from a chapter and the words he knows. Nothing here touches the store or the screen; the random
// source is passed in (mulberry32 in tests), as in quiz.ts.
import { wordParse, type Chapter } from './chapter';
import type { Word } from './db';
import { PARTS_OF_SPEECH, splitParse, type ParseFeature, type ParseFeatureId } from './parseCode';
import { isFormOf, lemmasOf, shuffle, type Random } from './quiz';

export const DRILL_SIZE = 10;
/** A round asks about this many learning words first, or all it has when it has fewer. */
const LEARNING_SHARE = 5;
const OPTION_COUNT = 4;

/** One question about a word: 'pos', 'tense', 'case', 'number+gender' ... (the ids of its features, joined by '+'). */
export interface DrillStep {
  id: string;
  /** 'Part of speech', 'Number and gender' */
  label: string;
  right: string;
  /** four different choices, the right one among them */
  options: string[];
}

/** One word of the chapter to parse, with its verse so the screen can show it, and the steps to ask. */
export interface DrillQuestion {
  /** the word's key in the store: the headword he knows it by */
  lemma: string;
  /** the word as the verse has it */
  form: string;
  /** 'Romans 8:28' */
  reference: string;
  /** the book's code ('rom', '1jn'); a round kept before the chapter picker (mw-5r3p30.60) has none: it was Romans */
  book?: string;
  chapter: number;
  verse: number;
  /** the Greek words of the verse, in order; `at` is the one asked */
  words: string[];
  at: number;
  /** the RP code, 'V-PAP-DPM' */
  code: string;
  /** the code in words, for after the answer */
  parsing: string;
  steps: DrillStep[];
}

const NAMES: Record<ParseFeatureId, string> = {
  tense: 'tense',
  voice: 'voice',
  mood: 'mood',
  person: 'person',
  case: 'case',
  number: 'number',
  gender: 'gender',
};

const capitalised = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function listed(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The features cut into steps. A feature with few values (number, gender, person) cannot make four choices alone, so
 * features join until the step has four values to choose from; one left over joins the step before. */
function groupFeatures(features: readonly ParseFeature[]): ParseFeature[][] {
  const groups: ParseFeature[][] = [];
  let current: ParseFeature[] = [];
  let space = 1;
  for (const f of features) {
    current.push(f);
    space *= f.choices.length;
    if (space >= OPTION_COUNT) {
      groups.push(current);
      current = [];
      space = 1;
    }
  }
  if (current.length > 0) {
    if (groups.length > 0) groups[groups.length - 1].push(...current);
    else groups.push(current);
  }
  return groups;
}

/** Every combination of the features' choices, as the words a code would give: 'singular masculine'. */
function valuesOf(group: readonly ParseFeature[]): string[] {
  return group.reduce<string[]>((all, f) => all.flatMap((prefix) => f.choices.map((c) => (prefix ? `${prefix} ${c}` : c))), ['']);
}

function step(id: string, label: string, right: string, space: readonly string[], random: Random): DrillStep {
  const wrong = shuffle(space.filter((v) => v !== right), random).slice(0, OPTION_COUNT - 1);
  if (wrong.length < OPTION_COUNT - 1) throw new Error(`Not enough choices for ${id}`);
  return { id, label, right, options: shuffle([right, ...wrong], random) };
}

/** The questions about one word, from its RP code: the part of speech first, then what the code goes on to say. */
export function buildSteps(code: string, random: Random): DrillStep[] {
  const { pos, features } = splitParse(code);
  const parts = PARTS_OF_SPEECH.includes(pos) ? PARTS_OF_SPEECH : [...PARTS_OF_SPEECH, pos];
  const steps = [step('pos', 'Part of speech', pos, parts, random)];
  for (const group of groupFeatures(features)) {
    steps.push(
      step(
        group.map((f) => f.id).join('+'),
        capitalised(listed(group.map((f) => NAMES[f.id]))),
        group.map((f) => f.value).join(' '),
        valuesOf(group),
        random,
      ),
    );
  }
  return steps;
}

const nfc = (s: string) => s.normalize('NFC');

interface Candidate {
  word: Word;
  verse: number;
  at: number;
  code: string;
  /** whether the code says more than its part of speech */
  parsable: boolean;
}

/** The places in the chapter where a word he knows stands, each place claimed by one word. */
function candidatesOf(chapter: Chapter, words: readonly Word[]): Candidate[] {
  const headwords = new Set(words.map((w) => nfc(w.lemma)));
  const claimed = new Set<string>();
  const found: Candidate[] = [];
  for (const word of words.filter((w) => w.state !== 'dropped')) {
    const others = new Set(headwords);
    others.delete(nfc(word.lemma));
    const lemmas = lemmasOf({ ...word, lemmas: [word.lemma, ...word.lemmas] }, others);
    for (const v of chapter.verses) {
      v.g.forEach((g, at) => {
        const key = `${v.n}:${at}`;
        if (claimed.has(key) || !isFormOf(g, lemmas, others)) return;
        claimed.add(key);
        found.push({ word, verse: v.n, at, code: g.p, parsable: splitParse(g.p).features.length > 0 });
      });
    }
  }
  return found;
}

/** One place per word, in the order given. */
function onePerWord(order: readonly Word[], byWord: ReadonlyMap<string, Candidate[]>, random: Random): Candidate[] {
  return order.flatMap((w) => {
    const places = byWord.get(w.lemma) ?? [];
    return places.length > 0 ? [places[Math.floor(random() * places.length)]] : [];
  });
}

/**
 * Draws a round from `chapter`: up to `size` places where a word he knows (solid or learning) stands, ten different words
 * when he has them, five learning ones first. Words that are only their part of speech (a particle, a preposition)
 * come after every word with more to parse, and only when the round would be short without them.
 */
export function drawDrill(chapter: Chapter, words: readonly Word[], random: Random, size = DRILL_SIZE): DrillQuestion[] {
  const all = candidatesOf(chapter, words);
  const group = (list: Candidate[]) => {
    const byWord = new Map<string, Candidate[]>();
    for (const c of list) byWord.set(c.word.lemma, [...(byWord.get(c.word.lemma) ?? []), c]);
    return byWord;
  };
  const parsable = group(all.filter((c) => c.parsable));
  const plain = group(all.filter((c) => !c.parsable));
  const wordsOf = (byWord: ReadonlyMap<string, Candidate[]>, state: Word['state']) =>
    shuffle([...byWord.values()].map((places) => places[0].word).filter((w) => w.state === state), random);

  const learning = wordsOf(parsable, 'learning');
  const solid = wordsOf(parsable, 'solid');
  const first = onePerWord([...learning.slice(0, LEARNING_SHARE), ...solid, ...learning.slice(LEARNING_SHARE)], parsable, random);
  const again = shuffle(all.filter((c) => c.parsable && !first.includes(c)), random);
  const rest = shuffle(onePerWord([...plain.values()].map((places) => places[0].word), plain, random), random);
  const more = shuffle(all.filter((c) => !c.parsable && !rest.includes(c)), random);

  return shuffle([...first, ...again, ...rest, ...more].slice(0, size), random).map((c) => {
    const verse = chapter.verses.find((v) => v.n === c.verse);
    if (!verse) throw new Error(`No verse ${c.verse}`);
    const g = verse.g[c.at];
    return {
      lemma: c.word.lemma,
      form: g.t,
      reference: `${chapter.book} ${chapter.chapter}:${verse.n}`,
      book: chapter.code,
      chapter: chapter.chapter,
      verse: verse.n,
      words: verse.g.map((w) => w.t),
      at: c.at,
      code: c.code,
      parsing: wordParse(chapter, g),
      steps: buildSteps(c.code, random),
    };
  });
}
