// tests/e2e/talk-fetch.spec.ts — the passages the tutor asks for reach its next turn (mw-5r3p30.825). In his Revelation 6 talk the tutor asked for 6:2-17 and every later request held verse 1
// only. The mill is stubbed: its first answer asks to fetch Revelation 6:2-17; the sheet says so under the reply, and the next request it receives holds the text of 6:2.
import { expect, test } from '@playwright/test';
import { openTutor } from './open-tutor';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';
import { shot } from './shot';

interface Sent {
  held_passages?: { reference: string; greek: string; english: string }[];
  history: { q: string; a: string }[];
  verses?: string;
}

test('a talk on Revelation 6: the fetch of 6:2-17 is shown under the reply and the next request holds the text of 6:2', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.replyFor = (input) => {
    const sent = input as unknown as Sent;
    return {
      status: 'answered',
      answer: sent.held_passages?.length ? { answer: 'Now I have the fifth seal in front of me.', words: [] } : { answer: 'The four horses are the first four seals.', words: [], fetch: ['Revelation 6:2-17'] },
    };
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=6&view=english&weave=off');
  await openTutor(page);
  const sheet = page.getByRole('dialog', { name: 'Talk about Revelation 6' });
  await expect(sheet).toBeVisible();

  const say = async (n: number, words: string) => {
    await (await talkField(sheet)).fill(words);
    await sheet.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(sheet.locator('[data-turn]')).toHaveCount(n);
  };
  await say(1, 'What are the four horses?');
  await expect(sheet.locator('[data-talk-fetched]')).toHaveText(/^Tutor fetched Rev 6:2-\d+$/);
  expect((fake.received[0].input as unknown as Sent).held_passages).toBeUndefined();
  await shot(page, 'talk-fetched');

  await say(2, 'And what is the fifth seal?');
  expect(fake.received).toHaveLength(2);
  const second = fake.received[1].input as unknown as Sent;
  expect(second.held_passages).toHaveLength(1);
  expect(second.held_passages?.[0].reference).toMatch(/^Revelation 6:2-\d+$/);
  // the English of 6:2 as the Reader shows it, and its Greek
  expect(second.held_passages?.[0].english).toContain('a white horse');
  expect(second.held_passages?.[0].greek).toContain('λευκός');
  expect(second.history).toHaveLength(1);
});

test('a talk whose fetch reads nothing says so under the reply: Could not read Isaiah 53:5', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'That is in Isaiah.', words: [], fetch: ['Isaiah 53:5'] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=6&view=english&weave=off');
  await openTutor(page);
  const sheet = page.getByRole('dialog', { name: 'Talk about Revelation 6' });
  await (await talkField(sheet)).fill('Where is the suffering servant?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-talk-unread]')).toHaveText('Could not read Isaiah 53:5');
  await expect(sheet.locator('[data-talk-fetched]')).toHaveCount(0);
  await shot(page, 'talk-fetch-unread');
});
