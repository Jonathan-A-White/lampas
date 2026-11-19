// src/data/daily/devotionals.ts — the 37 devotionals of the Governor's Logos library (read from the Laptop's Logos catalog, 2026-10-19; mw-6ww.126), each with its
// Logos resource id (the 'LLS:' form a logosres: link takes) and whether Logos marks it as opening by day of year (`dayOfYear`; 'no' may only mean unflagged).
// Settings > Daily picks one of them for Today, or Random among those ticked; `devotionalForDay` is the pure choice. A new devotional is an entry in data/logos/catalogue-rules.json (then `npm run logos:catalogue`).
// Beside them stands Morning RePhil (MORNING_REPHIL, kind 'rephil', mw-qtu3zvz.15): not a Logos book, so not in DEVOTIONALS, the shelf or the draw's ticks; it is always on offer, and Random draws it only
// while it has an episode he has not heard (src/data/daily/morningRephil.ts).
import { entriesOf } from '../../resources/catalogue';
import { isOffered, type Owned } from '../owned';

export interface Devotional {
  /** the Logos resource id: 'LLS:20.10.1' */
  id: string;
  title: string;
  /** the author(s), as Logos catalogs them; empty when it names none */
  author: string;
  /** Logos flags the resource as supporting a day-of-year reference */
  dayOfYear: boolean;
  /** absent: a book of his Logos library, opened at the day; 'rephil': Morning RePhil, an episode he watches on the web */
  kind?: 'rephil';
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

/** The id Which devotional keeps for Morning RePhil. */
export const MORNING_REPHIL_ID = 'rephil:morning';

/** Brookfield First's Morning RePhil as a devotional: the episode is drawn and kept by src/data/daily/morningRephil.ts, its link is the episode's own. */
export const MORNING_REPHIL: Devotional = { id: MORNING_REPHIL_ID, title: 'Morning RePhil (Brookfield First)', author: 'Pastor Phil Morgan', dayOfYear: false, kind: 'rephil' };

const byId = new Map([...DEVOTIONALS, MORNING_REPHIL].map((d) => [d.id, d]));
const FALLBACK = byId.get(DEFAULT_DEVOTIONAL) as Devotional;

export const devotionalOf = (id: string): Devotional | undefined => byId.get(id);

/** The devotional Today shows when every Morning RePhil episode is seen, to start (Settings > Daily > When all Morning RePhil are seen): Spurgeon, Lampas's default devotional. */
export const DEFAULT_BACKUP = DEFAULT_DEVOTIONAL;

/** The backup devotional named by `id`: a Logos devotional of the catalog, else Spurgeon's Morning and Evening. */
export const backupDevotional = (id: string): Devotional => {
  const d = byId.get(id);
  return d && d.kind === undefined ? d : FALLBACK;
};

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

/** A source of devotionals (mw-r9xo1pj.4): who gives them, and how they come. A new church feed is one more entry here and one switch in Settings > Daily > Devotional sources, not a new bolt.
 *  `logos`: books of his Logos library, drawn from the ones that are On in Your Logos library; `episodes`: a feed of episodes he hears one by one. */
export interface DevotionalSource {
  id: 'logos' | 'rephil';
  provider: string;
  title: string;
  kind: 'logos' | 'episodes';
}

export const DEVOTIONAL_SOURCES: readonly DevotionalSource[] = [
  { id: 'logos', provider: 'Logos', title: 'Logos devotionals', kind: 'logos' },
  { id: 'rephil', provider: 'Brookfield First', title: 'Morning RePhil', kind: 'episodes' },
];

/** Which sources the draw may use: `logos` is true only while Logos is On AND 'Logos devotionals' is On; `rephil` is Brookfield First's switch. */
export type DrawSources = Record<DevotionalSource['id'], boolean>;

/** Every source on (what a caller that knows no switches means). */
export const ALL_SOURCES: DrawSources = { logos: true, rephil: true };

/** The sources he has on, from the three things that decide it: Logos itself (Settings > Study resources), and the two switches of Settings > Daily > Devotional sources ('on' or 'off'; absent reads as On). */
export const drawSourcesOf = (logosOn: boolean, logosDevotionals?: string, rephil?: string): DrawSources => ({ logos: logosOn && logosDevotionals !== 'off', rephil: rephil !== 'off' });

/** Whether the source `d` comes from is on. */
export const sourceOn = (d: Devotional, sources: DrawSources): boolean => (d.kind === 'rephil' ? sources.rephil : sources.logos);

/** THE draw: the devotionals Random may show or Another may draw, in the catalog's order: the `ticked` Logos ones while the Logos source is on, and Morning RePhil while its source is on and `rephil` says an episode is
 *  unheard. Every reader of the draw (Today, its chip, Another, the tutor's Today's devotional) comes here (mw-r9xo1pj.4). */
export function drawPool(ticked: readonly string[], rephil: boolean, sources: DrawSources = ALL_SOURCES): Devotional[] {
  return [...(sources.logos ? DEVOTIONALS.filter((d) => ticked.includes(d.id)) : []), ...(sources.rephil && rephil ? [MORNING_REPHIL] : [])];
}

/** The devotional for `date`: the one he chose; with Random, the day's `pick` (what Another drew, kept for the date) when the catalog has it and its source is on, else one of the draw (drawPool) by the LOCAL date (the same
 *  all day). Nothing in the draw, or a choice the catalog lacks, gives Morning and Evening. */
export function devotionalForDay(choice: string, ticked: readonly string[], date: Date, pick?: string, rephil = false, sources: DrawSources = ALL_SOURCES): Devotional {
  if (choice !== RANDOM) return byId.get(choice) ?? FALLBACK;
  const picked = pick === undefined ? undefined : byId.get(pick);
  if (picked && sourceOn(picked, sources)) return picked;
  const pool = drawPool(ticked, rephil, sources);
  return pool.length === 0 ? FALLBACK : pool[dateSeed(date) % pool.length];
}

/** The devotionals Settings > Daily's picker lists, in the catalog's order: those `ticked` for the draw that he may be offered (in his import or free with Logos: src/data/owned.ts isOffered, mw-qtu3zvz.167) while the Logos
 *  source is on, Morning RePhil last while its source is on (a web page, always offered), and always the one chosen now (`current`), so the picker never hides what Today shows. With the Logos source off (Logos Off, or
 *  'Logos devotionals' Off) only the one chosen now and Morning RePhil are listed: a Logos book opens nothing then (mw-r9xo1pj.2). */
export const pickableDevotionals = (ticked: readonly string[], current: string, owned: Owned, sources: DrawSources = ALL_SOURCES): Devotional[] => [
  ...DEVOTIONALS.filter((d) => d.id === current || (sources.logos && ticked.includes(d.id) && isOffered(d.id, owned))),
  ...(sources.rephil || current === MORNING_REPHIL_ID ? [MORNING_REPHIL] : []),
];

/** The id Another draws: one of the draw (drawPool) other than `current`; when the draw holds nothing else, any other of the sources that are on (Morning RePhil only while `rephil` says an episode is unheard); with every
 *  source off, `current` stays. `random` is Math.random's kind. */
export function anotherDevotional(current: string, ticked: readonly string[], random: () => number = Math.random, rephil = false, sources: DrawSources = ALL_SOURCES): string {
  let pool = drawPool(ticked, rephil, sources).filter((d) => d.id !== current);
  if (pool.length === 0) pool = drawPool(DEVOTIONALS.map((d) => d.id), rephil, sources).filter((d) => d.id !== current);
  if (pool.length === 0) return current;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id;
}
