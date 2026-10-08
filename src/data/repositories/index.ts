// UI code reaches the local store only through the repositories exported here, never through Dexie tables
// directly, and a repository owns its transactions (docs/pwa-best-practices.md section 15).
export { addImportedWords, listSolidHeadwords, listSolidLemmas, listWords, seedWordsIfFirstOpen, setWordState } from './words';
export type { Word, WordState } from './words';
export {
  getGreekPronunciation,
  getLayout,
  getReaderView,
  getSectionHeadings,
  getVoice,
  getWeave,
  setGreekPronunciation,
  setLayout,
  setReaderView,
  setSectionHeadings,
  setVoice,
  setWeave,
} from './settings';
export type { ReaderView, ReadingLayout, SectionHeadings, VoiceLanguage, Weave } from './settings';
export { listResults, recordAnswer } from './results';
export type { TestResult } from './results';
export { addAnswer, listAnswers, verseRef } from './answers';
export type { AnswerWord, TutorAnswer } from './answers';
