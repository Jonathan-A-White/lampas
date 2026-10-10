// The tutor grinds that take a spoken question (bible-talk and verse-ask) give it back cleaned up (mw-5r3p30.103): the answer's
// `question` is his words with punctuation and capitals, no ums or false starts, the meaning unchanged. The app shows it in place of
// the raw words when it is there. The schema, the instructions, the phone's guards and the examples all say so.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isVerseAnswer } from '../../src/services/tutor';
import { isTalkAnswer } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Schema & { required: string[]; properties: Record<string, Schema & { description: string; maxLength: number }> } =>
  JSON.parse(readFileSync(rel, 'utf8')) as never;

const KINDS = [
  { kind: 'bible-talk', max: 600, guard: isTalkAnswer },
  { kind: 'verse-ask', max: 400, guard: isVerseAnswer },
] as const;

const SPOKEN = 'um why are there uh italic words what does it mean for the words to be italic';
const CLEAN = 'Why are there italic words? What does it mean for the words to be italic?';

describe.each(KINDS)('$kind: the cleaned question', ({ kind, max, guard }) => {
  const schema = readJson(`grinds/${kind}.answer.schema.json`);
  const instructions = readFileSync(`grinds/${kind}.instructions.md`, 'utf8');
  const answer = { answer: 'They are words the translators added.', words: [] };

  it('is a field of the answer schema, as long as the question may be, and not required', () => {
    expect(schema.properties.question).toMatchObject({ type: 'string', minLength: 1, maxLength: max });
    expect(schema.required).not.toContain('question');
    expect(schema.properties.question.description).toMatch(/punctuation/i);
  });

  it('is told, in the instructions, how to clean what he said', () => {
    expect(instructions).toContain('## Cleaning up what he said');
    const section = instructions.slice(instructions.indexOf('## Cleaning up what he said')).split(/\n## /)[0].toLowerCase();
    for (const rule of ['`question`', 'punctuation', 'capital', 'um', 'false start', 'repeat', 'meaning', 'never answer', SPOKEN.toLowerCase(), CLEAN.toLowerCase()]) {
      expect(section, rule).toContain(rule);
    }
  });

  it('is taken by the schema and the phone\'s guard, and an answer without it still is', () => {
    for (const value of [answer, { ...answer, question: CLEAN }, { ...answer, question: 'x'.repeat(max) }]) {
      expect(validate(value, schema)).toEqual([]);
      expect(guard(value)).toBe(true);
    }
  });

  it.each([
    ['an empty question', { ...answer, question: '' }],
    ['a question over the limit', { ...answer, question: 'x'.repeat(max + 1) }],
    ['a question that is not a string', { ...answer, question: 7 }],
  ])('refuses %s in both', (_, value) => {
    expect(validate(value, schema)).not.toEqual([]);
    expect(guard(value)).toBe(false);
  });

  it('has a scenario whose spoken question comes back clean', () => {
    const example = JSON.parse(readFileSync(`grinds/examples/${kind}/cleaned-question.json`, 'utf8')) as { request: { question: string }; expect: Record<string, unknown> };
    expect(example.request.question).toBe(SPOKEN);
    expect(example.expect.question).toEqual({ equals: CLEAN });
  });
});
