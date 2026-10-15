// Audio Bible (Settings > Study resources): which audio Bible the Verse view's Listen offers a link to. Off to start; The Word of Promise (NKJV) opens the book in
// the Audible app and says which chapter to pick (src/resources/audioBible.ts). Free to read: no licence is needed.
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
  hint: 'Listen in an audio Bible you own: the Verse view links to it.',
  help: 'Off, or The Word of Promise (NKJV), which you own in Audible. On: the Verse view\'s Listen has a "Listen in Audible" link that opens the book in the Audible app and says which chapter to pick, such as Chapters > Luke 15. Audible lets no other app open a book at a chapter, so you pick the chapter there. It needs the book in your Audible library. Off by default.',
});
