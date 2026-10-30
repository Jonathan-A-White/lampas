import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';

// Tapping a row the Settings search found takes him to it: the page of its group, the row scrolled into view and marked (mw-5r3p30.877; the link of mw-5r3p30.502).
// The rows that are no setting of the registry (Keep on this phone, the link rows, the devotional) were opened at the top of their section, not marked.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// a letter every row has finds them all, so each result sits in a long list; they are in different groups, and the last three are below the fold of their page
for (const key of ['textSize', 'greekRate', 'offlineCopy', 'request.devotional', 'link.about', 'link.help']) {
  test(`searching and tapping "${key}" lands on its row, in view and marked`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto('/#/settings');
    await page.getByRole('searchbox', { name: 'Search settings' }).fill('e');
    const result = page.locator(`[data-found="${key}"]`);
    await result.scrollIntoViewIfNeeded();
    await result.tap();
    const row = page.locator(`[data-setting="${key}"]`);
    await expect(row).toHaveAttribute('data-highlighted', '');
    await expect(row).toBeInViewport({ ratio: 1 });
    // it stays there once the page has settled
    await page.waitForTimeout(800);
    await expect(row).toBeInViewport({ ratio: 1 });
  });
}

// every result, not only these: none opens a page without its row marked and in view
test('every result of a search lands on its row', async ({ page }) => {
  test.setTimeout(240_000);
  await openUnlocked(page);
  await page.goto('/#/settings');
  const search = page.getByRole('searchbox', { name: 'Search settings' });
  await search.fill('e');
  const keys = await page.locator('[data-found]').evaluateAll((els) => els.map((el) => el.getAttribute('data-found') as string));
  expect(keys.length).toBeGreaterThan(60);
  const missed: string[] = [];
  for (const key of keys) {
    await page.goto('/#/settings');
    await search.fill('e');
    await page.locator(`[data-found="${key}"]`).scrollIntoViewIfNeeded();
    await page.locator(`[data-found="${key}"]`).tap();
    await page.waitForTimeout(500);
    const lands = await page.evaluate((k) => {
      const el = document.querySelector(`[data-setting="${CSS.escape(k)}"]`);
      if (!el) return false;
      const box = el.getBoundingClientRect();
      const bar = (document.querySelector('main.screen') as HTMLElement).getBoundingClientRect();
      // a row taller than the screen (Grammar approach) is scrolled to by its top, so its name shows
      const inView = box.height > bar.height ? box.top >= bar.top - 1 && box.top < bar.bottom : box.top >= bar.top - 1 && box.bottom <= bar.bottom + 1;
      return inView && el.hasAttribute('data-highlighted');
    }, key);
    if (!lands) missed.push(key);
  }
  expect(missed).toEqual([]);
});

// a setting link in the tutor's reply (the Settings chip of src/TutorLinks.tsx) lands on its row too
test("the Settings chip of a tutor's reply lands on its row, in view and marked", async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'You can turn that on in Settings.', words: [], links: [{ kind: 'setting', key: 'resource.logos' }] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('How do I turn Logos on?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await sheet.locator('[data-tutor-links]').getByRole('button', { name: /^Open .* in Settings$/ }).tap();
  const row = page.locator('[data-setting="resource.logos"]');
  await expect(row).toHaveAttribute('data-highlighted', '');
  await expect(row).toBeInViewport({ ratio: 1 });
});
