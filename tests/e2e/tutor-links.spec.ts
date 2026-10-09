import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

// Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page (as in study-resources.spec.ts).
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

test('the tutor\'s links at phone width: chips for the resources he switched on, thumb-sized, and a verse link that opens the Reader', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      answer: 'Love, ἀγάπη, is the thread of the chapter; Paul pulls it tight in verse 35 and ends with it in verse 39.',
      words: [],
      links: [{ kind: 'word', lemma: 'ἀγάπη' }, { kind: 'verse', reference: 'Romans 8:35' }, { kind: 'word', lemma: 'πίστις' }],
    },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  // Strong's and Logos on in Settings (turning an app On opens it once; the blur plays the app taking the page away).
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  await section.scrollIntoViewIfNeeded();
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(section.getByRole('switch', { name: 'Logos', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Where does love come back?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const links = sheet.locator('[data-tutor-links]');
  await expect(links).toBeVisible();
  await expect(links.locator('[data-tutor-link]')).toHaveCount(3);
  const names = ['G26 for ἀγάπη', 'Open in Logos: BDAG for ἀγάπη', 'Open Romans 8:35 in Lampas', 'Open Romans 8:35 in Logos', 'G4102 for πίστις', 'Open in Logos: BDAG for πίστις'];
  for (const name of names) {
    const chip = links.getByLabel(name, { exact: true });
    await chip.scrollIntoViewIfNeeded();
    await expect(chip).toBeVisible();
    const box = await chip.boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(43.5);
    expect(box?.width, name).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0), name).toBeLessThanOrEqual(VIEWPORT.width);
  }
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(VIEWPORT.width);
  await links.scrollIntoViewIfNeeded();
  await shot(page, 'tutor-links');

  // The verse link opens the verse in the Reader and takes the Talk sheet away.
  await links.getByRole('button', { name: 'Open Romans 8:35 in Lampas', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  expect(page.url()).toContain('v=35');
});

test('an Old Testament verse link opens in his Bible in Logos (LSB today) and has no Reader chip', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      answer: 'Paul quotes Genesis 15:6 to show that Abraham was counted righteous by faith, long before the law.',
      words: [],
      links: [{ kind: 'verse', reference: 'Genesis 15:6' }],
    },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  await section.scrollIntoViewIfNeeded();
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(section.getByRole('switch', { name: 'Logos', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Where does Paul get that?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const links = sheet.locator('[data-tutor-links]');
  await expect(links).toBeVisible();
  const logos = links.getByRole('link', { name: 'Open Genesis 15:6 in Logos', exact: true });
  await logos.scrollIntoViewIfNeeded();
  await expect(logos).toBeVisible();
  await expect(logos).toHaveText('Logos');
  await expect(logos).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ge15.6');
  await expect(links.getByRole('button')).toHaveCount(0);
  const box = await logos.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await shot(page, 'tutor-links-ot');
});
