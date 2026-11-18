// src/library/bibleParts.ts — a Bible and the parts it is set for (mw-5r3p30.1135): Settings > Study resources keeps one Bible in Logos for each of three parts (New Testament, Old Testament, Apocrypha), and
// Library > Bibles shows and sets the same three keys. The marks and the Bibles row's line are read from them (never from a Bible row of the shelf), `withBibles` puts them in the shelf's states, and
// `setBibleFor` writes the part he named.
import { setLogosBibleFor, type ShelfState } from '../data/repositories';
import { isOffered, type Owned } from '../data/owned';
import { entryOf } from '../resources/catalogue';
import { bibleFor, bibleHolds, CANON_PARTS, LOGOS_PARTS, type LogosBibles, type LogosPart } from '../resources/logosBible';

/** The short names of the parts, as a mark on a Bible: 'NT', 'OT', 'Apocrypha'. */
export const PART_MARKS: Record<LogosPart, string> = { nt: 'NT', ot: 'OT', apocrypha: 'Apocrypha', septuagint: 'Septuagint' };

/** The parts a Bible is set for, read from the three Settings keys (his Bible in Logos for each part), in the order Settings lists them. */
export const partsOf = (resource: string, bibles: Partial<LogosBibles>): LogosPart[] => LOGOS_PARTS.filter((p) => bibles[p.part] === resource).map((p) => p.part);

/** The parts a Bible can be set for: those it holds (a Resource ID the catalogue does not list holds all). */
export const partsFor = (resourceId: string): LogosPart[] => LOGOS_PARTS.map((p) => p.part).filter((part) => bibleHolds(resourceId, part));

/** The parts of the canon a Bible can be set for: 'All three' means these, never the Septuagint's, which is a Bible of its own. */
export const canonPartsFor = (resourceId: string): LogosPart[] => partsFor(resourceId).filter((part) => CANON_PARTS.includes(part));

/** The words of the last button of the ask, which sets the canon's parts the Bible holds (never the Septuagint's): 'All three' or 'Both' where those parts are the whole list of buttons, and their names ('OT and Apocrypha') where the Septuagint is among the buttons, so the name says what it sets; null for one part (its own button already does it). */
export function allLabelFor(resourceId: string): string | null {
  const canon = canonPartsFor(resourceId);
  if (canon.length < 2) return null;
  if (canon.length === partsFor(resourceId).length) return canon.length >= 3 ? 'All three' : 'Both';
  const names = canon.map((part) => PART_MARKS[part]);
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Sets the Bible for one part, or for every part of the canon it holds when `part` is 'all' (a part it cannot hold keeps its own Bible, and the Septuagint's is left as it is): the Settings keys, the same fact Settings > Study resources sets. */
export async function setBibleFor(part: LogosPart | 'all', resourceId: string): Promise<void> {
  for (const p of part === 'all' ? canonPartsFor(resourceId) : [part]) await setLogosBibleFor(p, resourceId);
}

/** The marks of a Bible: 'NT · OT', or '' when it is set for no part. */
export const marksOf = (resource: string, bibles: Partial<LogosBibles>): string => partsOf(resource, bibles).map((p) => PART_MARKS[p]).join(' · ');

/** The shelf's states with the Bibles taken from Settings (`set`: the Resource IDs of the Bibles in Logos he set), never from a Bible row of the shelf: a Bible is On while one of them names it. */
export function withBibles(states: ReadonlyMap<string, ShelfState>, set: Iterable<string>): Map<string, ShelfState> {
  const next = new Map([...states].filter(([id]) => entryOf(id)?.kind !== 'bible'));
  for (const id of set) next.set(id, 'on');
  return next;
}

const bibleName = (id: string): string => entryOf(id)?.short ?? id;

/** The Bibles he set that he may be offered (isOffered: his import holds them, or Logos gives them free): each part whose Bible is not offered is left out, so the Library names no Bible the Bibles page does not list (mw-qtu3zvz.184).
 *  A Resource ID he typed, which no catalogue row names, is kept: the Bibles page has no row of it to list, and he named it himself (mw-fnvjof.17.6, mw-fnvjof.17.169). */
export function offeredBibles(bibles: LogosBibles, owned: Owned): Partial<LogosBibles> {
  return Object.fromEntries(LOGOS_PARTS.filter((p) => bibleOffered(bibles[p.part], owned)).map((p) => [p.part, bibles[p.part]]));
}

/** Whether one Bible he set may be named and opened in Logos: a Resource ID the catalogue does not list (one he typed) always may; a catalogue Bible only when isOffered (his import holds it, or Logos gives it free).
 *  Every door that builds a link into his Bible in Logos asks this (mw-qtu3zvz.208). */
export const bibleOffered = (resource: string, owned: Owned): boolean => entryOf(resource) === undefined || isOffered(resource, owned);

/** The Bible he set for a book's part (bibleFor), or undefined when it is not offered (bibleOffered): the door that opens a place in his Bible in Logos draws nothing for undefined (mw-qtu3zvz.208). */
export const offeredBibleFor = (code: string, bibles: LogosBibles, owned: Owned): string | undefined => (bibleOffered(bibleFor(code, bibles), owned) ? bibleFor(code, bibles) : undefined);

/** The line the Bibles row reads: 'LSB for all three · Septuagint LXX Swete', or 'NT NKJV · OT LSB · Apocrypha NRSV · Septuagint LXX Swete': the canon's three parts, in one name when they agree, then the Septuagint's.
 *  A part with no Bible (offeredBibles left it out) is not named, and 'none on' is the line when no part has one. */
export function bibleLine(bibles: Partial<LogosBibles>): string {
  const canon = CANON_PARTS.map((part) => bibles[part]);
  const first = bibles.nt;
  const canonLine =
    first !== undefined && new Set(canon).size === 1
      ? `${bibleName(first)} for all three`
      : LOGOS_PARTS.filter((p) => CANON_PARTS.includes(p.part) && bibles[p.part] !== undefined)
          .map((p) => `${PART_MARKS[p.part]} ${bibleName(bibles[p.part]!)}`)
          .join(' · ');
  const septuagint = bibles.septuagint === undefined ? '' : `${PART_MARKS.septuagint} ${bibleName(bibles.septuagint)}`;
  return [canonLine, septuagint].filter((part) => part !== '').join(' · ') || 'none on';
}
