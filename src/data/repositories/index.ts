// UI code reaches the local store only through the repositories exported here, never through Dexie tables
// directly, and a repository owns its transactions (docs/pwa-best-practices.md section 15).
export { addImportedWords, addWordToLearn, wordIsListed, listDroppedLemmas, listLearningLemmas, listSolidHeadwords, listSolidLemmas, listWords, setWordState, teachWord } from './words';
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
  getQuizGoal,
  QUIZ_GOAL_MAX,
  getLogosBible,
  getReadSpan,
  getReaderView,
  getSectionHeadings,
  getSpeechRate,
  getSpeechRates,
  getTextSize,
  getTheme,
  getReadTutor,
  getDeveloper,
  getScriptDepth,
  getImmersive,
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
  takePronunciationSwitch,
  setLayout,
  setQuizGoal,
  setLogosBible,
  setReadSpan,
  setReaderView,
  setSectionHeadings,
  setSpeechRate,
  setTextSize,
  setTheme,
  setReadTutor,
  setDeveloper,
  setScriptDepth,
  setImmersive,
  setTips,
  setVoice,
  setWeave,
  setWeaveGrammar,
} from './settings';
export type { ReadSpan } from '../../speech/readSpan';
export type { DeveloperMode, GrammarMove, Immersive, PickerGrammar, ReaderView, ReadingLayout, ReadTutor, SectionHeadings, Tips, VoiceLanguage, Weave, WeaveGrammar } from './settings';
export { listResults, recordAnswer } from './results';
export type { TestResult } from './results';
export { countDue, ensureScheduled, listDue, recordReview, reviewsOf, scheduleSounds, seedScheduleIfFirstOpen, SOUND_KIND } from './reviews';
export type { Review } from './reviews';
export { moveToFrontier, solidCandidates } from './rusty';
export type { ItemRef } from './rusty';
export { addAnswer, listAnswers, verseRef } from './answers';
export type { AnswerWord, TutorAnswer } from './answers';
export { listOpenedParadigms, markParadigmOpened } from './paradigmsOpened';
export { STUDY_WAY_LINE_MAX, STUDY_WAY_MAX, deleteStudyWayLine, editStudyWayLine, keepStudyWayLine, listStudyWay } from './studyWay';
export type { EditResult, KeepResult } from './studyWay';
export { addTurn, addTurnChanges, deleteTurns, getTurn, listRecentTalks, listTurnPictures, listTurns, markChangeUndone, markBridgeChoice, markFeedbackSent, markFeedbackWithdrawn, markGreekChoice, markQuizGoalChoice, markRustyChoice, markSettingChoice, talkRef } from './talks';
export type { KeptPicture, RecentTalk, TalkPicture, TalkTurn, TurnChanges } from './talks';
export { listDrillResults, recordDrillStep } from './drills';
export type { DrillResult } from './drills';
export { getMissTally, getVerseReading, keepVerseReading, listReadingHistory, reachOf, TALLY_READINGS } from './readings';
export type { FixWord, MissCount, Reach, ReadingRecord, VerseReading } from './readings';
export { getLadderRow, listWellRead, setLadderShowing, skipLadderVerse } from './ladder';
export type { LadderRow } from './ladder';
export { latestDrillRunFor, saveDrillRun, weakFacets } from './drillRuns';
export type { DrillRunRow } from './drillRuns';
export { answerPlanItem, closeDrillPlan, drillPlanCounts, getDrillPlan, listDrillPlans, saveDrillPlan } from './drillPlans';
export type { PlanAnswer } from './drillPlans';
export { countFetchedItems, listFetchedIdeas, saveFetchedItems, takeFetchedItems } from './fetchedItems';
export { getLevel, levelFromStep, listLevels, otherFrontier, recordDrill, recordGrammarAnswer, scheduleIdea, seedLevelsIfFirstOpen, setLevel, SOLID_STEP, teachIdea } from './grammarLevels';
export type { DrillMode, FrontierChoice, GrammarLevel, GrammarLevelHow, GrammarLevelName, IdeaOutcome, TeachResult } from './grammarLevels';
export { getEvidence, noteAnswer, noteDrillAnswer, noteWordRead } from './inference';
export { getSavedGoalText } from './goalSaved';
export { isTermKnown, listKnownTerms, setTermKnown } from './grammar';
export { getStudyResources, setResourceOn, setResourceOption } from './resources';
export type { StudyResources } from './resources';
export { dayOf, lastUsageDayBefore, listUsage, recordUsage, savedSettings, usageCounts } from './usage';
export type { UsageCounts, UsageRow } from './usage';
export { dismissTip, keepTip, openTip, shownTipIds } from './tips';
export type { TipRow } from './tips';
export { dropShares, parkShare, waitingShare } from './shares';
export type { ShareRow } from './shares';

export { getPenSeen, getWhySeen, getWriteProgress, handwritingOn, markPenSeen, markWhySeen, recordWrite } from './handwriting';
