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
