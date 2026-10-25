// tests/e2e/library-import.spec.ts — Import your library (#/library?import, mw-rfjjzd.6, docs/design/library-at-scale.md 5) at 390x844: the head of his Logos export (tests/fixtures/logos-export-head.csv)
// goes through the real file input with setInputFiles, the result screen shows counts and one button inside the screen, 'What they are' lists the reasons, and a long list (the whole catalogue and
// a thousand books Lampas cannot use) turns on in one tap and leaves the Library's card saying when it was imported. Every control is a thumb's size and nothing runs off the screen sideways.
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const FIXTURE = 'tests/fixtures/logos-export-head.csv';
const HEADER = 'ResourceId,Type,AbbreviatedTitle,Title,Series,Languages,ReferenceSupersets';

/** A long list as Logos saves it: every book of the catalogue (by Resource ID, with its title), and a thousand manuscripts, sermons and journals Lampas cannot use. */
function longList(): string {
  const quote = (text: string): string => (/[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const kept = readdirSync('src/resources/catalogue')
    .flatMap((file) => (JSON.parse(readFileSync(`src/resources/catalogue/${file}`, 'utf8')) as { entries: { resource: string; short: string; title: string }[] }).entries)
    .map((e) => [e.resource, 'text.monograph', e.short, e.title, '', 'en', ''].map(quote).join(','));
  const types = ['text.monograph.ancient-manuscript', 'text.monograph.sermons', 'text.serial.journal', 'text.monograph.collected-work'];
  const rest = Array.from({ length: 1000 }, (_, i) => [`LLS:FILLER-${i}`, types[i % types.length], '', `Filler book ${i}`, '', 'en', ''].join(','));
  return [HEADER, ...kept, ...rest].join('\r\n') + '\r\n';
}

const open = async (page: Page, hash: string, heading: string): Promise<void> => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.goto(`/#/${hash}`);
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
};

/** Every visible button is at least 44 px high and wide, none runs past the right edge, and the page does not scroll sideways. */
async function expectThumbSized(page: Page): Promise<void> {
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main button, header button, footer button'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const box = el.getBoundingClientRect();
        return { name: el.textContent?.trim() ?? el.tagName, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
      }),
  );
  expect(found.length).toBeGreaterThan(0);
  for (const c of found) {
    expect(c.height, `${c.name} is at least 44 px high`).toBeGreaterThanOrEqual(43.5);
    expect(c.width, `${c.name} is at least 44 px wide`).toBeGreaterThanOrEqual(43.5);
    expect(c.right, `${c.name} ends inside the screen`).toBeLessThanOrEqual(390.5);
    expect(c.bottom, `${c.name} ends inside the screen`).toBeLessThanOrEqual(844);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => { const box = document.querySelector('.screen') as HTMLElement; return box.scrollWidth <= box.clientWidth; })).toBe(true);
}

test('the head of his export is read on the phone: counts, one button and the reasons', async ({ page }) => {
  const sent: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' && !request.url().startsWith('data:')) sent.push(`${request.method()} ${request.url()}`);
  });
  await open(page, 'library?import', 'Import your library');
  await page.getByLabel('Logos list file').setInputFiles(FIXTURE);
  await expect(page.getByTestId('import-read')).toHaveText('60 books read from your Logos list.');
  await expect(page.getByTestId('import-open')).toHaveText('22 open from Lampas');
  await expect(page.getByTestId('import-kinds')).toHaveText('22 devotionals');
  await expect(page.getByTestId('import-left')).toHaveText('38 Lampas cannot use yet');
  // the phone starts with every devotional On (the draw), so there is nothing new to turn on: the one button keeps the list for the next update
  await expect(page.getByTestId('import-kept')).toContainText('22 books are already on your shelf or set by you');
  await expect(page.getByRole('button', { name: 'Keep this list' })).toBeVisible();
  await expectThumbSized(page);
  await shot(page, 'library-import-result');

  await page.getByRole('button', { name: /^What they are/ }).click();
  await expect(page.getByRole('heading', { name: 'What Lampas cannot use yet', level: 1 })).toBeVisible();
  await expect(page.getByTestId('import-reasons').getByRole('listitem')).toHaveCount(2);
  await expectThumbSized(page);
  await shot(page, 'library-import-reasons');
  expect(sent, 'the file and the list were not sent anywhere').toEqual([]);
});

test('a long list turns on in one tap and the Library says when it came', async ({ page }) => {
  await open(page, 'library?import', 'Import your library');
  const list = longList();
  const books = list.trim().split('\r\n').length - 1;
  await page.getByLabel('Logos list file').setInputFiles({ name: 'logos-list.csv', mimeType: 'text/csv', buffer: Buffer.from(list, 'utf8') });
  await expect(page.getByTestId('import-left')).toHaveText('1,000 Lampas cannot use yet');
  const button = page.getByRole('button', { name: /^Turn on \d+ books$/ });
  await expect(button).toBeVisible();
  await expectThumbSized(page);
  // the round Ask the tutor button rises above the pinned button and does not cover it
  const [turnOn, ask] = await Promise.all([button.boundingBox(), page.locator('[data-ask-tutor]').boundingBox()]);
  expect(ask!.y + ask!.height, 'the round button ends above the Turn on button').toBeLessThanOrEqual(turnOn!.y);
  await shot(page, 'library-import-long');
  await button.click();
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  await expect(page.getByTestId('import-line')).toContainText(`from a list of ${books.toLocaleString('en')} books`);
  await expect(page.getByRole('button', { name: 'Import again', exact: true })).toBeVisible();
  await expectThumbSized(page);
  await shot(page, 'library-after-import');
});

test('a file that is not a Logos list is refused in one line', async ({ page }) => {
  await open(page, 'library?import', 'Import your library');
  await page.getByLabel('Logos list file').setInputFiles({ name: 'words.csv', mimeType: 'text/csv', buffer: Buffer.from('Id,Name\r\nA,B\r\n', 'utf8') });
  await expect(page.getByRole('alert')).toContainText('This is not a Logos list');
  await expect(page.getByRole('button', { name: 'Choose your Logos list' })).toBeVisible();
  await shot(page, 'library-import-refused');
});
