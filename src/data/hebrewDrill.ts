// src/data/hebrewDrill.ts — the Parsing drill on a Hebrew word (mw-gdcyf98.19): the word's parsing in plain words ('Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine
// singular', docs/data.md) cut into steps of four choices, asked the way the Greek ones are: the part of speech first, then, for a verb, its stem, its form and its person, gender and number,
// for a noun or an adjective its gender and number. The words are the Hebrew parsing terms of the Grammar sheet (src/data/grammar/hebrew/terms.ts); the wrong choices are near misses first (choices.ts).
// Pure: the random source is passed in.
import { OPTION_COUNT, choicesOf } from './choices';
import type { DrillStep } from './drill';
import { shuffle, type Random } from './random';

/** The part-of-speech heads of a parsing, lowest to highest in what they say; the segment of the word's own part of speech is the first one that has one of these. */
const PARTS = ['Verb', 'Noun', 'Adjective', 'Pronoun', 'Number'];
/** The parts of speech a drill offers (a word's own, when it is another such as 'Interjection', is added). */
const POS_CHOICES = ['noun', 'verb', 'adjective', 'pronoun', 'preposition', 'conjunction', 'adverb', 'article', 'number'];
const STEMS = ['Qal', 'Nifal', 'Piel', 'Pual', 'Hifil', 'Hofal', 'Hitpael'];
const FORMS = ['Perfect', 'Imperfect', 'Consecutive imperfect', 'Imperative', 'Participle', 'Infinitive construct', 'Infinitive absolute'];
/** Forms a reader takes for each other. */
const MISTAKEN: readonly [string, string][] = [
  ['Perfect', 'Imperfect'], ['Imperfect', 'Consecutive imperfect'], ['Imperfect', 'Imperative'], ['Participle', 'Infinitive absolute'],
  ['Infinitive construct', 'Infinitive absolute'], ['Nifal', 'Hitpael'], ['Piel', 'Pual'], ['Hifil', 'Hofal'], ['Qal', 'Nifal'], ['noun', 'adjective'], ['preposition', 'adverb'],
];
const mistakenFor = (value: string): string[] => MISTAKEN.flatMap(([a, b]) => (a === value ? [b] : b === value ? [a] : []));
const PERSONS = ['first person', 'second person', 'third person'];
const GENDERS = ['masculine', 'feminine', 'common'];
const NUMBERS = ['singular', 'plural', 'dual'];

/** The segment of a parsing that is the word itself, cut into its terms: 'Conjunctive waw | Verb - Hifil - Consecutive imperfect - third person feminine singular' is Verb, Hifil, ... */
export function termsOf(parsing: string): string[] {
  const segments = parsing.split(' | ').map((s) => s.trim()).filter(Boolean);
  const own = segments.find((s) => PARTS.includes(s.split(' - ')[0])) ?? segments[segments.length - 1] ?? '';
  return own.split(' - ').map((t) => t.trim()).filter(Boolean);
}

/** The part of speech the first term names, in the lower case of the other choices: 'Preposition-b' is 'preposition'. */
const posOf = (head: string): string => head.replace(/-.*$/, '').toLowerCase();

/** A phrase of person, gender and number or gender and number, and the phrases that differ from it in one of those: 'third person masculine singular' -> 'third person feminine singular' ... */
function phraseSpace(phrase: string): { near: string[]; others: string[] } {
  const words = phrase.split(' ');
  const swaps = (list: readonly string[], at: number | undefined): string[][] =>
    at === undefined ? [] : list.filter((v) => v !== words[at]).map((v) => words.map((w, i) => (i === at ? v : w)));
  const gender = words.findIndex((w) => GENDERS.includes(w));
  const number = words.findIndex((w) => NUMBERS.includes(w));
  const person = (() => {
    const i = words.findIndex((w, k) => PERSONS.some((p) => p.startsWith(w) && words[k + 1] === 'person'));
    return i < 0 ? undefined : i;
  })();
  const join = (list: string[][]): string[] => list.map((w) => w.join(' '));
  const one = [...swaps(NUMBERS, number >= 0 ? number : undefined), ...swaps(GENDERS, gender >= 0 ? gender : undefined)];
  const personSwaps = person === undefined ? [] : PERSONS.filter((p) => !p.startsWith(words[person])).map((p) => words.map((w, i) => (i === person ? p.split(' ')[0] : w)));
  const two = [...swaps(NUMBERS, number >= 0 ? number : undefined), ...swaps(GENDERS, gender >= 0 ? gender : undefined)].flatMap((first) => {
    const w = first;
    const g = w.findIndex((x) => GENDERS.includes(x));
    return g < 0 ? [] : GENDERS.filter((x) => x !== w[g]).map((x) => w.map((y, i) => (i === g ? x : y)));
  });
  return { near: [...join(one), ...join(personSwaps)], others: join(two) };
}

function step(id: string, label: string, right: string, near: readonly string[], fillers: readonly string[], random: Random): DrillStep {
  const { options, near: nearest } = choicesOf({ right, near, fillers }, random);
  if (options.length < OPTION_COUNT) throw new Error(`Not enough choices for ${id}`);
  return { id, label, right, options, near: nearest };
}

/** The choices of one term among a fixed list, the right one added to it when the list lacks it. */
function among(id: string, label: string, right: string, list: readonly string[], random: Random): DrillStep {
  const space = list.includes(right) ? list : [...list, right];
  return step(id, label, right, shuffle(mistakenFor(right).filter((m) => space.includes(m)), random), space, random);
}

/** The questions about one Hebrew word, from its parsing in plain words: its part of speech, then what the parsing goes on to say (stem, form, person, gender and number). */
export function hebrewSteps(parsing: string, random: Random): DrillStep[] {
  const terms = termsOf(parsing);
  if (terms.length === 0) throw new Error('A Hebrew word with no parsing cannot be drilled');
  const pos = posOf(terms[0]);
  const steps = [among('pos', 'Part of speech', pos, POS_CHOICES, random)];
  if (terms[0] === 'Verb') {
    const [, stem, form, ...rest] = terms;
    if (stem) steps.push(among('stem', 'Stem', stem, STEMS, random));
    if (form) steps.push(among('form', 'Form', form, FORMS, random));
    for (const phrase of rest) {
      const { near, others } = phraseSpace(phrase);
      steps.push(step('person+gender+number', 'Person, gender and number', phrase, near, [...near, ...others], random));
    }
  } else if (terms.length > 1) {
    const phrase = terms.slice(1).join(' ');
    const { near, others } = phraseSpace(phrase);
    if (near.length + others.length >= OPTION_COUNT - 1) steps.push(step('gender+number', 'Gender and number', phrase, near, [...near, ...others], random));
  }
  return steps;
}
