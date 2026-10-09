import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings', rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test('Settings > New words: New words at and Move it are one line of 48 px chips at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const rows = [
    { group: page.getByRole('group', { name: 'New words at', exact: true }), chips: ['Solid grammar', 'Frontier grammar'], pressed: 'Frontier grammar' },
    { group: page.getByRole('group', { name: 'Move it', exact: true }), chips: ['Ask', 'Auto', 'Off'], pressed: 'Ask' },
  ];
  for (const { group, chips, pressed } of rows) {
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    const tops: number[] = [];
    for (const chip of chips) {
      const button = group.getByRole('button', { name: chip, exact: true });
      const b = await button.boundingBox();
      expect(b?.height).toBeGreaterThanOrEqual(47.5);
      expect(b?.width).toBeGreaterThanOrEqual(47.5);
      expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(390);
      tops.push(Math.round(b?.y ?? 0));
      expect(await button.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    }
    expect(new Set(tops).size).toBe(1);
    await expect(group.getByRole('button', { name: pressed, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expectFitsPhone(page);
});

test('after a strong round at Solid grammar with Ask, the end card offers the move to Frontier grammar', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Due: \d+$/ })).toBeVisible();
  // 19 right answers behind him, New words at Solid grammar, Move it Ask (the default); one idea is due as a flashcard
  await put(page, 'settings', [
    { key: 'pickerGrammar', value: 'solid' },
    { key: 'grammarAnswers', value: '1'.repeat(19) },
  ]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'preposition', step: 5, rights: 3, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);

  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('grammar-prompt')).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    const show = page.getByRole('button', { name: 'Show' });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: 'I knew it' }).click();
    } else {
      await page.locator('[data-option]').first().click();
    }
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('score')).toHaveText(/^\d+ of 10$/);

  const offer = page.getByTestId('move-offer');
  await expect(offer).toBeVisible();
  await expect(offer).toContainText('Move new words to frontier grammar?');
  for (const name of ['Yes', 'Not now']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  await expectFitsPhone(page);
  await shot(page, 'move-offer');

  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(page.getByTestId('move-said')).toHaveText('Moved new words to frontier grammar');
});
