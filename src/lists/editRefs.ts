// src/lists/editRefs.ts — the pure parts of editing a verse list (mw-9q8wp1.3): the references typed text names, the list with them added, and the list in Bible order.
import { osisOf, parseCanonReference } from '../nav/links';
import { chaptersOf, findReferences, listReferences, type FoundReference } from '../nav/refsInText';
import { canonicalOf, listedOf } from './canonical';

/** The references typed text names: those findReferences finds in it, else the whole text as one reference ('Rom.8.28', 'Psalm 23'); empty for text that names none. */
export function referencesTyped(text: string): FoundReference[] {
  const found = findReferences(text);
  if (found.length > 0) return found;
  const named = parseCanonReference(text);
  const limit = named && named.chapter !== undefined && chaptersOf(named.book, named.testament);
  if (!named || named.chapter === undefined || !limit || named.chapter < 1 || named.chapter > limit) return [];
  return [
    {
      printed: text.trim(),
      ref: `${osisOf(named.book)}.${named.chapter}${named.verse === undefined ? '' : `.${named.verse}`}`,
      book: named.book,
      testament: named.testament,
      chapter: named.chapter,
      ...(named.verse === undefined ? {} : { verse: named.verse }),
      ...(named.verse === undefined || named.to === undefined ? {} : { lastVerse: named.to }),
    },
  ];
}

/** The list with the references of `text` added at the end, none twice. `error` says why nothing was added. */
export function addedFrom(refs: readonly string[], text: string): { refs: string[]; error?: string } {
  const typed = text.trim();
  const found = referencesTyped(typed).map(canonicalOf);
  if (found.length === 0) return { refs: [...refs], error: `No reference found in ${typed}` };
  const next = [...refs];
  for (const canonical of found) if (!next.includes(canonical)) next.push(canonical);
  return next.length === refs.length ? { refs: next, error: found.length === 1 ? 'That reference is already in this list' : 'Those references are already in this list' } : { refs: next };
}

/** The references in Bible order (the Old Testament's books, then the New's; a chapter alone before its verses). A string that names no place keeps to the end; ties keep their order. */
export function inBibleOrder(refs: readonly string[]): string[] {
  const keyOf = (canonical: string): string | undefined => {
    const listed = listedOf(canonical);
    return listed ? canonicalOf(listed) : undefined;
  };
  const placed = refs.flatMap((canonical) => listedOf(canonical) ?? []);
  const rank = new Map(listReferences(placed, 'bible').map((r, i) => [canonicalOf(r), i]));
  const place = (canonical: string): number => rank.get(keyOf(canonical) ?? '') ?? Number.MAX_SAFE_INTEGER;
  return refs.map((canonical, i) => ({ canonical, i })).sort((a, b) => place(a.canonical) - place(b.canonical) || a.i - b.i).map((r) => r.canonical);
}
