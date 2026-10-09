// A made-up chapter and word-count table that prove every rule of src/data/frontier.ts (docs/frontier.md).
// It is not Romans 8, so the tests do not change when the data does. The words are real Greek words with
// invented counts; καί and εἰμί are the words he knows in every scenario.
import type { Chapter, GreekWord, Verse } from '../../src/data/chapter';
import type { FrequencyEntry } from '../../src/data/frequency';

/** lemma -> [Strong's number, gloss, times the New Testament uses it, a name]. The chapter's `lex` and the table are made from this. */
const WORDS: Record<string, [string, string, number, boolean]> = {
  'καί': ['G2532', 'and', 9217, false],
  'εἰμί': ['G1510', 'to be', 2500, false],
  'θεός': ['G2316', 'God', 1317, false],
  'λόγος': ['G3056', 'word', 330, false],
  'ἀγάπη': ['G26', 'love', 116, false],
  'δόξα': ['G1391', 'glory', 100, false],
  'ἔργον': ['G2041', 'work', 100, false],
  'ὁδός': ['G3598', 'way', 100, false],
  'Παῦλος': ['G3972', 'Paul', 158, true],
  // Commoner than every word he lacks, so that only the rule keeps them out of the list.
  'κόσμος': ['G2889', 'world', 2000, false],
  'φῶς': ['G5457', 'light', 1800, false],
};

const word = (lemma: string): GreekWord => ({ t: lemma, tr: '', s: WORDS[lemma][0], l: lemma, p: 'N-NSM' });

/** A verse of these lemmas; each word is its own English chunk. */
const verse = (n: number, ...lemmas: string[]): Verse => ({
  n,
  g: lemmas.map(word),
  e: lemmas.map((l, i) => ({ t: WORDS[l][1], g: [i] })),
});

export const FIXTURE_CHAPTER: Chapter = {
  book: 'Test',
  code: 'tst',
  chapter: 1,
  lex: Object.fromEntries(Object.values(WORDS).map(([s, g]) => [s, { g, d: g }])),
  parse: { 'N-NSM': 'noun nominative singular masculine' },
  verses: [
    verse(1, 'καί', 'θεός', 'εἰμί', 'λόγος'), // θεός and λόγος: 2 of 4 words solid
    verse(2, 'καί', 'εἰμί', 'Παῦλος'), // Παῦλος: 2 of 3
    verse(3, 'θεός', 'καί', 'εἰμί', 'καί', 'ἀγάπη', 'φῶς'), // 3 of 6 (φῶς is learning)
    verse(4, 'θεός', 'καί', 'εἰμί'), // θεός: 2 of 3, three words
    verse(5, 'ἀγάπη', 'καί', 'εἰμί', 'καί'), // ἀγάπη: 3 of 4
    verse(6, 'θεός', 'θεός', 'καί', 'καί', 'εἰμί', 'εἰμί'), // θεός: 4 of 6, the same share as verse 4 but longer
    verse(7, 'ἀγάπη', 'λόγος'), // none solid; shorter than verse 5 but harder
    verse(8, 'ἔργον', 'δόξα', 'κόσμος'),
    verse(9, 'ὁδός', 'δόξα'),
  ],
};

/** The table loadFrequency would give: commonest first. */
export const FIXTURE_FREQUENCY: FrequencyEntry[] = Object.entries(WORDS)
  .map(([lemma, [strongs, , count, proper]]) => ({ strongs, lemma, count, chapters: Math.min(count, 260), proper }))
  .sort((a, b) => b.count - a.count);

export const FIXTURE_SOLID = new Set(['καί', 'εἰμί']);
export const FIXTURE_LEARNING = new Set(['φῶς']);
export const FIXTURE_DROPPED = new Set(['κόσμος']);
