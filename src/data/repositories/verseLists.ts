// src/data/repositories/verseLists.ts — his verse lists (mw-9q8wp1.1): named lists of Bible references in the order he saved them, in the Dexie `verseLists` table. The ONLY file that
// reads or writes that table. A reference is a canonical string (src/lists/canonical.ts: 'Rom.8.28', 'Ps.62.1-2'); this file keeps them as given and never looks inside.
import { db, type VerseListRow } from '../db';

export type { VerseListRow };

/** What a list is called when it is made with no name. */
export const UNTITLED_LIST = 'Untitled list';

/** The lists, the newest first. */
export async function listVerseLists(): Promise<VerseListRow[]> {
  const all = await db.verseLists.toArray();
  return all.sort((a, b) => b.created - a.created || b.id - a.id);
}

export const verseListCount = (): Promise<number> => db.verseLists.count();

export const getVerseList = (id: number): Promise<VerseListRow | undefined> => db.verseLists.get(id);

/** Makes a list. A blank name becomes 'Untitled list'. */
export async function createVerseList(name: string, refs: readonly string[], now: number = Date.now()): Promise<VerseListRow> {
  const row: Omit<VerseListRow, 'id'> = { name: name.trim() || UNTITLED_LIST, refs: [...refs], created: now, updated: now };
  const id = await db.verseLists.add(row as VerseListRow);
  return { ...row, id };
}

/** Renames a list, keeping its references. Returns the list as it is now, or undefined, changing nothing, for a blank name or a list that is not there. */
export async function renameVerseList(id: number, name: string, now: number = Date.now()): Promise<VerseListRow | undefined> {
  const next = name.trim();
  if (next === '') return undefined;
  return db.transaction('rw', db.verseLists, async () => {
    const row = await db.verseLists.get(id);
    if (!row) return undefined;
    const renamed = { ...row, name: next, updated: now };
    await db.verseLists.put(renamed);
    return renamed;
  });
}

/** Replaces a list's references, in the order given. Returns the list as it is now, or undefined, changing nothing, for a list that is not there. */
export async function setVerseListRefs(id: number, refs: readonly string[], now: number = Date.now()): Promise<VerseListRow | undefined> {
  return db.transaction('rw', db.verseLists, async () => {
    const row = await db.verseLists.get(id);
    if (!row) return undefined;
    const next = { ...row, refs: [...refs], updated: now };
    await db.verseLists.put(next);
    return next;
  });
}

/** Adds to a list the references it does not hold yet, after the ones it holds, in the order given. Returns the list as it is now and how many were added, or undefined, changing
 *  nothing, for a list that is not there; when nothing is new the list is left as it was (`updated` too). */
export async function appendToVerseList(id: number, refs: readonly string[], now: number = Date.now()): Promise<{ row: VerseListRow; added: number } | undefined> {
  return db.transaction('rw', db.verseLists, async () => {
    const row = await db.verseLists.get(id);
    if (!row) return undefined;
    const held = new Set(row.refs);
    const fresh = refs.filter((ref) => !held.has(ref) && held.add(ref));
    if (fresh.length === 0) return { row, added: 0 };
    const next = { ...row, refs: [...row.refs, ...fresh], updated: now };
    await db.verseLists.put(next);
    return { row: next, added: fresh.length };
  });
}

/** Where `sendVerseListRef` puts a reference: a list he has (by id) or a new list (by name). */
export type SendTarget = { id: number } | { newName: string };

/** Puts one reference of list `fromId` at the end of another list, or of a new list made for it, and for a move takes it out of `fromId`. Returns the target as it is now and what was done:
 *  'sent', or 'already' when the target held it, which changes nothing at all (a move keeps it where it was too). Undefined, changing nothing, for a list that is not there. */
export async function sendVerseListRef(
  fromId: number,
  ref: string,
  to: SendTarget,
  move: boolean,
  now: number = Date.now(),
): Promise<{ status: 'sent' | 'already'; target: VerseListRow } | undefined> {
  return db.transaction('rw', db.verseLists, async () => {
    const from = await db.verseLists.get(fromId);
    if (!from) return undefined;
    let target: VerseListRow;
    if ('id' in to) {
      const held = await db.verseLists.get(to.id);
      if (!held || held.id === fromId) return undefined;
      if (held.refs.includes(ref)) return { status: 'already' as const, target: held };
      target = { ...held, refs: [...held.refs, ref], updated: now };
      await db.verseLists.put(target);
    } else {
      const row: Omit<VerseListRow, 'id'> = { name: to.newName.trim() || UNTITLED_LIST, refs: [ref], created: now, updated: now };
      target = { ...row, id: await db.verseLists.add(row as VerseListRow) };
    }
    if (move) await db.verseLists.put({ ...from, refs: from.refs.filter((r) => r !== ref), updated: now });
    return { status: 'sent' as const, target };
  });
}

/** Removes a list and returns the row it removed, which `restoreVerseList` puts back (Undo); undefined for a list that is not there. */
export async function removeVerseList(id: number): Promise<VerseListRow | undefined> {
  return db.transaction('rw', db.verseLists, async () => {
    const row = await db.verseLists.get(id);
    if (!row) return undefined;
    await db.verseLists.delete(id);
    return row;
  });
}

/** Puts back a list `removeVerseList` removed, with its id, its references and its dates as they were. */
export async function restoreVerseList(row: VerseListRow): Promise<void> {
  await db.verseLists.put(row);
}
