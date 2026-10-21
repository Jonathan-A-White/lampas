// Handwriting drills (Settings > Handwriting, mw-86e9r1.51): whether the letter lessons and the letter drill offer Write it, writing the letter with a pen
// or a finger as a memory aid (src/handwriting/). Automatic, the default, is on once a pen has touched the screen (a web page sees a pen only then:
// src/handwriting/penWatch.ts keeps 'pen seen' on the phone); On offers it to a finger too; Off offers it nowhere.
import { defineSetting } from '../define';
import { greekFrom } from './greekInterest';

export type HandwritingDrills = 'auto' | 'on' | 'off';

export const handwritingSetting = defineSetting<HandwritingDrills>({
  key: 'handwritingDrills',
  default: 'auto',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'auto', label: 'Automatic' },
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'handwriting',
  dependsOn: greekFrom(3),
  label: 'Handwriting drills',
  hint: 'Write letters with a pen or finger, as a memory aid. Automatic: on once a pen is seen.',
  help: 'Writing a letter by hand helps it stick; you never need to write Greek to read the Bible. With this on, each letter\'s lesson has a Write it part and the letter drill mixes in Write it questions: you trace the letter, then copy it, then write it from memory, two rights at each, and the phone itself checks which letter you wrote (no tutor, nothing sent). Skip is always there and never costs progress. Automatic, the default, turns it on once a pen (a stylus) has touched the screen: a web page cannot see a pen before that. On offers it to a finger too; Off offers it nowhere.',
});
