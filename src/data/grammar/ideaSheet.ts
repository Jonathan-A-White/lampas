// src/data/grammar/ideaSheet.ts — what the idea sheet (src/IdeaSheet.tsx, mw-hqd5bz.7) shows of a grammar idea, worked out from the
// chapter files alone: the passage the examples come from (the goal's, else the open chapter), up to three example forms of the
// idea in it, and a paradigm table built from the passage's own forms: the article in a case, or the persons of one verb in a
// tense, with a blank where the passage has no form. Pure data work: no store, no screen; docs/grammar.md.
import { type BookIndex, type Chapter, type GreekWord } from '../chapter';
import { goalText, parseGoal } from '../goal';
import { splitParse } from '../parseCode';
import type { OpenChapter } from '../readerChapter';
import { clustersOf, foundationSpans, isFoundation, type Span } from './inference';
import { ideasOfWord, type GrammarIdea } from './ladder';

/** A book goal looks in its first chapters only: every chapter would be a request each. */
export const MAX_CHAPTERS = 5;
export const MAX_EXAMPLES = 3;
/** A foundation idea shows more: a sound or a letter is met in many forms, and each form shows it in a different place (mw-86e9r1.13). */
export const MAX_FOUNDATION_EXAMPLES = 12;

type ChapterLoader = (book: string, n: number) => Promise<Chapter>;

export interface IdeaPassage {
  /** 'Romans 8', '1 John 1:3': what the examples are said to come from */
  title: string;
  chapters: Chapter[];
  /** a verse goal: only this verse of its chapter */
  verse?: number;
}

/**
 * The passage the examples of an idea come from: the goal named by `goalSaved` (the goal setting's text, any form parseGoal reads),
 * its chapter, its one verse or the first MAX_CHAPTERS chapters of its book; with no goal, or one that names nothing the index
 * has, the open chapter. The index may be left out when there is no goal text to read.
 */
export async function ideaPassage(goalSaved: string | undefined, open: OpenChapter, load: ChapterLoader, index?: BookIndex): Promise<IdeaPassage> {
  const goal = goalSaved && index ? parseGoal(goalSaved, index) : undefined;
  if (!goal) return { title: open.title, chapters: [await load(open.book, open.chapter)] };
  const count = index?.books.find((b) => b.code === goal.book)?.chapters ?? 0;
  const numbers = goal.chapter !== undefined ? [goal.chapter] : Array.from({ length: Math.min(count, MAX_CHAPTERS) }, (_, i) => i + 1);
  return { title: goalText(goal), chapters: await Promise.all(numbers.map((n) => load(goal.book, n))), verse: goal.verse };
}

/** A stretch of an example's Greek: `marked` is the part an idea is about (the pair of vowels, the breathing's vowel, the letter). */
export interface ExamplePart {
  text: string;
  marked: boolean;
}

export interface IdeaExample {
  word: GreekWord;
  /** the chapter it stands in: its parsing and gloss are read from it */
  chapter: Chapter;
  verse: number;
  /** '1 John 1:1' */
  reference: string;
  /** the word's Greek in order, the letters the idea is about marked; one unmarked part for a grammar idea */
  parts: ExamplePart[];
}

/** Words of `chapters` (the one `verse` of the first, when given), in text order. */
function* wordsOf(chapters: Chapter[], verse?: number): Generator<{ word: GreekWord; chapter: Chapter; verse: number }> {
  for (const chapter of chapters) {
    for (const v of chapter.verses) {
      if (verse !== undefined && v.n !== verse) continue;
      for (const word of v.g) yield { word, chapter, verse: v.n };
    }
  }
}

/** True for an idea about how Greek is spelt and said (the alphabet, a letter, a pair, a breathing, an accent, iota subscript, syllables,
 * punctuation): its examples are forms with the letters marked, found by their spelling, never by their parsing. */
export const isSpellingIdea = (id: string): boolean => id === 'alphabet' || id === 'syllables' || id === 'punctuation' || isFoundation(id);

/** Spans put in order with any that overlap made one. */
function joined(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && span.start < last.end) last.end = Math.max(last.end, span.end);
    else out.push({ ...span });
  }
  return out;
}

/** The form cut into parts, the clusters in `spans` marked. */
function partsOf(form: string, spans: Span[]): ExamplePart[] {
  const clusters = clustersOf(form).map((c) => (c.text + c.marks).normalize('NFC'));
  const parts: ExamplePart[] = [];
  let at = 0;
  const push = (to: number, marked: boolean): void => {
    if (to > at) parts.push({ text: clusters.slice(at, to).join(''), marked });
    at = Math.max(at, to);
  };
  for (const span of joined(spans)) {
    push(span.start, false);
    push(span.end, true);
  }
  push(clusters.length, false);
  return parts;
}

/** The spans of a form an idea of spelling is about, or undefined when the form is not spelt with it; 'alphabet' (any form) has none to mark. */
function spellingOf(id: string, form: string): Span[] | undefined {
  const spans = foundationSpans(form);
  if (id === 'alphabet') return clustersOf(form).some((c) => c.letter) ? [] : undefined;
  const found = spans.get(id);
  // a word of one syllable has nothing to cut
  if (id === 'syllables') return found && found.length >= 2 ? found : undefined;
  return found;
}

/**
 * Up to `max` words of the passage in the order of the text. For a grammar idea: the words whose parsing needs it (ideasOfWord), one for each
 * lemma. For an idea of spelling (isSpellingIdea): the words spelt with it, one for each form, with the letters it is about marked in
 * `parts`, up to MAX_FOUNDATION_EXAMPLES when `max` is not given.
 */
export function ideaExamples(id: string, chapters: Chapter[], verse?: number, max?: number): IdeaExample[] {
  const spelling = isSpellingIdea(id);
  const limit = max ?? (spelling ? MAX_FOUNDATION_EXAMPLES : MAX_EXAMPLES);
  const needs = new Map<string, boolean>();
  const has = (word: GreekWord): boolean => {
    const key = `${word.l} ${word.p}`;
    let found = needs.get(key);
    if (found === undefined) {
      found = ideasOfWord(word).includes(id);
      needs.set(key, found);
    }
    return found;
  };
  const chosen: IdeaExample[] = [];
  const seen = new Set<string>();
  for (const { word, chapter, verse: n } of wordsOf(chapters, verse)) {
    if (chosen.length >= limit) break;
    const key = spelling ? word.t.normalize('NFC').toLowerCase() : word.l;
    if (seen.has(key)) continue;
    let parts: ExamplePart[];
    if (spelling) {
      const spans = spellingOf(id, word.t);
      if (!spans) continue;
      parts = partsOf(word.t, spans);
    } else {
      if (!has(word)) continue;
      parts = [{ text: word.t, marked: false }];
    }
    seen.add(key);
    chosen.push({ word, chapter, verse: n, reference: `${chapter.book} ${chapter.chapter}:${n}`, parts });
  }
  return chosen;
}

export interface Paradigm {
  /** 'The article in the genitive', 'λέγω in the aorist' */
  title: string;
  /** a tense's table is of one verb: its lemma, and how it is parsed ('θεάομαι, aorist middle deponent indicative') */
  lemma?: string;
  verb?: string;
  columns: string[];
  rows: { label: string; cells: (string | null)[] }[];
}

const NUMBERS = ['singular', 'plural'];
const GENDERS = ['masculine', 'feminine', 'neuter'];
const PERSONS = ['1st person', '2nd person', '3rd person'];
/** The moods that have a person: a tense's persons are shown from these. */
const FINITE = ['indicative', 'subjunctive', 'optative', 'imperative'];

const isLower = (form: string): boolean => form === form.toLowerCase();

/** A blank grid of `rows` by `columns`. */
const grid = (rows: string[], columns: string[]): (string | null)[][] => rows.map(() => columns.map(() => null));

/** Puts `form` in a cell; a form that starts a sentence (capital) gives way to one in the middle of it. */
function place(cells: (string | null)[][], row: number, column: number, form: string): void {
  const there = cells[row][column];
  if (there === null || (!isLower(there) && isLower(form))) cells[row][column] = form;
}

function articleIn(grammarCase: string, chapters: Chapter[], verse?: number): Paradigm | null {
  const cells = grid(NUMBERS, GENDERS);
  for (const { word } of wordsOf(chapters, verse)) {
    if (!word.p.startsWith('T-')) continue;
    const values = Object.fromEntries(splitParse(word.p).features.map((f) => [f.id, f.value]));
    if (values.case !== grammarCase) continue;
    const [row, column] = [NUMBERS.indexOf(values.number), GENDERS.indexOf(values.gender)];
    if (row >= 0 && column >= 0) place(cells, row, column, word.t);
  }
  if (cells.every((row) => row.every((c) => c === null))) return null;
  return { title: `The article in the ${grammarCase}`, columns: GENDERS, rows: NUMBERS.map((label, i) => ({ label, cells: cells[i] })) };
}

function personsOf(tense: string, chapters: Chapter[], verse?: number): Paradigm | null {
  const verbs = new Map<string, { lemma: string; verb: string; cells: (string | null)[][]; filled: number }>();
  for (const { word } of wordsOf(chapters, verse)) {
    if (!word.p.startsWith('V-')) continue;
    const values = Object.fromEntries(splitParse(word.p).features.map((f) => [f.id, f.value]));
    if (values.tense !== tense || !FINITE.includes(values.mood)) continue;
    const [row, column] = [NUMBERS.indexOf(values.number), PERSONS.indexOf(values.person)];
    if (row < 0 || column < 0) continue;
    const key = `${word.l}|${values.voice}|${values.mood}`;
    let verb = verbs.get(key);
    if (!verb) {
      verb = { lemma: word.l, verb: `${word.l}, ${tense} ${values.voice} ${values.mood}`, cells: grid(NUMBERS, PERSONS), filled: 0 };
      verbs.set(key, verb);
    }
    if (verb.cells[row][column] === null) verb.filled++;
    place(verb.cells, row, column, word.t);
  }
  // the verb with the most persons; the first of the text when they tie (Map keeps the order of first use)
  let best: { lemma: string; verb: string; cells: (string | null)[][]; filled: number } | undefined;
  for (const verb of verbs.values()) if (!best || verb.filled > best.filled) best = verb;
  if (!best) return null;
  return { title: `${best.lemma} in the ${tense}`, lemma: best.lemma, verb: best.verb, columns: PERSONS, rows: NUMBERS.map((label, i) => ({ label, cells: best.cells[i] })) };
}

/** The paradigm table of a case idea (the article's forms in that case across number and gender) or a tense idea (the persons of
 * one verb of the passage), from the passage's own forms; null for any other idea, or when the passage has none to show. */
export function paradigmOf(idea: GrammarIdea, chapters: Chapter[], verse?: number): Paradigm | null {
  const term = idea.terms[0];
  if (idea.id.startsWith('case-')) return articleIn(term, chapters, verse);
  if (idea.id.startsWith('tense-')) return personsOf(term, chapters, verse);
  return null;
}
