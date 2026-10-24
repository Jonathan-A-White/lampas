// tests/e2e/library-demo.spec.ts — the DEMO of the library-at-scale epic (mw-rfjjzd.21, docs/design/library-at-scale.md 14 S13, docs/demo-library-at-scale.md) at 390x844 against the fake Postern: the
// whole loop in one walk, in the order of his six steps. Logos On in Settings > Study resources, Your Logos library, Import of the head of his export (tests/fixtures/logos-export-head.csv, with the
// catalogue's own books beneath it so there is something to turn on: the head holds only devotionals, which start On), the counts, 'What they are', Turn on, the library home, a word's sheet with
// its 'All N lexicons' door, the verse's 'In another book…', one Ask for a book through the fake Postern, and Your requests moving from Sent to Filed. A shot after each stage:
// library-demo-1-import ... library-demo-7-requests. Nothing is bumped or seeded on the phone: the shelf is what the import turns on.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked, SEED_PUBLIC_KEY } from './unlocked';
import { openGroup } from './settings-group';
import { openVerseView } from './verse-view';
import { CATALOGUE } from '../../src/resources/catalogue';

test.use({ viewport: { width: 390, height: 844 } });

const FIXTURE = 'tests/fixtures/logos-export-head.csv';
const ASKED = 'Morphology Charts';

/** The head of his export with the catalogue's books beneath it, as Logos saves a list (the head's own ids are not repeated). */
function theList(): Buffer {
  const head = readFileSync(FIXTURE, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/);
  const have = new Set(head.map((line) => line.split(',')[0]));
  const quote = (text: string): string => (/[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const books = CATALOGUE.filter((e) => !have.has(e.resource)).map((e) => [e.resource, 'text.monograph', e.short, e.title, '', 'en', ''].map(quote).join(','));
  return Buffer.from([...head, ...books].join('\r\n') + '\r\n', 'utf8');
}

/** Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

async function fitsThePhone(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test('the library at scale end to end: import, counts, reasons, turn on, the word sheet door, the verse chooser, one ask, Your requests', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  // 1. Settings > Study resources > Logos On, then Settings > Your Logos library > Import: choose the file
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const resources = page.getByRole('region', { name: 'Study resources' });
  await resources.getByRole('switch', { name: 'Logos', exact: true }).click();
  await expect(resources.getByRole('switch', { name: 'Logos', exact: true })).toHaveAttribute('aria-checked', 'true');
  // the door is the first row of the Settings home
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await page.getByRole('button', { name: /^Your Logos library/ }).click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Import your library', level: 1 })).toBeVisible();
  await page.getByLabel('Logos list file').setInputFiles({ name: 'logos-list.csv', mimeType: 'text/csv', buffer: theList() });

  // the counts: books read, how many open from Lampas, how many it cannot use yet, and one button to turn them on
  await expect(page.getByTestId('import-read')).toHaveText(/^\d+ books read from your Logos list\.$/);
  await expect(page.getByTestId('import-open')).toHaveText(/^\d+ open from Lampas$/);
  await expect(page.getByTestId('import-left')).toHaveText('38 Lampas cannot use yet');
  const turnOn = page.getByRole('button', { name: /^Turn on \d+ books$/ });
  await expect(turnOn).toBeVisible();
  await fitsThePhone(page);
  await shot(page, 'library-demo-1-import');

  // 2. What they are: the reasons, on a page of their own
  await page.getByRole('button', { name: /^What they are/ }).click();
  await expect(page.getByRole('heading', { name: 'What Lampas cannot use yet', level: 1 })).toBeVisible();
  await expect(page.getByTestId('import-reasons').getByRole('listitem')).toHaveCount(2);
  await fitsThePhone(page);
  await shot(page, 'library-demo-2-reasons');
  await page.getByRole('button', { name: '‹ Your list' }).click();

  // 3. Turn on: the library home, the kinds with their counts
  await turnOn.click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  await expect(page.getByTestId('import-line')).toContainText('from a list of');
  const rows = page.getByTestId('kind-row');
  await expect(rows).toHaveCount(7);
  await expect(rows.filter({ hasText: 'Lexicons' }).getByTestId('kind-count')).toContainText(/^\d+ on · \d+ pinned$/);
  await expect(rows.filter({ hasText: 'Devotionals' }).getByTestId('kind-count')).toContainText(/\d+ on/);
  await fitsThePhone(page);
  await shot(page, 'library-demo-3-library');

  // 4. A word's sheet: the pinned lexicons as tiles and the door 'All N lexicons ›', which opens every lexicon with a search; a tap opens Logos at the word
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  const study = word.getByRole('group', { name: 'Study', exact: true });
  await expect(study.getByRole('link', { name: 'Open in Logos: BDAG', exact: true })).toBeVisible();
  await expect(study.getByRole('link', { name: 'Open in Logos: Louw-Nida', exact: true })).toBeVisible();
  await expect(study.getByRole('link', { name: 'Bible Word Study in Logos', exact: true })).toBeVisible();
  const door = study.getByRole('button', { name: /^All \d+ lexicons ›$/ });
  await door.scrollIntoViewIfNeeded();
  await expect(door).toBeVisible();
  await door.click();
  const all = page.getByRole('dialog', { name: 'All lexicons', exact: true });
  await expect(all).toBeVisible();
  await expect(all.getByRole('searchbox', { name: 'Search lexicons' })).toBeVisible();
  const lexicons = all.getByRole('link');
  expect(await lexicons.count()).toBeGreaterThan(3);
  await expect(lexicons.first()).toHaveAttribute('href', /^logosres:/);
  await fitsThePhone(page);
  await shot(page, 'library-demo-4-word-sheet');
  await page.goBack();
  await expect(all).toBeHidden();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('button', { name: 'Done', exact: true }).click();

  // 5. The verse: 'In another book…' lists the books On that cover Romans; a commentary opens Logos at Romans 8:31
  const view = await openVerseView(page, 31);
  await view.getByRole('button', { name: 'In another book…', exact: true }).click();
  const chooser = page.getByRole('dialog', { name: 'Romans 8:31 in Logos' });
  await expect(chooser).toBeVisible();
  await expect(chooser.getByRole('group', { name: /^Commentaries on Romans \(\d+\)$/ })).toBeVisible();
  await expect(chooser.getByRole('group', { name: /^Greek texts \(\d+\)$/ })).toBeVisible();
  const commentary = chooser.getByRole('group', { name: /^Commentaries on Romans/ }).getByRole('link').first();
  await expect(commentary).toHaveAttribute('href', /^logosres:LLS:[A-Za-z0-9._-]+;ref=Bible\.Ro8\.31$/);
  await fitsThePhone(page);
  await shot(page, 'library-demo-5-chooser');
  await page.goBack();
  await expect(chooser).toBeHidden();

  // 6. Ask for a book: search the books Lampas cannot use yet, pick one, Send: the fake Postern is told, and the sheet says so
  await page.goto('/#/library');
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Ask for a book' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask for a book' });
  await sheet.getByRole('searchbox', { name: 'Search your other books' }).fill(ASKED);
  await sheet.getByTestId('ask-results').getByRole('button', { name: new RegExp(ASKED) }).click();
  await expect(sheet.getByTestId('ask-picked')).toContainText(ASKED);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByText('Sent: the factory has it')).toBeVisible();
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'book', title: ASKED });
  await shot(page, 'library-demo-6-ask');
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);

  // 7. Your requests: the book shows as Sent, then Filed once the mill has filed it (the statuses are pulled when the screen opens: a reload stands for opening it)
  await page.goto('/#/requests');
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  const line = page.locator('[data-request]', { hasText: ASKED }).locator('[data-request-status]');
  await expect(line).toHaveText('Sent');
  fake.sendStatus(SEED_PUBLIC_KEY, { kind: 'request-status', request: fake.txids[0], bead: 'mw-demo.1', status: 'filed', ts: Date.now() });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await expect(line).toHaveText('Filed');
  await fitsThePhone(page);
  await shot(page, 'library-demo-7-requests');
});
