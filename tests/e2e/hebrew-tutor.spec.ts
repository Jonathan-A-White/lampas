// Hebrew in the tutor (mw-5r3p30.97) at phone width: a tutor answer with a Hebrew word renders the word lang he, dir rtl, in the bundled Hebrew
// font, and the English words around it stay in reading order on one line. Settings > Hebrew in the tutor is a thumb-sized choice of three.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

const HEBREW_ANSWER = {
  answer: 'Paul\'s word for righteousness echoes the Hebrew צֶדֶק (tsedeq), which is about being in the right before God.',
  words: [],
};

test('a Hebrew word in an answer is lang he, dir rtl, in the Hebrew font, with the English around it in order', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: HEBREW_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Where does righteousness come from?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const turn = sheet.locator('[data-turn]');
  const hebrew = turn.locator('[lang="he"]');
  await expect(hebrew).toHaveCount(1);
  await expect(hebrew).toHaveText('צֶדֶק');
  await expect(hebrew).toHaveAttribute('dir', 'rtl');
  // the bundled font is what sets it (no phone font is needed), and it is loaded
  expect(await hebrew.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Noto Serif Hebrew');
  expect(
    await page.evaluate(async () => {
      await document.fonts.load('28px "Noto Serif Hebrew"', 'צֶדֶק');
      return document.fonts.check('28px "Noto Serif Hebrew"', 'צֶדֶק');
    }),
  ).toBe(true);

  // the English words either side keep their order: before the Hebrew is to its left, after it is to its right, on the same line
  const where = await turn.evaluate((root) => {
    const rectOf = (needle: string) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.textContent?.indexOf(needle) ?? -1;
        if (at >= 0) {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + needle.length);
          const r = range.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top };
        }
      }
      throw new Error(`no text ${needle}`);
    };
    return { before: rectOf('echoes the Hebrew'), word: rectOf('צֶדֶק'), after: rectOf('(tsedeq)') };
  });
  expect(where.before.right).toBeLessThanOrEqual(where.word.left + 1);
  expect(where.word.right).toBeLessThanOrEqual(where.after.left + 1);
  expect(Math.abs(where.word.top - where.after.top)).toBeLessThan(8);
  await shot(page, 'hebrew-tutor');
});

test('Settings > Hebrew in the tutor offers three choices, Hebrew and transliteration chosen at first, each a thumb', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/settings');
  const group = page.getByRole('group', { name: 'Hebrew in the tutor' });
  await group.scrollIntoViewIfNeeded();
  const names = ['Transliteration', 'Hebrew and transliteration', 'Full'];
  for (const name of names) {
    const button = group.getByRole('button', { name, exact: true });
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await expect(group.getByRole('button', { name: 'Hebrew and transliteration', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Full', exact: true }).click();
  await expect(group.getByRole('button', { name: 'Full', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('group', { name: 'Hebrew in the tutor' }).getByRole('button', { name: 'Full', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'settings-hebrew');
});
