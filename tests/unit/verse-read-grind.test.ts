// The verse-read grind (grinds/verse-read.json) is read by the mill, not by this app, so its shape is held to
// SpellForge's tutor-turn.json: the same keys, scoring included (the mill scores the recording and gives the model the
// result). Its answer schema is checked against sample answers with a small validator for the keywords it uses, and
// isVerseReadAnswer, the guard the phone runs, agrees with it.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { isVerseReadAnswer } from '../../src/services/reading';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/verse-read.json');
const schema = readJson('grinds/verse-read.answer.schema.json');
const verseAsk = readJson('grinds/verse-ask.json');

describe('grinds/verse-read.json', () => {
  it('has the keys of verse-ask.json plus scoring, for the lampas app and the verse-read kind', () => {
    expect(Object.keys(grind).sort()).toEqual([...Object.keys(verseAsk), 'scoring'].sort());
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: 'verse-read', versions: ['1'], model: 'sonnet', effort: 'medium' });
  });

  it('takes one recording of audio/webm, audio/ogg or audio/mp4, up to 8 MiB, and scores it against target_text', () => {
    expect(grind.attachments).toEqual({ min: 1, max: 1, mime: ['audio/webm', 'audio/ogg', 'audio/mp4'], maxBytes: 8388608 });
    expect(grind.scoring).toEqual({ audio: true, target_field: 'target_text', langs: ['en', 'el'] });
  });

  it('scores in English and in modern Greek, and its instructions cover a Greek reading', () => {
    expect((grind.scoring as { langs: string[] }).langs).toEqual(['en', 'el']);
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('`el`');
    expect(text).toContain('modern Greek pronunciation');
    expect(text).toContain('Greek syllables');
  });

  it('names an instructions file and an answer schema that exist', () => {
    expect(existsSync(grind.instructions as string)).toBe(true);
    expect(existsSync(grind.answerSchema as string)).toBe(true);
    expect(grind.answerSchema).toBe('grinds/verse-read.answer.schema.json');
  });

  it('tells the model to mark only real misreadings, at most 8 words, with chunks', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('reading_result');
    expect(text).toContain('target_text');
    expect(text).toContain('8 words');
    expect(text).toContain('chunks');
  });
});

describe('the answer schema and isVerseReadAnswer', () => {
  const fix = { word: 'together', index: 7, chunks: ['to', 'geth', 'er'], tip: 'Say the th softly.' };
  const good = { verdict: 'some-to-fix', focus_words: [fix], note: 'Nearly there.' };
  const bad: [string, unknown][] = [
    ['an unknown verdict', { ...good, verdict: 'ok' }],
    ['no note', { verdict: 'well-read', focus_words: [] }],
    ['an empty note', { ...good, note: '' }],
    ['a word with no chunks', { ...good, focus_words: [{ ...fix, chunks: [] }] }],
    ['13 chunks', { ...good, focus_words: [{ ...fix, chunks: Array.from({ length: 13 }, () => 'a') }] }],
    ['a word with no tip', { ...good, focus_words: [{ word: 'together', index: 7, chunks: ['to'] }] }],
    ['a word with no index', { ...good, focus_words: [{ word: 'together', chunks: ['to'], tip: 'Say it.' }] }],
    ['a negative index', { ...good, focus_words: [{ ...fix, index: -1 }] }],
    ['an extra key on a word', { ...good, focus_words: [{ ...fix, extra: 1 }] }],
    ['9 words', { ...good, focus_words: Array.from({ length: 9 }, () => fix) }],
    ['an extra key', { ...good, extra: 1 }],
  ];

  it('accepts a reading with words to fix and a well-read one with none', () => {
    expect(validate(good, schema as Schema)).toEqual([]);
    expect(isVerseReadAnswer(good)).toBe(true);
    const clear = { verdict: 'well-read', focus_words: [], note: 'Well read.' };
    expect(validate(clear, schema as Schema)).toEqual([]);
    expect(isVerseReadAnswer(clear)).toBe(true);
  });

  it('accepts an incomplete reading, with no words to fix', () => {
    const partial = { verdict: 'incomplete', focus_words: [], note: "I heard 'and if the Spirit', then you stopped." };
    expect(validate(partial, schema as Schema)).toEqual([]);
    expect(isVerseReadAnswer(partial)).toBe(true);
  });

  it('tells the model to use incomplete when the transcript covers only part of target_text or nothing clear', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('`incomplete`');
    expect(text).toMatch(/only part of `target_text`/);
    expect(text).toMatch(/where he stopped/);
  });

  it('tells the model to give each word its place from the scorer\'s word list, counting from 0', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('`index`');
    expect(text).toMatch(/0-based|counting from 0/);
    expect(text).toMatch(/word list/);
  });

  it('refuses an index that is not a whole number on the phone', () => {
    expect(isVerseReadAnswer({ ...good, focus_words: [{ ...fix, index: 1.5 }] })).toBe(false);
  });

  it.each(bad)('refuses %s in both', (_, value) => {
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isVerseReadAnswer(value)).toBe(false);
  });
});

describe('quotes in the note and the tip', () => {
  it('tells the model to write plain quotes, never a backslash before one', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('plain quote marks');
    expect(text).toContain('never put a backslash before a quote');
  });
});
