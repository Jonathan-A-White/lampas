// tests/unit/keep-import.test.ts — the import keepImport keeps (tests/support/logos-import.ts) is one the App's startup writes leave alone (mw-qtu3zvz.193): its note carries the catalogue's own
// version, so afterCatalogueUpdate (which App starts at its first open, nobody waiting) does not match the list again and write rows a later scenario, after its reset(), would read.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { afterCatalogueUpdate, importNote } from '../../src/data/repositories';
import { CATALOGUE_VERSION, entriesOf } from '../../src/resources/catalogue';
import { keepImport } from '../support/logos-import';

describe('a kept import in a test', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
  });

  it('carries the version of the catalogue, so the first open after an update has nothing to match again', async () => {
    await keepImport(entriesOf('sermons').slice(0, 3).map((e) => e.resource));
    expect((await importNote())?.version).toBe(CATALOGUE_VERSION);
  });

  it('is left as it is by afterCatalogueUpdate: no row of the shelf and no note is written', async () => {
    await keepImport(entriesOf('sermons').slice(0, 3).map((e) => e.resource));
    const noteBefore = await db.meta.get('libraryImport');
    await afterCatalogueUpdate();
    expect(await db.meta.get('libraryImport')).toEqual(noteBefore);
    expect(await db.library.count()).toBe(0);
  });
});
