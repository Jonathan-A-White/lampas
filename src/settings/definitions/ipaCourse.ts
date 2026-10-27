// The IPA lesson (Settings > Listening > Pronunciation, mw-gdcyf98.24, his words: "just like there's an optional lesson for IPA for Greek maybe there's an optional lesson whatever the
// equivalent is and that can be a setting"): whether the Goal screen offers the optional course 'Learn the IPA sounds', for Greek and, while he reads Hebrew, for Hebrew. One switch for the one
// kind of lesson, a row both languages share (from either dial at Curious up). On to start, so the Greek entry stays as it was. Its key is not 'ipaCourse': that is where the course keeps
// his Greek progress (src/data/repositories/ipaCourse.ts), and a setting there would overwrite it.
import { defineSetting } from '../define';
import { depthFrom } from './interest';

export type IpaLesson = 'on' | 'off';

export const ipaCourseSetting = defineSetting<IpaLesson>({
  key: 'ipaLesson',
  default: 'on',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'pronunciation',
  label: 'IPA lesson',
  hint: 'The optional IPA lesson, for Greek and for Hebrew.',
  help: 'Whether the Goal screen offers the optional lesson on IPA, the standard symbols for sounds, for Greek and, while you read Hebrew, for Hebrew too. It is never needed for Lampas. On by default; Off takes it off the Goal screen and keeps what you have done.',
  dependsOn: depthFrom(1),
});
