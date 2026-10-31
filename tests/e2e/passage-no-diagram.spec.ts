// tests/e2e/passage-no-diagram.spec.ts — a diagram is of one verse (mw-5r3p30.895), at 360x740: the Verse view of a passage, Revelation 10:1-11, has no Diagram in its row and the row
// has no empty cell; the view of one verse, Revelation 10:1, keeps Diagram. jsdom has no layout, so the cells are measured here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 360, height: 740 };

async function open(page: Page, ref: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto(`/#/?ref=${ref}`);
}

test('a passage has no Diagram in its row, and the row has no empty cell', async ({ page }) => {
  await open(page, 'Rev.10.1-11');
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.locator('[data-verse-view="1-11"]').or(view)).toBeVisible();
  const row = view.getByRole('group', { name: 'Actions', exact: true });
  await expect(row.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Diagram', exact: true })).toHaveCount(0);
  await shot(page, 'passage-no-diagram');
  // every cell of the row fills the row's width: the last cell of a short last row is stretched, not left beside a hole
  const boxes = [];
  for (const button of await row.getByRole('button').all()) {
    const b = await button.boundingBox();
    if (!b) throw new Error('no button box');
    boxes.push(b);
  }
  const rowBox = await row.boundingBox();
  if (!rowBox) throw new Error('no row box');
  const rows = [...new Set(boxes.map((b) => Math.round(b.y)))];
  for (const y of rows) {
    const cells = boxes.filter((b) => Math.round(b.y) === y);
    const right = Math.max(...cells.map((b) => b.x + b.width));
    expect(right).toBeGreaterThanOrEqual(rowBox.x + rowBox.width - 1);
  }
});

test('one verse keeps Diagram in its row', async ({ page }) => {
  await open(page, 'Rev.10.1');
  const view = page.getByRole('region', { name: 'Verse view' });
  const row = view.getByRole('group', { name: 'Actions', exact: true });
  await expect(row.getByRole('button', { name: 'Diagram', exact: true })).toBeVisible();
  await shot(page, 'verse-diagram');
});
