// src/library/bibleParts.ts — a Bible and the parts it is set for (mw-5r3p30.1135): Settings > Study resources keeps one Bible in Logos for each of three parts (New Testament, Old Testament, Apocrypha), and
// Library > Bibles shows and sets the same three keys. The marks and the Bibles row's line are read from them (never from a Bible row of the shelf), `withBibles` puts them in the shelf's states, and
// `setBibleFor` writes the part he named.
import { setLogosBibleFor, type ShelfState } from '../data/repositories';
import { entryOf } from '../resources/catalogue';
import { bibleHolds, CANON_PARTS, LOGOS_PARTS, type LogosBibles, type LogosPart } from '../resources/logosBible';

/** The short names of the parts, as a mark on a Bible: 'NT', 'OT', 'Apocrypha'. */
export const PART_MARKS: Record<LogosPart, string> = { nt: 'NT', ot: 'OT', apocrypha: 'Apocrypha', septuagint: 'Septuagint' };

/** The parts a Bible is set for, read from the three Settings keys (his Bible in Logos for each part), in the order Settings lists them. */
export const partsOf = (resource: string, bibles: LogosBibles): LogosPart[] => LOGOS_PARTS.filter((p) => bibles[p.part] === resource).map((p) => p.part);

/** The parts a Bible can be set for: those it holds (a Resource ID the catalogue does not list holds all). */
export const partsFor = (resourceId: string): LogosPart[] => LOGOS_PARTS.map((p) => p.part).filter((part) => bibleHolds(resourceId, part));

/** The parts of the canon a Bible can be set for: 'All three' means these, never the Septuagint's, which is a Bible of its own. */
export const canonPartsFor = (resourceId: string): LogosPart[] => partsFor(resourceId).filter((part) => CANON_PARTS.includes(part));

/** The words of the last button of the ask: 'All three' for a Bible holding the canon's three parts, 'Both' for two, and null for one (its own part's button already does it). */
export function allLabelFor(resourceId: string): string | null {
  const n = canonPartsFor(resourceId).length;
  return n >= 3 ? 'All three' : n === 2 ? 'Both' : null;
}

/** Sets the Bible for one part, or for every part of the canon it holds when `part` is 'all' (a part it cannot hold keeps its own Bible, and the Septuagint's is left as it is): the Settings keys, the same fact Settings > Study resources sets. */
export async function setBibleFor(part: LogosPart | 'all', resourceId: string): Promise<void> {
  for (const p of part === 'all' ? canonPartsFor(resourceId) : [part]) await setLogosBibleFor(p, resourceId);
}

/** The marks of a Bible: 'NT · OT', or '' when it is set for no part. */
export const marksOf = (resource: string, bibles: LogosBibles): string => partsOf(resource, bibles).map((p) => PART_MARKS[p]).join(' · ');

/** The shelf's states with the Bibles taken from Settings (`set`: the Resource IDs of the Bibles in Logos he set), never from a Bible row of the shelf: a Bible is On while one of them names it. */
export function withBibles(states: ReadonlyMap<string, ShelfState>, set: Iterable<string>): Map<string, ShelfState> {
  const next = new Map([...states].filter(([id]) => entryOf(id)?.kind !== 'bible'));
  for (const id of set) next.set(id, 'on');
  return next;
}

const bibleName = (id: string): string => entryOf(id)?.short ?? id;

/** The line the Bibles row reads: 'LSB for all three · Septuagint LXX Swete', or 'NT NKJV · OT LSB · Apocrypha NRSV · Septuagint LXX Swete': the canon's three parts, in one name when they agree, then the Septuagint's. */
export function bibleLine(bibles: LogosBibles): string {
  const canon = CANON_PARTS.map((part) => bibles[part]);
  const parts =
    new Set(canon).size === 1
      ? `${bibleName(bibles.nt)} for all three`
      : LOGOS_PARTS.filter((p) => CANON_PARTS.includes(p.part))
          .map((p) => `${PART_MARKS[p.part]} ${bibleName(bibles[p.part])}`)
          .join(' · ');
  return `${parts} · ${PART_MARKS.septuagint} ${bibleName(bibles.septuagint)}`;
}
