// UI code reaches the local store only through the repositories exported here, never through Dexie tables
// directly, and a repository owns its transactions (docs/pwa-best-practices.md section 15).
export { addImportedWords, addWordToLearn, wordIsListed, listLearningLemmas, listSolidHeadwords, listSolidLemmas, listWords, seedWordsIfFirstOpen, setWordState } from './words';
export type { Word, WordState } from './words';
export {
  getGoal,
  getGrammarApproach,
  getGreekPronunciation,
  getLayout,
  getLogosBible,
  getReaderView,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getTextSize,
  getTheme,
  getVoice,
  getWeave,
  getWeaveGrammar,
  setGoal,
  setGrammarApproach,
  setGreekPronunciation,
  setLayout,
  setLogosBible,
  setReaderView,
  setSectionHeadings,
  setSpeechRate,
  setTextSize,
  setTheme,
  setVoice,
  setWeave,
  setWeaveGrammar,
} from './settings';
export type { ReaderView, ReadingLayout, SectionHeadings, VoiceLanguage, Weave, WeaveGrammar } from './settings';
export { listResults, recordAnswer } from './results';
export type { TestResult } from './results';
export { countDue, ensureScheduled, listDue, recordReview, reviewsOf, seedScheduleIfFirstOpen } from './reviews';
export type { Review } from './reviews';
export { addAnswer, listAnswers, verseRef } from './answers';
export type { AnswerWord, TutorAnswer } from './answers';
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
