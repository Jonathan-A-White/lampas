// The round Ask the tutor button and Review's Next (mw-86e9r1.27): the Tester saw, on an answered 'Which idea is this?' card at 390x844, the round button
// standing over the right end of Next (Next y 715 to 762, the button y 728 to 783), so a tap there could open Ask. On every answered card of a round that
// holds grammar ideas (concept cards among them) and words, upright, the Next button (Finish on the last card) and the round button do not meet.
import { expect, test, type Page } from '@playwright/test';
import { LADDER } from '../../src/data/grammar/ladder';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const BUTTON = 'button[data-ask-tutor]';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Puts schedule rows in the app's own store through raw IndexedDB, as the app wrote them.
async function putReviews(page: Page, rows: object[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('reviews', 'readwrite');
          for (const row of list) tx.objectStore('reviews').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

test('on every answered Review card, Next (Finish at the end) and the round Ask button do not overlap', async ({ page }) => {
  await openUnlocked(page);
  await honestSpeech(page, { langs: ['el-GR'] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  // ideas whose forms are rare in a passage, due now on the schedule's first step: with no form to ask about, a card asks 'Which idea is this?'
  const rare = ['voice-none', 'voice-impersonal-active', 'pronoun-reciprocal', 'pronoun-correlative', 'mood-optative', 'mood-participle-imperative'];
  const ideas = LADDER.filter((i) => rare.includes(i.id));
  expect(ideas).toHaveLength(rare.length);
  const now = Date.now();
  await putReviews(page, ideas.map((i) => ({ kind: 'grammar', id: i.id, step: 0, due: now - 60_000, lastWhen: 0, lapses: 0, rights: 0 })));
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const counter = page.getByText(/^1 of \d+$/);
  await expect(counter).toBeVisible();
  const total = Number((await counter.innerText()).replace(/^1 of /, ''));
  const prompt = page.getByTestId('prompt').or(page.getByTestId('grammar-prompt'));
  let concepts = 0;
  for (let i = 0; i < total; i += 1) {
    await expect(page.getByText(`${i + 1} of ${total}`, { exact: true })).toBeVisible();
    await expect(prompt).toBeVisible();
    const asked = (await prompt.innerText()).slice(0, 40);
    const show = page.getByRole('button', { name: 'Show', exact: true });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: /^(Not yet|Don't know)$/ }).click();
    } else {
      await page.locator('[data-option]').first().click();
    }
    const next = page.getByTestId('next');
    await expect(next).toBeVisible();
    await expect(next).toHaveText(i === total - 1 ? 'Finish' : 'Next');
    const ask = page.locator(BUTTON);
    await expect(ask).toBeVisible();
    // the bar is sticky and the card's feedback may still be drawing: read both boxes once they have settled
    await page.waitForTimeout(200);
    const nextBox = await next.boundingBox();
    const askBox = await ask.boundingBox();
    if (!nextBox || !askBox) throw new Error('no box');
    expect(meets(nextBox, askBox), `card ${i + 1} of ${total} ("${asked}"): Next ${JSON.stringify(nextBox)} meets the Ask button ${JSON.stringify(askBox)}`).toBe(false);
    if (asked.startsWith('Which idea is this?') && concepts++ === 0) await shot(page, 'review-next-ask-concept');
    await next.click();
  }
  await expect(page.getByTestId('score')).toBeVisible();
  // the round held the card the Tester saw
  expect(concepts, 'a "Which idea is this?" card came').toBeGreaterThan(0);
});
