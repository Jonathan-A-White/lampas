// tests/e2e/his-library.ts — gives a phone a Library import that holds every book of the catalogue and every bundled Logos sermon collection, as the Governor's own phone does: Lampas offers a Logos book only
// when his import holds it (src/data/owned.ts isOffered, mw-qtu3zvz.94 and .126), so a phone with no import draws no 'All on', no lexicon rows and no Logos sermon row. The rows are written into the app's own
// store through raw IndexedDB the moment the app first creates it, as tests/e2e/his-words.ts does. openUnlocked / openUnlicensed do it unless the spec says `{ empty: true }` or `{ import: false }`; a spec that is
// about a phone with no import, or with a smaller one, says `{ import: false }` or calls keepImport (tests/e2e/keep-import.ts), which replaces what was kept.
import type { Page } from '@playwright/test';
import { CATALOGUE } from '../../src/resources/catalogue';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';

/** The Resource ID of every book of the catalogue and of every bundled Logos sermon collection. */
export const HIS_LIBRARY: readonly string[] = [...new Set([...CATALOGUE.map((e) => e.resource), ...Object.values(LOGOS_RESOURCES).flat()])];

export async function giveHisLibrary(page: Page): Promise<void> {
  const rows = HIS_LIBRARY.map((resource) => ({ resource, type: 'text.monograph.sermons', title: resource, series: '', languages: 'en', refs: '', matched: true }));
  await page.addInitScript((rows) => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (this: IDBFactory, name: string, version?: number) {
      const request = version === undefined ? open.call(this, name) : open.call(this, name, version);
      if (name !== 'lampas') return request;
      let created = false;
      request.addEventListener('upgradeneeded', (event) => {
        if ((event as IDBVersionChangeEvent).oldVersion === 0) created = true;
      });
      // our listener is first, so this transaction is queued before any the app makes
      request.addEventListener('success', () => {
        if (!created) return;
        const tx = request.result.transaction(['exportRows'], 'readwrite');
        for (const row of rows) tx.objectStore('exportRows').put(row);
      });
      return request;
    } as typeof IDBFactory.prototype.open;
  }, rows);
}
