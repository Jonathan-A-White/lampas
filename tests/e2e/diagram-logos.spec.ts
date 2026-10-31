// tests/e2e/diagram-logos.spec.ts — 'See it in Logos' under a verse's diagram (mw-5r3p30.893) at phone width: Romans 8:1 (Greek) and Genesis 1:1 (Hebrew) show the row once his Logos switch is On,
// every link a thumb tall and inside the phone, and nothing is drawn while Logos is Off. The answers are the fake mill's: a plain tree for Romans 8:1 and the hand-written Genesis 1:1 one (the row does not read the tree).
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { turnLogosOn } from './settings-group';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
const tree = (file: string): unknown => (JSON.parse(readFileSync(`tests/fixtures/diagrams/${file}`, 'utf8')) as { diagram: unknown }).diagram;
/** Romans 8:1 has 15 words: a plain tree that uses each once (κατάκριμα the subject, an understood verb, every other word hung on it), enough for THE RULE. */
const ROMANS_8_1 = {
  clauses: [
    {
      clause: {
        subject: { words: [{ i: 3 }], modifiers: [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((i) => ({ kind: 'word', word: { i }, modifiers: [] })) },
        verb: { words: [{ implied: 'ἐστίν' }], modifiers: [] },
      },
    },
  ],
};

test.use({ viewport: VIEWPORT });

async function start(page: Page, answer: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.kindReplies['sentence-diagram'] = { status: 'answered', answer: answer === 'romans' ? ROMANS_8_1 : tree(answer) };
  await routePostern(page, fake);
  await openUnlocked(page);
}

async function diagramOf(page: Page, verse: string) {
  const view = await openVerseView(page, 1);
  await expect(view.getByRole('heading', { name: verse })).toBeVisible();
  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  const pane = view.getByRole('region', { name: 'Diagram' });
  await expect(pane.getByRole('button', { name: 'Redraw', exact: true })).toBeVisible();
  return pane;
}

async function linksFit(row: ReturnType<Page['getByRole']>): Promise<void> {
  for (const link of await row.getByRole('link').all()) {
    const b = await link.boundingBox();
    if (!b) throw new Error('no link box');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
  }
}

test('nothing is drawn under Romans 8:1 while Logos is Off', async ({ page }) => {
  await start(page, 'romans');
  await page.goto('/#/?b=rom&c=8&view=greek&weave=off');
  const pane = await diagramOf(page, 'Romans 8:1');
  await expect(pane.getByRole('link', { name: 'Lexham SGNT' })).toHaveCount(0);
  await expect(pane.getByRole('group', { name: 'See it in Logos' })).toHaveCount(0);
});

test('Romans 8:1 shows the Lexham SGNT, its Notes and how to diagram once Logos is On', async ({ page }) => {
  await start(page, 'romans');
  await turnLogosOn(page);
  await page.goto('/#/?b=rom&c=8&view=greek&weave=off');
  const pane = await diagramOf(page, 'Romans 8:1');
  const row = pane.getByRole('group', { name: 'See it in Logos' });
  await expect(row).toBeVisible();
  await expect(row.getByRole('link', { name: 'Lexham SGNT' })).toHaveAttribute('href', 'logosres:LLS:LEXHAMSGNT;ref=Bible.Ro8.1');
  await expect(row.getByRole('link', { name: 'SGNT Notes' })).toHaveAttribute('href', 'logosres:LLS:SGNTNOTES;ref=Bible.Ro8.1');
  await expect(row.getByRole('link', { name: 'How to diagram' })).toBeVisible();
  await expect(row.getByRole('link', { name: 'Hebrew Syntax' })).toHaveCount(0);
  await linksFit(row);
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'diagram-logos-romans');
});

test('Genesis 1:1 shows the two Hebrew syntax books and how to diagram once Logos is On', async ({ page }) => {
  await start(page, 'gen-1-1-hebrew.json');
  await turnLogosOn(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
  const pane = await diagramOf(page, 'Genesis 1:1');
  const row = pane.getByRole('group', { name: 'See it in Logos' });
  await expect(row).toBeVisible();
  await expect(row.getByRole('link', { name: 'Hebrew Syntax' })).toHaveAttribute('href', 'logosres:LLS:46.20.9');
  await expect(row.getByRole('link', { name: "Student's Guide" })).toHaveAttribute('href', 'logosres:LLS:46.20.3');
  await expect(row.getByRole('link', { name: 'How to diagram' })).toBeVisible();
  await expect(row.getByRole('link', { name: 'Lexham SGNT' })).toHaveCount(0);
  await linksFit(row);
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'diagram-logos-genesis');
});
