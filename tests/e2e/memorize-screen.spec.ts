// tests/e2e/memorize-screen.spec.ts — the Memorize home (mw-fu7dqf.11, #/memorize) at 390x844: two lists with memorized verses at different steps, the Library's Memorize row, the sections and marks
// in view, a row's Start opening its session, and nothing running off the phone's edge.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const DAY = 86_400_000;

/** Two lists and four memorized verses: Rom.8.28 (step 2, due, last 9 of 10) and 2Thess.3.3 (step 0, due) in Refuge, John.14.27 (step 3, due in 14 days) in Peace, John.3.16 (step 1) picked alone. */
async function seed(page: Page): Promise<void> {
  await page.evaluate(
    (day) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['verseLists', 'reviews', 'recalls'], 'readwrite');
          const now = Date.now();
          tx.objectStore('verseLists').add({ name: 'Refuge', refs: ['Rom.8.28', '2Thess.3.3'], created: 1000, updated: 1000 });
          tx.objectStore('verseLists').add({ name: 'Peace', refs: ['John.14.27'], created: 900, updated: 900 });
          const row = (ref: string, step: number, due: number) => tx.objectStore('reviews').put({ kind: 'verse', id: `en:${ref}`, step, due, lastWhen: now - 3 * day, lapses: 0, rights: 0 });
          row('Rom.8.28', 2, now - 2000);
          row('2Thess.3.3', 0, now - 1000);
          row('John.14.27', 3, now + 14 * day);
          row('John.3.16', 1, now + 2 * day);
          tx.objectStore('recalls').add({
            ref: 'Rom.8.28',
            lang: 'en',
            when: now - 3 * day,
            rung: 1,
            score: 0.9,
            missed: ['all'],
            asked: Array.from({ length: 10 }, (_, i) => ({ token: `w${i}`, lang: 'en' })),
            gap: 0,
            how: 'said',
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    DAY,
  );
}

test('the Library row opens Memorize: the verses due with Start, then every verse by list with its mark', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seed(page);

  await page.goto('/#/library');
  const row = page.getByTestId('memorize-row').getByRole('button', { name: /^Memorize/ });
  await expect(row).toContainText('2 due');
  await row.click();

  await expect(page.getByRole('heading', { name: 'Memorize', level: 1 })).toBeVisible();
  const due = page.getByRole('region', { name: 'Due today' });
  await expect(due.getByRole('listitem')).toHaveCount(2);
  await expect(due.getByRole('button', { name: 'Start all' })).toBeVisible();
  const verses = page.getByRole('region', { name: 'Your verses' });
  await expect(verses.getByRole('heading', { level: 3 })).toHaveText(['Refuge', 'Peace', 'Picked alone']);
  await expect(verses.getByRole('img', { name: 'English · Step 3 of 7 · last 9 of 10 · due today' })).toBeVisible();
  await expect(verses.getByRole('img', { name: 'English · Step 1 of 7 · due today' })).toBeVisible();
  await expect(verses.getByRole('img', { name: /^English · Step 4 of 7 · due / })).toBeVisible();
  await expect(verses.getByRole('img', { name: /^English · Step 2 of 7 · due / })).toBeVisible();

  // nothing runs off the phone's right edge
  const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length);
  expect(wide).toBe(0);
  await shot(page, 'memorize-screen');

  await due.getByRole('button', { name: 'Start Romans 8:28 in English' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8:28', level: 1 })).toBeVisible();
  await expect(page.getByTestId('memorize-verse')).toBeVisible();
});

test('Stop memorizing takes a verse off the screen', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seed(page);
  await page.goto('/#/memorize');
  await page.getByRole('button', { name: 'Stop memorizing John 3:16' }).click();
  await expect(page.getByRole('region', { name: 'Picked alone' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Due today' }).getByRole('listitem')).toHaveCount(2);
});
