// src/reader/sayWord.ts — a long press on a word of the Reader's text says it, in its own language, straight from the press (docs/pwa-best-practices.md section 12): the words of the
// text (VerseText), of a variant's brace and of the readings on its sheet (mw-9ji6ek0.22) all say theirs here. A reading under way is paused by the word (speech/greek.ts speakBeside).
import { publish } from '../events/bus';
import { hasVoice, speakWord } from '../speech/greek';
import type { SpeechLanguage } from '../speech/languages';

export function sayWord(text: string, language: SpeechLanguage, verse: number): void {
  // a phone that lists no Hebrew voice says nothing: its default voice would read the letters as English (the reading shows the line about it, ReadControls)
  if (language === 'hebrew' && hasVoice('hebrew') === false) return;
  if (speakWord(text, language)) publish({ kind: 'word-spoken', text, language, verse });
}
