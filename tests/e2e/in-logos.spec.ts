// tests/e2e/in-logos.spec.ts — a verse in his Logos library (mw-rfjjzd.9, docs/design/library-at-scale.md 3.6) at 390x844: the Verse view's 'In Logos' and 'In another book…', and the chooser behind
// the second: it opens within the bars, every row is a 44 px link, a group is folded to three with 'N more', search opens all, Manage goes to the Library. The shelf is what the catalogue holds
// with every Greek text, commentary, lexicon and grammar On (the catalogue has no interlinear yet; a unit test and the feature give the groups their counts).
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

/** Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

/** Logos On (Settings > Study resources), then every book of four kinds On from the Library's own pages, then back to the Reader. */
async function shelfHolds(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');
  for (const [kind, heading] of [['greek-text', 'Greek texts'], ['commentary', 'Commentaries'], ['lexicon', 'Lexicons'], ['grammar', 'Grammars']] as const) {
    await page.goto(`/#/library?kind=${kind}`);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'All on', exact: true }).click();
    await expect(page.getByTestId('kind-status')).not.toHaveText('none on');
  }
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('the Verse view has In Logos and In another book…, and the chooser opens within the bars with 44 px rows, folds to three, searches and goes to Manage', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await shelfHolds(page);

  const view = await openVerseView(page, 31);
  const doors = view.getByRole('group', { name: 'Romans 8:31 in Logos' });
  const bible = doors.getByRole('link', { name: 'In Logos' });
  await expect(bible).toHaveAttribute('href', /^logosres:/);
  const another = doors.getByRole('button', { name: 'In another book…', exact: true });
  for (const door of [bible, another]) expect((await door.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'in-logos-verse-view');

  await another.click();
  const sheet = page.getByRole('dialog', { name: 'Romans 8:31 in Logos' });
  await expect(sheet).toBeVisible();

  // within the bars: below the strip the shell draws (when it shows one) and inside the phone
  const box = (await sheet.boundingBox())!;
  const bars = await page.locator('[data-shell-bars]').boundingBox();
  expect(box.y).toBeGreaterThanOrEqual((bars ? bars.y + bars.height : 0) - 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(844.5);
  expect(box.x + box.width).toBeLessThanOrEqual(390.5);

  // the groups follow the shelf and the place: the one commentary on Romans, and the eight Greek texts folded to three
  await expect(sheet.getByRole('group', { name: 'Commentaries on Romans (1)' }).getByRole('link')).toHaveCount(1);
  const greek = sheet.getByRole('group', { name: 'Greek texts (8)' });
  await expect(greek.getByRole('link')).toHaveCount(3);
  await expect(sheet.getByRole('group', { name: /John/ })).toHaveCount(0);
  for (const link of await sheet.getByRole('link').all()) {
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await expect(link).toHaveAttribute('href', /^logosres:LLS:[A-Za-z0-9._-]+;ref=Bible\.Ro8\.31$/);
    await expect(link).toHaveAttribute('data-fallback', /^https:\/\/ref\.ly\/logosres\//);
  }
  await shot(page, 'in-logos-chooser');

  // 'N more' unfolds the group
  await greek.getByRole('button', { name: '5 more', exact: true }).click();
  await expect(greek.getByRole('link')).toHaveCount(8);
  await expect(greek.getByRole('button', { name: /more$/ })).toHaveCount(0);

  // search opens every group and keeps the books it matches
  await sheet.getByRole('searchbox').fill('sblgnt');
  await expect(sheet.getByRole('group', { name: 'Greek texts (2)' }).getByRole('link')).toHaveCount(2);
  await expect(sheet.getByRole('group', { name: /Commentaries/ })).toHaveCount(0);
  await shot(page, 'in-logos-chooser-search');

  // the phone's Back closes the sheet and leaves him on the Verse view
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(view).toBeVisible();
  await another.click();
  await expect(sheet).toBeVisible();

  // Manage at the foot is in reach and goes to the Library
  const manage = sheet.getByRole('button', { name: 'Manage in Your Logos library', exact: true });
  const foot = (await manage.boundingBox())!;
  expect(foot.y + foot.height).toBeLessThanOrEqual(844.5);
  expect(foot.height).toBeGreaterThanOrEqual(43.5);
  await manage.click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
});

test('with no Greek text, interlinear or commentary On the second door is not drawn', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await leaveSettings(page);

  const view = await openVerseView(page, 31);
  await expect(view.getByRole('link', { name: 'In Logos' })).toBeVisible();
  await expect(view.getByRole('button', { name: 'In another book…', exact: true })).toHaveCount(0);
});
