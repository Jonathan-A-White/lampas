// src/data/repositories/library.ts — his shelf (docs/design/library-at-scale.md 3.2): which books of his Logos library Lampas may use, Off, On or Pinned, in the Dexie `library` table
// (one row per book he has touched; Off is no row). The ONLY file that reads or writes that table: UI code reaches the shelf here (tests/unit/library-only-here.test.ts).
//
// Four old settings keys held the same facts before the shelf: `resourceOption.logos` (the lexicons ticked), `grammarBooks`, `works` and `devotionalDraw`. Each is taken into rows the
// first time the shelf is read after the update (the first lexicon tick and Black become Pinned, the rest On) and the readers that were written for those keys
// (tickedOf's option, getGrammarBooks, getWorks, the devotional draw) read the rows instead. The row `#taken` of the library table remembers the text of each old key as it was taken;
// a key that now holds other text (a test's seed, a key the phone's settings sync wrote) is taken again, for its books only; a key that has not changed is ignored, so what he taps
// on the shelf is never overwritten by an old key.
import { DEVOTIONALS, ALL_TICKED, NONE_TICKED, tickedDevotionals, tickedText } from '../daily/devotionals';
import { CATALOGUE, entriesOf, entryOf, type CatalogueEntry, type Kind } from '../../resources/catalogue';
import { DEFAULT_GRAMMAR_BOOKS, GRAMMAR_BOOKS } from '../../resources/grammarBooks';
import { LEXICONS } from '../../resources/logos';
import { WORKS } from '../../resources/works';
import { db, type LibraryRow } from '../db';

export type ShelfState = 'off' | 'on' | 'pinned';

/** How many books of one kind may be Pinned (a tile row on the word sheet, the lines of the idea sheet). */
export const MAX_PINS = 3;

/** Why the shelf did not do what it was asked: the catalogue has no such book, a kind has its pins, a Devotional cannot be Pinned, a kind holds one at a time. */
export type ShelfRefusal = 'no-such-book' | 'too-many-pins' | 'no-pin-for-devotionals' | 'one-at-a-time';

export type ShelfResult = { ok: true } | { ok: false; reason: ShelfRefusal };

const OK: ShelfResult = { ok: true };
const refused = (reason: ShelfRefusal): ShelfResult => ({ ok: false, reason });

export type { LibraryRow };

// --- the old keys ---------------------------------------------------------------------------------------------------------------------------

const LOGOS_KEY = 'resourceOption.logos';
const BOOKS_KEY = 'grammarBooks';
const WORKS_KEY = 'works';
const DRAW_KEY = 'devotionalDraw';
/** The row that remembers the text of each old key as the shelf took it (kind 'taken', never a book): the meta store is busy while the words are seeded, and the settings store must stay as it was. */
const TAKEN_ID = '#taken';

/** What each old key owns: the books it spoke for. A key's books are replaced when the key is taken again; any other row of the kind is his alone. */
interface Part {
  key: string;
  kind: Kind;
  /** the Resource IDs the old key could tick */
  owns: readonly string[];
  /** the Resource IDs a kept value of the key makes On; undefined text is nothing kept */
  fromKept(raw: string | undefined): string[];
}

/** The ids in a kept JSON array, or undefined when the text is not one. */
function jsonIds(raw: string | undefined): string[] | undefined {
  if (typeof raw !== 'string') return undefined;
  try {
    const ids: unknown = JSON.parse(raw);
    if (Array.isArray(ids)) return ids.filter((id): id is string => typeof id === 'string');
  } catch {
    // not JSON: as if nothing was kept
  }
  return undefined;
}

const lexiconResources = (ids: readonly string[]): string[] => LEXICONS.filter((l) => ids.includes(l.id)).map((l) => l.resource);
const bookResources = (ids: readonly string[]): string[] => GRAMMAR_BOOKS.filter((b) => ids.includes(b.id)).map((b) => b.resource);
const workResources = (ids: readonly string[]): string[] => WORKS.filter((w) => ids.includes(w.id)).flatMap((w) => w.volumes.map((v) => v.resource));

const PARTS: readonly Part[] = [
  { key: LOGOS_KEY, kind: 'lexicon', owns: LEXICONS.map((l) => l.resource), fromKept: (raw) => lexiconResources(jsonIds(raw) ?? ['bdag']) },
  { key: BOOKS_KEY, kind: 'grammar', owns: GRAMMAR_BOOKS.map((b) => b.resource), fromKept: (raw) => bookResources(jsonIds(raw) ?? DEFAULT_GRAMMAR_BOOKS) },
  { key: WORKS_KEY, kind: 'commentary', owns: workResources(WORKS.map((w) => w.id)), fromKept: (raw) => workResources(jsonIds(raw) ?? []) },
  {
    key: DRAW_KEY,
    kind: 'devotional',
    owns: DEVOTIONALS.map((d) => d.id),
    fromKept: (raw) => tickedDevotionals(typeof raw === 'string' && raw !== '' ? raw : ALL_TICKED),
  },
];

/** The books that start Pinned when the old ticks are taken: the first lexicon ticked, and Black among the grammar books. */
const startsPinned = (part: Part, resources: readonly string[]): string[] => {
  if (part.kind === 'lexicon') return resources.slice(0, 1);
  if (part.kind === 'grammar') return GRAMMAR_BOOKS.filter((b) => b.id === 'black' && resources.includes(b.resource)).map((b) => b.resource);
  return [];
};

type From = Record<string, string | null>;

function parseFrom(raw: string | undefined): From {
  try {
    const from: unknown = raw === undefined ? {} : JSON.parse(raw);
    if (from !== null && typeof from === 'object') return from as From;
  } catch {
    // unreadable: nothing was taken
  }
  return {};
}

type Drift = { changed: { part: Part; raw: string | null }[]; next: From };

/** The old keys whose text is not the text last taken (all four, the first time), from the texts the keys hold now; undefined when none. */
function driftFrom(kept: readonly (string | undefined)[], taken: string | undefined): Drift | undefined {
  const before = parseFrom(taken);
  const next: From = {};
  const changed: Drift['changed'] = [];
  for (const [i, part] of PARTS.entries()) {
    const raw = kept[i] ?? null;
    next[part.key] = raw;
    if (raw !== before[part.key]) changed.push({ part, raw });
  }
  return changed.length === 0 ? undefined : { changed, next };
}

/** The text of the four old keys (undefined for one that is not kept), in PARTS' order. One read of the small settings store: a bulkGet is a request for each key, and each waits for a turn of a busy page. */
async function oldKeys(): Promise<(string | undefined)[]> {
  const rows = new Map((await db.settings.toArray()).map((r) => [r.key, r.value]));
  return PARTS.map((p) => rows.get(p.key));
}

/** Every row but the one that remembers the old keys, and the text it holds. */
function splitTaken(all: readonly LibraryRow[]): { rows: LibraryRow[]; taken: string | undefined } {
  return { rows: all.filter((r) => r.id !== TAKEN_ID), taken: all.find((r) => r.id === TAKEN_ID)?.taken };
}

const takenRow = (drift: Drift): LibraryRow => ({ id: TAKEN_ID, kind: 'taken', state: 'on', since: 0, taken: JSON.stringify(drift.next) });

/** The rows an old key's text makes: the books it ticks On, the first lexicon and Black Pinned. */
function takenRows(part: Part, raw: string | null, at: number): LibraryRow[] {
  const resources = part.fromKept(raw ?? undefined);
  const pinned = startsPinned(part, resources);
  return resources.map((id): LibraryRow => ({ id, kind: part.kind, state: pinned.includes(id) ? 'pinned' : 'on', since: at }));
}

/** Takes every old key whose text changed into rows. The keys are read before the write transaction, which holds only the shelf and takes what it was shown only if the shelf has taken
 *  nothing since. Never called from a live query (Dexie refuses a write there): the readers use rowsNow, which settles it a moment later. */
async function settle(): Promise<void> {
  const [all, kept] = await Promise.all([db.library.toArray(), oldKeys()]);
  const { taken } = splitTaken(all);
  const drift = driftFrom(kept, taken);
  if (!drift) return;
  await db.transaction('rw', db.library, async () => {
    if ((await db.library.get(TAKEN_ID))?.taken !== taken) return;
    const at = Date.now();
    for (const { part, raw } of drift.changed) {
      await db.library.bulkDelete([...part.owns]);
      await db.library.bulkPut(takenRows(part, raw, at));
    }
    await db.library.put(takenRow(drift));
  });
}

/** Settles one after another: a call returns once the keys as they stood at the call have been taken. */
let settling: Promise<void> = Promise.resolve();
function ensureShelf(): Promise<void> {
  settling = settling.then(settle, settle);
  return settling;
}

// Taking the old keys at the first open after the update (docs/design 14 S2). Called straight, not through `settling`: a native promise chain would leave Dexie's zone, and the
// open waits for this to end, so a database call outside the zone would wait for the open.
db.on('ready', () => settle().catch(() => undefined));

let scheduled = false;

/** Every row, with the old keys that have not been taken yet applied in memory: a live query may not write, so a reader that finds one answers as if it were taken and lets it be written a moment later. */
async function rowsNow(): Promise<LibraryRow[]> {
  const [all, kept] = await Promise.all([db.library.toArray(), oldKeys()]);
  const { rows, taken } = splitTaken(all);
  const drift = driftFrom(kept, taken);
  if (!drift) return rows;
  if (!scheduled) {
    scheduled = true;
    setTimeout(() => void ensureShelf().catch(() => undefined).finally(() => (scheduled = false)), 0);
  }
  const at = Date.now();
  const replaced = new Set(drift.changed.flatMap(({ part }) => part.owns));
  return [...rows.filter((r) => !replaced.has(r.id)), ...drift.changed.flatMap(({ part, raw }) => takenRows(part, raw, at))];
}

// --- the shelf ------------------------------------------------------------------------------------------------------------------------

const rank = (row: LibraryRow, order: Map<string, number>): number => (row.state === 'pinned' ? 0 : 1) * 1e6 + (order.get(row.id) ?? 1e5);
const catalogueOrder = new Map(CATALOGUE.map((e, i) => [e.resource, i]));

/** His rows (every kind, or one), Pinned first, then in the catalogue's order. */
export async function shelfOf(kind?: Kind): Promise<LibraryRow[]> {
  const rows = (await rowsNow()).filter((r) => kind === undefined || r.kind === kind);
  return rows.sort((a, b) => rank(a, catalogueOrder) - rank(b, catalogueOrder));
}

/** The Pinned rows of a kind, in the catalogue's order. */
export async function pinnedOf(kind: Kind): Promise<LibraryRow[]> {
  return (await shelfOf(kind)).filter((r) => r.state === 'pinned');
}

/** Whether a book is Off, On or Pinned now. */
export async function stateOf(resource: string): Promise<ShelfState> {
  return (await rowsNow()).find((r) => r.id === resource)?.state ?? 'off';
}

/** Puts one book in a state. Refused when the catalogue has no such book, when it would be a kind's fourth pin, when it is a Devotional being Pinned, and a Bible going On
 *  takes the place of the one On (Bibles are one at a time). Off removes the row. */
export async function setState(resource: string, state: ShelfState, now = Date.now()): Promise<ShelfResult> {
  await ensureShelf();
  const entry = entryOf(resource);
  if (!entry) return refused('no-such-book');
  return db.transaction('rw', db.library, async () => put(entry, state, now));
}

/** setState inside a transaction. */
async function put(entry: CatalogueEntry, state: ShelfState, now: number): Promise<ShelfResult> {
  const was = await db.library.get(entry.resource);
  if (state === 'off') {
    await db.library.delete(entry.resource);
    return OK;
  }
  if (state === 'pinned') {
    if (entry.kind === 'devotional') return refused('no-pin-for-devotionals');
    if (entry.kind !== 'bible' && was?.state !== 'pinned' && (await db.library.where('kind').equals(entry.kind).filter((r) => r.state === 'pinned').count()) >= MAX_PINS) {
      return refused('too-many-pins');
    }
  }
  if (entry.kind === 'bible') await db.library.where('kind').equals('bible').filter((r) => r.id !== entry.resource).delete();
  await db.library.put({ id: entry.resource, kind: entry.kind, state, since: was?.state === state ? was.since : now });
  return OK;
}

/** All on / All off for a kind: every catalogue book of the kind goes On (a Pinned one stays Pinned), or every row of the kind goes. Bibles are one at a time: All on is refused. */
export async function setKind(kind: Kind, state: 'on' | 'off', now = Date.now()): Promise<ShelfResult> {
  await ensureShelf();
  if (state === 'on' && kind === 'bible') return refused('one-at-a-time');
  return db.transaction('rw', db.library, async () => {
    if (state === 'off') {
      await db.library.where('kind').equals(kind).delete();
      return OK;
    }
    const have = new Map((await db.library.where('kind').equals(kind).toArray()).map((r) => [r.id, r]));
    await db.library.bulkPut(entriesOf(kind).map((e): LibraryRow => have.get(e.resource) ?? { id: e.resource, kind, state: 'on', since: now }));
    return OK;
  });
}

/** What an import hands the shelf: a book (by Resource ID) and the state its match asks for. */
export interface ImportRow {
  resource: string;
  state: 'on' | 'pinned';
}

/** Takes the books of an import: each the catalogue knows goes On (or Pinned, as far as the kind's pins allow), but a book he already has a row for keeps its state (his tap wins),
 *  and a Bible is taken only while he has none. Returns how many rows it added. */
export async function importShelf(rows: readonly ImportRow[], now = Date.now()): Promise<number> {
  await ensureShelf();
  return db.transaction('rw', db.library, async () => {
    let added = 0;
    for (const row of rows) {
      const entry = entryOf(row.resource);
      if (!entry || (await db.library.get(entry.resource))) continue;
      if (entry.kind === 'bible' && (await db.library.where('kind').equals('bible').count()) > 0) continue;
      const result = await put(entry, row.state, now);
      if (!result.ok) {
        // a pin that cannot be given is still a book on his shelf
        if ((await put(entry, 'on', now)).ok) added += 1;
      } else added += 1;
    }
    return added;
  });
}

/** After the catalogue changes (its version stamp): drops the rows of books it no longer has and gives the others the kind it now files them under. Returns how many rows changed. */
export async function rematch(): Promise<number> {
  await ensureShelf();
  return db.transaction('rw', db.library, async () => {
    let changed = 0;
    for (const row of splitTaken(await db.library.toArray()).rows) {
      const entry = entryOf(row.id);
      if (!entry) {
        await db.library.delete(row.id);
        changed += 1;
      } else if (entry.kind !== row.kind) {
        await db.library.put({ ...row, kind: entry.kind, state: entry.kind === 'devotional' ? 'on' : row.state });
        changed += 1;
      }
    }
    return changed;
  });
}

// --- the old readers and their writers, over the rows -------------------------------------------------------------------------------------

/** Puts the books of `owns` as `resources` say: those ticked stay as they are or go On, the rest go Off; nothing else on the shelf is touched. */
async function tick(kind: Kind, owns: readonly string[], resources: readonly string[]): Promise<void> {
  await ensureShelf();
  const now = Date.now();
  await db.transaction('rw', db.library, async () => {
    const have = new Map((await db.library.bulkGet([...owns])).filter((r): r is LibraryRow => r !== undefined).map((r) => [r.id, r]));
    await db.library.bulkDelete(owns.filter((id) => have.has(id) && !resources.includes(id)));
    await db.library.bulkPut(resources.filter((id) => !have.has(id)).map((id): LibraryRow => ({ id, kind, state: 'on', since: now })));
  });
}

const heldIds = async (owns: readonly string[]): Promise<Set<string>> => {
  const wanted = new Set(owns);
  return new Set((await rowsNow()).filter((r) => wanted.has(r.id)).map((r) => r.id));
};

/** The ids of the lexicons on the shelf (in LEXICONS' order): what Settings > Logos ticks. */
export async function lexiconTicks(): Promise<string[]> {
  const held = await heldIds(LEXICONS.map((l) => l.resource));
  return LEXICONS.filter((l) => held.has(l.resource)).map((l) => l.id);
}

export const setLexiconTicks = (ids: readonly string[]): Promise<void> => tick('lexicon', LEXICONS.map((l) => l.resource), lexiconResources(ids));

/** The ids of the grammar books on the shelf (in GRAMMAR_BOOKS' order), then any id the old key holds that no book has (the idea sheet's readMoreFor passes over it, as it did when the key was the only home). */
export async function grammarBookTicks(): Promise<string[]> {
  const held = await heldIds(GRAMMAR_BOOKS.map((b) => b.resource));
  const old = jsonIds((await db.settings.get(BOOKS_KEY))?.value) ?? [];
  return [...GRAMMAR_BOOKS.filter((b) => held.has(b.resource)).map((b) => b.id), ...old.filter((id) => !GRAMMAR_BOOKS.some((b) => b.id === id))];
}

export const setGrammarBookTicks = (ids: readonly string[]): Promise<void> => tick('grammar', GRAMMAR_BOOKS.map((b) => b.resource), bookResources(ids));

/** The ids of the works on the shelf (in WORKS' order): a work is on while any of its volumes is. */
export async function workTicks(): Promise<string[]> {
  const held = await heldIds(workResources(WORKS.map((w) => w.id)));
  return WORKS.filter((w) => w.volumes.some((v) => held.has(v.resource))).map((w) => w.id);
}

export const setWorkTicks = (ids: readonly string[]): Promise<void> => tick('commentary', workResources(WORKS.map((w) => w.id)), workResources(ids));

/** The devotional draw as `devotionalDraw` writes it ('all', 'none', or ids joined by commas): the devotionals on the shelf. */
export async function devotionalDraw(): Promise<string> {
  const held = await heldIds(DEVOTIONALS.map((d) => d.id));
  return tickedText(DEVOTIONALS.filter((d) => held.has(d.id)).map((d) => d.id));
}

/** Keeps the draw: the shelf's devotionals become those the text names, and the old key is written beside them with the shelf told it has taken that text, so the key stays the one a
 *  phone that has not updated reads, and is not taken again over what the rows now say. */
export async function setDevotionalDraw(text: string): Promise<void> {
  await ensureShelf();
  const now = Date.now();
  const ids = text === NONE_TICKED ? [] : tickedDevotionals(text);
  await db.transaction('rw', db.settings, db.library, async () => {
    const have = new Map((await db.library.bulkGet(DEVOTIONALS.map((d) => d.id))).filter((r): r is LibraryRow => r !== undefined).map((r) => [r.id, r]));
    await db.library.bulkDelete([...have.keys()].filter((id) => !ids.includes(id)));
    await db.library.bulkPut(ids.filter((id) => !have.has(id)).map((id): LibraryRow => ({ id, kind: 'devotional', state: 'on', since: now })));
    await db.settings.put({ key: DRAW_KEY, value: text });
    const from = parseFrom((await db.library.get(TAKEN_ID))?.taken);
    await db.library.put({ id: TAKEN_ID, kind: 'taken', state: 'on', since: 0, taken: JSON.stringify({ ...from, [DRAW_KEY]: text }) });
  });
}
