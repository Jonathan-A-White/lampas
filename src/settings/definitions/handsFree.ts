// Hands-free (Settings > Listening > Reading voices, the section's first row; mw-rl10piw.5): whether the app is run by voice with the screen left alone. Off until he turns it on, on until he
// turns it off: the Settings switch and the three-finger tap anywhere (src/handsFree/HandsFreeGate.tsx) are this one setting, and both go through src/handsFree/switch.ts, which says
// 'Hands-free on' or 'Hands-free off' aloud. While it is On a small microphone mark stands at the top right and the screen stays awake. This setting opens no microphone: that is the next story's.
import { defineSetting } from '../define';

export type HandsFreeValue = 'on' | 'off';

export const handsFreeSetting = defineSetting<HandsFreeValue>({
  key: 'handsFree',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'voices',
  label: 'Hands-free',
  hint: 'A three-finger tap turns it On or Off.',
  help: 'Hands-free is Off until you turn it On, and stays On until you turn it Off. This switch and a tap with three fingers anywhere in the app do the same thing; each says "Hands-free on" or "Hands-free off" aloud. While it is On a small microphone mark shows at the top right and the screen stays awake.',
});
