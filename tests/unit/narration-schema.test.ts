// tests/unit/narration-schema.test.ts — the narration answer schema holds `question` to one sentence ending in a question mark (mw-5r3p30.1027).
// The live smoke of 2026-11-03 16:07Z got the question field "04" from a model, with the rest of the answer right: the schema had no pattern, so nothing refused it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import '../support/grinds-in-graph';
import { validate, type Schema } from '../support/schema-validate';

const schema = JSON.parse(readFileSync('grinds/narration.answer.schema.json', 'utf8')) as Schema;
const answer = {
  caught: ['A man had two sons'],
  missed: ['He came to his senses and decided to return and confess'],
  in_order: true,
  question: 'While he was down among the pigs, what began to change in the way he was thinking?',
};

describe('the narration answer schema’s question', () => {
  it('takes one sentence ending in a question mark', () => {
    expect(validate(answer, schema)).toEqual([]);
  });
  it.each([['04'], ['04?'], ['What began to change?  Why?'], ['What began to change'], ['?'], ['Tell me about the son.']])('refuses %j', (question) => {
    expect(validate({ ...answer, question }, schema)).not.toEqual([]);
  });
});
