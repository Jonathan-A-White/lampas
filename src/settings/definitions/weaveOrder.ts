// The Weave's Order (Settings > Weave, its Order row, mw-5r3p30.250): the order the woven verse is laid out in. English is the MSB's English
// order; the original is the Greek or Hebrew word order of the MSB tables, each English chunk standing where its first Greek word stands, so his Greek words
// are read where the Greek has them and the rest are their English glosses (src/data/weave.ts chunkOrder). Shown while the Weave is not Off.
import { defineSetting } from '../define';

export type WeaveOrder = 'english' | 'greek';

export const weaveOrderSetting = defineSetting<WeaveOrder>({
  key: 'weaveOrder',
  default: 'english',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'english', label: 'English' },
      { value: 'greek', label: 'Original' },
    ],
  },
  section: 'weave',
  label: 'Order',
  hint: 'Lay the woven verse out in the English or in the original word order.',
  help: 'In the English view with the Weave on, the order the verse is laid out in:\n\n- **English**: the English translation\'s own order.\n- **Original**: the order of the Greek or Hebrew words. Each English word or phrase stands where its original word stands in the verse, so the original of his words is read where the original has it and the rest are their English glosses. An original word the translation gives no English of its own is not shown.\n\nEnglish by default; it shows only while the Weave is not Off.',
  dependsOn: { key: 'weave', shown: (value) => value !== 'off' },
});
