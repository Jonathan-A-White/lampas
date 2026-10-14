import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Drill it on the idea sheet (mw-i7xe0n.3): the level slider, the question and its answers all stand inside the screen, upright (390x844) and sideways (844x390).
const VIEWPORTS = [
  { name: 'upright', size: { width: 390, height: 844 } },
  { name: 'sideways', size: { width: 844, height: 390 } },
];

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'settings' | 'grammarLevels', rows: object[]) {
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

/** Every box is inside the screen: nothing is cut off at the right or the bottom, and nothing starts above or left of it. */
async function expectInside(size: { width: number; height: number }, locators: ReturnType<Page['locator']>[]) {
  for (const locator of locators) {
    const box = await locator.boundingBox();
    expect(box, String(locator)).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-0.5);
    expect(box!.y).toBeGreaterThanOrEqual(-0.5);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 0.5);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 0.5);
  }
}

for (const { name, size } of VIEWPORTS) {
  test(`Drill it on The noun fits the screen ${name}: the slider, the question and its answers`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
    await put(page, 'grammarLevels', [{ id: 'accents', level: 'solid', since: Date.now(), how: 'placement' }]);
    await page.goto('/#/goal');
    // the app reads what was put in its store behind its back only when it starts
    await page.reload();
    await page.getByTestId('ideas-bar').click();
    await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();

    const idea = page.getByRole('dialog', { name: 'Idea' });
    await expect(idea.getByRole('heading', { name: 'The noun' })).toBeVisible();
    await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
    const slider = idea.getByRole('slider', { name: 'Your level' });
    await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
    expect((await slider.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await expectInside(size, [slider, idea.getByTestId('level-stops'), idea.getByRole('button', { name: 'Drill it', exact: true })]);

    // the thumb: sliding to I know it starts Drill it
    await slider.focus();
    await page.keyboard.press('End');
    const drill = page.getByRole('dialog', { name: 'Drill it' });
    await expect(drill.getByTestId('drill-step')).toHaveText(/^Step 1 of \d+$/);
    await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
    const options = drill.locator('[data-option]');
    expect(await options.count()).toBeGreaterThanOrEqual(2);
    await expectInside(size, [
      drill.getByRole('heading', { name: 'The noun' }),
      drill.getByTestId('grammar-prompt'),
      ...(await options.all()),
      drill.getByRole('button', { name: 'Hint', exact: true }),
      drill.getByRole('button', { name: 'Stop', exact: true }),
    ]);
    const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(fits.w).toBeLessThanOrEqual(fits.c);

    // a Hint takes answers away; an answer shows Next, which also stands inside the screen
    await drill.getByRole('button', { name: 'Hint', exact: true }).click();
    const taken = drill.locator('[data-option][data-taken]');
    expect(await taken.count()).toBeGreaterThan(0);
    for (const option of await taken.all()) {
      await expect(option).toHaveCSS('text-decoration-line', 'line-through');
      await expect(option).toHaveCSS('opacity', '0.4');
    }
    await expect(drill.getByTestId('hint-line')).toHaveText(`Hint: ${await taken.count()} wrong ${(await taken.count()) === 1 ? 'answer' : 'answers'} taken away`);
    await expect(drill.getByRole('button', { name: 'Hint used', exact: true })).toBeDisabled();
    await drill.locator('[data-option]:not(:disabled)').first().click();
    const nextButton = drill.getByTestId('drill-next');
    await expectInside(size, [nextButton, drill.getByTestId('feedback')]);
    if (name === 'upright') await shot(page, 'drill-it');

    // Stop leaves the idea where it was
    await drill.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(drill).toHaveCount(0);
    await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
  });
}
