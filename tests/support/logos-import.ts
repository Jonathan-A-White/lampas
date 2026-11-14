// tests/support/logos-import.ts — a kept Library import (db.exportRows) for a test that needs Logos sermon collections to be his (mw-qtu3zvz.94): a Logos source is offered, and its row drawn in Settings,
// only when his import holds one of its resources (src/data/owned.ts).
import { db } from '../../src/data/db';
import { CATALOGUE } from '../../src/resources/catalogue';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';

/** Resource IDs of every bundled Logos sermon collection. */
export const EVERY_LOGOS_SERMON: readonly string[] = Object.values(LOGOS_RESOURCES).flat();

/** The Resource ID of every book of the catalogue: an import that holds the whole catalogue, for a test of a screen that is not about what he owns (a pure function takes it as its `owned`; `keepImport(EVERY_BOOK_IDS)` keeps it). */
export const EVERY_BOOK_IDS: readonly string[] = CATALOGUE.map((e) => e.resource);
export const EVERY_BOOK: ReadonlySet<string> = new Set(EVERY_BOOK_IDS);

/** Keeps an import that holds these Resource IDs (every bundled Logos sermon collection by default), replacing any kept before. */
export async function keepImport(resources: readonly string[] = EVERY_LOGOS_SERMON): Promise<void> {
  await db.exportRows.clear();
  await db.exportRows.bulkPut(resources.map((resource) => ({ resource, type: 'text.monograph.sermons', title: resource, series: '', languages: 'en', refs: '', matched: true })));
}

/** Forgets the kept import. */
export const forgetImport = (): Promise<void> => db.exportRows.clear();
