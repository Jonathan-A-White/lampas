import { SCRIPTS } from '../../script/scripts';
import { ROWS } from '../rows';
import { AppearanceControl, ChapterButtonsControl, CopyFormatControl, FontControl, HeadingsControl, ImmersiveControl, ImmersiveHintControl, LayoutControl, ReadingModeControl } from './appearance';
import { ApproachControl } from './approach';
import { AskDevotionalControl } from './askDevotional';
import { DailyDevotionalControl, DailyMemorizeControl, DailyPlanControl, DailyPsalmsControl, DailyReviewControl, DailyTicksControl, DevotionalControl, GreekKeyboardControl, HebrewKeyboardControl, DevotionalDrawControl, TodaysDevotionalControl } from './daily';
import { DeveloperControl } from './developer';
import { GoalControl } from './goal';
import { GrammarExtentControl } from './grammarExtent';
import { GreekInterestControl, HebrewInterestControl } from './interest';
import { HandwritingControl } from './handwriting';
import { LanguagesControl } from './languages';
import { LinkControl } from './links';
import { MapsControl } from './maps';
import { NewWordsControl } from './newWords';
import { QuizGoalControl } from './quizGoal';
import { AudioBibleControl, LibraryControl, LogosBibleControl, ReadingPlanControl, ResourceControl } from './resources';
import { AskByControl, ReadLessonsControl, ReadTutorControl, ScriptDepthControl, SendControl, TalkControl, TipsControl } from './tutor';
import type { Control } from './types';
import { EnglishAccentControl, FamilyControl, IpaLessonControl, PronunciationControl, PronunciationSeparateControl, ReadSpanControl, SpeedControl, VoiceControl } from './voice';
import { VariantLessonsOfferControl, VariantsControl, VariantWitnessesControl } from './variants';
import { WeaveControl } from './weave';

/** The control of each row, by the row's key (src/settings/rows.ts): a row with no control here is a test failure. */
export const CONTROLS: Readonly<Record<string, Control>> = {
  languages: LanguagesControl,
  greekInterest: GreekInterestControl,
  hebrewInterest: HebrewInterestControl,
  theme: AppearanceControl,
  font: FontControl,
  textSize: AppearanceControl,
  layout: LayoutControl,
  readingMode: ReadingModeControl,
  chapterButtons: ChapterButtonsControl,
  copyText: CopyFormatControl,
  copyReference: CopyFormatControl,
  copyNumbers: CopyFormatControl,
  copyLink: CopyFormatControl,
  sectionHeadings: HeadingsControl,
  immersiveReader: ImmersiveControl,
  immersiveHint: ImmersiveHintControl,
  weave: WeaveControl,
  weaveGrammar: WeaveControl,
  weaveOrder: WeaveControl,
  variants: VariantsControl,
  variantWitnesses: VariantWitnessesControl,
  variantLessonsOffer: VariantLessonsOfferControl,
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
  hebrewVoice: VoiceControl,
  greekRate: SpeedControl,
  hebrewRate: SpeedControl,
  pronunciation: FamilyControl,
  pronunciationSeparate: PronunciationSeparateControl,
  greekPronunciation: PronunciationControl,
  hebrewPronunciation: PronunciationControl,
  englishAccent: EnglishAccentControl,
  ipaLesson: IpaLessonControl,
  logosBible: LogosBibleControl,
  logosBibleOt: LogosBibleControl,
  logosBibleApocrypha: LogosBibleControl,
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
  hebrewKeyboard: HebrewKeyboardControl,
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
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('maps.')).map((r) => [r.key, MapsControl])),
  ...Object.fromEntries(ROWS.filter((r) => r.key.startsWith('link.')).map((r) => [r.key, LinkControl])),
};
