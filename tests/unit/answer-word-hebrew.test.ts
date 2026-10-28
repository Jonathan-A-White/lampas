// A Hebrew word of the companion's answer (mw-gdcyf98.20): found again in the chapter, its lemma looked up in the Hebrew lexicon and added to his words as a Hebrew word (Word.lang 'hbo'),
// and never mistaken for a Greek one. Genesis 1 and Jonah 1 are the copies of the built chapters in tests/fixtures/data.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { addLemmaToLearn, findGreekWord, glossOf } from '../../src/data/answerWord';
import { db } from '../../src/data/db';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { stubChapterFetch } from '../support/chapter-fetch';

const gen1 = JSON.parse(readFileSync('tests/fixtures/data/gen/1.json', 'utf8')) as Chapter;
const scope = { title: 'Genesis 1', chapter: gen1, verse: null };
const LEMMA = 'רֵאשִׁית';
const FORM = hebrewPointedForm(gen1.verses[0].g[0].t);

beforeEach(async () => {
  stubChapterFetch();
  await db.open();
  await db.words.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('findGreekWord for a Hebrew word of an answer', () => {
  it('finds the word as the app writes the verse\'s Hebrew, pointed with the cantillation off', () => {
    const found = findGreekWord({ ...scope, verse: gen1.verses[0] }, { greek: FORM, lemma: 'x', note: 'y', language: 'he' });
    expect(found).toBe(gen1.verses[0].g[0]);
  });

  it('finds a Hebrew word by its lemma when the form was written loosely', () => {
    const found = findGreekWord(scope, { greek: 'zzz', lemma: LEMMA, note: 'y', language: 'he' });
    expect(found?.l).toBe(LEMMA);
  });

  it('gives the chapter\'s gloss of the word', () => {
    expect(glossOf(scope, { greek: 'zzz', lemma: LEMMA, note: 'y', language: 'he' })).toBe('first, beginning');
  });
});

describe('addLemmaToLearn for a Hebrew lemma', () => {
  it('looks the lemma up in the Hebrew lexicon and lists it with its language, the lexicon\'s gloss and part of speech', async () => {
    const added = await addLemmaToLearn(scope, LEMMA, 1000);
    expect(added).toEqual({ headword: LEMMA, result: 'added' });
    const row = await db.words.get(LEMMA);
    expect(row).toMatchObject({ lemma: LEMMA, lang: 'hbo', gloss: 'first, beginning', state: 'learning' });
  });

  it('says a Hebrew lemma already listed is already there', async () => {
    await addLemmaToLearn(scope, LEMMA, 1000);
    expect((await addLemmaToLearn(scope, LEMMA, 2000)).result).toBe('already');
    expect(await db.words.count()).toBe(1);
  });

  it('does not add a Hebrew word the Hebrew lexicon lacks, and does not look in the Greek one', async () => {
    expect((await addLemmaToLearn(scope, 'אבגדה', 1000)).result).toBe('unknown');
    expect(await db.words.count()).toBe(0);
  });
});
