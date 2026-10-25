import { SCRIPTS } from '../../script/scripts';
import { ROWS } from '../rows';
import { AppearanceControl, ChapterButtonsControl, FontControl, HeadingsControl, ImmersiveControl, ImmersiveHintControl, LayoutControl, ReadingModeControl } from './appearance';
import { ApproachControl } from './approach';
import { AskDevotionalControl } from './askDevotional';
import { DailyDevotionalControl, DailyMemorizeControl, DailyPlanControl, DailyPsalmsControl, DailyReviewControl, DailyTicksControl, DevotionalControl, GreekKeyboardControl, DevotionalDrawControl, TodaysDevotionalControl } from './daily';
import { DeveloperControl } from './developer';
import { GoalControl } from './goal';
import { GrammarExtentControl } from './grammarExtent';
import { GreekInterestControl } from './greekInterest';
import { HandwritingControl } from './handwriting';
import { LinkControl } from './links';
import { NewWordsControl } from './newWords';
import { QuizGoalControl } from './quizGoal';
import { AudioBibleControl, LibraryControl, LogosBibleControl, ReadingPlanControl, ResourceControl } from './resources';
import { AskByControl, ReadLessonsControl, ReadTutorControl, ScriptDepthControl, SendControl, TalkControl, TipsControl } from './tutor';
import type { Control } from './types';
import { EnglishAccentControl, PronunciationControl, ReadSpanControl, SpeedControl, VoiceControl } from './voice';
import { WeaveControl } from './weave';

/** The control of each row, by the row's key (src/settings/rows.ts): a row with no control here is a test failure. */
export const CONTROLS: Readonly<Record<string, Control>> = {
  greekInterest: GreekInterestControl,
  theme: AppearanceControl,
  font: FontControl,
  textSize: AppearanceControl,
  layout: LayoutControl,
  readingMode: ReadingModeControl,
  chapterButtons: ChapterButtonsControl,
  sectionHeadings: HeadingsControl,
  immersiveReader: ImmersiveControl,
  immersiveHint: ImmersiveHintControl,
  weave: WeaveControl,
  weaveGrammar: WeaveControl,
  weaveOrder: WeaveControl,
  newWordsADay: NewWordsControl,
  pickerGrammar: NewWordsControl,
  grammarMove: NewWordsControl,
  paradigmExtent: GrammarExtentControl,
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
  dailyMemorize: DailyMemorizeControl,
  dailyPlan: DailyPlanControl,
  dailyPsalms: DailyPsalmsControl,
  dailyDevotional: DailyDevotionalControl,
  devotional: DevotionalControl,
  devotionalDraw: DevotionalDrawControl,
  todaysDevotional: TodaysDevotionalControl,
  dailyTicks: DailyTicksControl,
  greekKeyboard: GreekKeyboardControl,
  'request.devotional': AskDevotionalControl,
  library: LibraryControl,
  tips: TipsControl,
  readTutor: ReadTutorControl,
  readLessons: ReadLessonsControl,
  askBy: AskByControl,
  talk: TalkControl,
  send: SendControl,
  developer: DeveloperControl,
  quizGoal: QuizGoalControl,
  ...Object.fromEntries(SCRIPTS.map((s) => [s.settingKey, ScriptDepthControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('resource.')).map((r) => [r.key, ResourceControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('link.')).map((r) => [r.key, LinkControl])),
};
