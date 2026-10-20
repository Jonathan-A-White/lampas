// tests/unit/reading-weave.test.ts — the reading check with the weave on (mw-5r3p30.411): the verse is read as it stands on screen, the words shown in Greek in
// Greek and the English in English, and the request carries it as ordered segments [{text, lang}] for the mill's scorer, which turns each to IPA in its own language.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { GreekWord, Verse } from '../../src/data/chapter';
import { chunkOrder, type Woven, type WovenVerse } from '../../src/data/weave';
import { buildReadingRequest, readingText, wordsOfText, wovenReading } from '../../src/services/reading';
import { validate, type Schema } from '../support/schema-validate';

const word = (t: string): GreekWord => ({ t, l: t, p: 'x', s: 'x' }) as unknown as GreekWord;
/** 'And we know that love' with Greek for And (Καὶ) and love (ἀγαπῶσιν), two English words for οἴδαμεν, and the Greek order οἴδαμεν ... Καὶ */
const verse = (n: number, chunks: { t: string; g: number[] }[], g: string[]): Verse => ({ n, g: g.map(word), e: chunks }) as unknown as Verse;
const v1 = verse(1, [{ t: 'And', g: [0] }, { t: ' we know ', g: [1] }, { t: 'that', g: [] }, { t: 'love', g: [2] }], ['Καὶ', 'οἴδαμεν', 'ἀγαπῶσιν']);
const shown = (v: Verse, ...chunks: number[]): WovenVerse => v.e.map((c, i): Woven => (chunks.includes(i) ? { words: c.g.map((k) => v.g[k]), learning: false } : null));

describe('wovenReading', () => {
  it('lays the verse out as it is shown: English chunks in English, the Greek of a woven chunk in Greek, neighbours of one language joined', () => {
    const reading = wovenReading([v1], [shown(v1, 0, 3)], 'el');
    expect(reading?.segments).toEqual([
      { text: 'Καὶ', lang: 'el' },
      { text: 'we know that', lang: 'en' },
      { text: 'ἀγαπῶσιν', lang: 'el' },
    ]);
    expect(reading?.words.map((w) => w.t)).toEqual(['Καὶ', 'ἀγαπῶσιν']);
  });

  it('is null with no word shown in Greek, and with no weave', () => {
    expect(wovenReading([v1], [shown(v1)], 'el')).toBeNull();
    expect(wovenReading([v1], [null], 'el')).toBeNull();
  });

  it("follows the order the weave lays the chunks out in (Order: Greek), not the English's", () => {
    const swapped = verse(2, [{ t: 'love', g: [1] }, { t: 'God', g: [0] }], ['Θεός', 'ἀγάπη']);
    const greekFirst = Object.assign(shown(swapped, 0), { order: chunkOrder(swapped, 'greek') }) as WovenVerse;
    const reading = wovenReading([swapped], [greekFirst], 'el');
    expect(reading?.segments).toEqual([
      { text: 'God', lang: 'en' },
      { text: 'ἀγάπη', lang: 'el' },
    ]);
  });

  it("takes a passage's verses one after another, each in its own order", () => {
    const v2 = verse(2, [{ t: 'He', g: [] }, { t: 'God', g: [0] }], ['Θεός']);
    const reading = wovenReading([v1, v2], [shown(v1, 0), shown(v2, 1)], 'el');
    expect(reading?.segments.map((s) => `${s.lang}:${s.text}`)).toEqual(['el:Καὶ', 'en:we know that love He', 'el:Θεός']);
  });

  it('leaves out a chunk with no words', () => {
    const blank = verse(3, [{ t: ' ', g: [] }, { t: 'Lord', g: [0] }], ['Κύριος']);
    expect(wovenReading([blank], [shown(blank, 1)], 'el')?.segments).toEqual([{ text: 'Κύριος', lang: 'el' }]);
  });
});

describe('the reading text and request of a woven verse', () => {
  const weave = wovenReading([v1], [shown(v1, 0, 3)], 'el');

  it('is the segments one after another, so a word the mill marks by index is the word on screen', () => {
    expect(readingText(v1, 'english', weave)).toBe('Καὶ we know that ἀγαπῶσιν');
    expect(wordsOfText(readingText(v1, 'english', weave))[4]).toBe('ἀγαπῶσιν');
    expect(readingText(v1, 'english', null)).toBe('And we know that love');
  });

  it('sends target_text, lang en, the ordered segments and the Greek words shown, nothing else changed', () => {
    const request = buildReadingRequest('Romans 8:28', v1, 'english', 'en', undefined, undefined, undefined, undefined, undefined, undefined, weave);
    expect(request).toMatchObject({
      reference: 'Romans 8:28',
      target_text: 'Καὶ we know that ἀγαπῶσιν',
      lang: 'en',
      segments: [
        { text: 'Καὶ', lang: 'el' },
        { text: 'we know that', lang: 'en' },
        { text: 'ἀγαπῶσιν', lang: 'el' },
      ],
    });
    expect(request.greek_words?.map((w) => w.form)).toEqual(['Καὶ', 'ἀγαπῶσιν']);
  });

  it('has no segments for a verse with nothing shown in Greek', () => {
    const request = buildReadingRequest('Romans 8:28', v1, 'english', 'en');
    expect(request).not.toHaveProperty('segments');
    expect(request).not.toHaveProperty('greek_words');
    expect(request.target_text).toBe('And we know that love');
  });

  it('fits the input schema', () => {
    const schema = JSON.parse(readFileSync('grinds/verse-read.input.schema.json', 'utf8')) as Schema;
    const request = buildReadingRequest('Romans 8:28', v1, 'english', 'en', undefined, undefined, undefined, undefined, undefined, undefined, weave);
    expect(validate(request, schema)).toEqual([]);
    expect(validate({ ...request, segments: [{ text: 'x', lang: 'fr' }] }, schema)).not.toEqual([]);
  });
});
