// src/library/bookForm.ts — the Ask for a book form as the tutor sees it (src/formHelper/FormHelper.tsx, mw-o7cts8.2): the fields in screen order and the keys the
// tutor answers with. The labels and the hint are the sheet's (src/library/AskForBook.tsx draws the same ones); the kind is a choice among the kinds' singular names, as the
// sheet's select lists them.
import type { FormSpec } from '../formHelper/formHelper';
import { KINDS } from '../resources/catalogue';
import { MAX_BOOK_CHARS, MAX_FEEDBACK_CHARS } from '../services/feedback';
import { infoOf } from './kinds';

export const TITLE_HINT = 'The title, and its author if you know it';

export const BOOK_FORM: FormSpec = {
  name: 'Ask for a book',
  fields: [
    { name: 'title', label: 'Which book?', hint: TITLE_HINT, required: true, kind: 'text', maxLength: MAX_BOOK_CHARS },
    { name: 'kind', label: 'Kind of book', required: false, kind: 'choice', options: KINDS.map((k) => infoOf(k).singular) },
    { name: 'why', label: 'Why would it help?', required: false, kind: 'text', maxLength: MAX_FEEDBACK_CHARS },
  ],
};
