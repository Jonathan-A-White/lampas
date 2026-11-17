import { expect, test, type Locator, type Page } from '@playwright/test';
import { SETTLE_MS } from '../../src/ui/settle';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openReviewFromToday, waitForDue } from './today-chip';

// mw-indx1x6.73: in landscape (844x390) a drill's Example reference opened the verse card as a box about 160 px tall, so its verse was a cut half line behind the Close and
// Play/Open rows. The card's verse text now stands at least three lines tall with the marked word wholly inside, from every drill that draws a reference (DrillReference):
// Review's word question, Drill it, the Parsing drill and the Quick test.
const LANDSCAPE = { width: 844, height: 390 };
test.use({ viewport: LANDSCAPE });

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
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

/** Taps the reference link `link`, then checks the card: its verse box is three lines tall at least and the marked word is wholly inside the dialog and its scroll box. Closes the card. */
async function expectReadableCard(page: Page, link: Locator, name: string): Promise<void> {
  const reference = (await link.innerText()).trim();
  await link.click();
  const card = page.getByRole('dialog', { name: reference });
  await expect(card).toBeVisible();
  const text = card.locator('[data-reference-text]');
  await expect(text).toBeVisible();
  const marked = card.locator('[data-marked]');
  await expect(marked).toHaveCount(1);
  const sizes = await text.evaluate((el) => {
    const scroller = el.parentElement as HTMLElement;
    return { box: scroller.clientHeight, line: Number.parseFloat(getComputedStyle(el).lineHeight) };
  });
  expect(sizes.line).toBeGreaterThan(0);
  expect(sizes.box, `${name}: the verse box is ${sizes.box} px, a line is ${sizes.line} px`).toBeGreaterThanOrEqual(3 * sizes.line);
  // the marked word lies wholly inside the dialog and inside the box that scrolls the verse
  const word = await marked.boundingBox();
  const dialog = await card.boundingBox();
  const scroller = await text.evaluate((el) => {
    const r = (el.parentElement as HTMLElement).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  });
  expect(word && dialog).toBeTruthy();
  for (const edge of [dialog!, scroller]) {
    const top = 'y' in edge ? edge.y : edge.top;
    const bottom = 'y' in edge ? edge.y + edge.height : edge.bottom;
    const left = 'x' in edge ? edge.x : edge.left;
    const right = 'x' in edge ? edge.x + edge.width : edge.right;
    expect(word!.y, `${name}: the marked word's top`).toBeGreaterThanOrEqual(top - 0.5);
    expect(word!.y + word!.height, `${name}: the marked word's foot`).toBeLessThanOrEqual(bottom + 0.5);
    expect(word!.x).toBeGreaterThanOrEqual(left - 0.5);
    expect(word!.x + word!.width).toBeLessThanOrEqual(right + 0.5);
  }
  expect(dialog!.y).toBeGreaterThanOrEqual(-0.5);
  expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(LANDSCAPE.height + 0.5);
  await shot(page, `reference-card-landscape-${name}`);
  await card.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(card).toBeHidden();
}

/** The Greek view, so the marked word is drawn in the verse (the English view marks it only where the weave has). */
async function inGreek(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=greek&weave=solid');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('Review: the Example reference opens a verse card with its verse readable', async ({ page }) => {
  await inGreek(page);
  await waitForDue(page);
  await openReviewFromToday(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    const show = page.getByRole('button', { name: 'Show', exact: true });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: /^(I knew it|Kind of)$/ }).click();
    } else {
      await page.locator('[data-option]').first().click();
      if (await page.getByTestId('chapter-form').isVisible()) {
        await expectReadableCard(page, page.getByTestId('chapter-form').getByRole('link'), 'review');
        return;
      }
    }
    await page.getByTestId('next').click();
  }
  throw new Error('no card of the round had the reference line');
});

test('the Quick test: the reference opens a verse card with its verse readable', async ({ page }) => {
  await inGreek(page);
  await page.goto('/#/test');
  await expect(page.getByTestId('prompt')).toBeVisible();
  for (let i = 0; i < 20; i += 1) {
    await page.locator('[data-option]').first().click();
    const line = page.getByTestId('chapter-form');
    if (await line.isVisible()) {
      await expectReadableCard(page, line.getByRole('link'), 'quick-test');
      return;
    }
    await page.getByTestId('next').click();
  }
  throw new Error('no Quick test question had the reference line');
});

test('the Parsing drill: the reference opens a verse card with its verse readable', async ({ page }) => {
  await inGreek(page);
  await page.goto('/#/drill');
  const word = page.getByTestId('drill-word');
  await expect(word).toBeVisible();
  await expectReadableCard(page, page.getByTestId('drill-step').locator('xpath=preceding-sibling::p[1]').getByRole('link'), 'parsing-drill');
});

test('Drill it: the reference opens a verse card with its verse readable', async ({ page }) => {
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await inGreek(page);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 2' }]);
  await put(page, 'grammarLevels', ['breathings', 'accents', 'iota-subscript'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'placement' })));
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The noun', exact: true }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByTestId('idea-loading')).toHaveCount(0);
  await page.waitForTimeout(SETTLE_MS + 100);
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  // a walk of Drill it ends after a few questions, and not every question has a reference: a new walk is begun when one ends
  for (let walk = 0; walk < 6; walk += 1) {
    if (walk > 0) {
      await page.waitForTimeout(SETTLE_MS + 100);
      await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
    }
    await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
    for (let i = 0; i < 12; i += 1) {
      await page.waitForTimeout(SETTLE_MS + 100);
      await drill.locator('[data-option]:not(:disabled)').first().click();
      await expect(drill.getByTestId('drill-next')).toBeVisible();
      const link = drill.getByTestId('grammar-ref').getByRole('link');
      if (await link.count()) {
        await expectReadableCard(page, link, 'drill-it');
        return;
      }
      await drill.getByTestId('drill-next').click();
      if (!(await drill.locator('[data-option]').first().isVisible().catch(() => false))) break;
    }
    if (await drill.count()) await drill.getByRole('button', { name: /^(Stop|Done)$/ }).first().click();
  }
  throw new Error('no Drill it question had a reference');
});
