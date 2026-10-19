// tests/e2e/talk-list.ts — where things stand in the Talk sheet's conversation box, for the specs that prove the box keeps a thing in view (mw-5r3p30.600).
import { expect, type Locator } from '@playwright/test';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function rectOf(target: Locator): Promise<Rect> {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  return box;
}

/** The thing's whole box lies inside the conversation box's visible area (the box scrolls, so a thing scrolled out of it fails). */
export async function expectInList(sheet: Locator, target: Locator, what: string): Promise<void> {
  const list = await rectOf(sheet.locator('[data-talk-list]'));
  const box = await rectOf(target);
  expect(box.y, `${what} starts above the conversation box`).toBeGreaterThanOrEqual(list.y - 0.5);
  expect(box.y + box.height, `${what} ends below the conversation box`).toBeLessThanOrEqual(list.y + list.height + 0.5);
}
