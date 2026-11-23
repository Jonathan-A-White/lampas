// Pause before it acts (Settings > Listening > Reading voices, under Hands-free; mw-rl10piw.9): how long a silence after his words ends a spoken command. 1.5 seconds to
// start (his decision, mw-6ww.165); he lengthens it when he stops to think in the middle of a command. The row is always drawn: he sets it with Hands-free Off. The Hands-free
// session (src/handsFree/session.ts) reads it as each command is listened for, so a change needs no restart. The 8 s follow-up window is not this setting's.
import { defineSetting } from '../define';

export type HandsFreePauseValue = '1' | '1.5' | '2' | '3' | '4';

export const handsFreePauseSetting = defineSetting<HandsFreePauseValue>({
  order: 100,
  slot: 420,
  key: 'handsFreePause',
  default: '1.5',
  allowed: {
    kind: 'choice',
    values: [
      { value: '1', label: '1 second' },
      { value: '1.5', label: '1.5 seconds' },
      { value: '2', label: '2 seconds' },
      { value: '3', label: '3 seconds' },
      { value: '4', label: '4 seconds' },
    ],
  },
  section: 'voices',
  label: 'Pause before it acts',
  hint: 'How long it waits after you stop speaking.',
  help: 'Hands-free takes a silence after your words as the end of your command. This is how long that silence is:\n\n- **1.5 seconds**: the usual.\n- **A longer pause** lets you stop to think in the middle of a command without it being cut off, and makes it wait longer before it acts.\n\nA change takes effect at the next command. It does not change the eight seconds it waits for a follow-up.',
});

/** The silence that ends a command, in milliseconds. */
export const handsFreePauseMs = (value: HandsFreePauseValue): number => Math.round(Number(value) * 1000);
