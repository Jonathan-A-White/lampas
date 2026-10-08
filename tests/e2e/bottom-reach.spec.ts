// The last row of every scroll box can be scrolled clear of the phone's navigation bar (mw-5r3p30.39).
// A bar is faked two ways: the phone reports it (Chromium's safe-area override sets env(safe-area-inset-bottom)
// to 48 px), or the phone does not report it (the inset stays 0 and a 48 px bar still covers the bottom of the
// page, as on the Governor's Android Chrome). Either way the last row of a scroll box must clear 48 px, and a
// pinned bottom control must clear 24 px, the gesture bar's height.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const NAV_BAR = 48;
const GESTURE_BAR = 24;
const MODES = [
  { name: 'reported', inset: NAV_BAR },
  { name: 'unreported', inset: 0 },
];
const PHONES = [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x740', width: 360, height: 740 },
];

test.use({ isMobile: true, hasTouch: true });

async function withNavBar(page: Page, inset: number) {
  if (inset === 0) return;
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: inset, right: 0 } });
}

/** Scrolls the box holding `target` to its end; the target's bottom must then clear the nav bar. */
async function expectReachable(page: Page, target: Locator, box: string) {
  await target.evaluate((el, selector) => {
    const scroller = el.closest<HTMLElement>(selector);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, box);
  const rect = await target.boundingBox();
  const innerHeight = await page.evaluate(() => window.innerHeight);
  if (!rect) throw new Error('the last row has no box');
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.y + rect.height).toBeLessThanOrEqual(innerHeight - NAV_BAR + 0.5);
}

for (const phone of PHONES) for (const mode of MODES) {
  test.describe(`at ${phone.name} with a ${NAV_BAR} px navigation bar the phone ${mode.name === 'reported' ? 'reports' : 'does not report'}`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height } });

    test('Settings scrolls About clear of the navigation bar, and About opens', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/settings');
      await withNavBar(page, mode.inset);
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
      const about = page.getByRole('button', { name: 'About', exact: true });
      await expectReachable(page, about, '.screen');
      await shot(page, `bottom-settings-${phone.name}-${mode.name}`);
      await about.tap();
      await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
    });

    test('Words scrolls its last word clear of the navigation bar', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/words');
      await withNavBar(page, mode.inset);
      await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
      await expectReachable(page, page.locator('[data-lemma]').last(), '.screen');
      await shot(page, `bottom-words-${phone.name}-${mode.name}`);
    });

    test('the word sheet scrolls its last card clear of the navigation bar', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?c=8&view=greek');
      await withNavBar(page, mode.inset);
      await page.locator('[data-verse="1"] [data-word="1"]').tap();
      const sheet = page.getByRole('dialog', { name: 'Word' });
      await expect(sheet).toBeVisible();
      const body = sheet.locator('div.overflow-y-auto').first();
      await expectReachable(page, body.locator(':scope > *').last(), 'div.overflow-y-auto');
      await shot(page, `bottom-word-${phone.name}-${mode.name}`);
    });

    test('the Talk sheet keeps its Send button clear of the bar and its last turn reachable', async ({ page }) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
      await routePostern(page, fake);
      await openUnlocked(page);
      await page.goto('/');
      await withNavBar(page, mode.inset);
      await page.getByRole('button', { name: 'Verse 28', exact: true }).click();
      await page.getByRole('button', { name: 'Talk', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does συνεργεῖ mean here?');
      const send = sheet.getByRole('button', { name: 'Send', exact: true });
      await send.click();
      await expect(sheet.getByText(TALK_ANSWER.answer.slice(0, 20), { exact: false }).first()).toBeVisible();
      const innerHeight = await page.evaluate(() => window.innerHeight);
      const sendBox = await send.boundingBox();
      if (!sendBox) throw new Error('Send has no box');
      expect(sendBox.y + sendBox.height).toBeLessThanOrEqual(innerHeight - Math.max(mode.inset, GESTURE_BAR) + 0.5);
      // the last turn scrolls clear of the composer
      const list = sheet.locator('div.overflow-y-auto').first();
      await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
      const listBox = await list.boundingBox();
      const lastBox = await list.locator(':scope > *').last().boundingBox();
      if (!listBox || !lastBox) throw new Error('no talk list');
      expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(listBox.y + listBox.height + 0.5);
      await shot(page, `bottom-talk-${phone.name}-${mode.name}`);
    });
  });
}
