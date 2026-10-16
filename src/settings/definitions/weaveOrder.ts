// The Weave's Order (Settings > Weave, its Order row, mw-5r3p30.250): the order the woven verse is laid out in. English is the MSB's English
// order; Greek is the Greek word order of the MSB tables, each English chunk standing where its first Greek word stands, so his Greek words
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
      { value: 'greek', label: 'Greek' },
    ],
  },
  section: 'weave',
  label: 'Order',
  hint: 'Lay the woven verse out in the English or in the Greek word order.',
  help: 'In the English view with the Weave on, the order the verse is laid out in. English is the English translation\'s own order. Greek is the order of the Greek words: each English word or phrase stands where its Greek word stands in the verse, so the Greek of his words is read where the Greek has it and the rest are their English glosses. A Greek word the translation gives no English of its own is not shown. English by default; it shows only while the Weave is not Off.',
  dependsOn: { key: 'weave', shown: (value) => value !== 'off' },
});
