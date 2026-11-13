// tests/e2e/keep-import.ts — keeps a Library import (the exportRows store) through raw IndexedDB, as tests/support/logos-import.ts keepImport does in jsdom, and reloads so the app reads it (the page must have opened once,
// so the store exists). A Logos sermon archive is offered only when his import holds one of its resources (src/library/owned.ts, mw-qtu3zvz.94); a spec that seeds or opens an archive keeps one first.
import type { Page } from '@playwright/test';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';

/** Resource IDs of every bundled Logos sermon collection. */
export const EVERY_LOGOS_SERMON: readonly string[] = Object.values(LOGOS_RESOURCES).flat();

/** Clears the kept import, puts a row for each of these Resource IDs (every bundled Logos sermon collection by default; none for `[]`) and reloads. */
export async function keepImport(page: Page, resources: readonly string[] = EVERY_LOGOS_SERMON): Promise<void> {
  await page.evaluate(
    (ids) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('exportRows', 'readwrite');
          const store = tx.objectStore('exportRows');
          store.clear();
          for (const resource of ids) store.put({ resource, type: 'text.monograph.sermons', title: resource, series: '', languages: 'en', refs: '', matched: true });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    resources,
  );
  await page.reload();
}
