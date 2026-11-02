// The Reader's switch English | Weave | Greek (mw-5r3p30.651): with the Weave on, English is plain English, Weave the woven English and Greek the Greek;
// a long press on Weave flips the woven text between the English and the Greek word order and says which in a toast, and the order survives a reload.
// With the Weave Off the switch is English | Greek. At 390x844 and 844x390.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES = [
  { name: 'upright', size: { width: 390, height: 844 } },
  { name: 'sideways', size: { width: 844, height: 390 } },
];

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });

for (const { name, size } of SIZES) {
  test(`the switch is English | Weave | Greek and a long press on Weave flips the word order, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8&weave=solid');
    const verse1 = page.locator('[data-verse="1"] [data-text]');
    await expect(verse1).toBeVisible();

    // the Weave is on: three choices, Weave chosen, the Greek of his words in the English
    const group = page.getByRole('group', { name: 'Language', exact: true });
    await expect(group.getByRole('button')).toHaveText(['English', 'Weave', 'Greek']);
    await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);
    const box = await group.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 0.5);
    for (const label of ['English', 'Weave', 'Greek']) {
      const b = await choice(page, label).boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(43.5);
      expect(b!.width).toBeGreaterThanOrEqual(43.5);
    }
    await shot(page, `weave-switch-weave-${name}`);

    // English is plain English
    await choice(page, 'English').click();
    await expect(choice(page, 'English')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(0);
    await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);
    await shot(page, `weave-switch-english-${name}`);

    // Greek is the Greek
    await choice(page, 'Greek').click();
    await expect(choice(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
    await expect(verse1).toHaveText(/^Οὐδὲν ἄρα νῦν/);

    // Weave brings the woven text back; a long press on it flips to the Greek word order and says so
    await choice(page, 'Weave').click();
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await holdFor(page, choice(page, 'Weave'), 700);
    const toast = page.getByRole('status').filter({ hasText: 'Greek word order' });
    await expect(toast).toBeVisible();
    const toastBox = await toast.boundingBox();
    expect(toastBox!.x).toBeGreaterThanOrEqual(0);
    expect(toastBox!.x + toastBox!.width).toBeLessThanOrEqual(size.width + 0.5);
    await expect(verse1).toHaveText(/^no Therefore there is now condemnation/);
    await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
    await shot(page, `weave-switch-greek-order-${name}`);
    await page.clock.runFor(3000);
    await expect(toast).toHaveCount(0);

    // the order is kept across a reload; a second long press puts the English order back
    await page.reload();
    await expect(verse1).toHaveText(/^no Therefore there is now condemnation/);
    await holdFor(page, choice(page, 'Weave'), 700);
    await expect(page.getByRole('status').filter({ hasText: 'English word order' })).toBeVisible();
    await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);
  });

  test(`plain English is kept across a reload, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8&weave=solid');
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await choice(page, 'English').click();
    await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(0);
    await page.reload();
    await expect(choice(page, 'English')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(0);
  });

  test(`with the Weave off the switch is English | Greek, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8&weave=off');
    await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button')).toHaveText(['English', 'Greek']);
    await shot(page, `weave-switch-off-${name}`);
  });
}

// Switching the mode keeps the verse that is on top (mw-5r3p30.863): each mode sets a verse at its own height, so a number of pixels is not a place. His Acts 18, Weave at verse 14
// went to Greek at verse 11. The first verse whose top is at or below the reading box's top is the place; it must be the same verse after each switch, within the 8 px gap
// useBringVerse leaves.
test('switching the mode keeps the verse that is on top, Acts 18', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/?b=act&c=18&weave=solid');
  await expect(page.locator('[data-verse="14"] [data-text]')).toBeVisible();

  // the box is scrolled so verse 14 is the first verse at its top
  const topOf = (verse: number) =>
    page.evaluate((n) => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      return document.querySelector(`[data-verse="${n}"]`)!.getBoundingClientRect().top - box.getBoundingClientRect().top;
    }, verse);
  const firstVerse = () =>
    page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const top = box.getBoundingClientRect().top;
      const el = [...document.querySelectorAll<HTMLElement>('[data-verse]')].find((v) => v.getBoundingClientRect().top >= top);
      return Number(el?.dataset.verse);
    });
  await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('main[data-reader]')!;
    const el = document.querySelector('[data-verse="14"]')!;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  });
  expect(await firstVerse()).toBe(14);
  await shot(page, 'weave-switch-place-weave');

  for (const label of ['Greek', 'Weave', 'English']) {
    await choice(page, label).click();
    await expect(choice(page, label)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => Math.abs((await topOf(14)) - 8)).toBeLessThanOrEqual(8);
    expect(await firstVerse()).toBe(14);
    if (label === 'Greek') await shot(page, 'weave-switch-place-greek');
  }
});

// Turning Variants on or off keeps the verse that is on top (mw-9ji6ek0.45): the braces come into the text and leave it, every line reflows, and the place is a verse, not a number of
// pixels. His Romans 16, Variants On with the tail of verse 15 at the top went to verse 17 with Variants Off.
test('turning Variants on and off keeps the verse that is on top, Romans 16, in English, Weave and Greek', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=16&weave=solid');
  await expect(page.locator('[data-verse="10"] [data-text]')).toBeVisible();
  const chip = page.getByRole('button', { name: /^Variants,/ });
  const firstVerse = () =>
    page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const top = box.getBoundingClientRect().top;
      const el = [...document.querySelectorAll<HTMLElement>('[data-verse]')].find((v) => v.getBoundingClientRect().top >= top - 1);
      return Number(el?.dataset.verse);
    });
  const scrollTo = (verse: number) =>
    page.evaluate((n) => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const el = document.querySelector(`[data-verse="${n}"]`)!;
      box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
    }, verse);
  for (const label of ['English', 'Weave', 'Greek']) {
    await choice(page, label).click();
    await expect(choice(page, label)).toHaveAttribute('aria-pressed', 'true');
    await page.evaluate(() => (document.querySelector<HTMLElement>('main[data-reader]')!.scrollTop = 0));
    await scrollTo(15);
    await expect.poll(firstVerse).toBe(15);
    // Variants goes on, off, on: verse 15 is first at the top after each
    for (const on of ['true', 'false', 'true']) {
      await chip.click();
      await expect(chip).toHaveAttribute('aria-pressed', on);
      await expect.poll(firstVerse).toBe(15);
    }
    await shot(page, `weave-switch-variants-${label.toLowerCase()}`);
    // leave Variants Off for the next view
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
  }
});

// At the chapter's top the heading stays in view when Variants is turned on or off, as it does for a switch of the mode (mw-5r3p30.863).
test('turning Variants on at the top of the chapter leaves the heading in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=16');
  await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
  const chip = page.getByRole('button', { name: /^Variants,/ });
  for (const on of ['true', 'false']) {
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', on);
    expect(await page.evaluate(() => document.querySelector<HTMLElement>('main[data-reader]')!.scrollTop)).toBe(0);
  }
});

// Turn pages keeps its own anchor (src/reader/usePages.ts): Variants turned on or off re-cuts the pages, and the page he is on still holds the verse it began with, with no scrolling of the box.
test('Turn pages keeps its own anchor when Variants is turned on and off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'readingMode', value: 'pages' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      }),
  );
  await page.goto('/#/?b=rom&c=16');
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await expect(page.locator('[data-place-line]')).toHaveText(/Page 1 of \d+$/);
  const chip = page.getByRole('button', { name: /^Variants,/ });
  const scrollTop = () => page.evaluate(() => document.querySelector<HTMLElement>('main[data-reader]')!.scrollTop);
  // the verses that begin inside the reading box as it stands: the page he is on
  const onPage = () =>
    page.evaluate(() => {
      const b = document.querySelector<HTMLElement>('[data-reader]')!.getBoundingClientRect();
      return Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-verse]'))
        .filter((v) => {
          const r = v.getClientRects()[0];
          return r && r.left >= b.left - 1 && r.right <= b.right + 1;
        })
        .map((v) => Number(v.dataset.verse));
    });
  const first = (await onPage())[0];
  for (const on of ['true', 'false']) {
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', on);
    await expect.poll(async () => (await onPage()).includes(first)).toBe(true);
    expect(await scrollTop()).toBe(0);
  }
});

// The layout and the section headings reach an open Reader (a change by the tutor, or in Settings in another window) and lay every line again: the verse on top stays on top.
test('the layout changed under an open Reader keeps the verse that is on top', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=16');
  await expect(page.locator('[data-verse="10"] [data-text]')).toBeVisible();
  await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('main[data-reader]')!;
    const el = document.querySelector('[data-verse="12"]')!;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  });
  const firstVerse = () =>
    page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const top = box.getBoundingClientRect().top;
      const el = [...document.querySelectorAll<HTMLElement>('[data-verse]')].find((v) => v.getBoundingClientRect().top >= top - 1);
      return Number(el?.dataset.verse);
    });
  await expect.poll(firstVerse).toBe(12);
  const other = await context.newPage();
  await other.goto('/#/settings?setting=layout');
  await other.getByRole('button', { name: 'Paragraph', exact: true }).click();
  await expect(page.locator('main[data-reader]')).toHaveAttribute('data-layout', 'paragraph');
  await expect.poll(firstVerse).toBe(12);
  await other.getByRole('button', { name: 'Verse by verse', exact: true }).click();
  await expect(page.locator('main[data-reader]')).toHaveAttribute('data-layout', 'verse');
  await expect.poll(firstVerse).toBe(12);
});

// Text size and Font reach an open Reader at the root (src/appearance/appearanceSync.ts: html's --lp-scale and --lp-font-english), a change by the tutor or in Settings in another window,
// and every line is laid again at its new size: the verse on top stays on top (mw-9ji6ek0.46). A number of pixels is not a place.
test.describe('Text size, Font, the weave’s Grammar and the Immersive reader changed under an open Reader keep the verse that is on top', () => {
  const firstVerse = (page: Page) =>
    page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const top = box.getBoundingClientRect().top;
      const el = [...document.querySelectorAll<HTMLElement>('[data-verse]')].find((v) => v.getBoundingClientRect().top >= top - 1);
      return Number(el?.dataset.verse);
    });
  async function openAt12(page: Page, hash = '/#/?b=rom&c=16') {
    await page.setViewportSize({ width: 390, height: 844 });
    await openUnlocked(page);
    await page.goto(hash);
    await expect(page.locator('[data-verse="10"] [data-text]')).toBeVisible();
    await page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const el = document.querySelector('[data-verse="12"]')!;
      box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
    });
    await expect.poll(() => firstVerse(page)).toBe(12);
  }

  test('Text size', async ({ page }) => {
    await openAt12(page);
    // what the tutor's change does to the page: applyTextSize writes --lp-scale on html and nothing else reaches the Reader
    for (const scale of ['1.6', '0.85', '1']) {
      await page.evaluate((s) => document.documentElement.style.setProperty('--lp-scale', s), scale);
      await page.waitForTimeout(300);
      await expect.poll(() => firstVerse(page)).toBe(12);
    }
    await shot(page, 'weave-switch-text-size');
  });

  test('Font', async ({ page }) => {
    await openAt12(page);
    // what the tutor's change does to the page: applyFont writes --lp-font-english on html (the English faces follow it) and nothing else reaches the Reader
    const stacks = [
      '"Atkinson Hyperlegible", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      '"Lexend", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      '"Literata", Georgia, "Noto Serif", "Times New Roman", serif',
    ];
    for (const stack of stacks) {
      await page.evaluate((s) => document.documentElement.style.setProperty('--lp-font-english', s), stack);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await expect.poll(() => firstVerse(page)).toBe(12);
    }
    await shot(page, 'weave-switch-font');
  });

  // the rest of what the tutor can change under an open Reader and that lays its lines again: the weave's grammar dial and the Immersive reader, changed in Settings in another window
  for (const { key, group, buttons } of [
    { key: 'weaveGrammar', group: 'Grammar', buttons: ['Solid', 'Any'] },
    { key: 'immersiveReader', group: 'Immersive reader', buttons: ['On', 'Off'] },
  ]) {
    test(group, async ({ page, context }) => {
      await openAt12(page, '/#/?b=rom&c=16&weave=solid');
      const other = await context.newPage();
      await other.goto(`/#/settings?setting=${key}`);
      const row = other.getByRole('group', { name: group, exact: true });
      for (const name of buttons) {
        await row.getByRole('button', { name, exact: true }).click();
        await expect(row.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
        await page.waitForTimeout(1500);
        await expect.poll(() => firstVerse(page)).toBe(12);
      }
    });
  }
});

// A word he is learning draws its English hint under its Greek (src/reader/VerseText.tsx), so its line is taller. A word that gains or loses that hint under an open Reader (the tutor
// or Words, in another window, puts it on his learning list or takes it off) lays the lines again: the verse on top stays on top (mw-5r3p30.994).
test('a word gaining or losing its hint line under an open Reader keeps the verse that is on top', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=16&weave=solid%2Blearning');
  await expect(page.locator('[data-verse="10"] [data-text]')).toBeVisible();
  await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('main[data-reader]')!;
    const el = document.querySelector('[data-verse="12"]')!;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  });
  const firstVerse = () =>
    page.evaluate(() => {
      const box = document.querySelector<HTMLElement>('main[data-reader]')!;
      const top = box.getBoundingClientRect().top;
      const el = [...document.querySelectorAll<HTMLElement>('[data-verse]')].find((v) => v.getBoundingClientRect().top >= top - 1);
      return Number(el?.dataset.verse);
    });
  const hints = () => page.locator('[data-reader] [data-verse] [data-hint]').count();
  await expect.poll(firstVerse).toBe(12);
  const before = await hints();

  // Words in another window: a tap on a solid word makes it learning (a hint line under it where the text has it); a tap on a learning word asks to drop it, which takes the hint off
  const other = await context.newPage();
  await other.setViewportSize({ width: 390, height: 844 });
  await other.goto('/#/words');
  const solid = other.locator('button[data-lemma][data-state="solid"]');
  await expect(solid.first()).toBeVisible();
  const lemmas = await solid.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.lemma!));
  for (const lemma of lemmas) await other.locator(`button[data-lemma="${lemma}"]`).click();
  await expect.poll(hints).toBeGreaterThan(before);
  await page.waitForTimeout(1500);
  await expect.poll(firstVerse).toBe(12);
  await shot(page, 'weave-switch-hints-gained');

  const learning = other.locator('button[data-lemma][data-state="learning"]');
  const now = await learning.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.lemma!));
  for (const lemma of now) {
    await other.locator(`button[data-lemma="${lemma}"]`).click();
    await other.getByRole('button', { name: /^Drop/ }).click();
  }
  await expect.poll(hints).toBe(0);
  await page.waitForTimeout(1500);
  await expect.poll(firstVerse).toBe(12);
});
