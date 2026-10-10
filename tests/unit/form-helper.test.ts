// The form helper (mw-5r3p30.117): 'Let the tutor help me fill this in'. What it sends the grind, what it believes of the answer, and
// which fields an answer may fill. The rest (the panel, the tutor faked) is features/form-helper.feature.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { APPROACH_FORM } from '../../src/formHelper/approachForm';
import { applyFormValues, buildFormRequest, FORM_FIELD_MAX, oneQuestion, type FormSpec } from '../../src/formHelper/formHelper';
import { isTalkAnswer, MAX_REQUEST_BYTES } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

const input = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
const bytes = (v: unknown): number => new TextEncoder().encode(JSON.stringify(v)).length;

describe('the form helper request', () => {
  it('carries each field of the form: its name, label, hint, required flag, kind and current value', () => {
    const request = buildFormRequest(APPROACH_FORM, { approach: 'Colours for the cases', credit: '' }, 'Help me fill this in.', []);
    expect(request.form?.name).toBe('Ask for another approach');
    expect(request.form?.fields).toEqual([
      { name: 'approach', label: 'What approach, and how does it teach?', required: true, kind: 'text', value: 'Colours for the cases' },
      { name: 'pictures', label: 'Add a screenshot or photo', required: false, kind: 'pictures', value: '' },
      { name: 'credit', label: 'Who to credit', hint: 'Required: whoever made the approach or the pictures.', required: true, kind: 'text', value: '' },
      { name: 'link', label: 'Link', hint: 'Optional: where the approach can be found.', required: false, kind: 'link', value: '' },
    ]);
  });

  it('is a talk from a screen (no verse text) named for the form, fits the bible-talk input schema and the grist', () => {
    const request = buildFormRequest(APPROACH_FORM, {}, 'Help me fill this in.', [{ q: 'Help me fill this in.', a: 'What approach?' }]);
    expect(request.reference).toBe('Ask for another approach');
    expect(request.screen).toEqual({ name: 'Ask for another approach', facts: [] });
    expect('greek' in request).toBe(false);
    expect(validate(request, input)).toEqual([]);
    expect(bytes(request)).toBeLessThan(MAX_REQUEST_BYTES);
  });

  it('cuts a long value to what the schema allows', () => {
    const request = buildFormRequest(APPROACH_FORM, { approach: 'x'.repeat(1200) }, 'Go on.', []);
    expect(request.form?.fields[0].value.length).toBeLessThanOrEqual(FORM_FIELD_MAX);
    expect(validate(request, input)).toEqual([]);
  });
});

describe('the form helper answer', () => {
  it('is believed with the next question and the field values, and its schema allows them', () => {
    const answer = { answer: 'Who made it?', words: [], form_values: [{ field: 'approach', value: 'Colours' }], form_ask: 'credit' };
    expect(isTalkAnswer(answer)).toBe(true);
    expect(validate(answer, answerSchema)).toEqual([]);
  });

  it('is refused when a value is not text, has a stray key, or the list is too long', () => {
    const base = { answer: 'Who made it?', words: [] };
    expect(isTalkAnswer({ ...base, form_values: [{ field: 'approach', value: 7 }] })).toBe(false);
    expect(isTalkAnswer({ ...base, form_values: [{ field: 'approach', value: 'x', send: true }] })).toBe(false);
    expect(isTalkAnswer({ ...base, form_values: Array.from({ length: 9 }, () => ({ field: 'link', value: 'x' })) })).toBe(false);
    expect(isTalkAnswer({ ...base, form_ask: '' })).toBe(false);
  });
});

describe('what an answer may fill', () => {
  const form: FormSpec = APPROACH_FORM;

  it('fills the fields the form has, trimmed', () => {
    expect(applyFormValues(form, [{ field: 'approach', value: '  Colours  ' }, { field: 'credit', value: 'Anna' }])).toEqual([
      { field: 'approach', value: 'Colours' },
      { field: 'credit', value: 'Anna' },
    ]);
  });

  it('ignores a field the form does not have, and a picture field, which only he can fill', () => {
    expect(applyFormValues(form, [{ field: 'send', value: 'now' }, { field: 'pictures', value: '3' }, { field: 'link', value: 'example.org' }])).toEqual([
      { field: 'link', value: 'example.org' },
    ]);
  });

  it('cuts a value to the field limit', () => {
    const [filled] = applyFormValues(form, [{ field: 'credit', value: 'a'.repeat(500) }]);
    expect(filled.value.length).toBe(120);
  });
});

describe('the tutor asks one question', () => {
  it('cuts what follows the question: the model sometimes asks, then keeps talking', () => {
    expect(oneQuestion('Q? More text.')).toBe('Q?');
    expect(oneQuestion("Who made this approach, so we can credit them? If it's the Greek Colour Method…")).toBe('Who made this approach, so we can credit them?');
    expect(oneQuestion('Who made it? Is it Anna? Or someone else?')).toBe('Who made it?');
  });

  it('keeps one line and one sentence of explanation before the question, and an answer with no question as it is', () => {
    expect(oneQuestion('A credit names whoever made it. Who made it?')).toBe('A credit names whoever made it. Who made it?');
    expect(oneQuestion('That is everything I need. Read it, then tap Send yourself.')).toBe('That is everything I need. Read it, then tap Send yourself.');
    expect(oneQuestion('')).toBe('');
  });

  it('cuts at the question mark that ends a sentence, not one inside a word or a link', () => {
    expect(oneQuestion('Is it at example.org/a?b=1 or elsewhere? Tell me.')).toBe('Is it at example.org/a?b=1 or elsewhere?');
  });
});
