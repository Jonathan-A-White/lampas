// English accent (Settings > Greek pronunciation): the English the sound hints are said in. Every 'as in' hint, in the tiles, idea sheets, lessons, drills and
// quiz choices, comes from the accent's table (src/speech/accents/), American to start; IPA (the standard) shows the sound's own id in place of a key word.
// The tutor is sent it as `english_accent` and writes its sound examples and respellings for it. Kept on the device; the registry's entry also hands the choice
// to the accent module (src/settings/registry.ts) and src/speech/settingsSync.ts hands it the saved one at start.
import { ACCENTS, DEFAULT_ACCENT } from '../../speech/accents';
import { defineSetting } from '../define';

export const englishAccentSetting = defineSetting<string>({
  key: 'englishAccent',
  default: DEFAULT_ACCENT,
  allowed: { kind: 'choice', values: ACCENTS.map((a) => ({ value: a.id, label: a.label })) },
  section: 'pronunciation',
  label: 'English accent',
  hint: 'The English your sound hints and the tutor use: American, British, or IPA.',
  help: 'Which English the hints for Greek sounds are said in, everywhere at once, the tutor\'s examples too:\n\n- **American**: the default.\n- **British**\n- **IPA** (the standard): for readers who know it. Each sound is shown by its own symbol, such as /o/, in place of an English word.',
});
