// tests/e2e/diagram-lesson.spec.ts — the optional lesson 'How to read a sentence diagram' (mw-q6t5tvn.1, #/diagram-lesson) at 390x844: the page does not scroll sideways, the diagram scrolls
// in its own box and keeps its type, Back and Next are a thumb tall inside the phone, a wrong tap lights the right word, and the last step's Done leaves for the Reader and keeps it done.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: VIEWPORT });

async function box(page: Page, name: string) {
  const b = await page.getByRole('button', { name, exact: true }).boundingBox();
  if (!b) throw new Error(`no box for ${name}`);
  return b;
}

test('the lesson fits the phone, scrolls its diagram sideways, lights the right word and keeps Done', async ({ page }) => {
  // a licensed phone: the round Ask the tutor button is on the screen and must not sit on Back or Next
  await openUnlocked(page);
  await page.goto('/#/diagram-lesson');
  await expect(page.getByRole('heading', { name: 'How to read a sentence diagram', level: 1 })).toBeVisible();
  await expect(page.getByText('Step 1 of 9')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // a wrong tap lights the right word
  await page.getByRole('button', { name: 'wept', exact: true }).click();
  await expect(page.getByTestId('diagram-lesson-told')).toContainText('Not quite');
  await expect(page.locator('[data-lit]')).toHaveText('Jesus');
  await page.getByRole('button', { name: 'Jesus', exact: true }).click();
  await expect(page.getByTestId('diagram-lesson-told')).toHaveText('Right.');

  for (const name of ['Back', 'Next']) {
    const b = await box(page, name);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.y + b.height).toBeLessThanOrEqual(VIEWPORT.height);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
  }
  const ask = await page.locator('[data-ask-tutor]').boundingBox();
  if (!ask) throw new Error('no Ask the tutor button');
  const next = await box(page, 'Next');
  expect(ask.y + ask.height).toBeLessThanOrEqual(next.y);
  await shot(page, 'diagram-lesson');

  // the last step is the widest: Colossians 3:1 scrolls sideways in its box, the page does not
  for (let k = 0; k < 8; k++) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 9 of 9')).toBeVisible();
  const diagram = page.locator('[data-diagram]');
  const sizes = await diagram.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(sizes.scroll).toBeGreaterThan(sizes.client);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const done = await box(page, 'Done');
  expect(done.y + done.height).toBeLessThanOrEqual(VIEWPORT.height);

  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How to read a sentence diagram' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('lampas.diagram-lesson'))).toBe('done');
});
