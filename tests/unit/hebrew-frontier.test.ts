// src/data/frontier.ts on a Hebrew chapter (mw-gdcyf98.19): the same rule as the Greek, read from the Hebrew frequency list (public/data/frequency-hbo.json), counting only his Hebrew words;
// a Greek chapter's new words are what they were.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { pickFrontier, type Known } from '../../src/data/frontier';
import type { FrequencyEntry } from '../../src/data/frequency';

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const genesis1 = read<Chapter>('public/data/gen/1.json');
const romans8 = read<Chapter>('public/data/rom/8.json');
const hebrewCounts = read<FrequencyEntry[]>('public/data/frequency-hbo.json');
const greekCounts = read<FrequencyEntry[]>('public/data/frequency.json');

const nobody: Known = { solid: new Set(), learning: new Set(), dropped: new Set() };
const lemmas = (list: { lemma: string }[]) => list.map((c) => c.lemma);

describe('pickFrontier on an Old Testament chapter', () => {
  it("offers a fresh reader Genesis 1's three commonest Hebrew words first, each with the gloss of the chapter's lexicon", () => {
    const firstThree = pickFrontier(genesis1, nobody, hebrewCounts, 3);
    expect(firstThree.map((c) => [c.lemma, c.gloss])).toEqual([
      ['אֵת', '[Obj.]'],
      ['עַל', 'upon'],
      ['אֶל', 'to(wards)'],
    ]);
    expect(firstThree.every((c) => c.strongs.startsWith('H'))).toBe(true);
  });

  it('skips a Hebrew word he has solid, is learning or dropped, and offers the next', () => {
    const known: Known = { solid: new Set(['אֵת']), learning: new Set(['עַל']), dropped: new Set(['אֶל']) };
    expect(lemmas(pickFrontier(genesis1, known, hebrewCounts, 2))).toEqual(['אֲשֶׁר', 'כֹּל']);
  });

  it('puts a name after every other word, as the Greek does', () => {
    const all = pickFrontier(genesis1, nobody, hebrewCounts, 1000);
    const firstName = all.findIndex((c) => hebrewCounts.find((e) => e.strongs === c.strongs)?.proper);
    expect(firstName).toBeGreaterThan(0);
    expect(all.slice(firstName).every((c) => hebrewCounts.find((e) => e.strongs === c.strongs)?.proper)).toBe(true);
  });

  it("leaves a Greek chapter's new words as they were", () => {
    expect(lemmas(pickFrontier(romans8, nobody, greekCounts, 3))).toEqual(['καί', 'αὐτός', 'σύ']);
    expect(lemmas(pickFrontier(romans8, { ...nobody, solid: new Set(['καί']) }, greekCounts, 3))).toEqual(['αὐτός', 'σύ', 'δέ']);
  });
});
