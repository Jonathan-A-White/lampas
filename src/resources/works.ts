// src/resources/works.ts — the works of his Logos library that the tutor may link to (mw-5r3p30.675, PROVISIONAL): a commentary, opened at the passage, or a
// book, opened at its start, or, when the book has an index of its own (the Institutes: book.chapter.section), at the place the tutor names (mw-5r3p30.708). Lampas cannot read which books he owns, so Settings > Study resources > Works lists these and he ticks the ones he has (none to start
// with); the tutor is told the ticked ones and names no other. Adding a work is one entry in WORKS, its Resource ID copied from a source named in `source`, never
// guessed (mw-5r3p30.64: a guessed id opened nothing). Every link is the Logos scheme first with the ref.ly address as the fallback (logosRes.ts). docs/resources.md
// names each source and what is UNVERIFIED on a device.
import { bookOf } from '../data/books';
import { bibleRef } from './logosBible';
import { resourceLink, resourceStart, type LogosLink } from './logosRes';
import type { StudyPlace } from './types';

/** One Logos resource of a work. A commentary of several volumes has one each, with the books it covers (our book codes); a book has one and no `books`. */
export interface WorkVolume {
  /** the Resource ID his library lists: 'LLS:CALCOM64JN' */
  resource: string;
  /** the books of the Bible the volume comments on, by our code ('jhn'); only a commentary's volume has them */
  books?: readonly string[];
}

/** A book's own reference type, which Logos opens a book at (`ref=CICR.3.24`): its library listing's ReferenceSupersets column names it ('cicr.1-4.20.32'). The Bible's own
 *  references do not reach into a book that is not versified, so the place is this type's, from the shape below. */
export interface WorkIndex {
  /** the data type in the link: 'CICR' */
  type: string;
  /** how many chapters each book of the work has, in order: the Institutes' four books have 18, 17, 25 and 20 */
  chapters: readonly number[];
  /** what the tutor is told of how a place is written (the request's `places`) */
  hint: string;
}

export interface Work {
  /** kept in the settings store, so it never changes: 'calvin-commentaries' */
  id: string;
  /** the title Settings lists it by and the chip is named for */
  title: string;
  author: string;
  /** a commentary opens at a passage of the Bible; a book opens at its start */
  kind: 'commentary' | 'book';
  /** where the Resource IDs (and the books each volume covers) were read: one line, also in docs/resources.md */
  source: string;
  volumes: readonly WorkVolume[];
  /** a book only: the reference type that lets a link open inside it; without it a book opens at its start */
  index?: WorkIndex;
}

/** The library listing (vault plans/lampas-logos-library-2026-10-08.csv): its ResourceId column is the id, and a commentary's ReferenceSupersets column the books each volume covers (Logos' book numbers: 61 Matthew … 87 Revelation). */
const LISTING = 'His Logos library listing of 2026-10-08 (vault plans/lampas-logos-library-2026-10-08.csv, ResourceId and ReferenceSupersets columns)';

/** The Institutes' own milestones (a Logos employee on the forum: 'n.n.n', such as 4.2.1) and the listing's 'cicr.1-4.20.32': four books of 18, 17, 25 and 20 chapters. Both editions have it. */
const INSTITUTES_INDEX: WorkIndex = {
  type: 'CICR',
  chapters: [18, 17, 25, 20],
  hint: "A place in the book is written book.chapter (3.24) or book.chapter.section (3.21.5): the book is 1 to 4, and the chapter one the book has (book 1 has 18 chapters, book 2 17, book 3 25, book 4 20). Name a place only when you know the chapter treats the question.",
};

/** Every work, in the order Settings lists them. Calvin's commentaries are one volume per book or group of books in Logos; the Old Testament volumes are left out as Lampas holds the New. */
export const WORKS: readonly Work[] = [
  {
    id: 'calvin-commentaries',
    title: "Calvin's Commentaries",
    author: 'John Calvin',
    kind: 'commentary',
    source: LISTING,
    volumes: [
      { resource: 'LLS:CALCOM61HRMEV', books: ['mat', 'mrk', 'luk'] },
      { resource: 'LLS:CALCOM64JN', books: ['jhn'] },
      { resource: 'LLS:CALCOM65AC', books: ['act'] },
      { resource: 'LLS:CALCOM66RO', books: ['rom'] },
      { resource: 'LLS:CALCOM67CO1', books: ['1co', '2co'] },
      { resource: 'LLS:CALCOM69GA', books: ['gal', 'eph'] },
      { resource: 'LLS:CALCOM71PHP', books: ['php', 'col', '1th', '2th'] },
      { resource: 'LLS:CALCOM75TI', books: ['1ti', '2ti', 'tit', 'phm'] },
      { resource: 'LLS:CALCOM79HEB', books: ['heb'] },
      { resource: 'LLS:CALCOM81CATHEP', books: ['jas', '1pe', '2pe', '1jn', 'jud'] },
    ],
  },
  {
    id: 'calvin-institutes-lcc',
    title: 'Institutes of the Christian Religion (Library of Christian Classics)',
    author: 'John Calvin',
    kind: 'book',
    source: LISTING,
    volumes: [{ resource: 'LLS:ICRWJKC' }],
    index: INSTITUTES_INDEX,
  },
  {
    id: 'calvin-institutes-beveridge',
    title: 'Institutes of the Christian Religion (Beveridge)',
    author: 'John Calvin',
    kind: 'book',
    source: LISTING,
    volumes: [{ resource: 'LLS:ICRBEV' }],
    index: INSTITUTES_INDEX,
  },
];

export const workOf = (id: string): Work | undefined => WORKS.find((w) => w.id === id);

/** The names of the books a commentary covers, in the order of its volumes ('Matthew, Mark, Luke, John'); undefined for a book. */
export const coversOf = (work: Work): string | undefined => {
  if (work.kind !== 'commentary') return undefined;
  return work.volumes.flatMap((v) => v.books ?? []).map((code) => bookOf(code)?.name ?? code).join(', ');
};

/** A place in a book that has an index: `3.24` or `3.21.5` (book, chapter, section), as the Logos reference `3.24` and the words 'Book 3, chapter 24'. Undefined when the work has
 *  no index or the text is not a place the book has (a book or chapter out of range, a section of 0 or 100, any other shape). */
export function indexPlace(work: Work, spot: string): { ref: string; name: string } | undefined {
  const m = work.index ? /^(\d{1,2})\.(\d{1,3})(?:\.(\d{1,3}))?$/.exec(spot.trim()) : null;
  if (!work.index || !m) return undefined;
  const [book, chapter, section] = [Number(m[1]), Number(m[2]), m[3] === undefined ? undefined : Number(m[3])];
  const count = work.index.chapters[book - 1];
  if (count === undefined || chapter < 1 || chapter > count || (section !== undefined && (section < 1 || section > 99))) return undefined;
  const ref = section === undefined ? `${book}.${chapter}` : `${book}.${chapter}.${section}`;
  return { ref, name: `Book ${book}, chapter ${chapter}${section === undefined ? '' : `, section ${section}`}` };
}

/** The link that opens `work` in Logos. A commentary opens at `place` (`Bible.Jn3.16`, or the chapter when the place has no verse) in the volume that covers its book, and
 *  has no link when no place is named or no volume covers the book. A book opens at `spot` (`3.24`, indexPlace) when it has an index and the spot is one it has, as
 *  `ref=CICR.3.24`; otherwise at its start, whatever Bible place is named. */
export function workLink(work: Work, place?: StudyPlace, spot?: string): LogosLink | undefined {
  if (work.kind === 'book') {
    const [volume] = work.volumes;
    if (!volume) return undefined;
    const at = work.index && spot !== undefined ? indexPlace(work, spot) : undefined;
    return at && work.index ? resourceLink(volume.resource, `ref=${work.index.type}.${at.ref}`) : resourceStart(volume.resource);
  }
  if (!place) return undefined;
  const volume = work.volumes.find((v) => v.books?.includes(place.book));
  const ref = bibleRef(place.book, place.chapter, place.verse);
  return volume && ref ? resourceLink(volume.resource, `ref=${ref}`) : undefined;
}
