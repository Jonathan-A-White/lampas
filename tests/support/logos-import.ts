// tests/support/logos-import.ts — a kept Library import (db.exportRows) for a test that needs Logos sermon collections to be his (mw-qtu3zvz.94): a Logos source is offered, and its row drawn in Settings,
// only when his import holds one of its resources (src/library/owned.ts).
import { db } from '../../src/data/db';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';

/** Resource IDs of every bundled Logos sermon collection. */
export const EVERY_LOGOS_SERMON: readonly string[] = Object.values(LOGOS_RESOURCES).flat();

/** Keeps an import that holds these Resource IDs (every bundled Logos sermon collection by default), replacing any kept before. */
export async function keepImport(resources: readonly string[] = EVERY_LOGOS_SERMON): Promise<void> {
  await db.exportRows.clear();
  await db.exportRows.bulkPut(resources.map((resource) => ({ resource, type: 'text.monograph.sermons', title: resource, series: '', languages: 'en', refs: '', matched: true })));
}

/** Forgets the kept import. */
export const forgetImport = (): Promise<void> => db.exportRows.clear();
