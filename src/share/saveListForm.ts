// src/share/saveListForm.ts — the Share sheet's Save as a list form as the tutor's helper sees it (src/formHelper/FormHelper.tsx, mw-o7cts8.4): where to save (a choice
// among 'New list' and the names of the lists he has, read when the sheet opens) and the name of a new list. The labels are the sheet's (src/share/SaveAsList.tsx draws the
// same ones); the command its Save and the helper's Send both run is saveAsListCommand (src/services/formCommands.ts).
import type { FormSpec } from '../formHelper/formHelper';
import { LIST_NAME_MAX } from './listName';

/** The first choice of `where`: a list made for the references. */
export const NEW_LIST_CHOICE = 'New list';

export const WHERE_LABEL = 'Save to';
export const NAME_LABEL = 'List name';
export const NAME_HINT = 'The name of a new list; a list he has keeps its own.';

/** The form with `names` (the lists he has, newest first) after 'New list'. */
export function saveListForm(names: readonly string[]): FormSpec {
  return {
    name: 'Save as a list',
    fields: [
      { name: 'where', label: WHERE_LABEL, required: true, kind: 'choice', options: [NEW_LIST_CHOICE, ...names.filter((n, i) => n !== NEW_LIST_CHOICE && names.indexOf(n) === i)] },
      { name: 'name', label: NAME_LABEL, hint: NAME_HINT, required: true, kind: 'text', maxLength: LIST_NAME_MAX },
    ],
  };
}

/** The form before any list is known: 'New list' alone. */
export const SAVE_LIST_FORM: FormSpec = saveListForm([]);
