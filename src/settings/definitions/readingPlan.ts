// Reading plan (Settings > Study resources): whether Lampas keeps a reading plan, a chapter at a time through the Bible, with the audio Bible beside it. Off to
// start; starting a plan turns it on (src/data/repositories/readingPlan.ts startPlan). The plan itself (its start, what is done) is in the settings store under
// 'readingPlanState', outside the registry.
import { defineSetting } from '../define';

export type ReadingPlanSwitch = 'off' | 'on';

export const readingPlanSetting = defineSetting<ReadingPlanSwitch>({
  key: 'readingPlan',
  default: 'off',
  allowed: {
    kind: 'choice',
    values: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On' },
    ],
  },
  section: 'resources',
  label: 'Reading plan',
  hint: 'Read through the Bible a chapter at a time, with the audio Bible.',
  help: 'Whether Lampas keeps a reading plan: the whole Bible, Genesis to Revelation, a chapter at a time, in your audio Bible. On: it remembers where you started, the chapters done and the next one. Starting a plan turns this On, and the Audio Bible too if it was Off. Off by default.',
});
