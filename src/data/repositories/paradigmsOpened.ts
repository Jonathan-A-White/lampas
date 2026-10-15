// src/data/repositories/paradigmsOpened.ts — the paradigm tables he has opened (mw-svw421.5, docs/paradigms.md 'Where a table is linked'): a JSON list of
// table ids in the settings store under 'paradigmsOpened', oldest first, written when ParadigmsScreen shows a table. Review asks the ending of a form only once its table is
// in the list (data/grammar/questions.ts buildEnding). No table and no Dexie version; outside the settings registry, so only opening a table writes it.
import { db } from '../db';
import { paradigmById } from '../paradigms';

const KEY = 'paradigmsOpened';

const read = async (): Promise<string[]> => {
  const row = await db.settings.get(KEY);
  if (typeof row?.value !== 'string') return [];
  try {
    const kept: unknown = JSON.parse(row.value);
    return Array.isArray(kept) ? kept.filter((id): id is string => typeof id === 'string' && paradigmById(id) !== undefined) : [];
  } catch {
    return [];
  }
};

/** The ids of the tables he has opened, oldest first; a table that is no longer in the list is left out. */
export const listOpenedParadigms = (): Promise<string[]> => read();

/** Keeps that he opened this table (once); an id that is not a table is ignored. */
export function markParadigmOpened(id: string): Promise<void> {
  if (!paradigmById(id)) return Promise.resolve();
  return db.transaction('rw', db.settings, async () => {
    const opened = await read();
    if (!opened.includes(id)) await db.settings.put({ key: KEY, value: JSON.stringify([...opened, id]) });
  });
}
