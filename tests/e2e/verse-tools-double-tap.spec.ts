// tests/e2e/verse-tools-double-tap.spec.ts — a thumb's double tap on a door of the Verse view's tools line ends where one tap does (mw-5r3p30.1105). The first tap on Memorize turns it into
// 'Memorizing · English' (89 px wide to 165 px) and 'Rehearse' appears, so the doors after it move right and 'Maps · 2' stood under the spot of the second tap: the Maps sheet opened over
// the memorized verse. At 390x844 with a touch screen, the settle moment as on his phone (SETTLE_MS), and both taps timed on the page's clock (tests/support/gesture.ts).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { pageTime, settledBox, tapTwice } from '../support/gesture';
import { SETTLE_MS } from '../../src/ui/settle';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** 390x844 is his phone. In a window short or narrow enough that the controls join the scrolling flow (390x400, 320x568) the line does not move up when the progress marks appear, so the
 * second tap lands on the very button the first one turned into 'Memorizing · English', which opened its language sheet. */
const SIZES = [
  { width: 390, height: 844, gaps: [0, 120, 400] },
  { width: 390, height: 400, gaps: [0, 120, 400] },
  { width: 320, height: 568, gaps: [0, 120, 400] },
];

// tapTwice times the two taps, and the guard its moment, on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/** Romans 8:11 in the Verse view, with the settle moment put back after openUnlocked's '0' and its own first moment passed. */
async function openVerse11(page: Page, size = { width: 390, height: 844 }) {
  await page.setViewportSize(size);
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/#/?b=rom&c=8&v=11');
  await page.reload();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  const tools = view.getByRole('group', { name: 'Tools', exact: true });
  await expect(tools.getByRole('button', { name: /^Maps · \d+$/ })).toBeVisible();
  // a Verse view swallows taps for the moment as it opens
  await pageTime(page, SETTLE_MS + 100);
  return { view, tools };
}

for (const size of SIZES) for (const gap of size.gaps) {
  test(`${size.width}x${size.height}: a double tap on Memorize, ${gap} ms apart, memorizes the verse and opens nothing`, async ({ page }) => {
    const { view, tools } = await openVerse11(page, size);
    const memorize = tools.getByRole('button', { name: 'Memorize', exact: true });
    const box = await settledBox(memorize);
    await tapTwice(page, box, gap, { touch: true });
    // what a second tap opens is drawn once the page's clock has run a little (a sheet comes in on a timer), so it runs before the look
    await pageTime(page, SETTLE_MS + 100);
    await expect(tools.getByRole('button', { name: /^Memorizing · English$/ })).toBeVisible();
    expect(await page.getByRole('dialog').count(), 'no sheet opened under the second tap').toBe(0);
    await expect(view).toBeVisible();
    await shot(page, `verse-tools-double-tap-memorize-${size.width}x${size.height}-${gap}`);
  });
}

// every door of the line whose tap changes the line's layout: the second tap does nothing more than the first did
for (const door of [/^Copy$/, /^Share$/, /^Memorize$/, /^Maps · \d+$/, /^Sermons · \d+$/, /^Listen$/, /^In Logos/]) for (const gap of [120, 400]) {
  test(`a double tap on ${door}, ${gap} ms apart, acts once`, async ({ page }) => {
    const { tools } = await openVerse11(page);
    const target = tools.getByRole('button', { name: door });
    test.skip((await target.count()) === 0, 'this door is not drawn for Romans 8:11');
    const before = await tools.getByRole('button').count();
    const box = await settledBox(target.first());
    await tapTwice(page, box, gap, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    // one tap leaves at most the sheet of the door itself; never a second sheet of the door that moved under the thumb
    const dialogs = await page.getByRole('dialog').all();
    expect(dialogs.length, 'at most the one sheet the first tap opens').toBeLessThanOrEqual(1);
    if (dialogs.length === 1) {
      const name = (await dialogs[0].getAttribute('aria-label')) ?? '';
      const label = (await target.first().textContent()) ?? '';
      const own = label.startsWith('Maps') ? /^Maps/ : label.startsWith('Sermons') ? /^Sermons/ : label.startsWith('Share') ? /share/i : label.startsWith('In Logos') ? /logos/i : /./;
      expect(name, 'the sheet that is open is the tapped door\'s').toMatch(own);
    }
    expect(before).toBeGreaterThan(0);
  });
}
