// The verse-ask grind (grinds/verse-ask.json) is read by the mill, not by this app, so its shape is held to
// SpellForge's tutor-turn.json: the same keys. Its answer schema is checked against sample answers with a small
// validator for the keywords it uses, and isVerseAnswer, the guard the phone runs, agrees with it.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { isVerseAnswer } from '../../src/services/tutor';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const grind = readJson('grinds/verse-ask.json');
const schema = readJson('grinds/verse-ask.answer.schema.json');

/** The keys of SpellForge's grinds/tutor-turn.json, less `scoring`, which only its audio grind has. */
const GRIND_KEYS = ['grind', 'app', 'kind', 'versions', 'model', 'effort', 'instructions', 'answerSchema', 'attachments'];

interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
}
const KEYWORDS = new Set(['$schema', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties', 'items', 'maxItems', 'minLength', 'maxLength']);

function validate(value: unknown, s: Schema, path = '$'): string[] {
  for (const k of Object.keys(s)) if (!KEYWORDS.has(k)) throw new Error(`validator does not know ${k}`);
  const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (s.type && s.type !== kind) return [`${path}: expected ${s.type}, got ${kind}`];
  const problems: string[] = [];
  if (typeof value === 'string') {
    if (s.minLength !== undefined && value.length < s.minLength) problems.push(`${path}: too short`);
    if (s.maxLength !== undefined && value.length > s.maxLength) problems.push(`${path}: too long`);
  }
  if (Array.isArray(value)) {
    if (s.maxItems !== undefined && value.length > s.maxItems) problems.push(`${path}: too many items`);
    if (s.items) value.forEach((item, i) => problems.push(...validate(item, s.items as Schema, `${path}[${i}]`)));
  }
  if (kind === 'object') {
    const object = value as Record<string, unknown>;
    for (const name of s.required ?? []) if (!(name in object)) problems.push(`${path}.${name}: missing`);
    for (const [name, v] of Object.entries(object)) {
      const sub = s.properties?.[name];
      if (sub) problems.push(...validate(v, sub, `${path}.${name}`));
      else if (s.additionalProperties === false) problems.push(`${path}.${name}: not allowed`);
    }
  }
  return problems;
}

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
  ];

  it('accepts a good answer and an answer with no words', () => {
    expect(validate(good, schema as Schema)).toEqual([]);
    expect(isVerseAnswer(good)).toBe(true);
    expect(validate({ answer: 'x', words: [] }, schema as Schema)).toEqual([]);
    expect(isVerseAnswer({ answer: 'x', words: [] })).toBe(true);
  });

  it.each(bad)('refuses %s in both', (_, value) => {
    expect(validate(value, schema as Schema)).not.toEqual([]);
    expect(isVerseAnswer(value)).toBe(false);
  });
});
