// A ref= link to a verse or a range opens the normal Reader, not the Verse view, with the first verse at the top and Immersive left as it was (mw-5r3p30.1025, .1028; his words, 2026-11-03:
// "https://lampas.allmymind.org/#/?ref=John.5.25 should bring you here and #/?ref=John.5.16-30 should bring you here. Essentially, it should bring you to the non-immersive
// reader with the first verse at the top (if possible). John 5:47 would bring you here."). Cold open (the page loads on the link) and with the app already open (the address changes
// under a running Reader). 390x844.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keep(page: Page, key: string, value: string) {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value],
  );
}

type Setup = { immersive?: boolean; pages?: boolean };

/** Opens the Reader on Romans 8 (the app is open), with the settings he is said to have, then opens `hash` the way `how` says: 'cold' loads the page on it, 'open' changes the address under the running app. */
async function openLink(page: Page, hash: string, how: 'cold' | 'open', setup: Setup = {}): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  if (setup.immersive) await keep(page, 'immersiveReader', 'on');
  if (setup.pages) await keep(page, 'readingMode', 'pages');
  if (setup.immersive || setup.pages) {
    await page.reload();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', setup.immersive ? 'on' : 'off');
    await expect(page.locator('[data-verse="1"]')).toBeAttached();
  }
  if (how === 'cold') {
    await page.goto('about:blank');
    await page.goto(`/${hash}`);
  } else {
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash.slice(1));
  }
}

/** How far the top of `selector` is below the top of the reading box. */
const below = (page: Page, selector: string) =>
  page.locator('[data-reader]').evaluate((box, sel) => {
    const el = box.querySelector(sel);
    return el ? el.getBoundingClientRect().top - box.getBoundingClientRect().top : Number.NaN;
  }, selector);

/** How far the top of what a verse is brought to is below the top of the reading box: the section heading directly above it when it has one, else the verse. */
const topOfVerse = (page: Page, verse: number) =>
  page.locator('[data-reader]').evaluate((box, n) => {
    const el = box.querySelector(`[data-verse="${n}"]`);
    if (!el) return Number.NaN;
    const parent = el.parentElement;
    const block = parent?.hasAttribute('data-paragraph') && parent.firstElementChild === el ? parent : el;
    const above = block.previousElementSibling;
    const top = above?.hasAttribute('data-heading') ? above : el;
    return top.getBoundingClientRect().top - box.getBoundingClientRect().top;
  }, verse);

/** The Reader as a link leaves it: no Verse view, no sheet, nothing selected, the address the plain one. */
async function expectPlainReader(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'off');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
  await expect(page.locator('[data-link-notice]')).toHaveCount(0);
  const hash = await page.evaluate(() => window.location.hash);
  expect(hash).not.toContain('ref=');
  expect(hash).not.toMatch(/[?&]v=/);
  expect(hash).not.toMatch(/[?&]p=/);
}

const HOWS = ['cold', 'open'] as const;

for (const how of HOWS) {
  test(`${how}: #/?ref=John.5.25 opens the Reader with verse 25 at the top and no Verse view`, async ({ page }) => {
    await openLink(page, '#/?ref=John.5.25', how);
    await expectPlainReader(page, 'John 5');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'english');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '25');
    await expect.poll(() => below(page, '[data-verse="25"]')).toBeLessThan(20);
    expect(await below(page, '[data-verse="25"]')).toBeGreaterThanOrEqual(-1);
    // verse 24 ends above the box's top: verse 25's first line is the first text below the bars
    expect(await below(page, '[data-verse="24"]')).toBeLessThan(0);
    await shot(page, `link-opens-reader-${how}-verse`);
  });

  test(`${how}: #/?ref=John.5.16-30 opens the Reader with its heading and verse 16 at the top`, async ({ page }) => {
    await openLink(page, '#/?ref=John.5.16-30', how);
    await expectPlainReader(page, 'John 5');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'english');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '16');
    const heading = page.locator('[data-heading]', { hasText: 'The Father and the Son' });
    await expect(heading).toBeVisible();
    // the heading is the first thing below the bars, verse 16 right under it
    await expect.poll(() => topOfVerse(page, 16)).toBeLessThan(20);
    expect(await topOfVerse(page, 16)).toBeGreaterThanOrEqual(-1);
    const verse = await below(page, '[data-verse="16"]');
    expect(verse).toBeGreaterThan(0);
    expect(verse).toBeLessThan(120);
    // nothing of 15 is left above the heading's own top: 15 is out of the box
    expect(await below(page, '[data-verse="15"]')).toBeLessThan(0);
    await shot(page, `link-opens-reader-${how}-range`);
  });

  test(`${how}: #/?ref=John.5.47 scrolls to the chapter's end with verse 47 in view, no notice`, async ({ page }) => {
    await openLink(page, '#/?ref=John.5.47', how);
    await expectPlainReader(page, 'John 5');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '47');
    const inView = () =>
      page.locator('[data-reader]').evaluate((box) => {
        const el = box.querySelector('[data-verse="47"]');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        return r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
      });
    await expect.poll(inView).toBe(true);
    // the box is at its end: 47 cannot reach the top
    const atEnd = await page.locator('[data-reader]').evaluate((box) => box.scrollHeight - box.clientHeight - box.scrollTop);
    expect(atEnd).toBeLessThan(2);
    await shot(page, `link-opens-reader-${how}-end`);
  });
}

/** The Immersive reader setting as the store holds it. */
const storedImmersive = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string | undefined>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction('settings', 'readonly').objectStore('settings').get('immersiveReader');
          get.onsuccess = () => resolve(get.result?.value);
          get.onerror = () => reject(get.error);
        };
      }),
  );

// his words, 2026-11-03 (mw-5r3p30.1028): "clicking a link shouldn't affect your immersive reader settings"
test('Immersive On beforehand, cold: the link leaves it On, with the verse first at the top', async ({ page }) => {
  await openLink(page, '#/?ref=John.5.25', 'cold', { immersive: true });
  await expect(page.getByRole('heading', { name: 'John 5', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '25');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
  expect(await storedImmersive(page)).toBe('on');
  await expect.poll(() => below(page, '[data-verse="25"]')).toBeLessThan(20);
  expect(await below(page, '[data-verse="25"]')).toBeGreaterThanOrEqual(-1);
  expect(await below(page, '[data-verse="24"]')).toBeLessThan(0);
  await shot(page, 'link-opens-reader-immersive-cold');
});

test('Immersive On beforehand, with the app open: the link leaves it On, with the range first at the top', async ({ page }) => {
  await openLink(page, '#/?ref=John.5.16-30', 'open', { immersive: true });
  await expect(page.getByRole('heading', { name: 'John 5', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '16');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  expect(await storedImmersive(page)).toBe('on');
  await expect.poll(() => topOfVerse(page, 16)).toBeLessThan(20);
  expect(await topOfVerse(page, 16)).toBeGreaterThanOrEqual(-1);
});

test('Immersive Off beforehand: the link leaves it Off', async ({ page }) => {
  await openLink(page, '#/?ref=John.5.25', 'cold');
  await expectPlainReader(page, 'John 5');
  expect(await storedImmersive(page)).not.toBe('on');
});

for (const how of HOWS) {
  test(`${how}: an Old Testament link, #/?ref=Jon.1.10, opens Jonah 1 in English with verse 10 at the top`, async ({ page }) => {
    await openLink(page, '#/?ref=Jon.1.10', how);
    await expectPlainReader(page, 'Jonah 1');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'english');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '10');
    await expect.poll(() => below(page, '[data-verse="10"]')).toBeLessThan(20);
    expect(await below(page, '[data-verse="10"]')).toBeGreaterThanOrEqual(-1);
  });

  test(`${how}: an Old Testament range, #/?ref=Jon.1.4-9, opens Jonah 1 with verse 4 at the top`, async ({ page }) => {
    await openLink(page, '#/?ref=Jon.1.4-9', how);
    await expectPlainReader(page, 'Jonah 1');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'english');
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '4');
    await expect.poll(() => topOfVerse(page, 4)).toBeLessThan(20);
    expect(await topOfVerse(page, 4)).toBeGreaterThanOrEqual(-1);
  });
}

test('a view in the link is kept: #/?ref=John.5.25&view=greek opens the Greek Reader, no Verse view', async ({ page }) => {
  await openLink(page, '#/?ref=John.5.25&view=greek', 'cold');
  await expect(page.getByRole('heading', { name: 'John 5', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '25');
});

test('Turn pages: the page holding the first verse opens, with nothing selected', async ({ page }) => {
  await openLink(page, '#/?ref=John.5.25', 'cold', { pages: true });
  await expectPlainReader(page, 'John 5');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '25');
  const place = () =>
    page.locator('[data-reader]').evaluate((box) => {
      const el = box.querySelector('[data-verse="25"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      return { left: r.left - b.left, top: r.top - b.top, width: b.width, height: b.height };
    });
  await expect.poll(async () => {
    const p = await place();
    return p !== null && p.left >= -1 && p.left < p.width;
  }).toBe(true);
  const stands = await place();
  console.log(`Turn pages: verse 25 stands ${Math.round(stands?.top ?? -1)} px below the top of a ${Math.round(stands?.height ?? -1)} px page`);
  await shot(page, 'link-opens-reader-pages');
});

test('a verse past the end of the chapter keeps its notice and brings the last verse to view', async ({ page }) => {
  await openLink(page, '#/?ref=John.5.99', 'cold');
  await expect(page.getByRole('heading', { name: 'John 5', level: 1 })).toBeVisible();
  await expect(page.locator('[data-link-notice]')).toContainText('“John 5:99” is not in Lampas; showing John 5:47.');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
});
