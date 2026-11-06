// src/sermons/sermonsFor.ts — the sermons of a place from a list of sources (docs/sermons.md 'Which sermons are for this verse'): the rows whose preaching text overlaps the verse or passage first, narrower first,
// the rest of the chapter after them in the source's order; the sources in the list's order. A whole chapter has every row in `chapter`.
import type { SermonRef, SermonRow, SermonPlace, SermonsFound, SermonSource } from './types';

/** A place in a book as one number, so that a text that runs into the next chapter compares: no chapter has a thousand verses. */
const at = (chapter: number, verse: number): number => chapter * 1000 + verse;
const endOf = (ref: SermonRef): number => at(ref.toChapter ?? ref.chapter, ref.to);

/** Whether the preaching text `ref` overlaps verses `from` to `to` of `chapter`. */
export function overlaps(ref: SermonRef, chapter: number, from: number, to: number): boolean {
  return at(ref.chapter, ref.from) <= at(chapter, to) && endOf(ref) >= at(chapter, from);
}

/** Whether the preaching text `ref` touches `chapter` at all. */
export const touches = (ref: SermonRef, chapter: number): boolean => at(ref.chapter, ref.from) <= at(chapter, 999) && endOf(ref) >= at(chapter, 0);

/** How wide the preaching text is, for the order: the verses it spans (a text across chapters is wider than any in one). */
const width = (ref: SermonRef): number => endOf(ref) - at(ref.chapter, ref.from);

/** A source that fails leaves the others to answer: the failure is logged, and its rows are none. */
async function rowsOf(source: SermonSource, place: SermonPlace): Promise<SermonRow[]> {
  try {
    return (await source.sermonsFor(place)).filter((row) => touches(row.ref, place.chapter));
  } catch (error) {
    console.warn(`could not read the sermons of ${source.id}`, error);
    return [];
  }
}

export async function sermonsForSources(sources: readonly SermonSource[], place: SermonPlace): Promise<SermonsFound> {
  const answers = await Promise.all(sources.map((source) => rowsOf(source, place)));
  const from = place.from;
  if (from === undefined) return { here: [], chapter: answers.flat() };
  const to = place.to ?? from;
  const here: SermonRow[] = [];
  const chapter: SermonRow[] = [];
  for (const rows of answers) {
    const on = rows.filter((row) => overlaps(row.ref, place.chapter, from, to));
    // a stable sort: texts of one width stay in the source's order
    here.push(...on.sort((a, b) => width(a.ref) - width(b.ref)));
    chapter.push(...rows.filter((row) => !on.includes(row)));
  }
  return { here, chapter };
}
