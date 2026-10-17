// tests/e2e/read-aloud-anywhere.spec.ts — the small speaker (src/speech/ReadAloud.tsx) at a phone's width (features/read-aloud-anywhere.feature): on the
// Grammar sheet and on the idea sheet it sits at the top right of the heading, 44 px square, and a tap reads the sheet's words in the phone's voices, shows the
// speaking bar over the sheet and changes the button to Stop reading; the words stay on screen. The sheet shown after an update has one on each version.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

async function openGrammar(page: Page) {
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  await expect(grammar).toBeVisible();
  return grammar;
}

/** The speaker is a 44 px target at the right of the heading, on the heading's line. */
async function expectAtHeadingRight(sheet: ReturnType<Page['getByRole']>, heading: string) {
  const speaker = sheet.getByRole('button', { name: 'Read aloud', exact: true });
  const [button, title, box] = await Promise.all([
    speaker.boundingBox(),
    sheet.getByRole('heading', { name: heading }).boundingBox(),
    sheet.boundingBox(),
  ]);
  expect(button!.width).toBeGreaterThanOrEqual(43.5);
  expect(button!.height).toBeGreaterThanOrEqual(43.5);
  expect(button!.x + button!.width).toBeLessThanOrEqual(box!.x + box!.width);
  expect(button!.x + button!.width).toBeGreaterThan(box!.x + box!.width - 30);
  expect(Math.abs(button!.y - title!.y)).toBeLessThan(14);
}

test('the Grammar sheet and the idea sheet carry a small speaker that reads them and stops on a second tap', async ({ page }) => {
  const grammar = await openGrammar(page);
  await expectAtHeadingRight(grammar, 'genitive');
  await grammar.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(grammar.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  const said = await spoken(page);
  expect(said.map((s) => s.text).join(' ')).toContain('genitive');
  // the bar with Pause and Stop is drawn over the sheet, and its words are still there
  await expect(grammar.getByRole('region', { name: 'Speaking' })).toBeVisible();
  await expect(grammar.getByTestId('grammar-explanation')).toBeVisible();
  await shot(page, 'read-aloud-grammar');
  await grammar.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(grammar.getByRole('button', { name: 'Read aloud', exact: true })).toBeVisible();

  await grammar.getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();
  await expectAtHeadingRight(idea, 'The genitive case');
  await idea.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(idea.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  await expect(idea.getByRole('region', { name: 'Speaking' })).toBeVisible();
  expect((await spoken(page)).map((s) => s.text).join(' ')).toContain('What it is');
  await expect(idea.getByTestId('idea-what')).toBeVisible();
  await shot(page, 'read-aloud-idea');
});

test("the What's new sheet shown after an update has a speaker on each version, 44 px, that reads it and stops on a second tap", async ({ page }) => {
  const running = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  const changelog = [
    { version: running, date: '2026-10-09', story: 'fx-2', kind: 'new', text: 'Hear the whole chapter read to you, one verse after another.' },
    { version: '0.0.5', date: '2026-09-20', story: 'fx-6', kind: 'fixed', text: 'A verse read aloud no longer stops at its first word.' },
    { version: '0.0.1', date: '2026-09-01', story: 'fx-1', kind: 'new', text: 'Reading Romans 8 in Greek and English.' },
  ];
  await page.route('**/changelog.json', (route) => route.fulfill({ json: changelog, headers: { 'cache-control': 'no-store' } }));
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  // only the first load: the init script runs again on the reload, which must find the version he has seen
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('lampas.lastSeenVersion')) window.localStorage.setItem('lampas.lastSeenVersion', '0.0.1');
  });
  await page.goto('/');
  const sheet = page.getByRole('dialog', { name: "What's new" });
  await expect(sheet).toBeVisible();
  const speakers = sheet.getByRole('button', { name: 'Read aloud', exact: true });
  await expect(speakers).toHaveCount(2);
  // each at the right of its version's heading, a 44 px target inside the sheet
  const [button, head, box] = await Promise.all([speakers.first().boundingBox(), sheet.getByRole('heading', { name: running }).boundingBox(), sheet.boundingBox()]);
  expect(button!.width).toBeGreaterThanOrEqual(43.5);
  expect(button!.height).toBeGreaterThanOrEqual(43.5);
  expect(button!.x + button!.width).toBeLessThanOrEqual(box!.x + box!.width);
  expect(Math.abs(button!.y + button!.height / 2 - (head!.y + head!.height / 2))).toBeLessThan(24);
  await speakers.first().click();
  await expect(sheet.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  expect((await spoken(page)).map((s) => s.text).join(' ')).toContain('Hear the whole chapter read to you');
  await expect(sheet.getByRole('region', { name: 'Speaking' })).toBeVisible();
  await expect(sheet.getByText('Hear the whole chapter read to you, one verse after another.')).toBeVisible();
  await shot(page, 'read-aloud-whats-new');
  await sheet.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(speakers).toHaveCount(2);
});

test("a Settings row's More help has a speaker at its right once it is open, and it reads the help", async ({ page }) => {
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const more = page.getByRole('button', { name: 'More help' }).first();
  await more.scrollIntoViewIfNeeded();
  await more.click();
  const row = page.locator('[data-setting]', { has: page.getByRole('button', { name: 'Less help' }) });
  const speaker = row.getByRole('button', { name: 'Read aloud', exact: true });
  await expect(speaker).toBeVisible();
  const [button, rowBox] = await Promise.all([speaker.boundingBox(), row.boundingBox()]);
  expect(button!.width).toBeGreaterThanOrEqual(43.5);
  expect(button!.height).toBeGreaterThanOrEqual(43.5);
  expect(button!.x + button!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await speaker.click();
  await expect(row.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  await shot(page, 'read-aloud-more-help');
});
