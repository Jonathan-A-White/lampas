// tests/e2e/keep-settings.ts — puts settings in the app's store through raw IndexedDB, as the app wrote them, and reloads so the app reads them (the page must have opened once, so the store exists).
import type { Page } from '@playwright/test';

export async function keepSettings(page: Page, values: Record<string, string>): Promise<void> {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
  await page.reload();
}
