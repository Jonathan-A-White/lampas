// src/review/studyList.ts — the Study list at the end of a Review or a drill (mw-indx1x6.8, the Governor's words of 2026-11-12: 'They should be available after each question, but the aggregate should be
// deduped and prioritized at the end of the drill/review'). Pure: from the 'Study this' of every miss of the session (src/review/studyThis.ts, whose mapping of a question to what teaches it this reuses, none
// of its own) it gives the rows of the list, one for each resource, most-missed first, and the misses that linked to nothing, which the list's one 'Ask the tutor about these' row carries. PROVISIONAL, the Governor to confirm.
//   one resource   a table (whatever the cell), an idea's lesson, a word's card (Greek and Hebrew apart), how to remember a word
//   the order      the number of misses that pointed to it, most first; between equals the resource of the most recent miss first
//   what it opens  as the 'Study this' link of the most recent miss that pointed to it did: a table at the cell that miss asked
import type { ScreenContext } from '../tutor/screen';
import type { Miss, Study, StudyLink } from './studyThis';

/** One row of the list: the link to open, and how many of the session's misses pointed to its resource. */
export interface StudyRow {
  link: StudyLink;
  count: number;
}

export interface StudyListing {
  rows: StudyRow[];
  /** the misses nothing teaches, in the order they came */
  unlinked: Miss[];
}

/** The resource a link is to, whatever the cell or the label: two links with one key are one row. */
export function resourceKey(link: StudyLink): string {
  switch (link.kind) {
    case 'paradigm':
      return `paradigm:${link.address.table}`;
    case 'lesson':
      return `lesson:${link.ideaId}`;
    case 'word':
      return `word:${link.hebrew ? 'hbo' : 'grc'}:${link.lemma}`;
    case 'mnemonic':
      return `mnemonic:${link.lemma}`;
  }
}

/** The list of a session's misses, in the order he missed them. */
export function studyListOf(studies: readonly Study[]): StudyListing {
  const found = new Map<string, { link: StudyLink; count: number; last: number }>();
  const unlinked: Miss[] = [];
  studies.forEach(({ links, miss }, at) => {
    if (links.length === 0) unlinked.push(miss);
    // a miss counts once for a resource, however many of its links name it
    for (const key of new Set(links.map(resourceKey))) {
      const link = [...links].reverse().find((l) => resourceKey(l) === key) as StudyLink;
      const before = found.get(key);
      found.set(key, { link, count: (before?.count ?? 0) + 1, last: at });
    }
  });
  const rows = [...found.values()].sort((a, b) => b.count - a.count || b.last - a.last).map(({ link, count }) => ({ link, count }));
  return { rows, unlinked };
}

/** The most misses a talk is told of: the talk's request is of a fixed size. */
const MOST_TOLD = 8;

/** The first turn of the talk 'Ask the tutor about these' opens: each miss as the 'Study this' talk of one names it, then the asking. */
export function missesFirstTurn(misses: readonly Miss[]): string {
  const told = misses.slice(-MOST_TOLD);
  const lines = told.map(({ asked, answer, right, idea }, i) => `${i + 1}. The question: “${asked}”. My answer: “${answer}”. The right answer: “${right}”. The idea it tests: ${idea}.`);
  return `I got these wrong and nothing in the app teaches them.\n${lines.join('\n')}\nFor each, explain why the right answer is right, where I went wrong, and how to remember it.`;
}

/** The screen the talk of these misses reports (`name` is the screen he was on): each miss as a fact, so every later turn of the talk has them too. */
export function missesScreen(name: string, misses: readonly Miss[]): ScreenContext {
  return {
    name,
    facts: misses.slice(-MOST_TOLD).map(({ asked, answer, right, idea }, i) => ({ label: `Miss ${i + 1}`, value: `${asked} He chose: ${answer}. Right answer: ${right}. Idea: ${idea}.` })),
  };
}
