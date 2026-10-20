// src/resources/works.ts — the works of his Logos library that the tutor may link to (mw-5r3p30.675, PROVISIONAL): a commentary, opened at the passage, or a
// book, opened at its start. Lampas cannot read which books he owns, so Settings > Study resources > Works lists these and he ticks the ones he has (none to start
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
}

/** The library listing (vault plans/lampas-logos-library-2026-10-08.csv): its ResourceId column is the id, and a commentary's ReferenceSupersets column the books each volume covers (Logos' book numbers: 61 Matthew … 87 Revelation). */
const LISTING = 'His Logos library listing of 2026-10-08 (vault plans/lampas-logos-library-2026-10-08.csv, ResourceId and ReferenceSupersets columns)';

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
  },
  {
    id: 'calvin-institutes-beveridge',
    title: 'Institutes of the Christian Religion (Beveridge)',
    author: 'John Calvin',
    kind: 'book',
    source: LISTING,
    volumes: [{ resource: 'LLS:ICRBEV' }],
  },
];

export const workOf = (id: string): Work | undefined => WORKS.find((w) => w.id === id);

/** The names of the books a commentary covers, in the order of its volumes ('Matthew, Mark, Luke, John'); undefined for a book. */
export const coversOf = (work: Work): string | undefined => {
  if (work.kind !== 'commentary') return undefined;
  return work.volumes.flatMap((v) => v.books ?? []).map((code) => bookOf(code)?.name ?? code).join(', ');
};

/** The link that opens `work` in Logos. A commentary opens at `place` (`Bible.Jn3.16`, or the chapter when the place has no verse) in the volume that covers its book, and
 *  has no link when no place is named or no volume covers the book; a book opens at its start, whatever place is named. */
export function workLink(work: Work, place?: StudyPlace): LogosLink | undefined {
  if (work.kind === 'book') {
    const [volume] = work.volumes;
    return volume ? resourceStart(volume.resource) : undefined;
  }
  if (!place) return undefined;
  const volume = work.volumes.find((v) => v.books?.includes(place.book));
  const ref = bibleRef(place.book, place.chapter, place.verse);
  return volume && ref ? resourceLink(volume.resource, `ref=${ref}`) : undefined;
}
