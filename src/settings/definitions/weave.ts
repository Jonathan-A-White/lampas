// The Weave (Settings > Weave, its Words row): the Greek or Hebrew of his words in place of their English (src/data/weave.ts). The Reader reads it
// and tells the bus once it has loaded, and src/nav/readerAddress.ts writes it into the address.
import { defineSetting } from '../define';
import { depthFrom } from './interest';

export type Weave = 'off' | 'solid' | 'solid+learning';

export const weaveSetting = defineSetting<Weave>({
  key: 'weave',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'off', label: 'Off' },
      { value: 'solid', label: 'Solid' },
      { value: 'solid+learning', label: '+ Learning' },
    ],
  },
  section: 'weave',
  dependsOn: depthFrom(2),
  label: 'Weave',
  hint: 'The Greek or Hebrew of your words in place of their English.',
  help: 'Your words in Greek or Hebrew in place of their English:\n\n- **Solid**: the solid ones.\n- **+ Learning**: those you learn too, English beneath in small grey.',
});
