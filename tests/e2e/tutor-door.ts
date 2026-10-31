// tests/e2e/tutor-door.ts — drives the tutor door (src/tutor/door.ts, mw-5r3p30.880) the way a phone does: the Tutor door and Hand settings put in the store, and a two-finger tap.
import type { Page } from '@playwright/test';

/** Puts the Tutor door (and, when given, the Hand) in the app's store through raw IndexedDB, as the app wrote them, and reloads so the app reads them. The page must have opened once (the store exists). */
export async function keepDoor(page: Page, door: 'twoFinger' | 'floating', hand?: 'left' | 'right'): Promise<void> {
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of rows) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [['tutorDoor', door], ...(hand ? [['hand', hand]] : [])] as Array<[string, string]>,
  );
  await page.reload();
}

/** Two fingers on the page at `at`, lifted together: what the browser sends for a two-finger tap. */
export async function twoFingerTap(page: Page, at = { x: 150, y: 450 }): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: at.x, y: at.y, id: 1 },
    { x: at.x + 90, y: at.y + 10, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
