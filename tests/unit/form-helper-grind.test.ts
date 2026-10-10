// The form helper's method lives in the bible-talk grind's instructions (## Helping him fill in a form), which the mill reads, not this
// app: a grep proves each rule is named. The first reply for an empty form is also a grind scenario (grinds/examples/bible-talk/
// form-approach-first-question.json) that `mw grist smoke lampas` runs against the live grist.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text = readFileSync('grinds/bible-talk.instructions.md', 'utf8');
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
