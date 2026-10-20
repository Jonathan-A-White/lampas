// tests/e2e/ladder-graph.spec.ts — the whole path as a graph (mw-foy5mb.5), at 390x844 with a touch screen: reached from the Goal screen, every idea a node,
// panned with a finger and pinch-zoomed with two without the page scrolling, a tap on a node opens the idea's sheet, Back returns to Goal. No arrow or zoom
// buttons cover the graph (mw-5r3p30.650): the wheel zooms, the arrow keys and + / − move it when it has focus, and one small Where I am stays.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { EXCLUDED_RULES } from '../support/axe-excluded';
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

  await page.getByRole('button', { name: 'Where I am' }).click();
  await shot(page, 'ladder-graph');
});

test('the graph has no arrow or zoom buttons; one small Where I am sits below the picture', async ({ page }) => {
  await openGraph(page);
  for (const name of ['Pan up', 'Pan down', 'Pan left', 'Pan right', 'Zoom in', 'Zoom out']) await expect(page.getByRole('button', { name })).toHaveCount(0);
  const frame = page.getByTestId('ladder-graph');
  await expect(frame.locator('button')).toHaveCount(0);
  const where = page.getByRole('button', { name: 'Where I am' });
  const at = (await where.boundingBox())!;
  const box = (await frame.boundingBox())!;
  // small: a tap-sized pill, not a row of squares, low on the left of the graph
  expect(at.width).toBeLessThan(box.width / 3);
  expect(at.height).toBeLessThan(60);
  expect(at.x).toBeLessThan(box.x + box.width / 2);
  expect(at.y).toBeGreaterThanOrEqual(box.y + box.height);
  // it is below the picture, so it covers no idea
  const covered = await page.evaluate(
    ({ l, t, r, b, bottom }) =>
      [...document.querySelectorAll('[data-idea]')]
        .filter((n) => {
          const q = n.getBoundingClientRect();
          // an idea past the graph's own box is clipped away, so it is not drawn under the pill
          return q.width > 0 && q.top < bottom && q.left < r && q.right > l && q.top < b && q.bottom > t;
        })
        .map((n) => n.getAttribute('data-idea')),
    { l: at.x, t: at.y, r: at.x + at.width, b: at.y + at.height, bottom: box.y + box.height },
  );
  expect(covered).toEqual([]);
  // and it is clear of the tutor's round button
  const ask = (await page.getByRole('button', { name: 'Ask the tutor about this screen' }).boundingBox())!;
  expect(at.x + at.width <= ask.x || ask.x + ask.width <= at.x || at.y + at.height <= ask.y || ask.y + ask.height <= at.y).toBe(true);
});

test('the wheel zooms the graph, and the page does not scroll', async ({ page }) => {
  await openGraph(page);
  const box = (await page.getByTestId('ladder-graph').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  const start = await scale(page);
  await page.mouse.wheel(0, -300);
  await expect.poll(() => scale(page)).toBeGreaterThan(start);
  const zoomed = await scale(page);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => scale(page)).toBeLessThan(zoomed);
  expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
});

test('with the graph focused the arrow keys pan and + and − zoom', async ({ page }) => {
  await openGraph(page);
  const frame = page.getByRole('group', { name: /grammar ladder as a graph/ });
  await frame.focus();
  await expect(frame).toBeFocused();
  // the arrow shows what lies in that direction, so the picture slides the other way
  const move = async (key: string, axis: 'x' | 'y', sign: 1 | -1) => {
    const before = await page.getByTestId('graph-world').boundingBox();
    await page.keyboard.press(key);
    await expect
      .poll(async () => {
        const after = (await page.getByTestId('graph-world').boundingBox())!;
        return (after[axis] - before![axis]) * sign;
      }, key)
      .toBeGreaterThan(20);
  };
  await move('ArrowLeft', 'x', 1);
  await move('ArrowRight', 'x', -1);
  await move('ArrowUp', 'y', 1);
  await move('ArrowDown', 'y', -1);
  const start = await scale(page);
  await page.keyboard.press('+');
  await expect.poll(() => scale(page)).toBeGreaterThan(start);
  const zoomed = await scale(page);
  await page.keyboard.press('-');
  await expect.poll(() => scale(page)).toBeLessThan(zoomed);
  await expect(frame).toBeFocused();
  await shot(page, 'ladder-graph-keys');
});

test('axe finds no violation on the whole path', async ({ page }) => {
  await openGraph(page);
  const found = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules([...EXCLUDED_RULES]).analyze();
  expect(found.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test.describe('sideways', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  test('the whole path on a phone turned sideways: Where I am stays low on the left, below the picture', async ({ page }) => {
    await openGraph(page);
    const where = page.getByRole('button', { name: 'Where I am' });
    await expect(where).toBeVisible();
    const at = (await where.boundingBox())!;
    const box = (await page.getByTestId('ladder-graph').boundingBox())!;
    expect(at.y).toBeGreaterThanOrEqual(box.y + box.height);
    expect(at.y + at.height).toBeLessThanOrEqual(390);
    expect(box.height).toBeGreaterThan(120);
    expect(at.x).toBeLessThan(box.x + box.width / 2);
    await shot(page, 'ladder-graph-landscape');
  });
});

test('a tap on a node opens that idea, and Back from the path returns to Goal', async ({ page }) => {
  await openGraph(page);
  // the first view is on the idea he is learning, so its node is in the middle of the frame and can be tapped with the finger
  const node = page.locator('[data-idea="number-singular"]');
  await expect(node).toBeVisible();
  const title = (await node.getAttribute('aria-label'))!.split(':')[0];
  await node.tap();
  const sheet = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText(title);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await page.getByRole('button', { name: '‹ Goal' }).click();
  await expect(page.getByRole('heading', { name: 'Goal', exact: true, level: 1 })).toBeVisible();
});

test('from the keyboard: Tab brings each idea into the graph', async ({ page }) => {
  await openGraph(page);
  const frame = page.getByTestId('ladder-graph');
  const ideas = page.locator('[data-idea]');
  await page.getByRole('button', { name: '‹ Goal' }).focus();
  await page.keyboard.press('Tab');
  // the graph itself comes first (it takes the arrow keys), then each idea
  await expect(page.getByRole('group', { name: /grammar ladder as a graph/ })).toBeFocused();
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

  await shot(page, 'ladder-graph-keyboard');
});
