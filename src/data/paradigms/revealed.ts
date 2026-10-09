// src/data/paradigms/revealed.ts — the cells he has revealed in Study mode, by table, kept while the page lives so that going to
// the Reader with Ask the tutor and coming Back finds the table as he left it. Not kept across a close: a study table starts hidden.
const revealed = new Map<string, Set<string>>();

/** The places (data/paradigms cellName) revealed in a table. */
export const revealedOf = (table: string): ReadonlySet<string> => revealed.get(table) ?? new Set();

/** Shows a hidden cell, or hides a shown one. Returns the places revealed now. */
export function toggleRevealed(table: string, place: string): ReadonlySet<string> {
  const next = new Set(revealedOf(table));
  if (!next.delete(place)) next.add(place);
  revealed.set(table, next);
  return next;
}

/** Hides every cell of a table again. */
export function hideAll(table: string): void {
  revealed.delete(table);
}

/** For tests: the page starts over. */
export function forgetRevealed(): void {
  revealed.clear();
}
