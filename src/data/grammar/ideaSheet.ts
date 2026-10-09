// src/data/grammar/ideaSheet.ts — what the idea sheet (src/IdeaSheet.tsx, mw-hqd5bz.7) shows of a grammar idea, worked out from the
// chapter files alone: the passage the examples come from (the goal's, else the open chapter), up to three example forms of the
// idea in it, and a paradigm table built from the passage's own forms: the article in a case, or the persons of one verb in a
// tense, with a blank where the passage has no form. Pure data work: no store, no screen; docs/grammar.md.
import { type BookIndex, type Chapter, type GreekWord } from '../chapter';
import { goalText, parseGoal } from '../goal';
import { splitParse } from '../parseCode';
import type { OpenChapter } from '../readerChapter';
import { ideasOf, type GrammarIdea } from './ladder';

/** A book goal looks in its first chapters only: every chapter would be a request each. */
export const MAX_CHAPTERS = 5;
export const MAX_EXAMPLES = 3;

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

export interface IdeaExample {
  word: GreekWord;
  /** the chapter it stands in: its parsing and gloss are read from it */
  chapter: Chapter;
  verse: number;
  /** '1 John 1:1' */
  reference: string;
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

/** Up to `max` words of the passage whose parsing needs the idea (ideasOf), one for each lemma, in the order of the text. */
export function ideaExamples(id: string, chapters: Chapter[], verse?: number, max = MAX_EXAMPLES): IdeaExample[] {
  const needs = new Map<string, boolean>();
  const has = (code: string): boolean => {
    let found = needs.get(code);
    if (found === undefined) {
      found = ideasOf(code).includes(id);
      needs.set(code, found);
    }
    return found;
  };
  const chosen: IdeaExample[] = [];
  const lemmas = new Set<string>();
  for (const { word, chapter, verse: n } of wordsOf(chapters, verse)) {
    if (chosen.length >= max) break;
    if (lemmas.has(word.l) || !has(word.p)) continue;
    lemmas.add(word.l);
    chosen.push({ word, chapter, verse: n, reference: `${chapter.book} ${chapter.chapter}:${n}` });
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
