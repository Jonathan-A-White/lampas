// src/library/inLogos.ts — what the chooser behind "In another book…" holds for one place (docs/library-at-scale.md 3.6, mw-rfjjzd.9): the books of his shelf that open at a verse, as rows
// with their Logos links, and the rows as groups (Pinned, Commentaries on <book>, Greek texts, Interlinears; for an Old Testament place, Bibles, Hebrew texts, the commentaries that cover the book and Interlinears). Pure: the sheet reads
// the shelf and hands the states here, and a test hands its own entries.
import { apocryphaBookOf } from '../data/apocrypha';
import { bookOf, otBookOf } from '../data/books';
import type { ShelfState } from '../data/repositories';
import { GREEK_TOP, type GreekLevel } from '../settings/definitions/greekInterest';
import type { CatalogueEntry, Kind, SermonAt } from '../resources/catalogue';
import { spanHolds } from './parseExport';
import { bibleRef, partOf, verseLink } from '../resources/logosBible';
import { resourceLink, type LogosLink } from '../resources/logosRes';
import { resourcesForLevel } from '../resources/resourcesForLevel';
import type { StudyPlace } from '../resources/types';
import { isOffered, type Owned } from '../data/owned';

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
 *  Hebrew lexicons), in the order the groups are drawn. A sermon book is in neither: it opens only through the Sermons door (mw-qtu3zvz.92; src/sermons/sources/logos.ts makes its link there). */
const NT_KINDS: readonly Kind[] = ['commentary', 'greek-text', 'interlinear'];
const OT_KINDS: readonly Kind[] = ['bible', 'hebrew-text', 'commentary', 'interlinear'];

export { spanHolds };

export const isOldTestament = (place: StudyPlace): boolean => otBookOf(place.book) !== undefined;

/** Whether the book is in a volume of it: `covers` names our book codes (a missing one is the whole New Testament, so no Old Testament book), and `within` the span of a book it holds only in part (Be Skillful is Proverbs 1:8 to 9:18 only: elsewhere Logos opens its contents and fails to navigate, mw-qtu3zvz.238); a Bible holds the part of the canon the book is in
 *  (its `parts`, mw-5r3p30.889), so the Lexham Hebrew Bible is offered at an Old Testament place and never at a New Testament one; a Hebrew text has `parts` too (the Old Testament); a sermon archive is indexed by the passage each sermon is preached on and the
 *  export cannot say which books: it has no book list, and is offered only where the catalogue knows a sermon of it (sermonsAtPlace, mw-qtu3zvz.239). */
export const covers = (entry: CatalogueEntry, place: StudyPlace): boolean =>
  entry.kind === 'bible' || entry.kind === 'hebrew-text'
    ? entry.parts === undefined || entry.parts.includes(partOf(place.book))
    : entry.kind === 'sermons'
      ? sermonsAtPlace(entry, place).length > 0
      : entry.covers
        ? entry.covers.includes(place.book) && spanHolds(entry.within?.[place.book] ?? '-', place.chapter, place.verse)
        : partOf(place.book) === 'nt';

/** The link that opens `entry` at the place: a Bible as the Old Testament chapter links are made (logosBible.ts), any other book at the Bible reference, the way a work is (works.ts). */
export function linkFor(entry: CatalogueEntry, place: StudyPlace): LogosLink | undefined {
  if (entry.kind === 'bible') return verseLink(place.book, place.chapter, place.verse, entry.resource);
  const ref = bibleRef(place.book, place.chapter, place.verse);
  return ref ? resourceLink(entry.resource, `ref=${ref}`) : undefined;
}

/** The books of `entries` that are On or Pinned on the shelf (`states`, by Resource ID), cover the place, open at a verse and are his (in his import or free with Logos: `owned`, src/data/owned.ts isOffered, mw-qtu3zvz.126),
 *  each with its link, in the entries' order as the dial shows them (resourcesForLevel: Greek books are hidden at Just English). No sermon book is among them: those are sermonBookRows'. */
export function inLogosRows(entries: readonly CatalogueEntry[], states: ReadonlyMap<string, ShelfState>, place: StudyPlace, owned: Owned, level: GreekLevel = GREEK_TOP): InLogosRow[] {
  const kinds = partOf(place.book) === 'nt' ? NT_KINDS : OT_KINDS;
  return resourcesForLevel(entries, level).flatMap((entry): InLogosRow[] => {
    const state = states.get(entry.resource);
    if (!state || state === 'off' || !isOffered(entry.resource, owned) || !kinds.includes(entry.kind) || (entry.kind !== 'bible' && entry.opens !== 'verse') || !covers(entry, place)) return [];
    const link = linkFor(entry, place);
    return link ? [{ entry, state, link }] : [];
  });
}

/** A place in a book as one number, so that a sermon text that runs into the next chapter compares: no chapter has a thousand verses. */
const spot = (chapter: number, verse: number): number => chapter * 1000 + verse;

/** The sermons a sermon book is known to hold at the place, the narrowest first (the order the catalogue lists them in among equals): those whose preaching text overlaps the verse or passage, or touches the chapter
 *  when no verse is named. `to` is the passage's last verse (`place.verse` alone is one verse). A book with no sermon told of is none. */
export function sermonsAtPlace(entry: CatalogueEntry, place: StudyPlace & { to?: number }): SermonAt[] {
  const first = place.verse === undefined ? 0 : place.verse;
  const last = place.verse === undefined ? 999 : (place.to ?? place.verse);
  return (entry.sermonsAt ?? [])
    .filter((s) => s.book === place.book && spot(s.chapter, s.from) <= spot(place.chapter, last) && spot(s.toChapter ?? s.chapter, s.to) >= spot(place.chapter, first))
    .map((s, i) => ({ s, i, width: spot(s.toChapter ?? s.chapter, s.to) - spot(s.chapter, s.from) }))
    .sort((a, b) => a.width - b.width || a.i - b.i)
    .map(({ s }) => s);
}

/** The sermon books of `entries` (books of the kind sermons, and books of another kind that also hold sermons) that are On or Pinned on the shelf, are in his import or free with Logos (`owned`; not checked when absent)
 *  and open at the place, each with its link, in the entries' order. A book of sermons opens only where it is known to hold a sermon (`sermonsAt`), at that sermon, in the reference form its row names: Logos cannot open
 *  a book at a verse it has no sermon indexed at, and fails to navigate (mw-qtu3zvz.239); a book with more than sermons only at the verses it covers. `place.to` is the last verse of a passage. */
export function sermonBookRows(entries: readonly CatalogueEntry[], states: ReadonlyMap<string, ShelfState>, place: StudyPlace & { to?: number }, owned?: Owned): InLogosRow[] {
  return entries.flatMap((entry): InLogosRow[] => {
    const state = states.get(entry.resource);
    if (!state || state === 'off' || (owned && !isOffered(entry.resource, owned)) || entry.opens !== 'verse') return [];
    if (entry.kind === 'sermons') {
      const [sermon] = sermonsAtPlace(entry, place);
      return sermon ? [{ entry, state, link: resourceLink(entry.resource, sermon.at) }] : [];
    }
    if (!covers(entry, place)) return [];
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
  'hebrew-text': () => 'Hebrew texts',
  interlinear: () => 'Interlinears',
  bible: () => 'Bibles',
  lexicon: () => 'Lexicons',
  grammar: () => 'Grammars',
  devotional: () => 'Devotionals',
  sermons: () => 'Sermon books',
};

/** The groups the sheet draws for `rows`: Pinned first (a book once, not again in its kind), then the kinds in order; a group with no rows is left out. `query` keeps only the rows it matches. */
export function inLogosGroups(rows: readonly InLogosRow[], place: StudyPlace, query = ''): InLogosGroup[] {
  const kinds = partOf(place.book) === 'nt' ? NT_KINDS : OT_KINDS;
  const book = (bookOf(place.book) ?? apocryphaBookOf(place.book))?.name ?? place.book;
  const kept = rows.filter((r) => answers(r.entry, query));
  const pinned = kept.filter((r) => r.state === 'pinned' && r.entry.kind !== 'bible');
  const groups: InLogosGroup[] = [{ key: 'pinned', title: 'Pinned', rows: pinned }];
  for (const kind of kinds) {
    const own = kept.filter((r) => r.entry.kind === kind && !pinned.includes(r));
    groups.push({ key: kind, title: `${TITLES[kind](book)} (${own.length})`, rows: own });
  }
  return groups.filter((g) => g.rows.length > 0);
}

/** How a row names its book under the name: the one rule of the Library's pages (kinds.ts detailOf: title, author, series). */
export { detailOf } from './kinds';
