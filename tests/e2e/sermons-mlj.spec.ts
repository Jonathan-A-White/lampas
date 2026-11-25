// tests/e2e/sermons-mlj.spec.ts — the Martyn Lloyd-Jones row of the Sermons sheet (mw-qtu3zvz.280.17, docs/sermons.md 'The MLJ Trust row') at 390x844: one 44 px row in the chapter's list that names the
// MLJ Trust, and a tap opens the Trust's own sermon search for the chapter in a new page. The Trust's site is stubbed with page.route: nothing is fetched from it, only the address is held.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { keepSettings } from './keep-settings';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

const SERVICE = 'https://sermons.allmymind.org'; // the sermon index service: refused, as in sermons.spec.ts, so a live one never changes what the sheet lists

test('Romans 8: the Sermons sheet has one Martyn Lloyd-Jones (MLJ Trust) row, and a tap opens the Trust\'s search for Romans 8 in a new page', async ({ page, context }) => {
  await page.route(`${SERVICE}/**`, (route) => route.abort());
  const asked: string[] = [];
  await context.route(/^https:\/\/(www\.)?mljtrust\.org\//, (route) => {
    asked.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>MLJ Trust</title>' });
  });
  await openUnlocked(page);
  await page.goto('/');
  // under This browser: the default, Lampas, read aloud, is for a text sermon of the index; the row is a web link either way
  await keepSettings(page, { sermonsOpenWeb: 'browser' });
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  const view = await openVerseView(page, 1);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 8:1' });
  await expect(sheet).toBeVisible();

  const mlj = sheet.locator('a[data-mlj-row]');
  await expect(mlj).toHaveCount(1);
  await expect(mlj).toContainText('Martyn Lloyd-Jones (MLJ Trust)');
  await expect(mlj).toContainText('Opens on the web');
  expect((await mlj.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await expect(mlj).toHaveAttribute('href', 'https://www.mljtrust.org/search/?q=Romans%208');
  expect(asked, 'nothing is fetched from the Trust until the row is tapped').toEqual([]);
  await mlj.scrollIntoViewIfNeeded();
  await shot(page, 'sermons-mlj');

  const opened = context.waitForEvent('page');
  await mlj.click();
  const popup = await opened;
  await popup.waitForLoadState('domcontentloaded');
  expect(popup.url()).toBe('https://www.mljtrust.org/search/?q=Romans%208');
  await popup.close();
});
