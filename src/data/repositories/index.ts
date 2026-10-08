// UI code reaches the local store only through the repositories exported here, never through Dexie tables
// directly, and a repository owns its transactions (docs/pwa-best-practices.md section 15).
export { addImportedWords, listWords, seedWordsIfFirstOpen, setWordState } from './words';
export type { Word, WordState } from './words';
export { getReaderView, setReaderView } from './settings';
export type { ReaderView } from './settings';
export { listResults, recordAnswer } from './results';
export type { TestResult } from './results';
