// src/ui/listFilter.ts — what SearchableList shows: the search filter and the ticked-first order, pure.

export type ListItem = { id: string; name: string };

/** Ticked items first, then the rest, each group in the list's own order. */
export function tickedFirst(items: readonly ListItem[], first: ReadonlySet<string>): ListItem[] {
  return [...items.filter((i) => first.has(i.id)), ...items.filter((i) => !first.has(i.id))];
}

/** The items whose name holds what he typed (ignoring case and spaces at the ends); all of them for an empty search. */
export function matching(items: readonly ListItem[], query: string): ListItem[] {
  const q = query.trim().toLocaleLowerCase();
  return q === '' ? [...items] : items.filter((i) => i.name.toLocaleLowerCase().includes(q));
}

/** A name as the filter compares it: lower case, no spaces or dots ('1 John' -> '1john'). */
const squashed = (name: string): string => name.toLocaleLowerCase().replace(/[\s.]/g, '');

/** Whether `letters` occur in `name` in order, not necessarily side by side ('phlm' in 'philemon'). */
function inOrder(letters: string, name: string): boolean {
  let at = 0;
  for (const letter of name) if (letter === letters[at] && ++at === letters.length) return true;
  return letters === '';
}

/** The items whose name holds what he typed, or holds its letters in order ('phlm' finds Philemon, '1jn' finds 1 John), ignoring case, spaces and dots. The names that
 *  start with it come first, then those that hold it, then the rest, each group in the list's own order; all of them for an empty search. */
export function matchingInOrder(items: readonly ListItem[], query: string): ListItem[] {
  const q = squashed(query);
  if (q === '') return [...items];
  const rank = (name: string): number => (name.startsWith(q) ? 0 : name.includes(q) ? 1 : inOrder(q, name) ? 2 : 3);
  const ranked = items.map((item) => ({ item, rank: rank(squashed(item.name)) })).filter((r) => r.rank < 3);
  return [0, 1, 2].flatMap((n) => ranked.filter((r) => r.rank === n).map((r) => r.item));
}
