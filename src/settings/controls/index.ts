import { SCRIPTS } from '../../script/scripts';
import { ROWS } from '../rows';
import { AppearanceControl, HeadingsControl, ImmersiveControl, LayoutControl } from './appearance';
import { ApproachControl } from './approach';
import { DeveloperControl } from './developer';
import { GoalControl } from './goal';
import { LinkControl } from './links';
import { NewWordsControl } from './newWords';
import { LogosBibleControl, ResourceControl } from './resources';
import { ReadTutorControl, ScriptDepthControl, TipsControl } from './tutor';
import type { Control } from './types';
import { PronunciationControl, ReadSpanControl, SpeedControl, VoiceControl } from './voice';
import { WeaveControl } from './weave';

/** The control of each row, by the row's key (src/settings/rows.ts): a row with no control here is a test failure. */
export const CONTROLS: Readonly<Record<string, Control>> = {
  theme: AppearanceControl,
  textSize: AppearanceControl,
  layout: LayoutControl,
  sectionHeadings: HeadingsControl,
  immersiveReader: ImmersiveControl,
  weave: WeaveControl,
  weaveGrammar: WeaveControl,
  newWordsADay: NewWordsControl,
  pickerGrammar: NewWordsControl,
  grammarMove: NewWordsControl,
  goal: GoalControl,
  grammarApproach: ApproachControl,
  readSpan: ReadSpanControl,
  englishVoice: VoiceControl,
  greekVoice: VoiceControl,
  englishRate: SpeedControl,
  greekRate: SpeedControl,
  greekPronunciation: PronunciationControl,
  logosBible: LogosBibleControl,
  tips: TipsControl,
  readTutor: ReadTutorControl,
  developer: DeveloperControl,
  ...Object.fromEntries(SCRIPTS.map((s) => [s.settingKey, ScriptDepthControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('resource.')).map((r) => [r.key, ResourceControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('link.')).map((r) => [r.key, LinkControl])),
};
