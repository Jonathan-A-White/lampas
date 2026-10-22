// src/data/daily/devotionals.ts — the 37 devotionals of the Governor's Logos library (read from the Laptop's Logos catalog, 2026-10-19; mw-6ww.126), each with its
// Logos resource id (the 'LLS:' form a logosres: link takes) and whether Logos marks it as opening by day of year (`dayOfYear`; 'no' may only mean unflagged).
// Settings > Daily picks one of them for Today, or Random among those ticked; `devotionalForDay` is the pure choice. A new devotional is an entry in data/logos/catalogue-rules.json (then `npm run logos:catalogue`).
import { entriesOf } from '../../resources/catalogue';

export interface Devotional {
  /** the Logos resource id: 'LLS:20.10.1' */
  id: string;
  title: string;
  /** the author(s), as Logos catalogs them; empty when it names none */
  author: string;
  /** Logos flags the resource as supporting a day-of-year reference */
  dayOfYear: boolean;
}

/** The devotionals Settings > Daily picks from: a view over the catalogue's devotionals named by id (src/resources/catalogue.ts; a calendar devotional an export adds is the catalogue's, not this list's, until the shelf reads it). */
export const DEVOTIONALS: readonly Devotional[] = entriesOf('devotional')
  .filter((e) => e.via === 'id')
  .map((e) => ({ id: e.resource, title: e.title, author: e.author ?? '', dayOfYear: e.dayOfYear === true }));

/** The devotional Today shows to start, and the fallback: Spurgeon's Morning and Evening. */
export const DEFAULT_DEVOTIONAL = 'LLS:20.10.1';

/** The picker's value that means a different one each day, drawn from those ticked. */
export const RANDOM = 'random';

/** The ticked-list setting's value for every devotional ticked (the start). */
export const ALL_TICKED = 'all';

const byId = new Map(DEVOTIONALS.map((d) => [d.id, d]));
const FALLBACK = byId.get(DEFAULT_DEVOTIONAL) as Devotional;

export const devotionalOf = (id: string): Devotional | undefined => byId.get(id);

/** The ids ticked for Random, from the setting's text ('all', or the ids joined by commas): only those in the catalog, in the catalog's order. */
export function tickedDevotionals(raw: string): string[] {
  if (raw === ALL_TICKED) return DEVOTIONALS.map((d) => d.id);
  const named = new Set(raw.split(',').map((s) => s.trim()));
  return DEVOTIONALS.filter((d) => named.has(d.id)).map((d) => d.id);
}

/** The setting's text for none ticked (an empty text would read as the default). */
export const NONE_TICKED = 'none';

/** The same text for a list of ticked ids: 'all' when every devotional is ticked, 'none' when none is. */
export function tickedText(ids: readonly string[]): string {
  const known = DEVOTIONALS.filter((d) => ids.includes(d.id));
  if (known.length === DEVOTIONALS.length) return ALL_TICKED;
  return known.length === 0 ? NONE_TICKED : known.map((d) => d.id).join(',');
}

/** A number from the local date (year, month, day as the phone's clock has them), the same all day. */
function dateSeed(date: Date): number {
  let h = (date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate()) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** The devotional for `date`: the one he chose; with Random, the day's `pick` (what Another drew, kept for the date) when the catalog has it, else one of the `ticked` ids
 *  drawn by the LOCAL date (the same all day). Nothing ticked, or a choice the catalog lacks, gives Morning and Evening. */
export function devotionalForDay(choice: string, ticked: readonly string[], date: Date, pick?: string): Devotional {
  if (choice !== RANDOM) return byId.get(choice) ?? FALLBACK;
  const picked = pick === undefined ? undefined : byId.get(pick);
  if (picked) return picked;
  const pool = DEVOTIONALS.filter((d) => ticked.includes(d.id));
  return pool.length === 0 ? FALLBACK : pool[dateSeed(date) % pool.length];
}

/** The id Another draws: one of the `ticked` ones other than `current`; when the draw holds nothing else, any other in the catalog. `random` is Math.random's kind. */
export function anotherDevotional(current: string, ticked: readonly string[], random: () => number = Math.random): string {
  let pool = DEVOTIONALS.filter((d) => d.id !== current && ticked.includes(d.id));
  if (pool.length === 0) pool = DEVOTIONALS.filter((d) => d.id !== current);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id;
}
