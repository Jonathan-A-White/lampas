// Greek keyboard (Settings > Daily, beside Memorize; PROVISIONAL, mw-fu7dqf.9): whether the phone has a Greek keyboard, which the Memorize session's Type it needs to type a verse in Greek.
// Lampas draws no keyboard of its own: the phone's offers it for a field marked lang="el". Off to start, so a phone that has none is never asked to type Greek; he turns it On once he has added one.
import { defineSetting } from '../define';
import { greekFrom } from './greekInterest';

export type GreekKeyboard = 'on' | 'off';

export const greekKeyboardSetting = defineSetting<GreekKeyboard>({
  key: 'greekKeyboard',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'daily',
  label: 'Greek keyboard',
  hint: 'You have added a Greek keyboard to your phone',
  help: 'On once you have added a Greek keyboard to your phone, so Memorize offers Type it for a verse in Greek. Android: Settings > System > Languages & input > On-screen keyboard > Gboard > Languages, add Greek.',
  dependsOn: greekFrom(1),
});
