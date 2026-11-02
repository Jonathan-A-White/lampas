// Handwriting drills (Settings > Handwriting, mw-86e9r1.51): whether the letter lessons and the letter drill offer Write it, writing the letter with a pen
// or a finger as a memory aid (src/handwriting/), a Greek letter or a Hebrew one (mw-5r3p30.913): a row both languages share, shown from Learning on either dial (depthFrom).
// Automatic, the default, is on once a pen has touched the screen (a web page sees a pen only then:
// src/handwriting/penWatch.ts keeps 'pen seen' on the phone); On offers it to a finger too; Off offers it nowhere.
import { defineSetting } from '../define';
import { depthFrom } from './interest';

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
  dependsOn: depthFrom(3),
  label: 'Handwriting drills',
  hint: 'Write letters with a pen or finger, as a memory aid. Automatic: on once a pen is seen.',
  help: 'Writing a letter by hand helps it stick. With this on, each Greek or Hebrew letter\'s lesson has a Write it part and the letter drill mixes in Write it questions: you trace the letter, then copy it, then write it from memory, two rights at each, and the phone itself checks which letter you wrote (no tutor, nothing sent). Skip is always there and never costs progress. The choices:\n\n- **Automatic**: the default, turns it on once a pen (a stylus) has touched the screen: a web page cannot see a pen before that.\n- **On**: offers it to a finger too.\n- **Off**: offers it nowhere.',
});
