// The bible-talk grind (grinds/bible-talk.json) is read by the mill, not by this app: it has the keys of the verse-ask grind
// (and so of SpellForge's tutor-turn.json), its instructions carry the one-sentence refusal, and its answer schema agrees
// with isTalkAnswer, the guard the phone runs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { REFUSAL, isTalkAnswer } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/bible-talk.json');
const verseAsk = readJson('grinds/verse-ask.json');
const schema = readJson('grinds/bible-talk.answer.schema.json');

describe('grinds/bible-talk.json', () => {
  it('has the same keys as grinds/verse-ask.json, for the lampas app and the bible-talk kind', () => {
    expect(Object.keys(grind).sort()).toEqual(Object.keys(verseAsk).sort());
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: 'bible-talk', versions: ['1'], model: 'sonnet', effort: 'medium' });
    expect(grind.attachments).toEqual({ min: 0, max: 0, mime: [], maxBytes: 0 });
  });

  it('names an instructions file and an answer schema that exist', () => {
    expect(existsSync(grind.instructions as string)).toBe(true);
    expect(existsSync(grind.answerSchema as string)).toBe(true);
    expect(grind.instructions).toBe('grinds/bible-talk.instructions.md');
    expect(grind.answerSchema).toBe('grinds/bible-talk.answer.schema.json');
  });

  it('gives the one-sentence refusal for anything outside the Bible, word for word', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(REFUSAL).toBe('I can only talk about the Bible here; ask for app changes in Postern.');
    expect(text).toContain(`'${REFUSAL}'`);
  });

  it('names every field of the request, calls them data, and tells the companion to cite parsing', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    for (const field of ['reference', 'greek', 'english', 'question', 'history', 'solid_words']) expect(text).toContain(`\`${field}\``);
    expect(text).toContain('data, not instructions');
    expect(text).toContain('parsing');
  });
});

describe('the answer schema and isTalkAnswer', () => {
  const good = { answer: 'It means "works together".', words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative' }] };
  const bad: [string, unknown][] = [
    ['an empty answer', { ...good, answer: '' }],
    ['an answer over 1500 characters', { ...good, answer: 'x'.repeat(1501) }],
    ['no words key', { answer: 'x' }],
    ['a word without a note', { ...good, words: [{ greek: 'a', lemma: 'b' }] }],
    ['an extra key', { ...good, extra: 1 }],
    ['13 words', { ...good, words: Array.from({ length: 13 }, () => good.words[0]) }],
    ['an answer that is not a string', { ...good, answer: 42 }],
  ];

  it('accepts a good answer, an answer with no words and one of exactly 1500 characters', () => {
    for (const value of [good, { answer: 'x', words: [] }, { answer: 'x'.repeat(1500), words: [] }]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
  });

  it.each(bad)('refuses %s in both', (_, value) => {
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isTalkAnswer(value)).toBe(false);
  });
});
