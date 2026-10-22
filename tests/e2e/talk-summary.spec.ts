// A talk remembers past its 10-turn window (mw-5r3p30.700): the phone keeps a running summary and sends it every turn, and the turns that fell out of the window go
// with the request to be folded into it. The fake tutor writes a summary the way the real one is asked to: the one it was sent, then each turn of `fold`.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';
import { shot } from './shot';

interface Sent {
  summary?: string;
  fold?: { q: string; a: string }[];
  history: { q: string; a: string }[];
}

test('the 15th request of a talk of 14 turns carries a summary naming a fact from turn 1', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.replyFor = (input) => {
    const sent = input as unknown as Sent;
    const folded = (sent.fold ?? []).map((t) => `He asked: ${t.q}`);
    return {
      status: 'answered',
      answer: {
        answer: `I remember: ${sent.summary ?? 'nothing yet'}`.slice(0, 1400),
        words: [],
        ...(folded.length > 0 ? { summary: [sent.summary, ...folded].filter(Boolean).join(' ').slice(0, 1000) } : {}),
      },
    };
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();

  /** says `words` as the talk's turn number `n`, the `sent`th request of the test, and waits for the answer to be drawn */
  const say = async (n: number, words: string, sent = n) => {
    const field = await talkField(sheet);
    await field.fill(words);
    await sheet.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(sheet.locator('[data-turn]')).toHaveCount(n);
    expect(fake.received).toHaveLength(sent);
  };
  await say(1, 'My son Luke is 14 and we read Greek on Sundays. What does ἀγάπη mean?');
  for (let n = 2; n <= 14; n++) await say(n, `Question ${n} about the verse.`);

  const inputs = fake.received.map((r) => r.input as unknown as Sent);
  // inside the window nothing is folded, and no summary is kept yet
  for (const sent of inputs.slice(0, 11)) {
    expect(sent.fold).toBeUndefined();
    expect(sent.summary).toBeUndefined();
  }
  // the 12th request is the first with a turn out of the window: turn 1, to be folded
  expect(inputs[11].history).toHaveLength(10);
  expect(inputs[11].fold?.map((t) => t.q)).toEqual(['My son Luke is 14 and we read Greek on Sundays. What does ἀγάπη mean?']);
  // the answer's summary was kept on the phone: the next request carries it, and folds the next turn
  expect(inputs[12].summary).toContain('Luke');
  expect(inputs[12].fold?.map((t) => t.q)).toEqual(['Question 2 about the verse.']);

  // the 15th request, asking about it
  await say(15, 'What did I tell you about my son?');
  const last = fake.received[14].input as unknown as Sent;
  expect(last.summary).toContain('Luke is 14');
  expect(last.history).toHaveLength(10);
  expect(last.history[0].q).toBe('Question 5 about the verse.');
  await shot(page, 'talk-summary');

  // New talk forgets the summary with the turns
  await sheet.getByRole('button', { name: 'New talk' }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(0);
  await say(1, 'A new start.', 16);
  const fresh = fake.received[15].input as unknown as Sent;
  expect(fresh.summary).toBeUndefined();
  expect(fresh.history).toEqual([]);
});
