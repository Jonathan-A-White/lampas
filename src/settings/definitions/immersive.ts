// Immersive reader (Settings > Immersive reader): whether the Reader's top and Talk bar slide away while he reads (src/immersive.ts).
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
  hint: 'While you read, the top and the Talk bar slide away.',
  help: 'On: scrolling the text down slides the header, the row of chips, the Talk bar and the Ask button out of view, so the text has the whole screen, and the text is set like a book: tight lines, a serif face, justified and hyphenated, with small dim verse numbers, and pure black behind it in the dark theme. Scrolling back up does not bring them back. Tapping the text with two fingers brings them back, and a second two-finger tap sends them away again; nothing else changes them: not the end of the chapter, a sheet closing or reading aloud stopping. Off by default.',
});
