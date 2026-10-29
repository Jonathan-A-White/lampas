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

/** Logos On (Settings > Study resources), then every book of the kinds On from the Library's own pages. */
async function shelfOn(page: Page, kinds: readonly (readonly [string, string])[]): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');
  for (const [kind, heading] of kinds) {
    await page.goto(`/#/library?kind=${kind}`);
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'All on', exact: true }).click();
    await expect(page.getByTestId('kind-status')).not.toHaveText('none on');
  }
}

/** The shelf of the first test: every Greek text, commentary, lexicon and grammar On, then back to the Reader at Romans 8. */
async function shelfHolds(page: Page): Promise<void> {
  await shelfOn(page, [['greek-text', 'Greek texts'], ['commentary', 'Commentaries'], ['lexicon', 'Lexicons'], ['grammar', 'Grammars']]);
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

  // the groups follow the shelf and the place: the 83 commentaries on Romans (mw-vb8krt) and the eight Greek texts, each folded to three
  await expect(sheet.getByRole('group', { name: 'Commentaries on Romans (83)' }).getByRole('link')).toHaveCount(3);
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

test('Jonah 1:10 > In another book… lists the commentaries on Jonah from his library, Old Testament ones included, each a 44 px link to the verse (mw-eup64h)', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await shelfOn(page, [['commentary', 'Commentaries']]);
  await page.goto('/#/?ref=Jonah.1.10');
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();

  const doors = view.getByRole('group', { name: 'Jonah 1:10 in Logos' });
  const another = doors.getByRole('button', { name: 'In another book…', exact: true });
  await expect(another).toBeVisible();
  await another.click();
  const sheet = page.getByRole('dialog', { name: 'Jonah 1:10 in Logos' });
  await expect(sheet).toBeVisible();

  // 42 commentaries of his cover Jonah (the Old Testament and the whole-Bible ones among them), folded to three
  const group = sheet.getByRole('group', { name: 'Commentaries on Jonah (42)' });
  await expect(group.getByRole('link')).toHaveCount(3);
  await group.getByRole('button', { name: '39 more', exact: true }).click();
  await expect(group.getByRole('link')).toHaveCount(42);
  await expect(sheet.getByRole('group', { name: /Greek texts|Interlinears/ })).toHaveCount(0);
  for (const link of await group.getByRole('link').all()) {
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await expect(link).toHaveAttribute('href', /^logosres:LLS:[A-Za-z0-9._-]+;ref=Bible\.Jon1\.10$/);
  }
  const box = (await sheet.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844.5);
  expect(box.x + box.width).toBeLessThanOrEqual(390.5);

  // search narrows to his Guzik
  await sheet.getByRole('searchbox').fill('guzik');
  await expect(sheet.getByRole('group', { name: 'Commentaries on Jonah (1)' }).getByRole('link')).toHaveCount(1);
  await shot(page, 'in-logos-jonah');
});

test('a Bible in Logos for each part: the Old Testament one picked, Jonah opens in it while Romans 8:31 still opens in the New Testament one, and the choice survives a reload (mw-5r3p30.841)', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  const logos = section.getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');

  // the three pickers all start at today's one Bible (the Legacy Standard Bible), and only the Old Testament's is moved
  const picker = (part: string) => page.getByRole('combobox', { name: `${part} Bible in Logos` });
  for (const part of ['New Testament', 'Old Testament', 'Apocrypha']) await expect(picker(part)).toHaveValue('LLS:LGCYSTNDRDBBLSB');
  await picker('Old Testament').selectOption({ label: 'ESV (English Standard Version)' });
  await expect(picker('Old Testament')).toHaveValue('LLS:1.0.710');
  await expect(picker('New Testament')).toHaveValue('LLS:LGCYSTNDRDBBLSB');
  await expect(picker('Apocrypha')).toHaveValue('LLS:LGCYSTNDRDBBLSB');
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await picker('Apocrypha').scrollIntoViewIfNeeded();
  await shot(page, 'settings-bible-in-logos-parts');

  // the choice survives a reload
  await page.reload();
  await expect(picker('Old Testament')).toHaveValue('LLS:1.0.710');
  await expect(picker('New Testament')).toHaveValue('LLS:LGCYSTNDRDBBLSB');

  // Jonah opens in the Old Testament Bible, Romans in the New Testament one
  await page.goto('/#/?ref=Jonah.1.10');
  const psalm = page.getByRole('region', { name: 'Verse view' });
  await expect(psalm.getByRole('group', { name: 'Jonah 1:10 in Logos' }).getByRole('link', { name: 'In Logos' })).toHaveAttribute('href', 'logosres:1.0.710;ref=Bible.Jon1.10');
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const view = await openVerseView(page, 31);
  await expect(view.getByRole('group', { name: 'Romans 8:31 in Logos' }).getByRole('link', { name: 'In Logos' })).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ro8.31');
});
