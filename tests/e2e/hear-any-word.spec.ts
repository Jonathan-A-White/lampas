// A long press on any word of prose says it in its own language (mw-5r3p30.124) at 412x915 on the Romans 8:28 Verse view, where a tutor answer
// holds English, Greek and Hebrew. The engine is bsv-kit's honest fake (tests/support/honest-fakes.ts; headless Chromium has no Greek or Hebrew
// voice); how a real voice sounds, and the phone's own long-press menu, are only a phone check (docs/pwa-best-practices.md section 12).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

test.use({ viewport: { width: 412, height: 915 } });

const ANSWER = {
  answer: 'The word ἀγαθόν means good, and Paul’s righteousness echoes the Hebrew צֶדֶק (tsedeq), about being in the right before God.',
  words: [],
};

async function openAnswer(page: Page) {
  // a slow reader (5 s a word): the word is still being spoken when the spec looks at the page's highlight
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'], baseMs: 5000 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  const view = await chooseAction(page, 28, 'Ask the tutor');
  const box = view.getByRole('region', { name: 'Ask the tutor' });
  await box.getByRole('textbox', { name: 'Your question' }).fill('Where does righteousness come from?');
  await box.getByRole('button', { name: 'Ask', exact: true }).click();
  const card = view.locator('[data-answer]');
  await expect(card).toContainText('ἀγαθόν');
  // the answer is read aloud when it arrives: only what the press adds counts
  await page.waitForTimeout(300);
  return card;
}


/** Holds the mouse on the middle of `word` as the page draws it, for `ms`. */
async function hold(page: Page, word: string, ms: number) {
  const at = await page.evaluate((needle) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const i = node.textContent?.indexOf(needle) ?? -1;
      if (i >= 0 && node.parentElement?.closest('[data-answer]')) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + needle.length);
        const r = range.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    throw new Error(`no ${needle} in the answer`);
  }, word);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('a long press on a Hebrew word of the answer says it with lang he-IL, selects nothing and opens no guide', async ({ page }) => {
  await openAnswer(page);
  const before = (await spoken(page)).length;
  await hold(page, 'צֶדֶק', 700);
  await expect.poll(async () => (await spoken(page)).slice(before)).toMatchObject([{ text: 'צֶדֶק', lang: 'he-IL' }]);
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  expect(await page.evaluate(() => getComputedStyle(document.body).userSelect)).toBe('none');
  await expect(page.getByRole('dialog', { name: 'How to say it' })).toHaveCount(0);
  // the word is marked while it speaks (the page highlight, for as long as the engine speaks it)
  expect(await page.evaluate(() => CSS.highlights.has('hear-word'))).toBe(true);
  await shot(page, 'hear-any-word');
});

test('a long press on a Greek word and on an English word of the answer says each in its own language; a tap or a short press says nothing', async ({ page }) => {
  await openAnswer(page);
  const before = (await spoken(page)).length;
  await hold(page, 'ἀγαθόν', 700);
  await expect.poll(async () => (await spoken(page)).slice(before)).toMatchObject([{ text: 'ἀγαθόν', lang: 'el-GR' }]);
  await hold(page, 'righteousness', 700);
  await expect.poll(async () => (await spoken(page)).slice(before)).toMatchObject([
    { text: 'ἀγαθόν', lang: 'el-GR' },
    { text: 'righteousness', lang: 'en-US' },
  ]);
  await hold(page, 'good', 150);
  await page.waitForTimeout(200);
  expect((await spoken(page)).length - before).toBe(2);
});
