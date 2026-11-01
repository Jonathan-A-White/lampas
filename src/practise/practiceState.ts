// src/practise/practiceState.ts — which door of the Verse view's Practise is open (mw-5r3p30.899): kept by VerseView for the verse or passage it was opened on, so the next one opens at the door.
// `revealed` is Dictation's (mw-5r3p30.900): the verse is hidden while he writes and shown once his page is judged.
import type { CopyLanguage } from './copywork';

/** Which door of Practise is open on a verse or passage (`key` is the unit it was opened on), and the language to copy in. */
export interface PracticeState {
  key: string;
  door: 'door' | 'copywork' | 'dictation' | 'quiz';
  language: CopyLanguage;
  /** Dictation: his page has been judged, so the verse is shown beside the marks */
  revealed?: boolean;
}

export const freshPractice = (key: string): PracticeState => ({ key, door: 'door', language: 'en' });
