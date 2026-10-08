// src/speech/answerRuns.ts — an answer of the Bible talk is English with Greek words in it. Read aloud, each stretch of Greek
// goes to the Greek voice and the rest to the English one (the runs src/speech/readAloud.ts speaks).
import type { Run } from './readAloud';

const GREEK_WORD = '[\\p{Script=Greek}\\p{M}]+';
// Greek words with only spaces between them are one stretch, so a phrase is read in one breath.
const GREEK_STRETCH = new RegExp(`${GREEK_WORD}(?:[ \\u00a0]+${GREEK_WORD})*`, 'gu');

const speakable = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

/** The answer cut into runs of one language each, in the order they come; a run with nothing to say is left out. */
export function answerRuns(text: string): Run[] {
  const runs: Run[] = [];
  let at = 0;
  const english = (to: number): void => {
    const piece = text.slice(at, to).replace(/\s+/g, ' ').trim();
    if (speakable(piece)) runs.push({ text: piece, language: 'english' });
  };
  for (const match of text.matchAll(GREEK_STRETCH)) {
    english(match.index);
    runs.push({ text: match[0].replace(/\s+/g, ' ').trim(), language: 'greek' });
    at = match.index + match[0].length;
  }
  english(text.length);
  return runs;
}

/** The syllables of a word he asked to have sounded out, as runs to read one after another: Greek, said slowly. */
export function syllableRuns(syllables: string[]): Run[] {
  return syllables.filter(speakable).map((text) => ({ text, language: 'greek' as const, slow: true }));
}
