// A question may be 4000 characters in the Bible talk and in Ask the tutor (mw-5r3p30.413): the one constant, the request, the input schemas and the answers' cleaned
// question all take it, and a request over it is refused by the schema.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAX_QUESTION_CHARS } from '../../src/services/requestBudget';
import { MAX_TALK_CHARS } from '../../src/services/talk';
import { MAX_QUESTION_CHARS as ASK_MAX } from '../../src/services/tutor';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const schemaOf = (kind: string): Schema => JSON.parse(readFileSync(`grinds/${kind}.input.schema.json`, 'utf8')) as Schema;

describe('the longest question', () => {
  it('is 4000 characters, one number for Talk and Ask', () => {
    expect(MAX_QUESTION_CHARS).toBe(4000);
    expect(MAX_TALK_CHARS).toBe(4000);
    expect(ASK_MAX).toBe(4000);
  });

  const base = { reference: 'Romans 8:28', greek: 'α', english: 'x', solid_words: [], settings: {} };
  it.each(['bible-talk'])('%s: the input schema takes a 4000-character question and no more', (kind) => {
    const schema = schemaOf(kind);
    const request = (question: string) => ({ ...base, question, history: [] });
    expect(validate(request('q'.repeat(4000)), schema)).toEqual([]);
    expect(validate(request('q'.repeat(4001)), schema)).not.toEqual([]);
  });

  it('bible-talk: the input schema takes a history turn whose question is 4000 characters', () => {
    const turn = { q: 'q'.repeat(4000), a: 'a'.repeat(1500) };
    expect(validate({ ...base, question: 'And now?', history: [turn] }, schemaOf('bible-talk'))).toEqual([]);
  });
});
