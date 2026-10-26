// Audio Bible (Settings > Study resources): which audio Bible the Verse view's Listen offers a link to. Off to start; The Word of Promise (NKJV) opens the Audible app and
// plays from the start of the chapter (src/resources/audioBible.ts). Free to read: no licence is needed.
import { AUDIO_BIBLES } from '../../resources/audioBible';
import { defineSetting } from '../define';

export const audioBibleSetting = defineSetting<string>({
  key: 'audioBible',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [{ value: 'off', label: 'Off' }, ...AUDIO_BIBLES.map((b) => ({ value: b.id, label: b.choice }))],
  },
  section: 'resources',
  label: 'Audio Bible',
  hint: 'The Word of Promise in Audible: the Verse view links to it.',
  help: 'Off, or The Word of Promise (NKJV), which you own in Audible. On: the Verse view\'s Listen has a "Listen in Audible" link that opens the Audible app and plays from the start of the chapter you are in, and a line naming that chapter in the Audible list, such as Chapters > Luke 15. It needs the Audible app and the book in your Audible library.',
});
