import { SCRIPTS } from '../../script/scripts';
import { ROWS } from '../rows';
import { AppearanceControl, FontControl, HeadingsControl, ImmersiveControl, ImmersiveHintControl, LayoutControl, ReadingModeControl } from './appearance';
import { ApproachControl } from './approach';
import { DailyDevotionalControl, DailyPlanControl, DailyPsalmsControl, DailyReviewControl, DailyTicksControl, DevotionalControl, DevotionalDrawControl, TodaysDevotionalControl } from './daily';
import { DeveloperControl } from './developer';
import { GoalControl } from './goal';
import { HandwritingControl } from './handwriting';
import { LinkControl } from './links';
import { NewWordsControl } from './newWords';
import { QuizGoalControl } from './quizGoal';
import { RequestDevotionalControl } from './requestDevotional';
import { AudioBibleControl, LogosBibleControl, ReadingPlanControl, ResourceControl, WorksControl } from './resources';
import { AskByControl, ReadLessonsControl, ReadTutorControl, ScriptDepthControl, TipsControl } from './tutor';
import type { Control } from './types';
import { EnglishAccentControl, PronunciationControl, ReadSpanControl, SpeedControl, VoiceControl } from './voice';
import { WeaveControl } from './weave';

/** The control of each row, by the row's key (src/settings/rows.ts): a row with no control here is a test failure. */
export const CONTROLS: Readonly<Record<string, Control>> = {
  theme: AppearanceControl,
  font: FontControl,
  textSize: AppearanceControl,
  layout: LayoutControl,
  readingMode: ReadingModeControl,
  sectionHeadings: HeadingsControl,
  immersiveReader: ImmersiveControl,
  immersiveHint: ImmersiveHintControl,
  weave: WeaveControl,
  weaveGrammar: WeaveControl,
  weaveOrder: WeaveControl,
  newWordsADay: NewWordsControl,
  pickerGrammar: NewWordsControl,
  grammarMove: NewWordsControl,
  goal: GoalControl,
  grammarApproach: ApproachControl,
  handwritingDrills: HandwritingControl,
  readSpan: ReadSpanControl,
  englishVoice: VoiceControl,
  greekVoice: VoiceControl,
  englishRate: SpeedControl,
  greekRate: SpeedControl,
  greekPronunciation: PronunciationControl,
  englishAccent: EnglishAccentControl,
  logosBible: LogosBibleControl,
  audioBible: AudioBibleControl,
  readingPlan: ReadingPlanControl,
  dailyReview: DailyReviewControl,
  dailyPlan: DailyPlanControl,
  dailyPsalms: DailyPsalmsControl,
  dailyDevotional: DailyDevotionalControl,
  devotional: DevotionalControl,
  devotionalDraw: DevotionalDrawControl,
  todaysDevotional: TodaysDevotionalControl,
  dailyTicks: DailyTicksControl,
  'request.devotional': RequestDevotionalControl,
  works: WorksControl,
  tips: TipsControl,
  readTutor: ReadTutorControl,
  readLessons: ReadLessonsControl,
  askBy: AskByControl,
  developer: DeveloperControl,
  quizGoal: QuizGoalControl,
  ...Object.fromEntries(SCRIPTS.map((s) => [s.settingKey, ScriptDepthControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('resource.')).map((r) => [r.key, ResourceControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('link.')).map((r) => [r.key, LinkControl])),
};
