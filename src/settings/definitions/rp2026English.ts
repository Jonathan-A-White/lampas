// English from the 2026 Greek (Settings > Reading, mw-9ji6ek0.33): whether the Reader shows, where the Robinson-Pierpont 2026 Greek changes what the English says, Lampas's own English
// over the Majority Standard Bible's, marked 'RP 2026' (data/rp2026-english.json, src/data/rp2026English.ts). Off leaves the text as the MSB has it. PROVISIONAL: the Governor confirms it.
import { defineSetting } from '../define';

export type Rp2026English = 'off' | 'on';

export const rp2026EnglishSetting = defineSetting<Rp2026English>({
  key: 'rp2026English',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
  },
  section: 'variants',
  label: 'English from the 2026 Greek',
  hint: 'Where the 2026 Greek changes the English, show Lampas’s own over the MSB’s.',
  help: 'On shows Lampas’s English, marked RP 2026, where the 2026 Greek changes it.',
});
