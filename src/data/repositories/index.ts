// UI code reaches the local store only through the repositories exported here, never through Dexie tables
// directly, and a repository owns its transactions (docs/pwa-best-practices.md section 15).
export { addImportedWords, addWordToLearn, wordIsListed, listDroppedLemmas, listLearningLemmas, listSolidHeadwords, listSolidLemmas, listWords, seedWordsIfFirstOpen, setWordState, teachWord } from './words';
export type { Word, WordOutcome, WordState } from './words';
export {
  clearGrammarAnswers,
  getGoal,
  getGrammarAnswers,
  getGrammarMove,
  getNewWordsADay,
  getPaceRounds,
  getPickerGrammar,
  recordRound,
  setNewWordsADay,
  getGrammarApproach,
  getGreekPronunciation,
  getLayout,
  getLogosBible,
  getReadSpan,
  getReaderView,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getTextSize,
  getTheme,
  getReadTutor,
  getTips,
  getVoice,
  getWeave,
  getWeaveGrammar,
  pushGrammarAnswer,
  setGoal,
  setGrammarMove,
  setPickerGrammar,
  setGrammarApproach,
  setGreekPronunciation,
  setLayout,
  setLogosBible,
  setReadSpan,
  setReaderView,
  setSectionHeadings,
  setSpeechRate,
  setTextSize,
  setTheme,
  setReadTutor,
  setTips,
  setVoice,
  setWeave,
  setWeaveGrammar,
} from './settings';
export type { ReadSpan } from '../../speech/readSpan';
export type { GrammarMove, PickerGrammar, ReaderView, ReadingLayout, ReadTutor, SectionHeadings, Tips, VoiceLanguage, Weave, WeaveGrammar } from './settings';
export { listResults, recordAnswer } from './results';
export type { TestResult } from './results';
export { countDue, ensureScheduled, listDue, recordReview, reviewsOf, seedScheduleIfFirstOpen } from './reviews';
export type { Review } from './reviews';
export { addAnswer, listAnswers, verseRef } from './answers';
export type { AnswerWord, TutorAnswer } from './answers';
export { STUDY_WAY_LINE_MAX, STUDY_WAY_MAX, deleteStudyWayLine, editStudyWayLine, keepStudyWayLine, listStudyWay } from './studyWay';
export type { EditResult, KeepResult } from './studyWay';
export { addTurn, listTurns, markChangeUndone, talkRef } from './talks';
export type { TalkTurn, TurnChanges } from './talks';
export { listDrillResults, recordDrillStep } from './drills';
export type { DrillResult } from './drills';
export { getVerseReading, keepVerseReading } from './readings';
export type { FixWord, VerseReading } from './readings';
export { getLevel, levelFromStep, listLevels, recordGrammarAnswer, scheduleIdea, seedLevelsIfFirstOpen, setLevel, SOLID_STEP, teachIdea } from './grammarLevels';
export type { GrammarLevel, GrammarLevelHow, GrammarLevelName, IdeaOutcome } from './grammarLevels';
export { getSavedGoalText } from './goalSaved';
export { isTermKnown, listKnownTerms, setTermKnown } from './grammar';
export { getStudyResources, setResourceOn, setResourceOption } from './resources';
export type { StudyResources } from './resources';
export { dayOf, listUsage, recordUsage, savedSettings, usageCounts } from './usage';
export type { UsageCounts, UsageRow } from './usage';
export { dismissTip, keepTip, openTip, shownTipIds } from './tips';
export type { TipRow } from './tips';
