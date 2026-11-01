// Immersive reader (Settings > Immersive reader): whether the Reader's top slides away while he reads (src/immersive.ts).
import { defineSetting } from '../define';

export type Immersive = 'on' | 'off';

export const immersiveSetting = defineSetting<Immersive>({
  key: 'immersiveReader',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'immersive',
  label: 'Immersive reader',
  hint: 'While you read, the top slides away.',
  help: 'On: scrolling the text down slides the header and the row of chips out of view, so the text has the whole screen, and the text is set like a book: tight lines, a serif face, justified and hyphenated, with small dim verse numbers, and pure black behind it in the dark theme. Scrolling back up does not bring them back. With Turn pages, turning to the next page slides them away. Tapping the text with two fingers brings them back, and a second two-finger tap sends them away again; with this Off, the same tap switches it On and sends them away. The floating ? for the tutor is not drawn while the bars are away; the two-finger tap that brings them back brings the ? with them. Off by default.',
});
