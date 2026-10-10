// The tutor's answer read aloud, interrupted by a tapped Hebrew word (mw-5r3p30.122) at 412x915: the speaking bar shows Pause, Restart and Stop over
// the answer in the Talk sheet and covers none of its text; a tap on the Hebrew word says it and leaves the answer PAUSED, the bar offering Resume,
// which goes on from the sentence it was in. The engine is bsv-kit's honest fake with a slow reader (tests/support/honest-fakes.ts).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const SENTENCES = [
  'Paul is describing righteousness as a status given by God, not earned by the one who receives it.',
  'The Hebrew word צֶדֶק (tsedeq) is about being in the right before God and before his people.',
  'That is why the next verses speak of no condemnation for those who are in Christ Jesus.',
];
const ANSWER = { answer: SENTENCES.join(' '), words: [] };

const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });

test('the bar sits clear of the answer, a tapped Hebrew word pauses the answer and Resume goes on from its sentence', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'], msPerWord: 250 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Where does righteousness come from?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn] [lang="he"]')).toHaveCount(1);

  // while the answer is read: the bar, 44 px targets, below every line of the answer
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  const box = await bar(page).boundingBox();
  const answerEnd = await page.evaluate(() => {
    const turn = document.querySelector('[data-turn]') as HTMLElement;
    let scroller: HTMLElement | null = turn;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    const r = (scroller ?? turn).getBoundingClientRect();
    return r.y + r.height;
  });
  expect(box && box.y >= answerEnd - 1).toBe(true);
  expect(box && box.x >= 0 && box.x + box.width <= 412).toBe(true);
  for (const name of ['Pause', 'Restart', 'Stop']) {
    const b = await bar(page).getByRole('button', { name, exact: true }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(43.5);
    expect(b?.width).toBeGreaterThanOrEqual(43.5);
  }
  await shot(page, 'speaking-interruption-playing');

  // the first sentence is heard; the tap on the Hebrew word interrupts the second
  await expect.poll(async () => (await spoken(page)).filter((e) => e.outcome === 'ended').length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  const before = (await spoken(page)).length;
  await sheet.locator('[data-turn] button:has([lang="he"])').click();
  // the guide opens over the sheet: the bar is in it, in view, with Resume
  const guide = page.getByRole('dialog', { name: 'How to say it' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('region', { name: 'Speaking', exact: true }).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  expect((await spoken(page)).slice(before)[0]).toMatchObject({ text: 'צֶדֶק', lang: 'he-IL' });
  await shot(page, 'speaking-interruption-paused');

  // Resume speaks on from the interrupted sentence, not from the start and not from the next one
  await expect.poll(async () => (await spoken(page)).filter((e) => e.lang === 'he-IL' && e.outcome === 'ended').length, { timeout: 15_000 }).toBe(1);
  const mark = (await spoken(page)).length;
  await bar(page).getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  const resumed = (await spoken(page)).slice(mark).map((e) => e.text);
  expect(resumed[0]).toContain('The Hebrew word');
  expect(resumed.join(' ')).not.toContain('Paul is describing');
});
