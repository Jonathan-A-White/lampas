// The tutor's `go` (mw-5r3p30.172), three taste fixes (mw-5r3p30.199): the Reader's header shows the whole chapter title at 390 and 360 px, a go to the chapter he is
// already on moves nothing and says so, and an answer that comes after he closed Talk says that is why it did not move him, with a tap that opens the chapter then.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';

/** Opens the Reader at `hash` unlocked, the mill answering every talk with `go` (or holding its answers when `go` is false). */
async function openTalk(page: Page, hash: string, sheetName: string, go: { book: string; chapter: number } | false): Promise<FakePostern> {
  const fake = makeFakePostern();
  if (go) fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, answer: `Taking you to ${go.book} ${go.chapter}.`, go } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto(hash);
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  await expect(page.getByRole('dialog', { name: sheetName })).toBeVisible();
  return fake;
}

async function ask(page: Page, sheetName: string, question: string) {
  const sheet = page.getByRole('dialog', { name: sheetName });
  await (await talkField(sheet)).fill(question);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  return sheet;
}

/** How many turns of any talk the app has kept (raw IndexedDB, as the app wrote them). */
function keptTurns(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('talks')) {
            db.close();
            return resolve(0);
          }
          const count = db.transaction('talks').objectStore('talks').count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => {
            db.close();
            resolve(0);
          };
        };
      }),
  );
}

/** The header's title text is whole: nothing cut off by an ellipsis or the box, and it reads `title`. */
async function expectWholeTitle(page: Page, title: string) {
  const heading = page.getByRole('heading', { name: title, level: 1 });
  await expect(heading).toBeVisible();
  const cut = await heading.evaluate((h) => {
    const text = h.querySelector('button span');
    if (!(text instanceof HTMLElement)) return { missing: true };
    const spans = [h, text, ...Array.from(h.querySelectorAll('*'))] as HTMLElement[];
    return { missing: false, over: spans.filter((el) => el.scrollWidth > el.clientWidth + 0.5).length, ellipsis: getComputedStyle(text).textOverflow === 'ellipsis' };
  });
  expect(cut).toEqual({ missing: false, over: 0, ellipsis: false });
  const header = await page.locator('header').first().evaluate((el) => ({ right: el.getBoundingClientRect().right, wide: el.scrollWidth > el.clientWidth }));
  expect(header.wide).toBe(false);
  const box = await heading.boundingBox();
  const switchBox = await page.getByRole('group', { name: 'Language', exact: true }).boundingBox();
  // Beside the switch on a line the title shares with it, the title ends before the switch begins; under 390 px (mw-5r3p30.768) the switch has a line of
  // its own below the title, and the title is then wholly above it.
  const below = (switchBox?.y ?? 0) >= (box?.y ?? 0) + (box?.height ?? 0) - 0.5;
  if (!below) expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((switchBox?.x ?? 0) + 0.5);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test.describe(`at ${viewport.width} x ${viewport.height}`, () => {
    test.use({ viewport });

    test('a go to 1 Thessalonians 5 shows its whole title in the header', async ({ page }) => {
      await openTalk(page, '/', 'Talk about Romans 8', { book: '1 Thessalonians', chapter: 5 });
      await ask(page, 'Talk about Romans 8', 'take me to 1 Thessalonians 5');
      await expect(page.getByText('Opened 1 Thessalonians 5')).toBeVisible();
      await expectWholeTitle(page, '1 Thessalonians 5');
      await shot(page, `go-long-title-${viewport.width}`);
    });

    test('the longest titles of the New Testament are whole', async ({ page }) => {
      await routePostern(page, makeFakePostern());
      await openUnlocked(page);
      for (const [hash, title] of [
        ['b=2th&c=3', '2 Thessalonians 3'],
        ['b=1th&c=5', '1 Thessalonians 5'],
        ['b=2co&c=13', '2 Corinthians 13'],
        ['b=1co&c=16', '1 Corinthians 16'],
        ['b=phm&c=1', 'Philemon 1'],
        ['b=col&c=1', 'Colossians 1'],
        ['b=rev&c=22', 'Revelation 22'],
      ]) {
        await page.goto(`/#/?${hash}&view=english`);
        await expectWholeTitle(page, title);
      }
    });
  });
}

test.describe('at 390 x 844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a go to the chapter he is on moves nothing, keeps the view and weave and adds no Back step', async ({ page }) => {
    await openTalk(page, '/#/?b=rom&c=8&view=greek&weave=off', 'Talk about Romans 8', { book: 'Romans', chapter: 8 });
    const before = await page.evaluate(() => ({ length: window.history.length, hash: window.location.hash }));
    const sheet = await ask(page, 'Talk about Romans 8', 'open Romans 8');
    await expect(sheet.locator('[data-turn]')).toContainText('Taking you to Romans 8.');
    await expect(sheet.getByText('Already on Romans 8')).toBeVisible();
    await expect(sheet.getByText(/Could not open/)).toHaveCount(0);
    await expect(sheet.getByText('Opened Romans 8')).toHaveCount(0);
    // the sheet stays open and the Reader has not moved
    await expect(sheet).toBeVisible();
    const after = await page.evaluate(() => ({ length: window.history.length, hash: window.location.hash }));
    expect(after.length).toBe(before.length);
    expect(after.hash).toContain('view=greek');
    expect(after.hash).toContain('weave=off');
    expect(after.hash).toBe(before.hash);
    await shot(page, 'go-already-there');
  });

  test('an answer that comes after he pressed Done says he closed Talk, and a tap on Open John 3 opens it', async ({ page }) => {
    const fake = await openTalk(page, '/', 'Talk about Romans 8', false);
    const sheet = await ask(page, 'Talk about Romans 8', 'take me to John 3');
    await expect.poll(() => fake.received.length).toBe(1);
    await sheet.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(sheet).toBeHidden();
    await fake.answer({ status: 'answered', answer: { ...TALK_ANSWER, answer: 'Taking you to John 3.', go: { book: 'John', chapter: 3 } } });
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    // the app polls the mill every 3 s: wait until it has kept the answer before opening Talk again, or the open sheet would be taken to John 3
    await expect.poll(() => keptTurns(page), { timeout: 15_000 }).toBe(1);
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Talk', exact: true }).click();
    const again = page.getByRole('dialog', { name: 'Talk about Romans 8' });
    await expect(again.locator('[data-turn]')).toContainText('Taking you to John 3.');
    await expect(again.getByText('You closed Talk before this came, so John 3 was not opened')).toBeVisible();
    await expect(again.getByText(/Could not open/)).toHaveCount(0);
    await shot(page, 'go-after-done');

    await again.getByRole('button', { name: 'Open John 3' }).click();
    await expect(page.getByRole('heading', { name: 'John 3', level: 1 })).toBeVisible();
    await expect(page.getByText('Opened John 3')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();

    // once opened, the turn no longer says it was not (mw-5r3p30.216)
    await page.getByRole('button', { name: 'Talk', exact: true }).click();
    const last = page.getByRole('dialog', { name: 'Talk about Romans 8' });
    await expect(last.getByText('Opened John 3')).toBeVisible();
    await expect(last.getByText(/was not opened/)).toHaveCount(0);
    await expect(last.getByRole('button', { name: 'Open John 3' })).toHaveCount(0);
    await shot(page, 'go-reopen-after-opened');
  });
});
