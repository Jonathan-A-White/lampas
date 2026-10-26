// mw-5vvlay.3: Ask the tutor on a verse of an 'hbo' chapter sends the verse's Hebrew words with their lemma, parsing and gloss and the English, in the shape the Greek verse is
// sent (greek_words, src/services/greekWords.ts), generalised by the chapter's source language (src/services/hebrewWords.ts).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { DEFAULT_PRONUNCIATION } from '../../src/speech/pronunciation';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { buildRequest, fitAsk } from '../../src/services/tutor';
import { validate, type Schema } from '../support/schema-validate';

const jonah = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as Chapter;
const verse10 = jonah.verses.find((v) => v.n === 10);
if (!verse10) throw new Error('no verse 10');
const size = (r: unknown) => new TextEncoder().encode(JSON.stringify(r)).length;
const ask = (question: string, solid: string[] = []) =>
  buildRequest('Jonah 1:10', verse10, question, solid, undefined, undefined, undefined, [], undefined, false, DEFAULT_PRONUNCIATION, undefined, undefined, undefined, jonah);
const inputSchema = JSON.parse(readFileSync('grinds/verse-ask.input.schema.json', 'utf8')) as Schema;

describe('Ask the tutor on Jonah 1:10 sends the Hebrew', () => {
  it('holds the verse in Hebrew, pointed, with the English and no Greek', () => {
    const r = ask('What does the Hebrew say for fear?');
    expect(r.greek).toBe('');
    expect(r.greek_words).toBeUndefined();
    expect(r.hebrew).toBe(verse10.g.map((w) => hebrewPointedForm(w.t)).join(' '));
    expect(r.hebrew).toContain('הָאֲנָשִׁים');
    expect(r.english).toContain('The men knew that he was fleeing');
  });

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

  it('fits the verse-ask input schema and the grist, even with a pasted question and a full solid list', () => {
    expect(validate(ask('What does the Hebrew say for fear?'), inputSchema)).toEqual([]);
    const request = fitAsk(ask('Say it again. '.repeat(150), Array.from({ length: 5000 }, (_, i) => `λέξις${i}`)));
    expect(size(request)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.hebrew).toContain('הָאֲנָשִׁים');
  });

  it('keeps a word the question names when a long passage\'s list stops before it', () => {
    const passage = { ...verse10, g: jonah.verses.flatMap((v) => v.g) };
    const last = passage.g[passage.g.length - 2];
    const request = buildRequest('Jonah 1', passage, `how do I say ${hebrewPointedForm(last.t)}?`, [], undefined, undefined, undefined, [], undefined, false, DEFAULT_PRONUNCIATION, undefined, undefined, undefined, jonah);
    expect(request.hebrew_words?.some((w) => w.form === hebrewPointedForm(last.t))).toBe(true);
    expect(size(fitAsk(request))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('sends a Greek verse no Hebrew fields', () => {
    const rom = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
    const v = rom.verses.find((x) => x.n === 28);
    if (!v) throw new Error('no verse');
    const r = buildRequest('Romans 8:28', v, 'q', [], undefined, undefined, undefined, [], undefined, false, DEFAULT_PRONUNCIATION, undefined, undefined, undefined, rom);
    expect(r.hebrew).toBeUndefined();
    expect(r.hebrew_words).toBeUndefined();
  });
});
