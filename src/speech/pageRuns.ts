// src/speech/pageRuns.ts — a line of a page of prose (About, My study way, the Preface) as runs to read aloud: English in the English voice, each stretch
// of Greek or Hebrew in its own (the cut a long press makes on a word, src/ui/wordAt.ts, and the tutor's answers make, src/speech/answerRuns.ts).
import { splitScripts } from '../script/scripts';
import type { Run } from './readAloud';

const GREEK_WORD = '[\\p{Script=Greek}\\p{M}]+';
// Greek words with only spaces between them are one stretch, so a phrase is read in one breath.
const GREEK_STRETCH = new RegExp(`${GREEK_WORD}(?:[ \\u00a0]+${GREEK_WORD})*`, 'gu');

const speakable = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

/** `text` cut into runs of one language each, in the order they come; a run with nothing to say is left out. */
export function pageRuns(text: string): Run[] {
  const runs: Run[] = [];
  const push = (piece: string, language: Run['language']): void => {
    const clean = piece.replace(/\s+/g, ' ').trim();
    if (speakable(clean)) runs.push({ text: clean, language });
  };
  for (const part of splitScripts(text)) {
    if (part.script === 'he') {
      push(part.text, 'hebrew');
      continue;
    }
    let at = 0;
    for (const match of part.text.matchAll(GREEK_STRETCH)) {
      push(part.text.slice(at, match.index), 'english');
      push(match[0], 'greek');
      at = match.index + match[0].length;
    }
    push(part.text.slice(at), 'english');
  }
  return runs;
}
