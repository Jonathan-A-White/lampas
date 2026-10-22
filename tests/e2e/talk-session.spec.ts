// A talk names itself to the mill and keeps the key points the tutor wrote at a refresh (mw-pxji7y.3). The fake tutor says what the real one does of its session:
// `talk` beside the answer (session fresh | resumed | refreshed, and the key points once, when refreshed).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, type FakePostern, type Reply } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';
import { shot } from './shot';

const LINE = 'The tutor wrote down the key points of this talk so far';
const KEY_POINTS = 'He is Jonathan; his son Luke is 14 and they read Greek together on Sundays. Talked of ἀγάπη in Romans 8:28.';

/** every row of an object store of the phone's database */
const rows = <T>(page: Page, store: string): Promise<T[]> =>
  page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const all = idb.transaction(name).objectStore(name).getAll();
          all.onsuccess = () => {
            idb.close();
            resolve(all.result);
          };
          all.onerror = () => reject(all.error);
        };
      }),
    store,
  ) as Promise<T[]>;

const talkOf = (fake: FakePostern, i: number): string | undefined => fake.received[i].grist.talk;

async function openTalk(page: Page, fake: FakePostern) {
  await page.setViewportSize({ width: 390, height: 844 });
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  /** says `words` as the talk's turn number `n` and waits for its answer to be drawn */
  const say = async (n: number, words: string) => {
    const field = await talkField(sheet);
    await field.fill(words);
    await sheet.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(sheet.locator('[data-turn]')).toHaveCount(n);
    expect(fake.received).toHaveLength(n);
  };
  return { sheet, say };
}

test('a talk of three turns sends the same talk id on all three, made of its ref and the first turn\'s time; New talk makes another', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Yes.', words: [] }, talk: { session: 'resumed', turns: 2, context_tokens: 61000 } };
  const { sheet, say } = await openTalk(page, fake);
  await say(1, 'First.');
  await say(2, 'Second.');
  await say(3, 'Third.');
  const talk = talkOf(fake, 0);
  expect(talk).toMatch(/^rom\.8\.28@\d{13}$/);
  expect(talkOf(fake, 1)).toBe(talk);
  expect(talkOf(fake, 2)).toBe(talk);
  // the first turn is kept with the very time the id carries
  const turns = await rows<{ ref: string; when: number }>(page, 'talks');
  expect(turns.map((t) => t.ref)).toEqual(['rom.8.28', 'rom.8.28', 'rom.8.28']);
  expect(`rom.8.28@${Math.min(...turns.map((t) => t.when))}`).toBe(talk);
  // 'resumed' shows nothing
  await expect(sheet.getByText(LINE)).toHaveCount(0);

  // New talk starts a new one by itself
  await sheet.getByRole('button', { name: 'New talk' }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(0);
  await page.waitForTimeout(5);
  const field = await talkField(sheet);
  await field.fill('A new start.');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  expect(fake.received).toHaveLength(4);
  expect(talkOf(fake, 3)).toMatch(/^rom\.8\.28@\d{13}$/);
  expect(talkOf(fake, 3)).not.toBe(talk);
});

test('a refreshed talk replaces the summary with the key points and says so once; fresh and resumed say nothing', async ({ page }) => {
  const fake = makeFakePostern();
  const sessions: Reply['talk'][] = [
    { session: 'fresh', reason: 'new', turns: 1, context_tokens: 61000 },
    { session: 'refreshed', turns: 1, context_tokens: 4000, key_points: KEY_POINTS },
    { session: 'resumed', turns: 2, context_tokens: 5000 },
  ];
  let n = 0;
  fake.replyFor = () => ({ status: 'answered', answer: { answer: 'Yes.', words: [] }, talk: sessions[n++] });
  const { sheet, say } = await openTalk(page, fake);

  await say(1, 'My son Luke is 14.');
  await expect(sheet.getByText(LINE)).toHaveCount(0);
  expect(await rows(page, 'talkSummaries')).toEqual([]);

  await say(2, 'And what does ἀγάπη mean?');
  const line = sheet.getByRole('button', { name: LINE });
  await expect(line).toHaveCount(1);
  const kept = await rows<{ ref: string; summary: string; covered: number }>(page, 'talkSummaries');
  expect(kept).toHaveLength(1);
  expect(kept[0]).toMatchObject({ ref: 'rom.8.28', summary: KEY_POINTS, covered: 1 });

  await say(3, 'Thank you.');
  await expect(sheet.getByText(LINE)).toHaveCount(1);
  // the next request still sends the history, with the key points as its summary
  expect((fake.received[2].input as { history: unknown[]; summary?: string }).history).toHaveLength(2);
  expect((fake.received[2].input as { summary?: string }).summary).toBe(KEY_POINTS);

  // tapping the line shows the key points
  await line.click();
  const points = page.getByRole('dialog', { name: 'Key points of this talk' });
  await expect(points).toBeVisible();
  await expect(points).toContainText(KEY_POINTS);
  await shot(page, 'talk-key-points');
  await points.getByRole('button', { name: 'Done' }).click();
  await expect(points).toHaveCount(0);
  await expect(sheet).toBeVisible();
});
