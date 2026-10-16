// The round Ask the tutor button and the Placement screens (mw-86e9r1.21): a phone held sideways (844x390) gave the button no gutter on Placement, so it sat over
// the right end of 'Start from the letters' and 'Back to Settings' and a tap there hit it. Every Placement screen (intro, question, quick round, end card) keeps
// every button clear of it, scrolled to the top and to the end; upright (390x844) the intro's buttons keep their full width.
import { expect, test, type Page } from '@playwright/test';
import { LADDER } from '../../src/data/grammar/ladder';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { neededIdeas } from './needed-ideas';
import { openUnlocked } from './unlocked';

const BUTTON = 'button[data-ask-tutor]';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'settings' | 'grammarLevels', rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

async function openPlacement(page: Page) {
  await openUnlocked(page);
  await honestSpeech(page, { langs: ['el-GR'] });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Place me' }).click();
  await expect(page.getByTestId('placement-goal')).toBeVisible();
  await expect(page.locator(BUTTON)).toBeVisible();
  await page.waitForTimeout(500);
}

/** Scrolls the screen from its top to its end and fails the moment any button on it meets the Ask button. */
async function expectButtonsClear(page: Page, place: string) {
  const main = page.locator('main.screen');
  const ask = await page.locator(BUTTON).boundingBox();
  if (!ask) throw new Error('no Ask button');
  const room = await main.evaluate((el) => el.scrollHeight - el.clientHeight);
  for (let at = 0; ; at += 40) {
    const to = Math.min(at, room);
    await main.evaluate((el, t) => {
      el.scrollTop = t;
    }, to);
    const buttons = main.locator('button');
    const count = await buttons.count();
    expect(count, `${place}: there are buttons`).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (!box) continue;
      const inView = await buttons.nth(i).evaluate((el) => {
        const bounds = document.querySelector('main.screen')!.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return r.bottom > bounds.top && r.top < bounds.bottom;
      });
      if (!inView) continue;
      expect(meets(box, ask), `${place}, scrolled to ${to} of ${room}: "${(await buttons.nth(i).textContent())?.trim().slice(0, 40)}" is under the Ask button`).toBe(false);
    }
    if (to >= room) break;
  }
}

test.describe('phone sideways', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('the intro: Start, Start from the letters and Back to Settings are clear of the Ask button', async ({ page }) => {
    await openPlacement(page);
    for (const name of ['Start', 'Start from the letters', 'Back to Settings']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    await expectButtonsClear(page, 'intro');
    await shot(page, 'placement-ask-button-intro-844x390');
  });

  test('a question card: its options and Next are clear of the Ask button', async ({ page }) => {
    await openPlacement(page);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.locator('[data-option]').first()).toBeVisible();
    await expectButtonsClear(page, 'question');
    await page.locator('[data-option]').first().click();
    await expect(page.getByTestId('next')).toBeVisible();
    await expectButtonsClear(page, 'question answered');
    await shot(page, 'placement-ask-button-question-844x390');
  });

  test('the quick round: its options, Say it again and Stop here are clear of the Ask button', async ({ page }) => {
    await openUnlocked(page);
    await honestSpeech(page, { langs: ['el-GR'] });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
    // everything the walk needs and every letter, pair and breathing is solid but ξ, ψ and ου, so Start goes straight to the quick round
    const items = LADDER.filter((i) => i.glyphs || i.parent).map((i) => i.id);
    const missed = ['letter-xi', 'letter-psi', 'diphthong-ou'];
    const rest = [...new Set([...(await neededIdeas('1 John 1:1')), ...items])].filter((id) => !missed.includes(id) && !['alphabet', 'diphthongs'].includes(id));
    await put(page, 'grammarLevels', rest.map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' })));
    await page.goto('/#/placement');
    await expect(page.getByTestId('placement-goal')).toBeVisible();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.locator('[data-option]').first()).toBeVisible();
    await expect(page.getByTestId('placement-question')).toContainText(/^Quick round 1 of 3/);
    await expectButtonsClear(page, 'quick round');
    await page.locator('[data-option]').first().click();
    await expect(page.getByTestId('next')).toBeVisible();
    await expectButtonsClear(page, 'quick round answered');
    await shot(page, 'placement-ask-button-quick-844x390');
  });

  test('the end card (Where you are): Back to the goal is clear of the Ask button', async ({ page }) => {
    await openPlacement(page);
    await page.getByRole('button', { name: 'Start from the letters' }).click();
    await expect(page.getByTestId('placement-title')).toHaveText('Where you are');
    await expectButtonsClear(page, 'end card');
    await shot(page, 'placement-ask-button-end-844x390');
  });
});

test.describe('phone upright', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the intro keeps no gutter: its buttons keep their full width', async ({ page }) => {
    await openPlacement(page);
    const main = await page.locator('main.screen').boundingBox();
    if (!main) throw new Error('no main');
    // the screen reaches the phone's right edge, and the buttons fill it less its 24 px padding either side
    expect(main.x + main.width).toBeCloseTo(390, 0);
    for (const name of ['Start', 'Start from the letters', 'Back to Settings']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box?.width, name).toBeCloseTo(390 - 48, 0);
    }
    await shot(page, 'placement-ask-button-intro-390x844');
  });
});
