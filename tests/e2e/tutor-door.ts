// tests/e2e/tutor-door.ts — drives the tutor door (src/tutor/door.ts, mw-5r3p30.880): the Hand setting put in the store. The Tutor door setting is gone (mw-5r3p30.882): the floating ? is the one door.
import type { Page } from '@playwright/test';

/** Puts the Hand in the app's store through raw IndexedDB, as the app wrote it, and reloads so the app reads it. The page must have opened once (the store exists). The app also keeps the Hand in
 * localStorage 'lampas.hand' (src/settings/hand.ts setHand) for the next start's first render, which draws the floating ? at once: without it the ? is drawn on the right first and a box read at that moment is the right's. */
export async function keepHand(page: Page, hand: 'left' | 'right'): Promise<void> {
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        window.localStorage.setItem('lampas.hand', value);
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'hand', value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    hand,
  );
  await page.reload();
}
