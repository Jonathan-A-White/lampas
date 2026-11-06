// The Old Testament in Greek (Settings home, under 'How much Greek?', mw-u2w5klk.11, the Septuagint epic's R3): whether the Reader opens a shipped Old Testament book from
// public/data-lxx, Swete's Greek with Brenton's English as the English view, instead of the Hebrew. Off to start; a book not yet shipped there stays Hebrew whatever this says.
// Drawn from Curious up, as the Greek view is (greekFrom): with no Greek there is nothing to switch to. PROVISIONAL: the Governor confirms the name.
import { defineSetting } from '../define';
import { greekFrom } from './greekInterest';

export type Septuagint = 'on' | 'off';

export const septuagintSetting = defineSetting<Septuagint>({
  key: 'septuagint',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'dial',
  label: 'Old Testament in Greek (Septuagint)',
  hint: 'Swete’s Greek with Brenton’s English; the Hebrew when off.',
  help: 'On: a book of the Old Testament that has its Septuagint opens in the Greek of Swete’s Septuagint, with Brenton’s English as the English view, instead of the Hebrew. The Septuagint numbers some chapters and verses differently (Greek Psalm 22 is Psalm 23), so the title says both, as “Psalms 23 (Greek 22)”. A book whose Septuagint is not ready stays in the Hebrew and says so. Off by default; it shows only from Curious up in How much Greek?',
  dependsOn: greekFrom(1),
});
