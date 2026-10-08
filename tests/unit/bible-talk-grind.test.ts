// The bible-talk grind (grinds/bible-talk.json) is read by the mill, not by this app: it has the keys of the verse-ask grind
// (and so of SpellForge's tutor-turn.json), its instructions carry the one-sentence refusal, and its answer schema agrees
// with isTalkAnswer, the guard the phone runs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { NO_SETTING, REFUSAL, isTalkAnswer } from '../../src/services/talk';
import { formatJson, settingsBlock, withSettingsBlock, withSettingsChanges } from '../../src/settings/grindText';
import { SETTINGS } from '../../src/settings/registry';
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

describe('settings_changes in the answer', () => {
  const answer = { answer: 'Slower now.', words: [] };
  const change = (key: string, value: unknown) => ({ ...answer, settings_changes: [{ key, value }] });

  it('is optional in the schema, and the app\'s guard takes it', () => {
    expect((schema.required as string[]).sort()).toEqual(['answer', 'words']);
    for (const value of [answer, change('greekRate', 0.8), { ...answer, settings_changes: [] }]) {
      expect(validate(value, schema as Schema)).toEqual([]);
      expect(isTalkAnswer(value)).toBe(true);
    }
  });

  it('allows, in the schema, exactly the keys and values the registry lists', () => {
    expect(validate(change('theme', 'dark'), schema as Schema)).toEqual([]);
    expect(validate(change('textSize', 'largest'), schema as Schema)).toEqual([]);
    expect(validate(change('greekRate', 1.5), schema as Schema)).toEqual([]);
    for (const [key, value] of [['fontColour', 'red'], ['theme', 'purple'], ['greekRate', 2], ['greekRate', 0.1], ['greekRate', 'slow'], ['greekVoice', 'Some Voice']]) {
      expect(validate(change(key as string, value), schema as Schema), `${key} ${String(value)}`).not.toEqual([]);
    }
    expect(validate({ ...answer, settings_changes: [{ key: 'theme', value: 'dark', extra: 1 }] }, schema as Schema)).not.toEqual([]);
    // the guard on the phone only needs a list: each change is checked against the registry when it is applied
    expect(isTalkAnswer({ ...answer, settings_changes: 'dark' })).toBe(false);
    expect(isTalkAnswer({ ...answer, extra: 1 })).toBe(false);
  });

  it('names every key of the registry, in the schema and in the instructions (run npm run grind:build when this fails)', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    const options = ((schema.properties as Record<string, Schema>).settings_changes.items as Schema).anyOf ?? [];
    const keys = options.map((o) => (o.properties?.key as Schema).const);
    expect(keys).toEqual(SETTINGS.map((s) => s.key));
    for (const s of SETTINGS) expect(text, s.key).toContain(`\`${s.key}\``);
    expect(text).toContain(settingsBlock());
    expect(withSettingsBlock(text)).toBe(text);
    expect(formatJson(withSettingsChanges(schema))).toBe(readFileSync(grind.answerSchema as string, 'utf8').trimEnd());
  });

  it('tells the companion never to claim a setting the registry lacks, and what to say instead', () => {
    const text = readFileSync(grind.instructions as string, 'utf8');
    expect(NO_SETTING).toBe('The app has no setting for that yet.');
    expect(text).toContain(`'${NO_SETTING}'`);
    expect(text).toContain('`settings_changes`');
    expect(text).toContain('`settings`');
    expect(text).toMatch(/Never claim a change the list does not have/);
  });
});
