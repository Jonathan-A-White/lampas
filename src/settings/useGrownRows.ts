// src/settings/useGrownRows.ts — the Settings screen draws again when a sermon source the index service gave grows its On | Off row (rows.ts growSermonRows, docs/sermons.md 'When online'). The kept list of those sources is
// read when the screen opens (outside the screen's live query: a read of the kept list there would make the query follow the table it lives in), which grows the rows of the sources seen on an earlier day.
import { useEffect, useSyncExternalStore } from 'react';
import { getKnownSermonSources } from '../data/repositories';
import { setKnownSermonSources } from '../sermons/known';
import { grownRowsCount, onRowsGrown } from './rows';

/** A number that changes each time rows are grown: a dependency for whatever reads the rows. */
export function useGrownRows(): number {
  useEffect(() => {
    let alive = true;
    getKnownSermonSources().then(
      (list) => alive && list.length > 0 && setKnownSermonSources(list),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  return useSyncExternalStore((onChange) => onRowsGrown(onChange), grownRowsCount);
}
