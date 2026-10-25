// src/formHelper/formHelper.ts — the form helper's glue (mw-5r3p30.117, docs/ask-tutor.md 'Let the tutor do it'). What a form tells the tutor about itself,
// which fields an answer may fill and when it may be sent are voice-kit's (@voice-kit/forms, mw-o7cts8.1), re-exported here under the names Lampas
// uses; what stays is the request the bible-talk grind is sent. A form that offers the door describes itself as a FormSpec and draws <FormHelper>
// (FormHelper.tsx); nothing here knows a particular form.
import { FORM_NAME_MAX, requestFields, type FormSpec } from 'voice-kit/forms';
import type { SettingValue } from '../settings/registry';
import type { TalkHistoryEntry, TalkRequest } from '../services/talk';

export {
  applyValues as applyFormValues,
  argsOf,
  FORM_FIELD_MAX,
  formCommand,
  FORM_START,
  FORM_VALUE_MAX,
  FORM_NAME_MAX,
  MAX_FORM_FIELDS,
  oneQuestion,
  requestFields as fieldStates,
  requiredFilled,
  type FormArgs,
  type FormField,
  type FormFieldKind,
  type FormFieldState,
  type FormRequest,
  type FormSpec,
  type FormValue,
} from 'voice-kit/forms';

const cut = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max - 1).trimEnd() + '…');

/** The request for what he just said while the tutor helps with `form`: a talk from a screen named for the form (no verse text), with the
 * form's fields and what they hold now, and `command` (the name of the command its Send runs) when the form has a Send the panel can show. The
 * grind answers with the next question and any values to put in the fields. */
export function buildFormRequest(
  form: FormSpec,
  values: Record<string, string>,
  question: string,
  turns: TalkHistoryEntry[],
  settings: Record<string, SettingValue> = {},
  command?: string,
): TalkRequest {
  return {
    reference: cut(form.name, FORM_NAME_MAX),
    screen: { name: cut(form.name, FORM_NAME_MAX), facts: [] },
    question: question.trim(),
    history: turns.map(({ q, a }) => ({ q, a })),
    solid_words: [],
    settings,
    form: { name: cut(form.name, FORM_NAME_MAX), fields: requestFields(form, values), ...(command ? { command } : {}) },
  };
}
