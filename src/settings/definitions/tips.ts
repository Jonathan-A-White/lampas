// Tips (Settings > Tips): whether Lampas may offer one small tip a day (src/tips/offer.ts) and show its one-time hints (src/tips/HintCard.tsx).
import { defineSetting } from '../define';

export type Tips = 'on' | 'off';

export const tipsSetting = defineSetting<Tips>({
  key: 'tips',
  default: 'on',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'tips',
  label: 'Tips',
  hint: 'One small tip a day, from what you use.',
  help: 'Whether Lampas may offer one small tip a day, from what you use, to help you get more from the app. Once a day at most, when you open Lampas and are online. On by default; Off sends nothing.',
});
