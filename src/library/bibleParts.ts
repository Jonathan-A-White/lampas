// src/library/bibleParts.ts — a Bible and the parts it is set for (mw-5r3p30.1135): Settings > Study resources keeps one Bible in Logos for each of three parts (New Testament, Old Testament, Apocrypha), and
// Library > Bibles shows and sets the same three keys. The marks and the Bibles row's line are read from them (never from a Bible row of the shelf), `withBibles` puts them in the shelf's states, and
// `setBibleFor` writes the part he named.
import { setLogosBibleFor, type ShelfState } from '../data/repositories';
import { entryOf } from '../resources/catalogue';
import { bibleHolds, LOGOS_PARTS, type LogosBibles, type LogosPart } from '../resources/logosBible';

/** The short names of the parts, as a mark on a Bible: 'NT', 'OT', 'Apocrypha'. */
export const PART_MARKS: Record<LogosPart, string> = { nt: 'NT', ot: 'OT', apocrypha: 'Apocrypha' };

/** The parts a Bible is set for, read from the three Settings keys (his Bible in Logos for each part), in the order Settings lists them. */
export const partsOf = (resource: string, bibles: LogosBibles): LogosPart[] => LOGOS_PARTS.filter((p) => bibles[p.part] === resource).map((p) => p.part);

/** The parts a Bible can be set for: those it holds (a Resource ID the catalogue does not list holds all). */
export const partsFor = (resourceId: string): LogosPart[] => LOGOS_PARTS.map((p) => p.part).filter((part) => bibleHolds(resourceId, part));

/** Sets the Bible for one part, or for every part it holds when `part` is 'all' (a part it cannot hold keeps its own Bible): the Settings keys, the same fact Settings > Study resources sets. */
export async function setBibleFor(part: LogosPart | 'all', resourceId: string): Promise<void> {
  for (const p of part === 'all' ? partsFor(resourceId) : [part]) await setLogosBibleFor(p, resourceId);
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

/** The line the Bibles row reads: 'LSB for all three', or 'NT NKJV · OT LSB · Apocrypha NRSV'. */
export function bibleLine(bibles: LogosBibles): string {
  if (new Set(Object.values(bibles)).size === 1) return `${bibleName(bibles.nt)} for all three`;
  return LOGOS_PARTS.map((p) => `${PART_MARKS[p.part]} ${bibleName(bibles[p.part])}`).join(' · ');
}
