// src/sermons/sermonsFor.ts — the sermons of a place from a list of sources (docs/sermons.md 'Which sermons are for this verse'): the rows whose preaching text overlaps the verse or passage first, narrower first,
// the rest of the chapter after them in the source's order; the sources in the list's order. A whole chapter has every row in `chapter`.
import { THEME_MAX_VERSES } from '../data/themeIndex';
import type { SameTheme, SermonRef, SermonRow, SermonPlace, SermonsFound, SermonSource, ThemeGroup, ThemeTopic } from './types';

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
    console.warn(`could not read the sermons of ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
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

/** The most rows 'On the same theme' shows in all. */
export const THEME_ROW_LIMIT = 12;

/** A topic and where it links, across the books: what the theme tier joins a sermon to. */
export interface TopicLinks extends ThemeTopic {
  links: readonly SermonRef[];
}

/** Whether two passages of one book overlap. */
const refsOverlap = (a: SermonRef, b: SermonRef): boolean => a.book === b.book && at(a.chapter, a.from) <= endOf(b) && endOf(a) >= at(b.chapter, b.from);

/** Orders ids as numbers where they are numbers ('9' before '10'), as the sermon-index service does. */
const byId = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true });
const compareTopics = (a: ThemeTopic, b: ThemeTopic): number => a.verses - b.verses || a.source.localeCompare(b.source) || a.id.localeCompare(b.id);

/**
 * The sermon-index service's theme tier (docs/sermons.md 'On the same theme'; docs/api.md there, 'The theme tier'), over the topics that link the verse (`topics`: each with all its links) and the sermons to try (`rows`).
 * A sermon is on a topic when its preaching text overlaps a link of the topic and the topic covers at most THEME_MAX_VERSES verses; it is never a row in `skip` (the sermons the passage groups hold, by `source:id`);
 * it is listed once, with its narrowest topic (fewest verses, then the theme source, then the topic). The rows run by the topic's size, then the topic (so that a topic's sermons stay together under its heading),
 * then the sermon's source and its id as a number; `limit` rows are kept and `more` is how many were left out.
 */
export function themeTier(topics: readonly TopicLinks[], rows: readonly SermonRow[], skip: ReadonlySet<string>, limit = THEME_ROW_LIMIT): SameTheme {
  const usable = topics.filter((topic) => topic.verses <= THEME_MAX_VERSES).sort(compareTopics);
  const best = new Map<string, { row: SermonRow; topic: TopicLinks }>();
  for (const row of rows) {
    const key = `${row.source}:${row.id}`;
    if (row.role !== 'text' || skip.has(key)) continue;
    const topic = usable.find((t) => t.links.some((link) => refsOverlap(link, row.ref)));
    if (!topic) continue;
    const held = best.get(key);
    if (!held || compareTopics(topic, held.topic) < 0) best.set(key, { row, topic });
  }
  const ordered = [...best.values()].sort((a, b) => compareTopics(a.topic, b.topic) || a.row.source.localeCompare(b.row.source) || byId(a.row.id, b.row.id));
  const groups: ThemeGroup[] = [];
  for (const { row, topic } of ordered.slice(0, limit)) {
    const last = groups[groups.length - 1];
    if (last && last.topic.source === topic.source && last.topic.id === topic.id) last.rows.push(row);
    else groups.push({ topic: { source: topic.source, id: topic.id, label: topic.label, verses: topic.verses }, rows: [row] });
  }
  return { groups, more: Math.max(0, ordered.length - limit) };
}
