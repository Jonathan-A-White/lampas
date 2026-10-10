// The Weave (Settings > Weave, its Words row): the Greek of his words in place of their English (src/data/weave.ts). The Reader reads it
// and tells the bus once it has loaded, and src/nav/readerAddress.ts writes it into the address.
import { defineSetting } from '../define';

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
  label: 'Weave',
  hint: 'The Greek of your words in place of their English.',
  help: 'In the English view, whether the Greek of his solid words, and of the words he is learning with their English beneath in small grey, is shown in place of their English. Solid shows the solid ones; + Learning shows the ones being learned too, with their English beneath in small grey until they turn solid.',
});
