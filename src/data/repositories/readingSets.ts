// src/data/repositories/readingSets.ts — the reading sets he keeps (mw-9ji6ek0.23): which reading he chose in each variant unit, in the Dexie `readingSets` table. The ONLY file
// that reads or writes that table. The set in force is db.settings 'readingSet' (Byzantine until he chooses). The built-in sets (Byzantine, NA, ECM) have no row and never change;
// Mine and the sets he names do. The rules that say what a set reads are pure and live in src/reader/readingSets.ts.
import {
  BASE,
  BUILT_IN_SETS,
  builtInOf,
  BYZANTINE,
  DEFAULT_SET_ID,
  isBuiltIn,
  MINE_ID,
  NA_ID,
  ECM_ID,
  type ReadingSet,
} from '../../reader/readingSets';
import { db, type ReadingSetRow } from '../db';

export type { ReadingSetRow };

const ACTIVE_KEY = 'readingSet';
/** What the set he starts by choosing is called. */
export const MINE_NAME = 'Mine';

const byName = (a: ReadingSetRow, b: ReadingSetRow): number => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/** Resolves an id to a set: a built-in, or a row of his; undefined for one that is not there. */
async function find(id: string): Promise<ReadingSet | undefined> {
  return builtInOf(id) ?? (await db.readingSets.get(id));
}

/** The sets he can read in: the three built-in ones first, then his own by name. */
export async function listReadingSets(): Promise<ReadingSet[]> {
  return [...BUILT_IN_SETS, ...(await db.readingSets.toArray()).sort(byName)];
}

/** The set in force: Byzantine when he has not chosen one, or when the one he chose has been deleted. */
export async function getActiveSet(): Promise<ReadingSet> {
  const row = await db.settings.get(ACTIVE_KEY);
  return (typeof row?.value === 'string' ? await find(row.value) : undefined) ?? BYZANTINE;
}

/** Puts `id` in force; false, changing nothing, for a set that is not there. */
export async function setActive(id: string): Promise<boolean> {
  return db.transaction('rw', db.readingSets, db.settings, async () => {
    if (!(await find(id))) return false;
    await db.settings.put({ key: ACTIVE_KEY, value: id });
    return true;
  });
}

/** Takes `index` (an index into the unit's alternatives, BASE for the text's own) as the reading of the unit `key` in the set in force, and returns the set it wrote to.
 * In a set of his own it writes there. Under a built-in set it starts Mine from that set (NA and ECM are read where Mine has no choice; Byzantine is the text's own), writes
 * there and puts Mine in force; the built-in set is never changed (PROVISIONAL, the plan's Q5: a Mine he had before is started over). `sharing` are the keys of the units that
 * share a word with this one (src/reader/readingSets.ts sharingKeys): a choice on any of them is cleared, as the reading chosen covers their words. */
export async function chooseReading(key: string, index: number, sharing: readonly string[] = []): Promise<ReadingSetRow> {
  return db.transaction('rw', db.readingSets, db.settings, async () => {
    const inForce = await getActiveSet();
    const mine: ReadingSetRow = isBuiltIn(inForce.id)
      ? { id: MINE_ID, name: MINE_NAME, choices: {}, ...(inForce.id === NA_ID || inForce.id === ECM_ID ? { from: inForce.id } : {}) }
      : { ...inForce, choices: { ...inForce.choices } };
    const forget = (k: string): void => {
      if (mine.from) mine.choices[k] = BASE;
      else delete mine.choices[k];
    };
    for (const other of sharing) if (other !== key) forget(other);
    if (index === BASE) forget(key);
    else mine.choices[key] = index;
    await db.readingSets.put(mine);
    await db.settings.put({ key: ACTIVE_KEY, value: mine.id });
    return mine;
  });
}

/** Saves a copy of the set in force under `name` and puts the copy in force; undefined, changing nothing, for a blank name. Saved at the same moment, two sets still get two ids. */
export async function saveSetAs(name: string, now: number = Date.now()): Promise<ReadingSetRow | undefined> {
  const named = name.trim();
  if (named === '') return undefined;
  return db.transaction('rw', db.readingSets, db.settings, async () => {
    const inForce = await getActiveSet();
    let n = now;
    while (await db.readingSets.get(`set-${n.toString(36)}`)) n += 1;
    const copy: ReadingSetRow = {
      id: `set-${n.toString(36)}`,
      name: named,
      choices: { ...inForce.choices },
      ...(inForce.id === NA_ID || inForce.id === ECM_ID ? { from: inForce.id } : inForce.from ? { from: inForce.from } : {}),
    };
    await db.readingSets.put(copy);
    await db.settings.put({ key: ACTIVE_KEY, value: copy.id });
    return copy;
  });
}

/** Renames a set of his; the set as it is now, or undefined, changing nothing, for a built-in set, a blank name or a set that is not there. */
export async function renameSet(id: string, name: string): Promise<ReadingSetRow | undefined> {
  const next = name.trim();
  if (isBuiltIn(id) || next === '') return undefined;
  return db.transaction('rw', db.readingSets, async () => {
    const row = await db.readingSets.get(id);
    if (!row) return undefined;
    const renamed = { ...row, name: next };
    await db.readingSets.put(renamed);
    return renamed;
  });
}

/** Deletes a set of his, and puts Byzantine in force when it was the one; false, changing nothing, for a built-in set (never deleted) or a set that is not there. */
export async function deleteSet(id: string): Promise<boolean> {
  if (isBuiltIn(id)) return false;
  return db.transaction('rw', db.readingSets, db.settings, async () => {
    if (!(await db.readingSets.get(id))) return false;
    await db.readingSets.delete(id);
    const row = await db.settings.get(ACTIVE_KEY);
    if (row?.value === id) await db.settings.put({ key: ACTIVE_KEY, value: DEFAULT_SET_ID });
    return true;
  });
}
