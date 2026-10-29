// mw-5vvlay.3, kept for the Bible talk when the verse ask was retired (mw-5r3p30.850): the talk on a verse of an 'hbo' chapter sends the verse's Hebrew words with their lemma, parsing and gloss
// and the English, in the shape the Greek verse is sent (greek_words, src/services/greekWords.ts), generalised by the chapter's source language (src/services/hebrewWords.ts).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { buildTalkRequest, fitHistory } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

const jonah = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;
const verse10 = jonah.verses.find((v) => v.n === 10);
if (!verse10) throw new Error('no verse 10');
const size = (r: unknown) => new TextEncoder().encode(JSON.stringify(r)).length;
const scope = { title: 'Jonah 1', chapter: jonah, verse: verse10 };
// the Hebrew dial at Curious: from there the talk on an Old Testament chapter sends its Hebrew
const CURIOUS = { hebrewInterest: '1' };
const ask = (question: string, solid: string[] = []) => buildTalkRequest(scope, question, [], solid, CURIOUS);
const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;

describe('the Bible talk on Jonah 1:10 sends the Hebrew', () => {
  it('lists each distinct Hebrew word with its lemma, transliteration, gloss and parsing in plain words', () => {
    const words = ask('What does the Hebrew say for fear?').hebrew_words ?? [];
    expect(words[0]).toEqual({
      form: 'וַיִּירְאוּ',
      lemma: 'יָרֵא',
      translit: 'way·yî·rə·’ū',
      gloss: 'to fear',
      parse: 'Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine plural',
    });
    // כִּי stands three times in the verse, twice as כִּי־ (with the maqaf) and once alone: two forms, each listed once
    const kiLemma = verse10.g.find((w) => w.s === 'H3588')?.l;
    expect(words.filter((w) => w.lemma === kiLemma)).toEqual([expect.objectContaining({ form: 'כִּי־' }), expect.objectContaining({ form: 'כִּי' })]);
    // a word the table gives no Strong's number for (the preposition and suffix of 'to them') still goes, with what the data has
    expect(words.some((w) => w.gloss === undefined && w.parse.includes('Pronoun'))).toBe(true);
  });

  it('fits the bible-talk input schema and the grist, even with a pasted question and a full solid list', () => {
    expect(validate(ask('What does the Hebrew say for fear?'), inputSchema)).toEqual([]);
    const request = fitHistory(ask('Say it again. '.repeat(150), Array.from({ length: 5000 }, (_, i) => `λέξις${i}`)));
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.hebrew).toContain('הָאֲנָשִׁים');
  });

  it('keeps a word the question names when a long passage\'s list stops before it', () => {
    const passage = { ...verse10, g: jonah.verses.flatMap((v) => v.g) };
    const last = passage.g[passage.g.length - 2];
    const request = buildTalkRequest({ title: 'Jonah 1', chapter: jonah, verse: passage }, `how do I say ${hebrewPointedForm(last.t)}?`, [], [], CURIOUS);
    expect(request.hebrew_words?.some((w) => w.form === hebrewPointedForm(last.t))).toBe(true);
    expect(size(fitHistory(request))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('sends a Greek verse no Hebrew fields', () => {
    const rom = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
    const v = rom.verses.find((x) => x.n === 28);
    if (!v) throw new Error('no verse');
    const r = buildTalkRequest({ title: 'Romans 8', chapter: rom, verse: v }, 'q', [], [], CURIOUS);
    expect(r.hebrew).toBeUndefined();
    expect(r.hebrew_words).toBeUndefined();
  });
});
