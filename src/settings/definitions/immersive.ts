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
  help: 'On: scrolling the text down slides the header, the row of chips, the Talk bar and the Ask button out of view, so the text has the whole screen. Scrolling back up a little, or tapping the text with two fingers, brings them back; they also come back when a sheet closes, at the end of the chapter and when reading aloud stops. Off by default.',
});
