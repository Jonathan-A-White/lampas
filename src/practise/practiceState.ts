// src/practise/practiceState.ts — which door of the Verse view's Practise is open (mw-5r3p30.899): kept by VerseView for the verse or passage it was opened on, so the next one opens at the door.
// `revealed` is Dictation's (mw-5r3p30.900): the verse is hidden while he writes and shown once his page is judged. `narration` and `fromNarration` are Narration's (mw-5r3p30.901), `summary` is Summary's (mw-5r3p30.902).
import type { CopyLanguage } from './copywork';
import type { Narrated } from './narration';
import type { Summarised } from './summary';

/** Which door of Practise is open on a verse or passage (`key` is the unit it was opened on), and the language to copy in. */
export interface PracticeState {
  key: string;
  door: 'door' | 'copywork' | 'narration' | 'dictation' | 'summary' | 'quiz';
  language: CopyLanguage;
  /** Dictation: his page has been judged, so the verse is shown beside the marks */
  revealed?: boolean;
  /** Narration (mw-5r3p30.901): what he told back, written down, with the tutor's answer; kept while Copywork or Dictation works on it and he comes back */
  narration?: Narrated;
  /** Copywork or Dictation is working on his written-down narration, in English, in place of the verse: `‹ Practise` goes back to Narration */
  fromNarration?: boolean;
  /** Summary (mw-5r3p30.902): what he gave as his summary (typed, or the tutor's reading of his page), with the tutor's answer; kept while he goes to another door and comes back */
  summary?: Summarised;
}

export const freshPractice = (key: string): PracticeState => ({ key, door: 'door', language: 'en' });
