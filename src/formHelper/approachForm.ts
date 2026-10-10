// src/formHelper/approachForm.ts — the Ask for another approach form as the tutor's helper sees it (src/formHelper/FormHelper.tsx): the fields in
// screen order and the keys the tutor answers with. The hints are the lines under the fields (src/AskApproachSheet.tsx draws the same ones).
import { MAX_CREDIT_NAME, MAX_CREDIT_URL, MAX_FEEDBACK_CHARS } from '../services/feedback';
import type { FormSpec } from './formHelper';

export const CREDIT_HINT = 'Required: whoever made the approach or the pictures.';
export const LINK_HINT = 'Optional: where the approach can be found.';

export const APPROACH_FORM: FormSpec = {
  name: 'Ask for another approach',
  fields: [
    { name: 'approach', label: 'What approach, and how does it teach?', required: true, kind: 'text', maxLength: MAX_FEEDBACK_CHARS },
    { name: 'pictures', label: 'Add a screenshot or photo', required: false, kind: 'pictures' },
    { name: 'credit', label: 'Who to credit', hint: CREDIT_HINT, required: true, kind: 'text', maxLength: MAX_CREDIT_NAME },
    { name: 'link', label: 'Link', hint: LINK_HINT, required: false, kind: 'link', maxLength: MAX_CREDIT_URL },
  ],
};
