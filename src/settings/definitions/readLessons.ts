// Read lessons to me (Settings > Read aloud): whether an idea sheet, a Grammar sheet and a new word's sheet read themselves aloud when they open
// (src/speech/ReadAloud.tsx LessonReadAloud). Off to start. For a reader who reads English slowly: the words stay on screen, he can stop the voice.
import { defineSetting } from '../define';
import { greekFrom } from './greekInterest';

export type ReadLessons = 'on' | 'off';

export const readLessonsSetting = defineSetting<ReadLessons>({
  key: 'readLessons',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
  section: 'readAloud',
  dependsOn: greekFrom(3),
  label: 'Read lessons to me',
  hint: 'A lesson reads itself aloud when it opens; the words stay on screen.',
  help: 'When On, an idea sheet, a Grammar sheet and a new word\'s sheet start reading themselves aloud as soon as they open, Greek in the Greek voice and the rest in the English one, at your speed. The words always stay on screen. The speaker on the sheet stops the voice, and so does closing the sheet. If your phone will not speak until you tap, the speaker pulses with "Tap to listen". Off by default: with it Off a lesson is read only when you tap its speaker.',
});
