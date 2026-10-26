// src/library/inLogos.ts — what the chooser behind "In another book…" holds for one place (docs/library-at-scale.md 3.6, mw-rfjjzd.9): the books of his shelf that open at a verse, as rows
// with their Logos links, and the rows as groups (Pinned, Commentaries on <book>, Greek texts, Interlinears; for an Old Testament place, Bibles, the commentaries that cover the book and Interlinears). Pure: the sheet reads
// the shelf and hands the states here, and a test hands its own entries.
import { bookOf, otBookOf } from '../data/books';
import type { ShelfState } from '../data/repositories';
import { GREEK_TOP, type GreekLevel } from '../settings/definitions/greekInterest';
import type { CatalogueEntry, Kind } from '../resources/catalogue';
import { bibleRef, verseLink } from '../resources/logosBible';
import { resourceLink, type LogosLink } from '../resources/logosRes';
import { resourcesForLevel } from '../resources/resourcesForLevel';
import type { StudyPlace } from '../resources/types';

/** One book that opens at the place: the catalogue's entry, its state on the shelf (never Off) and the link that opens it there. */
export interface InLogosRow {
  entry: CatalogueEntry;
  state: Exclude<ShelfState, 'off'>;
  link: LogosLink;
}

export type GroupKey = 'pinned' | Kind;

export interface InLogosGroup {
  key: GroupKey;
  /** the heading, with the count of its rows: 'Commentaries on Romans (10)'; 'Pinned' has no count */
  title: string;
  rows: InLogosRow[];
}

/** How many rows a group draws before the rest wait under 'N more'. */
export const SHOWN_ROWS = 3;

/** The kinds a New Testament verse is opened in, and an Old Testament one (a commentary opens there when its `covers` name the book: his commentaries on the Old Testament do; the Hebrew epic adds
 *  Hebrew lexicons), in the order the groups are drawn. */
const NT_KINDS: readonly Kind[] = ['commentary', 'greek-text', 'interlinear'];
const OT_KINDS: readonly Kind[] = ['bible', 'commentary', 'interlinear'];

export const isOldTestament = (place: StudyPlace): boolean => otBookOf(place.book) !== undefined;

/** Whether the book is in a volume of it: `covers` names our book codes (a missing one is the whole New Testament, so no Old Testament book); a Bible holds the whole of it. */
const covers = (entry: CatalogueEntry, place: StudyPlace): boolean =>
  entry.kind === 'bible' || (entry.covers ? entry.covers.includes(place.book) : !isOldTestament(place));

/** The link that opens `entry` at the place: a Bible as the Old Testament chapter links are made (logosBible.ts), any other book at the Bible reference, the way a work is (works.ts). */
function linkFor(entry: CatalogueEntry, place: StudyPlace): LogosLink | undefined {
  if (entry.kind === 'bible') return verseLink(place.book, place.chapter, place.verse, entry.resource);
  const ref = bibleRef(place.book, place.chapter, place.verse);
  return ref ? resourceLink(entry.resource, `ref=${ref}`) : undefined;
}

/** The books of `entries` that are On or Pinned on the shelf (`states`, by Resource ID), cover the place and open at a verse, each with its link, in the entries' order as the dial shows them
 *  (resourcesForLevel: Greek books are hidden at Just English). */
export function inLogosRows(entries: readonly CatalogueEntry[], states: ReadonlyMap<string, ShelfState>, place: StudyPlace, level: GreekLevel = GREEK_TOP): InLogosRow[] {
  const kinds = isOldTestament(place) ? OT_KINDS : NT_KINDS;
  return resourcesForLevel(entries, level).flatMap((entry): InLogosRow[] => {
    const state = states.get(entry.resource);
    if (!state || state === 'off' || !kinds.includes(entry.kind) || (entry.kind !== 'bible' && entry.opens !== 'verse') || !covers(entry, place)) return [];
    const link = linkFor(entry, place);
    return link ? [{ entry, state, link }] : [];
  });
}

/** Whether there is a second door at all: a book other than his Bible opens at the place (a Bible is already the first door). */
export const hasAnotherBook = (rows: readonly InLogosRow[]): boolean => rows.some((r) => r.entry.kind !== 'bible');

/** Whether a row answers what he typed: the name, title, author or series holds it, ignoring case. */
const answers = (entry: CatalogueEntry, query: string): boolean => {
  const q = query.trim().toLocaleLowerCase();
  return q === '' || [entry.short, entry.title, entry.author, entry.series].some((text) => text?.toLocaleLowerCase().includes(q));
};

const TITLES: Record<Kind, (book: string) => string> = {
  commentary: (book) => `Commentaries on ${book}`,
  'greek-text': () => 'Greek texts',
  interlinear: () => 'Interlinears',
  bible: () => 'Bibles',
  lexicon: () => 'Lexicons',
  grammar: () => 'Grammars',
  devotional: () => 'Devotionals',
};

/** The groups the sheet draws for `rows`: Pinned first (a book once, not again in its kind), then the kinds in order; a group with no rows is left out. `query` keeps only the rows it matches. */
export function inLogosGroups(rows: readonly InLogosRow[], place: StudyPlace, query = ''): InLogosGroup[] {
  const kinds = isOldTestament(place) ? OT_KINDS : NT_KINDS;
  const book = bookOf(place.book)?.name ?? place.book;
  const kept = rows.filter((r) => answers(r.entry, query));
  const pinned = kept.filter((r) => r.state === 'pinned' && r.entry.kind !== 'bible');
  const groups: InLogosGroup[] = [{ key: 'pinned', title: 'Pinned', rows: pinned }];
  for (const kind of kinds) {
    const own = kept.filter((r) => r.entry.kind === kind && !pinned.includes(r));
    groups.push({ key: kind, title: `${TITLES[kind](book)} (${own.length})`, rows: own });
  }
  return groups.filter((g) => g.rows.length > 0);
}

/** How a row names its book under the name: the full title when the name is a short one, and its author. */
export const detailOf = (entry: CatalogueEntry): string => [entry.title === entry.short ? '' : entry.title, entry.author ?? ''].filter(Boolean).join(' · ');
