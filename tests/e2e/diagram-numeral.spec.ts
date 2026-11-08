// The Diagram's numeral box at 390x844 (mw-5r3p30.1128): in Genesis 14:14 the Hebrew writes 318 as eight, ten, and, three, hundred, and the Diagram of the verse in Hebrew draws ONE box, '318', that a tap
// opens to the five pieces (each opening its word sheet) and 'Fold 318' closes again; John 21:11's three Greek words are one '153'; a number of one word (Genesis 1:5, 'day one') is drawn as it always was.
// The answers are the fake mill's flat tree (tests/support/flat-diagram.ts), which hangs every piece but the first two on the verb.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { flatDiagram } from '../support/flat-diagram';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

test.use({ viewport: VIEWPORT });

async function diagramOf(page: Page, address: string, verse: number): Promise<Locator> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.replyFor = (input, kind) => (kind === 'sentence-diagram' ? { status: 'answered', answer: flatDiagram(input) } : undefined);
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.setItem('lampas.diagram-lesson.invite', 'dismissed'));
  await page.goto(`/#/?${address}`);
  const view = await openVerseView(page, verse);
  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  const pane = view.getByRole('region', { name: 'Diagram' });
  await expect(pane.getByRole('button', { name: 'Redraw', exact: true })).toBeVisible();
  return pane;
}

test('Genesis 14:14 in Hebrew: one 318 box in place of eight, ten, and, three, hundred; a tap opens its words and Fold 318 closes it', async ({ page }) => {
  const pane = await diagramOf(page, 'b=gen&c=14&view=greek&weave=off', 14);
  const box = pane.locator('[data-numeral]');
  await expect(box).toHaveCount(1);
  await expect(box).toHaveText('318');
  await expect(box).toHaveAttribute('aria-expanded', 'false');
  expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  // the four other pieces are not drawn: the Hebrew numeral words are gone from the picture
  for (const piece of ['שְׁמֹנָ', 'עָשָׂ', 'שְׁלֹ', 'מֵא']) await expect(pane.locator('[data-word]', { hasText: piece })).toHaveCount(0);
  await expect(pane.getByRole('button', { name: /^Fold / })).toHaveCount(0);
  const folded = await pane.locator('[data-word]').count();
  await box.scrollIntoViewIfNeeded();
  await shot(page, 'diagram-numeral-shut');

  // a tap opens the box to its five pieces, each its own node
  await box.click();
  await expect(pane.locator('[data-numeral]')).toHaveCount(0);
  await expect(pane.locator('[data-word]')).toHaveCount(folded + 4);
  for (const piece of ['שְׁמֹנָ', 'עָשָׂ', 'שְׁלֹ', 'מֵא']) await expect(pane.locator('[data-word]', { hasText: piece })).toHaveCount(1);
  await pane.getByRole('button', { name: 'Fold 318', exact: true }).scrollIntoViewIfNeeded();
  await shot(page, 'diagram-numeral-open');

  // a piece still opens its own word sheet (eight, H8083)
  await pane.locator('[data-word]', { hasText: 'שְׁמֹנָ' }).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word.getByTestId('sheet-strongs')).toHaveText('H8083');
  await word.getByRole('button', { name: 'Done' }).click();
  await expect(word).toHaveCount(0);

  // Fold 318 closes it up again
  const fold = pane.getByRole('button', { name: 'Fold 318', exact: true });
  expect((await fold.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await fold.click();
  await expect(pane.locator('[data-numeral]')).toHaveText('318');
  await expect(pane.locator('[data-word]')).toHaveCount(folded);
  await expect(fold).toHaveCount(0);
});

test('John 21:11 in Greek: the hundred, fifty and three are one 153 box that opens to the three words', async ({ page }) => {
  const pane = await diagramOf(page, 'b=jhn&c=21&view=greek&weave=off', 11);
  const box = pane.locator('[data-numeral]');
  await expect(box).toHaveText('153');
  await expect(pane.locator('[data-word]', { hasText: 'πεντήκοντα' })).toHaveCount(0);
  await box.click();
  for (const piece of ['ἑκατὸν', 'πεντήκοντα', 'τριῶν']) await expect(pane.locator('[data-word]', { hasText: piece })).toHaveCount(1);
  await pane.getByRole('button', { name: 'Fold 153', exact: true }).click();
  await expect(pane.locator('[data-numeral]')).toHaveText('153');
});

test('a number of one word (Genesis 1:5, "day one") is drawn as it always was: no numeral box', async ({ page }) => {
  const pane = await diagramOf(page, 'b=gen&c=1&view=greek&weave=off', 5);
  await expect(pane.locator('[data-word]').first()).toBeVisible();
  await expect(pane.locator('[data-numeral]')).toHaveCount(0);
  await expect(pane.getByRole('group', { name: 'Numbers open' })).toHaveCount(0);
});
