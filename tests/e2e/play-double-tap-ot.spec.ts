// tests/e2e/play-double-tap-ot.spec.ts — a quick second tap on the Reader header's Play in an Old Testament chapter (mw-zbgo4ep.54). The report: in Leviticus 4 the second tap of a
// double tap on 'Read from the top' opened 'Choose a book' over the reading, because the button is gone the moment the speaking bar comes (src/speech/ReadControls.tsx) and the
// chapter's name beside it grows into its place. The app-wide tap guard (src/ui/tapGuard.ts, mw-ar5k42b.27) swallows the moment after a tap that brings the bar; this spec holds
// it for Leviticus, whose header carries the English | Hebrew switch (wider than John's English | Greek) and, on first open, the Weave.
// At 390x844 with a touch screen and the settle moment as on his phone (lampas.settleMs is put back from openUnlocked's 0), Play's centre is tapped twice 120 ms apart on the page's clock.
// The sweep: the header buttons whose click changes which buttons the header draws are the Play (ReadFromButton, 'Read from the top' / 'Read from here') and, while a reading is
// not on the speaking bar (reading.onBar false: never in the app today, the bar takes every reading), its Pause | Play and Stop; 'Read from here' shows only while a verse is
// selected, which is while its Verse view covers the header, so it cannot be tapped (tests/e2e/play-double-tap.spec.ts says the same). The Play is the only one that can be tapped.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech } from '../support/honest-fakes';
import { pageTime, tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// tapTwice times the two taps, and the guard its moment, on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const hashOf = (page: Page): Promise<string> => page.evaluate(() => window.location.hash);

/** A licensed phone with the settle moment as on his phone (unset, the moment is SETTLE_MS), Leviticus 4 opened at `address`. */
async function openLeviticus4(page: Page, address: string): Promise<void> {
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.removeItem('lampas.settleMs'));
  await honestSpeech(page, { msPerWord: 400 });
  await page.goto(`/#/?b=lev&c=4${address}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Leviticus 4', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // the real settle is on: the moment of the page's own opening has to pass
  await pageTime(page, 2000);
}

for (const [name, address] of [
  ['as it opens', ''],
  ['in English with nothing woven', '&view=english&weave=off'],
] as const) {
  test(`the Reader, Leviticus 4 ${name}: 'Read from the top' tapped twice 120 ms apart reads on and opens no 'Choose a book'`, async ({ page }) => {
    await openLeviticus4(page, address);
    const before = await hashOf(page);
    await tapTwice(page, page.getByRole('button', { name: 'Read from the top', exact: true }), 120, { touch: true });
    const bar = page.getByRole('region', { name: 'Speaking', exact: true });
    await expect(bar).toHaveCount(1);
    await pageTime(page, 1000);
    await expect(bar).toHaveAttribute('data-state', 'playing');
    await expect(page.getByText('Choose a book')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await hashOf(page), 'the address').toBe(before);
    if (address === '') await shot(page, 'play-double-tap-leviticus');
  });
}
