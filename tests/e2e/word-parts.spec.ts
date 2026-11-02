// A lesson shows how a word is built from its parts (mw-5r3p30.986, his feedback: 'this breakdown ... should be part of the lesson'): under the worked
// word and under the word table, at a phone's width; a word with no entry in src/data/wordParts.ts draws no empty line.
import { expect, test, type Locator } from '@playwright/test';
import { openIdea } from './large-text-titles';
import { shot } from './shot';

test.use({ viewport: { width: 390, height: 844 } });

/** No row of `rows` is clipped by its box on the right, or lies on another row. */
async function expectSet(sheet: Locator, rows: Locator): Promise<void> {
  const boxes = await rows.evaluateAll((els) => els.map((el) => ({ box: el.getBoundingClientRect().toJSON(), wide: el.scrollWidth > el.clientWidth + 1 })));
  const edge = (await sheet.boundingBox())!;
  for (const [i, { box, wide }] of boxes.entries()) {
    expect(wide, `row ${i} is clipped`).toBe(false);
    expect(box.height, `row ${i} has a height`).toBeGreaterThan(15);
    expect(box.x, `row ${i} starts inside the sheet`).toBeGreaterThanOrEqual(edge.x);
    expect(box.x + box.width, `row ${i} ends inside the sheet`).toBeLessThanOrEqual(edge.x + edge.width + 0.5);
    if (i > 0) expect(box.y, `row ${i} lies under row ${i - 1}`).toBeGreaterThanOrEqual(boxes[i - 1].box.y + boxes[i - 1].box.height - 0.5);
  }
}

test('The negative shows the parts of οὐδεμία in its word table and of οὐκ in its worked example', async ({ page }) => {
  const idea = await openIdea(page, '1 John 1', 'The negative');
  await expect(idea.getByRole('heading', { name: 'The negative' })).toBeVisible();

  const worked = idea.getByTestId('worked-parts');
  await expect(idea.getByTestId('worked-word')).toHaveText('οὐκ');
  await expect(worked).toHaveText('Built from: οὐ “not” + κ “before a smooth breathing”');

  const parts = idea.getByTestId('table-parts');
  await parts.scrollIntoViewIfNeeded();
  await expect(idea.getByTestId('idea-table').getByTestId('table-parts')).toBeVisible();
  const row = parts.locator('[data-word="οὐδεμία"]');
  await expect(row).toHaveText('οὐδεμία = οὐδέ “and not” + μία “one”');
  for (const word of ['οὐδείς', 'οὐδέποτε', 'οὐκέτι']) await expect(parts.locator(`[data-word="${word}"]`)).toBeVisible();

  // a word with no entry (the plain μή, οὐ) has no row: every row says something, and the table itself has no horizontal scroll
  await expect(parts.locator('[data-word="μή"]')).toHaveCount(0);
  for (const text of await parts.getByTestId('table-part').allTextContents()) expect(text).toMatch(/= .+ “.+”/);
  expect(await idea.getByTestId('idea-table').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

  await expectSet(idea, parts.getByTestId('table-part'));
  await expectSet(idea, worked);
  await worked.scrollIntoViewIfNeeded();
  await shot(page, 'word-parts-negative');
});

test('a lesson whose words have no parts draws no line for them', async ({ page }) => {
  const idea = await openIdea(page, '1 John 1', 'The conjunction');
  await expect(idea.getByTestId('idea-table')).toBeVisible();
  await expect(idea.getByTestId('worked-word')).toBeVisible();
  await expect(idea.getByTestId('worked-parts')).toHaveCount(0);
  await expect(idea.getByTestId('table-parts')).toHaveCount(0);
});
