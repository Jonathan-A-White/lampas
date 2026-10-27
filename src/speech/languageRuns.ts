// src/speech/languageRuns.ts — the one cut of a text into runs of the language each stretch is written in, so each is said in its own voice: a tutor's answer
// (answerRuns.ts), a page of prose (pageRuns.ts) and a verdict read aloud all go through it (mw-gdcyf98.27). The languages are a table, not a branch each: every script
// of src/script/scripts.ts names the speech language it is said in (`speaks`), so a new one is an entry there and nothing here; Greek, the language written in no
// entry of that table, is the stretch the rest is cut for.
import { scriptOf, splitScripts } from '../script/scripts';
import type { Run } from './readAloud';

export const GREEK_WORD = '[\\p{Script=Greek}\\p{M}]+';
// Greek words with only spaces between them are one stretch, so a phrase is read in one breath.
const GREEK_STRETCH = new RegExp(`${GREEK_WORD}(?:[ \\u00a0]+${GREEK_WORD})*`, 'gu');

/** Whether `text` has anything a voice can say. */
export const speakable = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

/** `text` cut into runs of one language each, in the order they come: English between, Greek and each script of the scripts table in their own voice; a run with nothing to say is left out. */
export function languageRuns(text: string): Run[] {
  const runs: Run[] = [];
  const push = (piece: string, language: Run['language']): void => {
    const clean = piece.replace(/\s+/g, ' ').trim();
    if (speakable(clean)) runs.push({ text: clean, language });
  };
  for (const part of splitScripts(text)) {
    const script = part.script ? scriptOf(part.script) : undefined;
    if (script) {
      push(part.text, script.speaks);
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
