// UI code reaches the local store only through the repositories exported here, never through Dexie tables
// directly, and a repository owns its transactions (docs/pwa-best-practices.md section 15).
export { addImportedWords, addWordToLearn, wordIsListed, listSolidHeadwords, listSolidLemmas, listWords, seedWordsIfFirstOpen, setWordState } from './words';
export type { Word, WordState } from './words';
export {
  getGreekPronunciation,
  getLayout,
  getReaderView,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getTextSize,
  getTheme,
  getVoice,
  getWeave,
  setGreekPronunciation,
  setLayout,
  setReaderView,
  setSectionHeadings,
  setSpeechRate,
  setTextSize,
  setTheme,
  setVoice,
  setWeave,
} from './settings';
export type { ReaderView, ReadingLayout, SectionHeadings, VoiceLanguage, Weave } from './settings';
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
export { isTermKnown, listKnownTerms, setTermKnown } from './grammar';
export { getStudyResources, setResourceOn, setResourceOption } from './resources';
export type { StudyResources } from './resources';
