// Hebrew keyboard (Settings > Daily, beside the Greek one; PROVISIONAL, mw-gdcyf98.6): whether the phone has a Hebrew keyboard, for a field marked lang="he".
// Lampas draws no keyboard of its own: the phone's offers it. Off to start, so a phone that has none is never asked to type Hebrew; he turns it On once he has added one.
import { defineSetting } from '../define';
import { hebrewFrom } from './hebrewInterest';

export type HebrewKeyboard = 'on' | 'off';

export const hebrewKeyboardSetting = defineSetting<HebrewKeyboard>({
  key: 'hebrewKeyboard',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'daily',
  label: 'Hebrew keyboard',
  hint: 'You have added a Hebrew keyboard to your phone',
  help: 'On once you have added a Hebrew keyboard to your phone. Android: Settings > System > Languages & input > On-screen keyboard > Gboard > Languages, add Hebrew.',
  dependsOn: hebrewFrom(1),
});
