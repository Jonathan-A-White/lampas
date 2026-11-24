// tests/e2e/enduring-word.spec.ts — Enduring Word, David Guzik's commentary on the web (mw-1l901so.1), at 390x844: the Verse view's 'Commentary' door where Logos is Off, and the row of the 'In another book…' chooser where
// his library holds no DGCB volume of the book; each opens Lampas's reader with the site's credit line, which (the sermon index serves none of its words) opens the page on the web. Each writes a shot.
// The network is refused: the sermon index service answers 404 (no words), and the page of enduringword.com is a stub the opened window shows.
import { expect, test, type Page } from '@playwright/test';
import { keepImport } from './keep-import';
import { openSettings } from './openSettings';
import { leaveSettings, openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

const PAGE = 'https://enduringword.com/bible-commentary/john-3/';
/** John 3:16 is in the range of section 6, '6. (16) ...' (mw-1l901so.2); a request leaves the fragment out, so the stub sees PAGE */
const SECTION = `${PAGE}#section-6`;
const CREDIT = '(c)1996-present The Enduring Word Bible Commentary by David Guzik - enduringword.com';

/** The sermon index service has no words of it, and the site's page is a stub: nothing leaves the test. Returns the addresses the browser was sent to. */
async function noNetwork(page: Page): Promise<string[]> {
  const opened: string[] = [];
  await page.route(/sermons\.allmymind\.org/, (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not served"}' }));
  // the window the reader opens is a page of its own: the route is the context's
  await page.context().route(/enduringword\.com/, (route) => {
    opened.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' });
  });
  return opened;
}

test('with Logos Off the Verse view has the Commentary door, which opens the chapter in the reader', async ({ page }) => {
  await openUnlocked(page);
  const opened = await noNetwork(page);
  await page.goto('/#/?b=jhn&c=3');
  await expect(page.locator('[data-verse="16"]')).toBeVisible();
  const view = await openVerseView(page, 16);
  const door = view.getByRole('link', { name: 'Commentary', exact: true });
  await door.scrollIntoViewIfNeeded();
  await expect(door).toHaveAttribute('href', SECTION);
  expect((await door.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'enduring-word-door');

  const popup = page.waitForEvent('popup');
  await door.click();
  const reader = page.getByRole('dialog', { name: 'John 3 · Enduring Word' });
  await expect(reader).toBeVisible();
  await expect(reader.locator('[data-enduring-credit]')).toHaveText(CREDIT);
  await expect(reader.getByRole('status')).toHaveText('Lampas could not get the words of this commentary, so it opens on the web.');
  await expect(reader.getByRole('link', { name: 'Open on the web' })).toHaveAttribute('href', SECTION);
  await shot(page, 'enduring-word-reader');
  await (await popup).waitForLoadState();
  expect(opened).toContain(PAGE);
});

test('with Logos On and no DGCB volume of John the chooser lists Enduring Word under Commentaries on John', async ({ page }) => {
  await openUnlocked(page, { import: false });
  const opened = await noNetwork(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // his import holds one commentary on John (Calvin's) and no volume of David Guzik's
  await keepImport(page, ['LLS:CALCOM64JN']);
  await openSettings(page);
  await openGroup(page, 'Study resources');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');
  await leaveSettings(page);
  await page.goto('/#/library?kind=commentary');
  await expect(page.getByRole('heading', { name: 'Commentaries', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'All on', exact: true }).click();
  await expect(page.getByTestId('kind-status')).not.toHaveText('none on');
  await page.goto('/#/?b=jhn&c=3');
  await expect(page.locator('[data-verse="16"]')).toBeVisible();
  const view = await openVerseView(page, 16);
  // the chooser carries the row, so the Verse view has no door of its own
  await expect(view.getByRole('link', { name: 'Commentary', exact: true })).toHaveCount(0);
  await view.getByRole('button', { name: 'In another book…', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'John 3:16 in Logos' });
  const group = sheet.getByRole('group', { name: 'Commentaries on John (2)' });
  const row = group.getByRole('link', { name: 'Open John 3:16 in Enduring Word (David Guzik)' });
  await expect(row).toBeVisible();
  expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'enduring-word-chooser');

  const popup = page.waitForEvent('popup');
  await row.click();
  const reader = page.getByRole('dialog', { name: 'John 3 · Enduring Word' });
  await expect(reader.locator('[data-enduring-credit]')).toHaveText(CREDIT);
  await (await popup).waitForLoadState();
  expect(opened).toContain(PAGE);
});
