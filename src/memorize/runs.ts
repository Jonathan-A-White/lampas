// src/memorize/runs.ts — a target as read aloud (docs/layout/memorize.md): the words in the language each is in, for read aloud's startAnswer.
import type { Run } from '../speech/readAloud';
import type { Token } from './target';

/** The verse as read aloud: neighbouring words of one language are one run, so the Weave is read in its own languages. */
export function runsOfTokens(tokens: readonly Token[]): Run[] {
  const runs: Run[] = [];
  for (const t of tokens) {
    const language = t.lang === 'el' ? 'greek' : 'english';
    const last = runs[runs.length - 1];
    if (last && last.language === language) last.text = `${last.text} ${t.text}`;
    else runs.push({ text: t.text, language });
  }
  return runs;
}
