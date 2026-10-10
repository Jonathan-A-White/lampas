// Ask by (Settings > Asking the tutor): whether Ask the tutor opens speak-first (the big Hold to ask bar, Type a question beneath it) or type-first (the
// text box and Send, a small mic beside them). src/Ask.tsx AskComposer reads it; the tutor may switch it when he asks (the verse-ask answer's settings_changes).
import { defineSetting } from '../define';

export type AskBy = 'speaking' | 'typing';

export const askBySetting = defineSetting<AskBy>({
  key: 'askBy',
  default: 'speaking',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'speaking', label: 'Speaking' },
      { value: 'typing', label: 'Typing' },
    ],
  },
  section: 'askBy',
  label: 'Ask by',
  hint: 'Ask the tutor with your voice first, or with the keyboard first.',
  help: 'How Ask the tutor opens. Speaking shows the big Hold to ask bar, with Type a question beneath it. Typing shows the text box and Send first, with a small mic beside them to speak instead. Speaking by default. You can also ask the tutor to switch it: say "let me type" or "switch back to speaking".',
});
