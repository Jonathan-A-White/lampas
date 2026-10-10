// src/formHelper/formHelper.ts — the form helper's pure half (mw-5r3p30.117, docs/ask-tutor.md 'Let the tutor help me fill this in'): what a
// form tells the tutor about itself, the request the bible-talk grind is sent, and which of the fields an answer may fill. A form that offers
// the helper describes itself as a FormSpec and draws <FormHelper> (FormHelper.tsx); nothing here knows a particular form.
import type { SettingValue } from '../settings/registry';
import type { TalkHistoryEntry, TalkRequest } from '../services/talk';

/** The kinds of field the tutor is told about: text (any length), a link, and pictures (only he can add those). */
export type FormFieldKind = 'text' | 'link' | 'pictures';

export interface FormField {
  /** the field's key, which the tutor's answer names: 'approach', 'credit' */
  name: string;
  /** what the form calls it on screen: 'Who to credit' */
  label: string;
  /** the line under it, if the form has one */
  hint?: string;
  required: boolean;
  kind: FormFieldKind;
  /** the longest text the field takes (not for pictures) */
  maxLength?: number;
}

/** A form as the tutor sees it: its name and its fields, in the order they are on screen. */
export interface FormSpec {
  name: string;
  fields: FormField[];
}

/** One field of the request: the form's field and what it holds now (for pictures, a count such as '2 pictures added', or ''). */
export interface FormFieldState {
  name: string;
  label: string;
  hint?: string;
  required: boolean;
  kind: FormFieldKind;
  value: string;
}

/** The longest value the grind is sent for one field (grinds/bible-talk.input.schema.json); a longer text is cut for the request only. */
export const FORM_FIELD_MAX = 600;
/** The most fields a form may have (the schemas' limit). */
export const MAX_FORM_FIELDS = 8;
/** The longest hint, label and name (the schemas' limits). */
const LABEL_MAX = 80;
const HINT_MAX = 120;
export const FORM_NAME_MAX = 40;
/** The longest value of a field in an answer (the answer schema's limit). */
export const FORM_VALUE_MAX = 1200;

/** What he says first, when he taps the button. */
export const FORM_START = 'Help me fill this in.';

/** What the grind answers about the form (grinds/bible-talk.answer.schema.json `form_values`). */
export interface FormValue {
  field: string;
  value: string;
}

const cut = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…');

/** The fields of `form` with what `values` holds (by field name; a missing one is empty). */
export function fieldStates(form: FormSpec, values: Record<string, string>): FormFieldState[] {
  return form.fields.slice(0, MAX_FORM_FIELDS).map((f) => ({
    name: f.name,
    label: cut(f.label, LABEL_MAX),
    ...(f.hint ? { hint: cut(f.hint, HINT_MAX) } : {}),
    required: f.required,
    kind: f.kind,
    value: cut(values[f.name] ?? '', FORM_FIELD_MAX),
  }));
}

/** The request for what he just said while the tutor helps with `form`: a talk from a screen named for the form (no verse text), with the
 * form's fields and what they hold now. The grind answers with the next question and any values to put in the fields. */
export function buildFormRequest(
  form: FormSpec,
  values: Record<string, string>,
  question: string,
  turns: TalkHistoryEntry[],
  settings: Record<string, SettingValue> = {},
): TalkRequest {
  return {
    reference: cut(form.name, FORM_NAME_MAX),
    screen: { name: cut(form.name, FORM_NAME_MAX), facts: [] },
    question: question.trim(),
    history: turns.map(({ q, a }) => ({ q, a })),
    solid_words: [],
    settings,
    form: { name: cut(form.name, FORM_NAME_MAX), fields: fieldStates(form, values) },
  };
}

/** The values of an answer the form may take: those for a field the form has that he types into, trimmed and cut to the field's limit. A field
 * the form does not have, a picture field and an empty value are ignored. */
export function applyFormValues(form: FormSpec, given: FormValue[] | undefined): FormValue[] {
  const filled: FormValue[] = [];
  for (const { field, value } of given ?? []) {
    const spec = form.fields.find((f) => f.name === field);
    if (!spec || spec.kind === 'pictures') continue;
    const text = value.trim().slice(0, spec.maxLength ?? FORM_VALUE_MAX);
    if (text) filled.push({ field, value: text });
  }
  return filled;
}

/** Whether every required field of `form` holds something (a picture field holds something when `values` says so). */
export const requiredFilled = (form: FormSpec, values: Record<string, string>): boolean =>
  form.fields.every((f) => !f.required || (values[f.name] ?? '').trim() !== '');

/** The tutor's answer cut after its first question (mw-5r3p30.158): the grind is told to ask one question, and now and then the model asks it and
 * keeps talking ('Who made this approach? If it's the Greek Colour Method…'), which he would read as a guess he did not ask for. A question mark
 * inside a word or an address ('a?b=1') does not end it; an answer with no question is as it was. */
export function oneQuestion(answer: string): string {
  const end = answer.search(/\?(?=\s|$)/);
  return end < 0 ? answer : answer.slice(0, end + 1);
}
