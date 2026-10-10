// The round Ask the tutor control (mw-5r3p30.91) at phone width: the same place on every full screen, thumb-sized, inside the window, clear of the
// screen's own buttons once the screen is scrolled to its end (and above the Reader's Talk bar and Import's Add bar), hidden while a sheet is open;
// the sheet it opens from Goal fits the phone and its suggested questions send. Ends with shots of the control on Goal and the Reader and of the sheet.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT });

const CONTROL = 'Ask the tutor about this screen';

type Rect = { x: number; y: number; width: number; height: number };

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
async function putSetting(page: Page, key: string, value: string) {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value] as const,
  );
}

const seeded = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const idb = open.result;
          if (!idb.objectStoreNames.contains('meta')) {
            idb.close();
            return resolve(false);
          }
          const get = idb.transaction('meta').objectStore('meta').get('grammarLevelsSeeded');
          get.onsuccess = () => {
            idb.close();
            resolve(get.result !== undefined);
          };
          get.onerror = () => {
            idb.close();
            resolve(false);
          };
        };
      }),
  );

/** The first open, then a goal, then the page loaded again so it reads the goal. */
async function openWithGoal(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  await putSetting(page, 'goal', '1 John 1:1');
  await page.reload();
}

const rectOf = async (target: Locator): Promise<Rect> => {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  return box;
};

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Scrolls the screen's own scroll box to its end. */
async function scrollToEnd(page: Page) {
  await page.evaluate(() => {
    for (const box of document.querySelectorAll<HTMLElement>('.screen')) box.scrollTop = box.scrollHeight;
  });
}

/** The visible buttons, links and fields of the page other than the control, as boxes. */
async function controlsOnPage(page: Page): Promise<{ name: string; rect: Rect }[]> {
  return page.evaluate((label) => {
    const out: { name: string; rect: { x: number; y: number; width: number; height: number } }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="button"]')) {
      if (el.getAttribute('aria-label') === label) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      out.push({ name: el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 30), rect: { x: r.x, y: r.y, width: r.width, height: r.height } });
    }
    return out;
  }, CONTROL);
}

const SCREENS: { name: string; path: string; ready: (page: Page) => Locator }[] = [
  { name: 'Goal', path: '/#/goal', ready: (p) => p.getByTestId('goal-title') },
  { name: 'Words', path: '/#/words', ready: (p) => p.getByRole('heading', { name: 'Words', level: 1 }) },
  { name: 'Review', path: '/#/review', ready: (p) => p.getByRole('heading', { name: 'Review', level: 1 }) },
  { name: 'Quick test', path: '/#/test', ready: (p) => p.getByRole('heading', { name: 'Quick test', level: 1 }) },
  { name: 'Parsing drill', path: '/#/drill', ready: (p) => p.getByRole('heading', { name: 'Parsing drill', level: 1 }) },
  { name: 'Paradigms', path: '/#/paradigms', ready: (p) => p.getByRole('heading', { name: 'Paradigms', level: 1 }) },
  { name: 'Placement', path: '/#/placement', ready: (p) => p.getByRole('heading', { name: 'Placement', level: 1 }) },
  { name: 'Settings', path: '/#/settings', ready: (p) => p.getByRole('heading', { name: 'Settings', level: 1 }) },
  { name: 'My study way', path: '/#/studyway', ready: (p) => p.getByRole('heading', { name: 'My study way', level: 1 }) },
  { name: 'Preface', path: '/#/preface', ready: (p) => p.getByRole('heading', { name: 'Preface', level: 1 }) },
  { name: 'Import', path: '/#/import', ready: (p) => p.getByRole('heading', { name: 'Import', level: 1 }) },
  { name: 'About', path: '/#/about', ready: (p) => p.getByRole('heading', { name: 'About', level: 1 }) },
];

test('the control is in the same place on every full screen, thumb-sized, inside the window and clear of the screen\'s own buttons', async ({ page }) => {
  test.setTimeout(120_000);
  await openWithGoal(page);
  const rights = new Set<number>();
  const bottoms = new Map<string, number>();
  for (const { name, path, ready } of SCREENS) {
    await page.goto(path);
    await expect(ready(page), name).toBeVisible();
    const control = page.getByRole('button', { name: CONTROL });
    await expect(control, name).toHaveCount(1);
    await expect(control, name).toBeVisible();
    const box = await rectOf(control);
    expect(box.width, name).toBeGreaterThanOrEqual(44);
    expect(box.height, name).toBeGreaterThanOrEqual(44);
    expect(box.x, name).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, name).toBeLessThanOrEqual(VIEWPORT.width);
    expect(box.y + box.height, name).toBeLessThanOrEqual(VIEWPORT.height - 48 + 0.5);
    rights.add(Math.round(box.x + box.width));
    bottoms.set(name, Math.round(box.y + box.height));
    await scrollToEnd(page);
    for (const other of await controlsOnPage(page)) expect(overlaps(box, other.rect), `${name}: the control is over "${other.name}"`).toBe(false);
  }
  // one right edge everywhere; one bottom edge everywhere but where the screen pins a bar of its own
  expect([...rights]).toHaveLength(1);
  const plain = [...bottoms.entries()].filter(([name]) => name !== 'Import').map(([, bottom]) => bottom);
  expect(new Set(plain).size).toBe(1);
  expect(bottoms.get('Import')).toBeLessThan(plain[0]);
});

test('on the Reader the control sits above the Talk bar, in the same corner', async ({ page }) => {
  await openWithGoal(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const control = page.getByRole('button', { name: CONTROL });
  await expect(control).toBeVisible();
  const box = await rectOf(control);
  const bar = await rectOf(page.getByRole('button', { name: 'Talk', exact: true }));
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
  expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
  const goal = await (async () => {
    await page.goto('/#/goal');
    await expect(page.getByTestId('goal-title')).toBeVisible();
    return rectOf(page.getByRole('button', { name: CONTROL }));
  })();
  expect(Math.round(box.x + box.width)).toBe(Math.round(goal.x + goal.width));
  await page.goto('/#/?b=rom&c=8');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await scrollToEnd(page);
  await page.evaluate(() => {
    const reader = document.querySelector<HTMLElement>('[data-reader]');
    if (reader) reader.scrollTop = reader.scrollHeight;
  });
  for (const other of await controlsOnPage(page)) expect(overlaps(box, other.rect), `the control is over "${other.name}"`).toBe(false);
  await shot(page, 'ask-tutor-reader');

  // it opens the chapter talk, with questions fitted to it
  await control.click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-suggestion]')).toHaveCount(3);
  await expect(control).toHaveCount(0);
});

test('from Goal: the control, the sheet that fits the phone with its questions, and a tap that sends one', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openWithGoal(page);
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await expect(page.getByTestId('learn-next')).toBeVisible();
  const control = page.getByRole('button', { name: CONTROL });
  await expect(control).toBeVisible();
  await shot(page, 'ask-tutor-goal');

  // the control is not over Read it, once the screen is scrolled to its end
  await scrollToEnd(page);
  const read = await rectOf(page.getByRole('button', { name: 'Read it', exact: true }));
  expect(overlaps(await rectOf(control), read)).toBe(false);

  await control.click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Goal' });
  await expect(sheet).toBeVisible();
  await expect(control).toHaveCount(0);
  const questions = sheet.locator('[data-suggestion]');
  await expect(questions).toHaveCount(3);
  await expect(questions.first()).toHaveText("What's the simplest verse in the New Testament for me to learn first, given where I am?");
  for (const box of await questions.all()) {
    const rect = await rectOf(box);
    expect(rect.height).toBeGreaterThanOrEqual(47.5);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(VIEWPORT.width);
  }
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'ask-tutor-sheet');

  await questions.first().click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  // the two not yet asked stay, and New talk is in the header beside Done, inside the phone
  await expect(sheet.locator('[data-suggestion]')).toHaveCount(2);
  const newTalk = await rectOf(sheet.getByRole('button', { name: 'New talk' }));
  expect(newTalk.height).toBeGreaterThanOrEqual(43.5);
  expect(newTalk.x + newTalk.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ reference: 'Goal', screen: { name: 'Goal' } });

  // Done: the sheet goes, the control comes back, and the talk is there on return
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(control).toBeVisible();
  await control.click();
  await expect(page.getByRole('dialog', { name: 'Ask the tutor: Goal' }).locator('[data-turn]')).toHaveCount(1);
});
