// The Reader's Menu and the Tools screen (mw-5r3p30.754, mw-5r3p30.768): a three-line Menu stands where the gear was, 48 px, labelled Menu; it opens a small menu of Tools and Settings, each an icon
// beside its word and the same size; a tap outside or the phone's Back closes it. Tools lists the library, Verse lists, Memorize, Paradigms, Words and Review; each opens its screen and Back returns to Tools.
import { expect, test, type Page } from '@playwright/test';
import { menuButton, menuRow, openMenu, openSettings, openTools, settingsHeading, toolsHeading } from './openSettings';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { turnLogosOn } from './settings-group';

const WIDTHS = [{ width: 390, height: 844 }, { width: 360, height: 740 }];

async function openReader(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** Nothing of the page is wider than the window, and the box lies whole inside it. */
async function fits(page: Page, box: { x: number; y: number; width: number; height: number }): Promise<void> {
  const { scrollWidth, clientWidth, width, height } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, width: innerWidth, height: innerHeight }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 0.5);
}

for (const size of WIDTHS) {
  test.describe(`at ${size.width} x ${size.height}`, () => {
    test.use({ viewport: size });

    test('the header holds the title, the language switch and a 48 px Menu, and the Menu opens Tools and Settings, each an icon beside its word', async ({ page }) => {
      await openReader(page);
      const header = page.locator('header').first();
      const button = menuButton(header);
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await fits(page, box);
      // the old gear is gone: Settings is a row of the Menu now
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
      const head = (await header.boundingBox())!;
      expect(head.height).toBeLessThanOrEqual(120);
      const title = (await header.getByRole('heading', { level: 1 }).boundingBox())!;
      expect(title.width).toBeGreaterThan(0);

      await openMenu(page);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      const menu = page.getByRole('menu', { name: 'Menu' });
      await fits(page, (await menu.boundingBox())!);
      const tools = (await menuRow(page, 'Tools').boundingBox())!;
      const settings = (await menuRow(page, 'Settings').boundingBox())!;
      expect(tools.height).toBeGreaterThanOrEqual(44);
      expect(tools.height).toBeCloseTo(settings.height, 0);
      expect(tools.width).toBeCloseTo(settings.width, 0);
      // each row: an icon (an svg) beside its word, the icons the same size
      const icons = await page.getByRole('menuitem').evaluateAll((rows) => rows.map((row) => { const r = row.querySelector('svg')!.getBoundingClientRect(); return [r.width, r.height, row.textContent]; }));
      expect(icons).toEqual([[24, 24, 'Tools'], [24, 24, 'Settings']]);
      // the Menu sits under the button, inside the window, over the text
      expect((await menu.boundingBox())!.y).toBeGreaterThanOrEqual(box.y + box.height - 0.5);
      await shot(page, `menu-${size.width}`);
    });

    test('a tap outside, Escape and the phone Back close the Menu; Settings in it opens Settings and Back returns to the Reader', async ({ page }) => {
      await openReader(page);
      const menu = page.getByRole('menu', { name: 'Menu' });
      await openMenu(page);
      await page.mouse.click(size.width / 2, size.height - 40);
      await expect(menu).toHaveCount(0);
      await openMenu(page);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
      await openMenu(page);
      await page.goBack();
      await expect(menu).toHaveCount(0);
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      expect(new URL(page.url()).hash).not.toMatch(/settings|tools/);

      await openSettings(page);
      await expect(settingsHeading(page)).toBeVisible();
      expect(new URL(page.url()).hash).toBe('#/settings');
      await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await expect(menu).toHaveCount(0);
    });

    test('Tools lists its six doors; each opens its screen and Back returns to Tools', async ({ page }) => {
      await openReader(page);
      await turnLogosOn(page);
      await page.goto('/#/');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await openTools(page);
      expect(new URL(page.url()).hash).toBe('#/tools');
      const list = page.getByRole('list', { name: 'Tools' });
      const doors = list.getByRole('button');
      await expect(doors).toHaveCount(6);
      expect(await list.locator('[data-tool]').evaluateAll((els) => els.map((el) => el.querySelector('[data-tool-name]')?.textContent))).toEqual(['Your Logos library', 'Verse lists', 'Memorize', 'Paradigms', 'Words', 'Review']);
      for (const door of await doors.all()) {
        const box = (await door.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        await fits(page, box);
      }
      await shot(page, `tools-${size.width}`);

      const screens: [string, string, string][] = [
        ['Your Logos library', 'Your Logos library', '‹ Tools'],
        ['Verse lists', 'Verse lists', '‹ Tools'],
        ['Memorize', 'Memorize', '‹ Back'],
        ['Paradigms', 'Paradigms', '‹ Tools'],
        ['Words', 'Words', '‹ Tools'],
        ['Review', 'Review', '‹ Tools'],
      ];
      for (const [door, heading, back] of screens) {
        await list.getByRole('button', { name: new RegExp(`^${door}`) }).click();
        await expect(page.getByRole('heading', { name: heading, exact: true, level: 1 })).toBeVisible();
        await page.getByRole('button', { name: back, exact: true }).click();
        await expect(toolsHeading(page)).toBeVisible();
        expect(new URL(page.url()).hash).toBe('#/tools');
      }
      // the phone Back from a tool also returns to Tools, and ‹ Reader leaves Tools for the Reader
      await list.getByRole('button', { name: /^Words/ }).click();
      await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeVisible();
      await page.goBack();
      await expect(toolsHeading(page)).toBeVisible();
      await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
    });

    test('Settings lists none of the tools, and its search finds one, in Tools, and opens it', async ({ page }) => {
      await openReader(page);
      await openSettings(page);
      await expect(settingsHeading(page)).toBeVisible();
      for (const name of ['Words', 'Review', 'Paradigms']) await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: new RegExp(`^${name}`) })).toHaveCount(0);
      // the Account page, where Words, Review and Paradigms were a row each, keeps the tutor's and the app's rows
      await page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Account/ }).click();
      for (const name of ['Words', 'Review', 'Paradigms']) await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toHaveCount(0);
      for (const name of ['About you', 'Memory', 'Conversations', 'Your requests']) await expect(page.getByRole('button', { name: new RegExp(`^${name}`) }).first()).toBeVisible();
      await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
      await page.getByRole('searchbox', { name: 'Search settings' }).fill('paradigms');
      const found = page.getByRole('list', { name: 'Matching tools' }).getByRole('button', { name: /^Paradigms/ });
      await expect(found).toContainText('in Tools');
      await found.click();
      await expect(page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 })).toBeVisible();
      await page.goBack();
      await expect(settingsHeading(page)).toBeVisible();
    });
  });
}

test('an old Settings address for a tool opens the tool', async ({ page }) => {
  await openReader(page);
  await page.goto('/#/settings?setting=link.words');
  await expect(page.getByRole('heading', { name: 'Words', exact: true, level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/words');
});

/** Puts the Immersive reader setting On in the app's store through raw IndexedDB, as the app wrote it. */
async function keepImmersive(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'immersiveReader', value: 'on' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

// mw-5r3p30.1143: on his phone (Mark 12, Weave on, the chips row under the header) the Menu showed one clipped row and no Settings, because the chips row painted over it.
// Both rows must stand whole and on top at every phone size: the point at each row's centre is that row, and a tap on Settings opens Settings.
for (const size of [{ width: 360, height: 740 }, { width: 384, height: 832 }, { width: 390, height: 844 }]) {
  test.describe(`Menu over the chips row at ${size.width} x ${size.height}`, () => {
    test.use({ viewport: size });

    test('Tools and Settings are both whole and on top of the chips row, and a tap on Settings opens Settings', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=mrk&c=12&view=english&weave=solid');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      // the Immersive reader On wraps the header and chips in a box that clips what hangs below it (src/Away.tsx, .away-inner): that is what clipped his Menu
      await keepImmersive(page);
      await page.reload();
      await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await expect(page.getByTestId('reader-chips')).toBeVisible();
      await openMenu(page);
      const chips = (await page.getByTestId('reader-chips').boundingBox())!;
      const menu = (await page.getByRole('menu', { name: 'Menu' }).boundingBox())!;
      // the Menu is laid over the chips row (else this check proves nothing)
      expect(menu.y).toBeLessThan(chips.y + chips.height);
      for (const name of ['Tools', 'Settings'] as const) {
        const row = menuRow(page, name);
        await expect(row).toBeVisible();
        const box = (await row.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        const hit = await row.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return at !== null && el.contains(at);
        });
        expect(hit, `${name} is the element at its own centre`).toBe(true);
        // and whole: the menu's box holds the row's, and the window holds the menu
        expect(box.y).toBeGreaterThanOrEqual(menu.y - 0.5);
        expect(box.y + box.height).toBeLessThanOrEqual(menu.y + menu.height + 0.5);
      }
      await menuRow(page, 'Settings').click();
      await expect(settingsHeading(page)).toBeVisible();
    });
  });
}
