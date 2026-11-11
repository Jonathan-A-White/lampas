// tests/e2e/greek-start.ts — a spec that makes its own browser context does not get the config's storage state, so it starts the phone at 5, All in, itself (docs/testing.md,
// 'The Greek dial's start level'): a new phone is otherwise placed at 0, Just English, which hides the Greek these specs use (mw-3ased2.2).
import type { BrowserContext, Page } from '@playwright/test';
import { broughtUpTo } from '../../src/data/repositories/greekBrings';
import type { GreekLevel } from '../../src/settings/definitions/greekInterest';

export const startAtAllIn = async (context: BrowserContext): Promise<void> => {
  await context.addInitScript(() => window.localStorage.setItem('lampas.greekInterestStart', '5'));
};

/** The settings rows a phone holds once the dials stand at `levels` (a dial left out is not written): each dial's level, and every starting value the steps up to the higher
 * dial bring in (the shared settings follow the higher dial, as moveDial has it). The way up only: a level below another already kept is written as the dial alone. */
export const rowsAtLevels = (levels: { greek?: GreekLevel; hebrew?: GreekLevel }): { key: string; value: string }[] => {
  const dials: Record<string, string> = {};
  if (levels.greek !== undefined) dials.greekInterest = String(levels.greek);
  if (levels.hebrew !== undefined) dials.hebrewInterest = String(levels.hebrew);
  const brought = broughtUpTo(Math.max(levels.greek ?? 0, levels.hebrew ?? 0) as GreekLevel);
  return Object.entries({ ...brought, ...dials }).map(([key, value]) => ({ key, value }));
};

/** Puts the phone at the Greek and/or Hebrew level in the app's store through raw IndexedDB, with everything the dial brings in on the way up (rowsAtLevels): the one way an
 * e2e reaches a level, because a bare level skips what tapping its step also sets (weave, view) and the screen it draws is not the one he sees (mw-fnvjof.17.74).
 * Open the app first (the store exists then); reload after. `extra` are other settings written in the same transaction. */
export const putAtLevels = async (page: Page, levels: { greek?: GreekLevel; hebrew?: GreekLevel }, extra: Record<string, string> = {}): Promise<void> => {
  const rows = [...rowsAtLevels(levels), ...Object.entries(extra).map(([key, value]) => ({ key, value }))];
  await page.evaluate(
    (put) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const row of put) tx.objectStore('settings').put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
};
