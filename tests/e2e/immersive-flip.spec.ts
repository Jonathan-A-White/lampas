import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { openUnlocked } from './unlocked';

// Flipping to the next or previous chapter with the Immersive reader On keeps the bars as he had them (mw-5r3p30.318): away stays away on the new
// chapter (a two-finger tap still shows them), shown stays shown; with the setting Off the flip shows them as before. The new chapter is a new
// Reader, so the "away" has to be carried across. A phone-width layout claim: it runs under --project=shots (390x844).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string>) {
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
}

async function openEphesians2(page: Page, immersive: 'on' | 'off') {
  await openUnlocked(page);
  await honestMic(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveReader: immersive, immersiveHint: 'off' });
  await page.goto('/#/?b=eph&c=2');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ephesians 2', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const header = (page: Page) => page.locator('header').first();
const chips = (page: Page) => page.getByTestId('reader-chips');
const talkBar = (page: Page) => page.locator('[data-talk-bar]');
const askButton = (page: Page) => page.locator('[data-ask-tutor]');
const all = (page: Page) => [header(page), chips(page), talkBar(page), askButton(page)];

const scrollText = (page: Page, by: number) =>
  page.evaluate((px) => {
    (document.querySelector('[data-reader]') as HTMLElement).scrollTop += px;
  }, by);
const scrollToEnd = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector('[data-reader]') as HTMLElement;
    box.scrollTop = box.scrollHeight;
  });

async function expectAll(page: Page, state: 'visible' | 'hidden') {
  for (const el of all(page)) await (state === 'visible' ? expect(el).toBeVisible() : expect(el).toBeHidden());
}

/** Two fingers on the text at once, lifted together: a two-finger tap. */
async function twoFingerTap(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: 150, y: 450, id: 1 },
    { x: 240, y: 460, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** Taps the foot button 'name' and waits until the new chapter's Reader is up (the address names it; the new Reader starts from the top). */
async function flipTo(page: Page, name: string, chapter: number) {
  await scrollToEnd(page);
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`c=${chapter}`));
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop)).toBe(0);
}

for (const [button, chapter] of [
  ['Ephesians 3 ›', 3],
  ['‹ Ephesians 1', 1],
] as const) {
  test(`with the bars away, flipping with '${button}' opens the new chapter with them still away`, async ({ page }) => {
    await openEphesians2(page, 'on');
    await scrollText(page, 400);
    await expectAll(page, 'hidden');

    await flipTo(page, button, chapter);
    // the place line is drawn only with the bars away, and names the new chapter
    await expect(page.locator('[data-place-line]')).toHaveText(new RegExp(`^Ephesians ${chapter} · `));
    await expectAll(page, 'hidden');
    // and they stay away (nothing brings them back by itself)
    await page.waitForTimeout(700);
    await expectAll(page, 'hidden');

    await twoFingerTap(page);
    await expectAll(page, 'visible');
    await expect(page.getByRole('heading', { name: `Ephesians ${chapter}`, level: 1 })).toBeVisible();
  });
}

test('with the bars shown, flipping to the next chapter shows them on the new chapter', async ({ page }) => {
  await openEphesians2(page, 'on');
  await expectAll(page, 'visible');
  await flipTo(page, 'Ephesians 3 ›', 3);
  await expect(page.getByRole('heading', { name: 'Ephesians 3', level: 1 })).toBeVisible();
  await expectAll(page, 'visible');
  await page.waitForTimeout(700);
  await expectAll(page, 'visible');
});

test('with Immersive reader Off, flipping to the next chapter shows the bars', async ({ page }) => {
  await openEphesians2(page, 'off');
  await expectAll(page, 'visible');
  await flipTo(page, 'Ephesians 3 ›', 3);
  await expect(page.getByRole('heading', { name: 'Ephesians 3', level: 1 })).toBeVisible();
  await expectAll(page, 'visible');
});
