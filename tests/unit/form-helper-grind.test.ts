// The form helper's method lives in the bible-talk grind's instructions (## Helping him fill in a form), which the mill reads, not this
// app: a grep proves each rule is named. The first reply for an empty form is also a grind scenario (grinds/examples/bible-talk/
// form-approach-first-question.json) that `mw grist smoke lampas` runs against the live grist.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { instructionsOf } from '../../scripts/grind-parts';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

const text = instructionsOf('bible-talk');
const section = (): string => {
  const start = text.indexOf('## Helping him fill in a form');
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? undefined : end).replace(/\s+/g, ' ').toLowerCase();
};

describe('the form helper section of the instructions', () => {
  it('names the request field and the two answer fields', () => {
    const s = section();
    for (const word of ['`form`', '`form_values`', '`form_ask`']) expect(s).toContain(word);
  });

  it('asks one short question at a time, never a list, and never asks for what a field already holds', () => {
    const s = section();
    expect(s).toContain('one short question');
    expect(s).toContain('never a list');
    expect(s).toContain('already holds');
  });

  it('ends the answer at the question mark, with a right and a wrong example (mw-5r3p30.158)', () => {
    const s = section();
    expect(s).toContain('stop at the question mark');
    expect(s).toContain('right:');
    expect(s).toContain('wrong:');
  });

  it('keeps a field hint out of the question, as the book first question flaked on it (mw-5r3p30.771)', () => {
    const s = section();
    expect(s).toContain('no field `hint`');
    expect(s).toContain('wrong: `who made this approach, so we can credit them? give a name');
  });

  it('fills fields from what he said, keeps his meaning, and never sends the form', () => {
    const s = section();
    expect(s).toContain('whole new value');
    expect(s).toContain('never send');
    expect(s).toContain('he taps send himself');
  });

  it('asks for a picture only at the moment it helps, by naming the pictures field', () => {
    const s = section();
    expect(s).toContain('`form_ask`');
    expect(s).toContain('pictures');
    expect(s).toContain('no photo');
  });

  it('says the form is ready, without asking again, when every required field is filled', () => {
    const s = section();
    expect(s).toContain('every required field');
    expect(s).toContain('leave `form_ask` out');
  });

  it('is listed in the contract with the request field', () => {
    expect(text).toMatch(/- `form`: present only while/);
  });
});

describe('the choice field and the Send button (mw-o7cts8.2)', () => {
  it('teaches a choice answered with one of its options exactly, and a Send button the tutor never presses', () => {
    const s = section();
    expect(s).toContain('`choice`');
    expect(s).toContain('`options`');
    expect(s).toContain('exactly as written');
    expect(s).toContain('`form.command`');
    expect(s).toContain('send button');
    expect(s).toContain('never send');
  });

  it('says to ask nothing, not even about an optional field, once every required field holds something (mw-5r3p30.765)', () => {
    expect(section()).toContain('say so in one sentence and ask nothing more, not even about an optional field');
  });

  it('forbids naming an empty optional field once every required field holds something, instead of allowing it (mw-5r3p30.766)', () => {
    const s = section();
    expect(s).toContain('do not name an empty optional field');
    expect(s).not.toContain('it may name the empty optional fields');
  });

  const input = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
  for (const name of ['form-book-first-question', 'form-book-kind']) {
    it(`${name}: the request fits the input schema and names the ask-for-book command and the kind's options`, () => {
      const example = JSON.parse(readFileSync(`grinds/examples/bible-talk/${name}.json`, 'utf8')) as { request: { form: { command: string; fields: { name: string; kind: string; options?: string[] }[] } } };
      expect(validate(example.request, input)).toEqual([]);
      expect(example.request.form.command).toBe('ask-for-book');
      expect(example.request.form.fields.find((f) => f.kind === 'choice')?.options).toContain('Grammar');
    });
  }
});
