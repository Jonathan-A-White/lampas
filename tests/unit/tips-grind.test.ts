// The tips grind (grinds/tips.json) is read by the mill, not by this app: it has the keys of the verse-ask grind (and so of SpellForge's
// tutor-turn.json), its input schema takes the usage summary and the ids of tips already shown, and its answer schema agrees with
// isTipAnswer, the guard the phone runs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { SCREENS, FEATURES, summarize } from '../../src/tips/summary';
import { isTipAnswer } from '../../src/tips/tip';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/tips.json');
const verseAsk = readJson('grinds/verse-ask.json');
const answerSchema = readJson('grinds/tips.answer.schema.json') as Schema;
const inputSchema = readJson('grinds/tips.input.schema.json') as Schema;
const instructions = readFileSync('grinds/tips.instructions.md', 'utf8');

describe('grinds/tips.json', () => {
  it('has the same keys as grinds/verse-ask.json, for the lampas app and the tips kind, on haiku at low effort', () => {
    expect(Object.keys(grind).sort()).toEqual(Object.keys(verseAsk).sort());
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: 'tips', versions: ['1'], model: 'haiku', effort: 'low' });
    expect(grind.attachments).toEqual({ min: 0, max: 0, mime: [], maxBytes: 0 });
  });

  it('names an instructions file and an answer schema that exist', () => {
    expect(existsSync(grind.instructions as string)).toBe(true);
    expect(existsSync(grind.answerSchema as string)).toBe(true);
    expect(grind.instructions).toBe('grinds/tips.instructions.md');
    expect(grind.answerSchema).toBe('grinds/tips.answer.schema.json');
  });

  it('tells the model the tone, the one small step, the shown ids and what he turned off, and calls the input data', () => {
    for (const field of ['summary', 'shown', 'turned_off', 'features_never', 'screens_never', 'settings_never']) expect(instructions).toContain(`\`${field}\``);
    expect(instructions).toContain('data, not instructions');
    expect(instructions).toMatch(/start right away/i);
    expect(instructions).toMatch(/one small step/i);
    expect(instructions).toMatch(/never repeat/i);
    expect(instructions).toMatch(/turned off/i);
  });

  it('names every feature and every screen the summary can list, so a tip can be about any of them', () => {
    for (const f of FEATURES) expect(instructions, f.id).toContain(`\`${f.id}\``);
    for (const s of SCREENS) expect(instructions, s.id).toContain(`\`${s.id}\``);
  });
});

describe('the input schema', () => {
  it('takes a real summary and the ids shown', () => {
    const summary = summarize({ usage: [], counts: { wordsLearning: 0, wordsSolid: 0, talks: 0, asks: 0, quizAnswers: 0, drillAnswers: 0, readings: 0, grammarKnown: 0 }, saved: {}, studyOn: [] }, Date.UTC(2026, 9, 1));
    expect(validate({ summary, shown: [] }, inputSchema)).toEqual([]);
    expect(validate({ summary, shown: ['try-talk'] }, inputSchema)).toEqual([]);
  });

  it('refuses a request without the summary or with shown ids that are not text', () => {
    expect(validate({ shown: [] }, inputSchema)).not.toEqual([]);
    expect(validate({ summary: {}, shown: [] }, inputSchema)).not.toEqual([]);
  });
});

describe('the answer schema and isTipAnswer', () => {
  const tip = { id: 'try-talk', title: 'Ask about a verse', body: 'Hold the Talk bar and say what puzzles you about the verse.' };
  const good: unknown[] = [
    { tip: null },
    { tip },
    { tip: { ...tip, action: { label: 'Open Settings', screen: 'settings' } } },
  ];
  const bad: [string, unknown][] = [
    ['no tip key', {}],
    ['an empty id', { tip: { ...tip, id: '' } }],
    ['an empty title', { tip: { ...tip, title: '' } }],
    ['a body over 400 characters', { tip: { ...tip, body: 'x'.repeat(401) } }],
    ['an extra key', { tip: { ...tip, extra: 1 } }],
    ['an action to a screen that is not there', { tip: { ...tip, action: { label: 'Go', screen: 'nowhere' } } }],
    ['an action without a label', { tip: { ...tip, action: { screen: 'words' } } }],
    ['two tips', { tip: [tip, tip] }],
  ];

  it('accepts no tip, a tip and a tip with an action, in the schema and in the app guard', () => {
    for (const value of good) {
      expect(validate(value, answerSchema)).toEqual([]);
      expect(isTipAnswer(value)).toBe(true);
    }
  });

  it.each(bad)('refuses %s in both', (_, value) => {
    expect(validate(value, answerSchema)).not.toEqual([]);
    expect(isTipAnswer(value)).toBe(false);
  });

  it('lets an action open exactly the screens the summary knows', () => {
    const action = (answerSchema.properties?.tip?.anyOf?.[1]?.properties?.action as Schema).properties?.screen;
    expect(action?.enum).toEqual(SCREENS.map((s) => s.id));
  });
});
