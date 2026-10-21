// tests/e2e/conversations.spec.ts — Conversations (mw-5r3p30.696) at phone width, 390x844: two kept talks, seeded as the Talk sheet leaves them. Settings > Account >
// Conversations lists both, the newest last turn first, each with its place in words, its date and the first line of its last question; the search narrows to the one
// whose answer holds the word and shows the matching line; a tap opens that talk in the Talk sheet with its earlier turns, and a new question can be sent (the grind
// is the fake Postern's). jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

/** Keeps two talks in the phone's database through raw IndexedDB, as the Talk sheet wrote them: a verse's, a few days old, and the Goal screen's, an hour old. */
async function keepTalks(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('talks', 'readwrite');
          const talks = tx.objectStore('talks');
          const now = Date.now();
          talks.add({ ref: 'rom.8.28', q: 'Why do all things work together?', a: 'Because God works in all things for good, by his steadfast love.', words: [], when: now - 3 * 86_400_000 });
          talks.add({ ref: 'rom.8.28', q: 'Who is the one who works?', a: 'God is the one who works.', words: [], when: now - 3 * 86_400_000 + 60_000 });
          talks.add({ ref: 'screen.goal', q: 'What should I learn next?\nAnd why that?', a: 'Begin with the article, which is the commonest word of all.', words: [], when: now - 3_600_000 });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('Conversations lists the kept talks newest first, searches them, and opens one to carry on', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/settings?group=account');
  await expect(page.getByRole('heading', { name: 'Account', exact: true, level: 1 })).toBeVisible();
  await keepTalks(page);
  await page.reload();

  // from the Settings menu, a thumb-tall row
  const menu = page.getByRole('button', { name: /^Conversations/ });
  await menu.scrollIntoViewIfNeeded();
  expect((await menu.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await menu.click();
  await expect(page.getByRole('heading', { name: 'Conversations', level: 1 })).toBeVisible();

  // both, the Goal screen's (an hour old) before the verse's (three days)
  const rows = page.locator('[data-recent-talk]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute('data-recent-talk', 'screen.goal');
  await expect(rows.nth(0)).toContainText('Ask the tutor: Goal');
  await expect(rows.nth(0)).toContainText('What should I learn next?'); // the first line of the last question
  await expect(rows.nth(0)).not.toContainText('And why that?');
  await expect(rows.nth(1)).toHaveAttribute('data-recent-talk', 'rom.8.28');
  await expect(rows.nth(1)).toContainText('Romans 8:28');
  await expect(rows.nth(1)).toContainText('Who is the one who works?'); // the last question, not the first
  for (let i = 0; i < 2; i++) {
    const box = await rows.nth(i).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'conversations');

  // the search narrows to the talk whose answer has the word, any case, and shows the line that has it
  const search = page.getByRole('searchbox', { name: 'Search conversations' });
  await search.fill('STEADFAST');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-recent-talk', 'rom.8.28');
  await expect(rows.first()).toContainText('Because God works in all things for good, by his steadfast love.');
  await shot(page, 'conversations-search');
  await search.fill('nobody said this');
  await expect(page.locator('[data-conversations-empty]')).toBeVisible();
  await search.fill('steadfast');

  // a tap opens the talk with its earlier turns, ready for the next question
  await rows.first().click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Why do all things work together?')).toBeVisible();
  await expect(sheet.getByText('Who is the one who works?')).toBeVisible();
  await shot(page, 'conversations-resumed');
  await (await talkField(sheet)).fill('And what does συνεργεῖ add?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText(TALK_ANSWER.answer.slice(0, 40), { exact: false }).first()).toBeVisible();
  expect(fake.received).toHaveLength(1);

  // closing the sheet returns to the list as it was
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(search).toHaveValue('steadfast');
  await expect(rows).toHaveCount(1);
});
