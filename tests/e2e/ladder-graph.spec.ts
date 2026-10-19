// tests/e2e/ladder-graph.spec.ts — the whole path as a graph (mw-foy5mb.5), at 390x844 with a touch screen: reached from the Goal screen, every idea a node,
// panned with a finger and pinch-zoomed with two without the page scrolling, a tap on a node opens the idea's sheet, Back returns to Goal.
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { LADDER } from '../../src/data/grammar/ladder';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

type Touch = { x: number; y: number; id: number };

const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Touch[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : points.map((p) => ({ x: p.x, y: p.y, id: p.id })) });

const scale = async (page: Page): Promise<number> => Number(await page.getByTestId('graph-world').getAttribute('data-scale'));
const worldAt = async (page: Page) => (await page.getByTestId('graph-world').getAttribute('transform'))!;

/** Puts levels in the app's own store through raw IndexedDB, as the app wrote them (tests/e2e/goal.spec.ts does the same). */
async function putLevels(page: Page, rows: object[]): Promise<void> {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('grammarLevels', 'readwrite');
          for (const row of list) tx.objectStore('grammarLevels').put(row);
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

/** Opens the Goal screen on a phone that is part way along the path: the letters and marks solid, the singular being learned. */
async function openGraph(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  const now = Date.now();
  // a fixed picture of a phone part way along, not a list of what a goal needs: it stays right as the ladder grows
  const solid = ['noun', 'alphabet', 'breathings', 'accents', 'punctuation', 'syllables'];
  await putLevels(page, [
    ...solid.map((id) => ({ id, level: 'solid', since: now, how: 'marked' })),
    { id: 'number-singular', level: 'frontier', since: now, how: 'sheet' },
  ]);
  // the app watches its own writes, not a raw one: load it again so it reads them
  await page.goto('/#/goal');
  await page.reload();
  await page.getByRole('button', { name: 'See the whole path' }).click();
  await expect(page.getByRole('heading', { name: 'The whole path', level: 1 })).toBeVisible();
  await expect(page.getByTestId('graph-world')).toBeAttached();
  await expect(page.locator('[data-idea="alphabet"]')).toHaveAttribute('data-state', 'solid');
  await expect(page.locator('[data-idea="number-singular"]')).toHaveAttribute('data-state', 'learning');
}

test('the whole path: every idea a node, pan and pinch without the page moving, a tap opens the idea, Back returns', async ({ page }) => {
  await openGraph(page);
  await expect(page.locator('[data-idea]')).toHaveCount(LADDER.length);
  await expect(page.locator('[data-edge]')).toHaveCount(LADDER.reduce((sum, idea) => sum + idea.needs.length, 0));
  await expect(page.getByTestId('graph-legend')).toContainText('Solid');
  await expect(page.getByTestId('graph-legend')).toContainText('Learning');
  await expect(page.getByTestId('graph-legend')).toContainText('Next');
  await expect(page.getByTestId('graph-legend')).toContainText('Not yet');

  const frame = page.getByTestId('ladder-graph');
  const box = (await frame.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // one finger pans the picture and the page stays where it was
  const before = await worldAt(page);
  await touch(cdp, 'touchStart', [{ x: cx, y: cy, id: 1 }]);
  for (let i = 1; i <= 6; i += 1) await touch(cdp, 'touchMove', [{ x: cx - i * 15, y: cy - i * 25, id: 1 }]);
  await touch(cdp, 'touchEnd', []);
  expect(await worldAt(page)).not.toBe(before);

  // two fingers apart zoom in, and back together zoom out
  const start = await scale(page);
  await touch(cdp, 'touchStart', [{ x: cx - 40, y: cy, id: 1 }, { x: cx + 40, y: cy, id: 2 }]);
  for (let i = 1; i <= 8; i += 1) await touch(cdp, 'touchMove', [{ x: cx - 40 - i * 12, y: cy, id: 1 }, { x: cx + 40 + i * 12, y: cy, id: 2 }]);
  await touch(cdp, 'touchEnd', []);
  const zoomed = await scale(page);
  expect(zoomed).toBeGreaterThan(start * 1.5);
  await touch(cdp, 'touchStart', [{ x: cx - 130, y: cy, id: 1 }, { x: cx + 130, y: cy, id: 2 }]);
  for (let i = 1; i <= 8; i += 1) await touch(cdp, 'touchMove', [{ x: cx - 130 + i * 12, y: cy, id: 1 }, { x: cx + 130 - i * 12, y: cy, id: 2 }]);
  await touch(cdp, 'touchEnd', []);
  expect(await scale(page)).toBeLessThan(zoomed / 1.5);

  // the page itself never moved or grew
  const page_ = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, top: document.documentElement.scrollTop, left: document.documentElement.scrollLeft }));
  expect(page_.w).toBeLessThanOrEqual(page_.cw);
  expect(page_.top).toBe(0);
  expect(page_.left).toBe(0);

  // the buttons zoom too
  const level = await scale(page);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  expect(await scale(page)).toBeGreaterThan(level);
  await page.getByRole('button', { name: 'Where I am' }).click();
  await shot(page, 'ladder-graph');
});

test('a tap on a node opens that idea, and Back from the path returns to Goal', async ({ page }) => {
  await openGraph(page);
  // the first view is on the idea he is learning, so its node is in the middle of the frame and can be tapped with the finger
  const node = page.locator('[data-idea="number-singular"]');
  await expect(node).toBeVisible();
  const title = (await node.getAttribute('aria-label'))!.split(':')[0];
  await node.tap();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(title);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await page.getByRole('button', { name: '‹ Goal' }).click();
  await expect(page.getByRole('heading', { name: 'Goal', level: 1 })).toBeVisible();
});

/** The ideas whose node lies wholly inside the graph's own box, and whether the focused node does. */
const insideFrame = (page: Page) =>
  page.evaluate(() => {
    const frame = document.querySelector('[data-testid="ladder-graph"]')!.getBoundingClientRect();
    const inside = (r: DOMRect) => r.left >= frame.left && r.right <= frame.right && r.top >= frame.top && r.bottom <= frame.bottom;
    return [...document.querySelectorAll('[data-idea]')].filter((n) => inside(n.getBoundingClientRect())).map((n) => n.getAttribute('data-idea')!);
  });

test('from the keyboard: Tab brings each idea into the graph, and the pan buttons move it', async ({ page }) => {
  await openGraph(page);
  const frame = page.getByTestId('ladder-graph');
  const ideas = page.locator('[data-idea]');
  await page.getByRole('button', { name: '‹ Goal' }).focus();
  await page.keyboard.press('Tab');
  await expect(ideas.first()).toBeFocused();

  // every idea, the first to the last, is wholly in the graph's box when Tab reaches it
  const box = (await frame.boundingBox())!;
  for (let i = 0; i < LADDER.length; i += 1) {
    const focused = page.locator('[data-idea]:focus');
    await expect(focused).toHaveCount(1);
    const at = (await focused.boundingBox())!;
    const id = await focused.getAttribute('data-idea');
    expect(at.x, `${id} (${i}) left`).toBeGreaterThanOrEqual(box.x);
    expect(at.x + at.width, `${id} (${i}) right`).toBeLessThanOrEqual(box.x + box.width);
    expect(at.y, `${id} (${i}) top`).toBeGreaterThanOrEqual(box.y);
    expect(at.y + at.height, `${id} (${i}) bottom`).toBeLessThanOrEqual(box.y + box.height);
    await page.keyboard.press('Tab');
  }

  // the pan buttons come after the ideas and each moves what is in view
  await page.getByRole('button', { name: 'Where I am' }).click();
  for (const name of ['Pan up', 'Pan left', 'Pan down', 'Pan right']) {
    const before = (await insideFrame(page)).join();
    const world = await worldAt(page);
    await page.getByRole('button', { name }).click();
    expect(await worldAt(page), `${name} moves the picture`).not.toBe(world);
    expect((await insideFrame(page)).join(), `${name} changes the ideas in view`).not.toBe(before);
  }
  await shot(page, 'ladder-graph-keyboard');
});
