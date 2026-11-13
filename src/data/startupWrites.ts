// src/data/startupWrites.ts — the writes App starts by itself at its first open, none waited for by the screen: the Logos list matched again after an update, the
// stale Bible marks dropped, and the upgrade paths of a phone that already has data. Each does nothing without his own rows, and a closed database drops it quietly (closedDatabase.ts).
import { logUnlessClosed } from './closedDatabase';
import { afterCatalogueUpdate, carrySermonShelf, dropStaleBibleRows, seedLevelsIfFirstOpen, seedScheduleIfFirstOpen } from './repositories';

/**
 * The first open after an update that changed the Logos catalogue re-files his shelf and matches the Logos list he imported again; the Library's old 'Chosen' mark of a Bible
 * that no part is set to is dropped (mw-5r3p30.1135); a Pinned sermon book becomes On and a Logos sermon list follows its books (mw-qtu3zvz.92); a new install starts empty (mw-5r3p30.385), but a store from before v10 that has words and no schedule gets them scheduled,
 * and a store from before v11 has the terms he marked I know this make their ideas solid. Resolves when all are done; never rejects.
 */
export async function startBackgroundWrites(): Promise<void> {
  await Promise.all([
    // then what the Library's old Sermons page held is carried to the one list of sermon sources (mw-qtu3zvz.92): a Pinned sermon book is On, a list follows its books
    afterCatalogueUpdate()
      .catch(logUnlessClosed('matching his Logos list again after the update failed'))
      .then(() => carrySermonShelf())
      .then(() => undefined, logUnlessClosed('carrying his sermon books to the list of sermon sources failed')),
    dropStaleBibleRows().then(() => undefined, logUnlessClosed('dropping a stale Bible mark failed')),
    seedScheduleIfFirstOpen()
      .then(() => seedLevelsIfFirstOpen())
      .then(() => undefined, logUnlessClosed('scheduling the words and the grammar terms he kept failed')),
  ]);
}
