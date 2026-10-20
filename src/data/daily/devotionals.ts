// src/data/daily/devotionals.ts — the 37 devotionals of the Governor's Logos library (read from the Laptop's Logos catalog, 2026-10-19; mw-6ww.126), each with its
// Logos resource id (the 'LLS:' form a logosres: link takes) and whether Logos marks it as opening by day of year (`dayOfYear`; 'no' may only mean unflagged).
// Settings > Daily picks one of them for Today, or Random among those ticked; `devotionalForDay` is the pure choice. A new devotional is a line here.

export interface Devotional {
  /** the Logos resource id: 'LLS:20.10.1' */
  id: string;
  title: string;
  /** the author(s), as Logos catalogs them; empty when it names none */
  author: string;
  /** Logos flags the resource as supporting a day-of-year reference */
  dayOfYear: boolean;
}

export const DEVOTIONALS: readonly Devotional[] = [
  { id: 'LLS:HLINSSDYBYDY', title: 'Holiness Day by Day: Transformational Thoughts for Your Spiritual Journey', author: 'Jerry Bridges', dayOfYear: false },
  { id: 'LLS:MANFAMDEVBCP', title: 'Manual of Family Devotions: Arranged from the Book of Common Prayer', author: 'Augustus Duncombe', dayOfYear: false },
  { id: 'LLS:HEARTOFPRAISE', title: 'The Heart of Praise', author: 'Jack W. Hayford', dayOfYear: false },
  { id: 'LLS:36.0.3', title: 'The Riches of John Bunyan', author: 'John Bunyan', dayOfYear: false },
  { id: 'LLS:365CALVIN', title: '365 Days with Calvin', author: 'John Calvin; Joel R. Beeke', dayOfYear: false },
  { id: 'LLS:365SPURGEON1', title: '365 Days with Spurgeon (Volume 1)', author: 'Charles H. Spurgeon; Terence Peter Crosby', dayOfYear: true },
  { id: 'LLS:365SPURGEON2', title: '365 Days with Spurgeon (Volume 2)', author: 'Charles H. Spurgeon; Terence Peter Crosby', dayOfYear: true },
  { id: 'LLS:365SPURGEON3', title: '365 Days with Spurgeon (Volume 3)', author: 'Charles H. Spurgeon; Terence Peter Crosby', dayOfYear: true },
  { id: 'LLS:365SPURGEON4', title: '365 Days with Spurgeon (Volume 4)', author: 'Charles H. Spurgeon; Terence Peter Crosby', dayOfYear: true },
  { id: 'LLS:365SPURGEON5', title: '365 Days with Spurgeon (Volume 5)', author: 'Charles H. Spurgeon; Terence Peter Crosby', dayOfYear: true },
  { id: 'LLS:365SPURGEON6', title: '365 Days with Spurgeon (Volume 6)', author: 'Charles H. Spurgeon; Terence Peter Crosby', dayOfYear: true },
  { id: 'LLS:40DAYSCROSS', title: '40 Days to the Cross: Reflections from Great Thinkers', author: 'Rebecca Van Noord; Jessi Strong', dayOfYear: false },
  { id: 'LLS:9780736971270', title: '52 Weeks Through the Psalms Devotional: A One-Year Journey of Prayer and Praise', author: 'James Merritt', dayOfYear: false },
  { id: 'LLS:FSBDEVOTIONAL', title: 'Connect the Testaments: A 365-Day Devotional with Bible Reading Plan', author: 'John D. Barry; Rebecca Van Noord', dayOfYear: true },
  { id: 'LLS:DLYDCLRTNSSWRFR', title: 'Daily Declarations for Spiritual Warfare', author: 'John Eckhardt', dayOfYear: true },
  { id: 'LLS:DYSHVNLVNGTRTHS', title: 'Days of Heaven upon Earth: A Year Book of Scripture Texts and Living Truths', author: 'A. B. Simpson', dayOfYear: true },
  { id: 'LLS:20.10.8', title: 'Ears from Harvested Sheaves, or, Daily Portions', author: 'J. C. Philpot', dayOfYear: false },
  { id: 'LLS:FRESHSTDEV', title: 'Fresh Start Devotionals', author: 'Jim L. Wilson', dayOfYear: false },
  { id: 'LLS:GDSFTHFL', title: 'God Is Faithful: A Daily Invitation into the Father Heart of God', author: 'David Wilkerson', dayOfYear: false },
  { id: 'LLS:9781434705846', title: 'Good Morning, God: Wake-up Devotions to Start Your Day God\'s Way', author: '', dayOfYear: false },
  { id: 'LLS:MKEYECNTCTGD', title: 'Making Eye Contact with God: A Weekly Devotional for Women', author: 'Terri Gillespie', dayOfYear: false },
  { id: 'LLS:MMNTGDDVBBLCLBK', title: 'Moment with God: A Devotional on Every Biblical Book', author: 'John D. Barry; Rebecca Van Noord', dayOfYear: false },
  { id: 'LLS:20.10.1', title: 'Morning and Evening', author: 'Charles H. Spurgeon', dayOfYear: false },
  { id: 'LLS:20.10.2', title: 'My Utmost for His Highest', author: 'Oswald Chambers', dayOfYear: false },
  { id: 'LLS:STRMSDSRT', title: 'Streams in the Desert', author: 'Lettie B. Cowman', dayOfYear: false },
  { id: 'LLS:BTSTN10TNNVRSRY', title: 'The Bait of Satan (Devotional Supplement Included)', author: 'John Bevere', dayOfYear: false },
  { id: 'LLS:SPURGINTERP', title: 'The Interpreter: Spurgeon’s Devotional Bible', author: 'Charles H. Spurgeon', dayOfYear: false },
  { id: 'LLS:VOICELRD', title: 'The Voice of the Lord: Messianic Jewish Daily Devotional', author: 'David J. Rudolph', dayOfYear: false },
  { id: 'LLS:20.10.14', title: 'Thoughts for the Quiet Hour', author: 'Samuel G. Hardman; Dwight Lyman Moody', dayOfYear: false },
  { id: 'LLS:TICHDD', title: 'Today in Christian History: Daily Devotionals', author: 'Christian History Institute', dayOfYear: true },
  { id: 'LLS:TICHDQ', title: 'Today in Christian History: Daily Quotes', author: 'Christian History Institute', dayOfYear: true },
  { id: 'LLS:TICHDS', title: 'Today in Christian History: Daily Stories', author: 'Christian History Institute', dayOfYear: true },
  { id: 'LLS:9781496400536', title: 'Turning Points with God: 365 Daily Devotions', author: 'David Jeremiah', dayOfYear: true },
  { id: 'LLS:12MOSUNA', title: 'Twelve Months of Sundays: Reflections on Bible Readings, Year A', author: 'N. T. Wright', dayOfYear: false },
  { id: 'LLS:12MOSUNB', title: 'Twelve Months of Sundays: Reflections on Bible Readings, Year B', author: 'N. T. Wright', dayOfYear: false },
  { id: 'LLS:12MOSUNC', title: 'Twelve Months of Sundays: Reflections on Bible Readings, Year C', author: 'N. T. Wright', dayOfYear: false },
  { id: 'LLS:WMNSDLYSPRTWRFR', title: 'Women’s Daily Declarations for Spiritual Warfare', author: 'John Eckhardt', dayOfYear: true },
];

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
