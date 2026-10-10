// The verse-ask grind (grinds/verse-ask.json) is read by the mill, not by this app, so its shape is held to
// SpellForge's tutor-turn.json: the same keys. Its answer schema is checked against sample answers with a small
// validator for the keywords it uses, and isVerseAnswer, the guard the phone runs, agrees with it.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { askByChange, isVerseAnswer } from '../../src/services/tutor';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/verse-ask.json');
const schema = readJson('grinds/verse-ask.answer.schema.json');

/** The keys of SpellForge's grinds/tutor-turn.json, less `scoring`, which only its audio grind has. */
const GRIND_KEYS = ['grind', 'app', 'kind', 'versions', 'model', 'effort', 'instructions', 'answerSchema', 'attachments'];

describe('grinds/verse-ask.json', () => {
  it('has the keys of the mill\'s grind shape, for the lampas app and the verse-ask kind', () => {
    expect(Object.keys(grind).sort()).toEqual([...GRIND_KEYS].sort());
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: 'verse-ask', versions: ['1'], model: 'sonnet', effort: 'medium' });
    expect(grind.attachments).toEqual({ min: 0, max: 0, mime: [], maxBytes: 0 });
  });

  it('names an instructions file and an answer schema that exist', () => {
    expect(existsSync(grind.instructions as string)).toBe(true);
    expect(existsSync(grind.answerSchema as string)).toBe(true);
    expect(grind.answerSchema).toBe('grinds/verse-ask.answer.schema.json');
  });

  it('tells the tutor the 120 word limit, the parsing and his solid words', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('120 words');
    expect(text).toContain('solid_words');
    expect(text).toContain('parsing');
  });

  it('names settings.hebrewDepth and gives an example for each of its three depths', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(text).toContain('`settings`');
    expect(text).toContain('hebrewDepth');
    for (const depth of ['transliteration', 'both', 'full']) expect(text).toContain(`\`${depth}\``);
    for (const example of ['tsedeq', 'צֶדֶק tsedeq', 'צֶדֶק']) expect(text).toContain(example);
  });
});

describe('the answer schema and isVerseAnswer', () => {
  const good = { answer: 'It means "works together".', words: [{ greek: 'συνεργεῖ', lemma: 'συνεργέω', note: 'verb, present active indicative' }] };
  const bad: [string, unknown][] = [
    ['an empty answer', { ...good, answer: '' }],
    ['no words key', { answer: 'x' }],
    ['a word without a note', { ...good, words: [{ greek: 'a', lemma: 'b' }] }],
    ['an extra key on a word', { ...good, words: [{ greek: 'a', lemma: 'b', note: 'c', extra: 1 }] }],
    ['13 words', { ...good, words: Array.from({ length: 13 }, () => good.words[0]) }],
    ['an answer that is not a string', { ...good, answer: 42 }],
    ['a change of a setting other than askBy', { ...good, settings_changes: [{ key: 'theme', value: 'dark' }] }],
    ['an askBy value it does not allow', { ...good, settings_changes: [{ key: 'askBy', value: 'shouting' }] }],
    ['two changes at once', { ...good, settings_changes: [{ key: 'askBy', value: 'typing' }, { key: 'askBy', value: 'speaking' }] }],
  ];

  it('accepts a good answer and an answer with no words', () => {
    expect(validate(good, schema as Schema)).toEqual([]);
    expect(isVerseAnswer(good)).toBe(true);
    expect(validate({ answer: 'x', words: [] }, schema as Schema)).toEqual([]);
    expect(isVerseAnswer({ answer: 'x', words: [] })).toBe(true);
  });

  it('accepts a switch of Ask by in both', () => {
    for (const value of ['typing', 'speaking']) {
      const switched = { answer: 'Done.', words: [], settings_changes: [{ key: 'askBy', value }] };
      expect(validate(switched, schema as Schema)).toEqual([]);
      expect(isVerseAnswer(switched)).toBe(true);
    }
  });

  const refusedChanges = bad.filter(([name]) => /change|askBy value|two changes/.test(name));
  const refusedOnlyBySchema = new Set(refusedChanges.map(([name]) => name));

  it.each(bad.filter(([name]) => !refusedOnlyBySchema.has(name)))('refuses %s in both', (_, value) => {
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isVerseAnswer(value)).toBe(false);
  });

  // The schema is what the tutor is held to; the app never loses a reply over a change it will not make (mw-5r3p30.171).
  it.each(refusedChanges)('the schema refuses %s but the app still reads the answer', (_, value) => {
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isVerseAnswer(value)).toBe(true);
  });

  it('still reads an answer whose settings_changes is not even a list', () => {
    expect(isVerseAnswer({ ...good, settings_changes: 'dark' })).toBe(true);
    expect(isVerseAnswer({ ...good, settings_changes: [null, 3, { key: 7 }] })).toBe(true);
  });
});

describe('askByChange: the one change Ask the tutor makes', () => {
  const of = (settings_changes: unknown) => askByChange({ answer: 'x', words: [], settings_changes } as never);

  it('takes askBy to typing or speaking, in any case', () => {
    expect(of([{ key: 'askBy', value: 'typing' }])).toEqual([{ key: 'askBy', value: 'typing' }]);
    expect(of([{ key: 'askBy', value: 'Typing' }])).toEqual([{ key: 'askBy', value: 'typing' }]);
    expect(of([{ key: 'askBy', value: ' SPEAKING ' }])).toEqual([{ key: 'askBy', value: 'speaking' }]);
  });

  it('ignores any other setting, a bad value, a change after the first and a malformed list', () => {
    expect(of([{ key: 'theme', value: 'dark' }])).toEqual([]);
    expect(of([{ key: 'askBy', value: 'shouting' }])).toEqual([]);
    expect(of([{ key: 'askBy', value: 'typing' }, { key: 'askBy', value: 'speaking' }])).toEqual([{ key: 'askBy', value: 'typing' }]);
    expect(of([{ key: 'theme', value: 'dark' }, { key: 'askBy', value: 'typing' }])).toEqual([]);
    expect(of('dark')).toEqual([]);
    expect(of([null, 3, { key: 7 }])).toEqual([]);
    expect(askByChange({ answer: 'x', words: [] })).toEqual([]);
  });
});
