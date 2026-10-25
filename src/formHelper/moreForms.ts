// src/formHelper/moreForms.ts — the three Ask for more forms (Settings > More > Ask for more: An approach or programme, A text, A translation) as the tutor's helper sees them
// (src/formHelper/FormHelper.tsx, mw-o7cts8.3): per kind the words the form shows (MORE_WORDS, which src/settings/AskMoreScreen.tsx draws) and its FormSpec, whose fields are
// name (what he wants), why and link in screen order, under the keys the tutor answers with.
import { MAX_CREDIT_URL, MAX_FEEDBACK_CHARS, MAX_MORE_NAME, MORE_KINDS, type MoreKind } from '../services/feedback';
import type { FormSpec } from './formHelper';

/** What each form asks, in his words. */
export const MORE_WORDS: Record<MoreKind, { title: string; what: string; whatHint: string; why: string }> = {
  approach: {
    title: 'An approach or programme',
    what: 'Which approach or programme?',
    whatHint: 'Its name, and who made it if you know: a course, a method, a reading programme.',
    why: 'How does it teach, and why do you want it?',
  },
  text: {
    title: 'A text',
    what: 'Which text?',
    whatHint: 'A text Lampas does not have: the Septuagint, the Apostolic Fathers, another edition.',
    why: 'Why do you want it?',
  },
  translation: {
    title: 'A translation',
    what: 'Which translation?',
    whatHint: 'An English translation to read beside the Greek: the ESV, the NASB.',
    why: 'Why do you want it?',
  },
};

export const MORE_FORMS = Object.fromEntries(
  MORE_KINDS.map((kind): [MoreKind, FormSpec] => [
    kind,
    {
      name: MORE_WORDS[kind].title,
      fields: [
        {
          name: 'name',
          label: MORE_WORDS[kind].what,
          hint: MORE_WORDS[kind].whatHint,
          required: true,
          kind: 'text',
          maxLength: MAX_MORE_NAME,
        },
        {
          name: 'why',
          label: MORE_WORDS[kind].why,
          required: false,
          kind: 'text',
          maxLength: MAX_FEEDBACK_CHARS,
        },
        {
          name: 'link',
          label: 'Link',
          required: false,
          kind: 'link',
          maxLength: MAX_CREDIT_URL,
        },
      ],
    },
  ]),
) as Record<MoreKind, FormSpec>;
