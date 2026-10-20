// src/data/paradigms/needs.ts — what a locked cell says it needs (mw-svw421.25): its missing ideas, the lowest on the ladder first, and the line in words.
import { ideaOf, type GrammarIdea } from '../grammar/ladder';
import { missingIdeas, type Levels, type ParadigmCell } from '.';

/** The ideas a locked form still needs, the lowest on the ladder first: what he should learn first heads the note. */
export const needsOf = (cell: ParadigmCell, levels: Levels): GrammarIdea[] =>
  missingIdeas(cell, levels)
    .map(ideaOf)
    .sort((a, b) => a.rung - b.rung);

/** What a locked form needs, in words: 'Needs the plural', 'Needs the plural and the genitive case'. */
export function needsText(cell: ParadigmCell, levels: Levels): string {
  const titles = needsOf(cell, levels).map((idea) => idea.title.toLowerCase());
  const last = titles.pop();
  return `Needs ${titles.length > 0 ? `${titles.join(', ')} and ${last}` : last}`;
}
