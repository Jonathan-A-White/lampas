// tests/e2e/library.spec.ts — the Library screen (#/library, mw-rfjjzd.4, docs/design/library-at-scale.md 3.3 and 3.4) at 390x844: every control is a thumb's size, nothing runs off the
// screen sideways, each of the three hit areas of the Off | On | Pin control selects, a search result opens its kind's page with the book in view, and a fourth pin is refused.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** The controls on the screen as a thumb meets them: each visible button, field and radio, with its box. */
async function controls(page: Page): Promise<{ name: string; width: number; height: number; right: number }[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main button, main input, main [role="radio"], header button'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const box = el.getBoundingClientRect();
        return { name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName, width: box.width, height: box.height, right: box.right };
      }),
  );
}

/** Every control at least 44 px high and wide (the radios and buttons; a field is wide enough already) and none past the screen's right edge. */
async function expectThumbSized(page: Page): Promise<void> {
  const found = await controls(page);
  expect(found.length).toBeGreaterThan(3);
  for (const c of found) {
    expect(c.height, `${c.name} is at least 44 px high`).toBeGreaterThanOrEqual(43.5);
    expect(c.width, `${c.name} is at least 44 px wide`).toBeGreaterThanOrEqual(43.5);
    expect(c.right, `${c.name} ends inside the screen`).toBeLessThanOrEqual(390.5);
  }
  const wide = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: (document.querySelector('.screen') as HTMLElement).scrollWidth, box: (document.querySelector('.screen') as HTMLElement).clientWidth }));
  expect(wide.page).toBeLessThanOrEqual(390);
  expect(wide.screen).toBeLessThanOrEqual(wide.box);
}

const open = async (page: Page, hash: string, heading: string): Promise<void> => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.goto(`/#/${hash}`);
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
};

/** Taps the middle of a box with the mouse, so what is hit is what is at that spot and not what the locator would scroll to. */
async function tapMiddle(page: Page, target: Locator): Promise<void> {
  const box = (await target.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('the home has seven rows with counts, thumb-sized controls and no sideways scroll', async ({ page }) => {
  await open(page, 'library', 'Your Logos library');
  await expect(page.getByTestId('kind-row')).toHaveCount(7);
  await expect(page.getByTestId('library-card')).toContainText('books Lampas can open are on.');
  await expectThumbSized(page);
  await shot(page, 'library-home');
});

test('Lexicons with 19 on: All on, two off, each of the three hit areas selects, thumb-sized', async ({ page }) => {
  await open(page, 'library?kind=lexicon', 'Lexicons');
  await page.getByRole('button', { name: 'All on', exact: true }).click();
  await expect(page.getByTestId('kind-status')).toHaveText('21 on');
  for (const name of ['Intermediate Greek-English Lexicon', 'NT Greek Vocabulary']) {
    await page.getByRole('radiogroup', { name, exact: true }).getByRole('radio', { name: 'Off', exact: true }).click();
  }
  await expect(page.getByTestId('kind-status')).toHaveText('19 on');
  await expectThumbSized(page);
  await page.locator('.screen').evaluate((box) => void (box.scrollTop = 0));
  await shot(page, 'library-lexicons');

  // the three hit areas of one book's control each select, tapped at their middle
  const group = page.getByRole('radiogroup', { name: 'EDNT', exact: true });
  await group.scrollIntoViewIfNeeded();
  for (const step of ['Off', 'On', 'Pin']) {
    await tapMiddle(page, group.getByRole('radio', { name: step, exact: true }));
    await expect(group.getByRole('radio', { name: step, exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(group.locator('[aria-checked="true"]')).toHaveCount(1);
    await page.waitForTimeout(350);
  }
  // and the choice is kept
  await page.reload();
  await expect(page.getByRole('radiogroup', { name: 'EDNT', exact: true }).getByRole('radio', { name: 'Pin', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('a fourth pin is refused with its line under the book', async ({ page }) => {
  await open(page, 'library?kind=lexicon', 'Lexicons');
  // a new phone starts with BDAG pinned: two more fill the three
  for (const name of ['Louw-Nida', 'DBL Greek']) {
    const group = page.getByRole('radiogroup', { name, exact: true });
    await group.scrollIntoViewIfNeeded();
    await group.getByRole('radio', { name: 'Pin', exact: true }).click();
    await expect(group.getByRole('radio', { name: 'Pin', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.waitForTimeout(350);
  }
  const edntGroup = page.getByRole('radiogroup', { name: 'EDNT', exact: true });
  await edntGroup.scrollIntoViewIfNeeded();
  await edntGroup.getByRole('radio', { name: 'Pin', exact: true }).click();
  const line = page.getByRole('alert').filter({ hasText: 'Three pinned already: unpin one first' });
  await expect(line).toBeVisible();
  await expect(edntGroup.getByRole('radio', { name: 'Pin', exact: true })).toHaveAttribute('aria-checked', 'false');
});

test('a search result opens the kind page with the book in view', async ({ page }) => {
  await open(page, 'library', 'Your Logos library');
  await page.getByRole('searchbox', { name: 'Search your books' }).fill('Beeke');
  await page.getByRole('button', { name: /^365 Days with Calvin/ }).click();
  await expect(page.getByRole('heading', { name: 'Devotionals', level: 1 })).toBeVisible();
  const row = page.locator('[aria-current="true"]');
  await expect(row).toContainText('365 Days with Calvin');
  const [box, screen] = await Promise.all([row.boundingBox(), page.locator('.screen').boundingBox()]);
  expect(box!.y).toBeGreaterThanOrEqual(screen!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(screen!.y + screen!.height);
  // Back returns to the home with its search
  await page.getByRole('button', { name: '‹ Library' }).click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
});

test('Bibles offer Off | Chosen and Devotionals Off | On: neither shows a Pin', async ({ page }) => {
  await open(page, 'library?kind=bible', 'Bibles');
  await expect(page.getByRole('radio', { name: 'Pin', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All on', exact: true })).toHaveCount(0);
  await page.getByRole('radiogroup', { name: 'ESV', exact: true }).getByRole('radio', { name: 'Chosen', exact: true }).click();
  await expect(page.getByTestId('kind-status')).toHaveText('1 chosen');
  await page.goto('/#/library?kind=devotional');
  await expect(page.getByRole('heading', { name: 'Devotionals', level: 1 })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Pin', exact: true })).toHaveCount(0);
  await expectThumbSized(page);
});
