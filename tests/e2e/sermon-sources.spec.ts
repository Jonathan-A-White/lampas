// tests/e2e/sermon-sources.spec.ts — Sermon sources (Settings > Study resources > Sermons > Sermon sources, src/sermons/SermonSourcesPage.tsx, mw-qtu3zvz.92) at 390x844 over 120 sources, the proof
// docs/design/sermon-sources.md section 14.12 asks: the top of the list, a search, All off and Undo, a screenshot of each, and the axe check on the page. The 120 are the bundled passage lists, every sermon
// book of the catalogue his import holds (a list standing for the books it is made from) and as many lists of the sermon index service as fill the rest, kept on the phone as the service gave them on an
// earlier day. After it: no dead address (the old Library > Sermons, a link to a source's setting), the Library without sermon books, and a book that is in the Library too. Last, on a phone as the Tester's
// (Logos On, his import, the two lists on the web On): the count of those on said once and the header one row (mw-qtu3zvz.173), a bulk button that counts only the rows it would change and is dimmed at none
// (mw-qtu3zvz.171), and a double tap on All off or These N off that leaves the Undo (mw-qtu3zvz.170); the three are folded in mw-qtu3zvz.174.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { EXCLUDED_RULES } from '../support/axe-excluded';
import { CATALOGUE, CATALOGUE_VERSION, KINDS } from '../../src/resources/catalogue';
import { EVERY_LOGOS_SERMON, keepImport } from './keep-import';
import { keepSettings } from './keep-settings';
import { turnLogosOn } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const TOTAL = 120;
/** The books a bundled list stands for: they have no row of their own. */
const UNDER = new Set(EVERY_LOGOS_SERMON);
/** The Logos books of the list: the sermon books no list stands for, and the books of another kind that also hold sermons. */
const BOOKS = CATALOGUE.filter((e) => (e.kind === 'sermons' && !UNDER.has(e.resource)) || (e.kind !== 'sermons' && e.alsoSermons === true));
/** The bundled passage lists (public/sermons/index.json): two on the web, which start On, and the ones made from Logos books, which start Off. */
const BUNDLED = (JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as { sources: { id: string }[] }).sources.map((s) => s.id);
const TOWNS = ['Ashford', 'Brookfield', 'Carlow', 'Dunmore', 'Easton', 'Fairhaven', 'Glenrock', 'Harlow', 'Inverness', 'Kingsbridge'];
const HOUSES = ['Baptist Church', 'Bible Chapel', 'Community Church', 'Presbyterian Church', 'Gospel Hall', 'Free Church'];
/** The lists of the sermon index service that bring the list to 120, as the phone keeps them (src/data/repositories/sermonSources.ts); every ninth starts On. */
const FILL = Array.from({ length: TOTAL - BUNDLED.length - BOOKS.length }, (_, i) => {
  const name = `${TOWNS[i % TOWNS.length]} ${HOUSES[Math.floor(i / TOWNS.length) % HOUSES.length]}`;
  return { id: `fill-${i}`, name, credit: name, homepage: `https://fill-${i}.example`, onByDefault: i % 9 === 0 };
});
const LISTS = BUNDLED.length + FILL.length;
/** The lists that are on when the page opens: the two web lists, the two Logos lists switched On below, and the service's lists that start On. */
const LISTS_ON = 2 + 2 + FILL.filter((s) => s.onByDefault).length;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Puts rows in the app's `meta` store through raw IndexedDB, as the app wrote them (the page must have opened once, so the store exists). */
async function keepMeta(page: Page, rows: Record<string, string>): Promise<void> {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('meta', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('meta').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

/** A phone with Logos On, an import that holds every sermon book, the service's lists kept, and two Logos lists switched On: 120 sources. The sermon index service is refused, as on a phone offline. */
async function with120(page: Page): Promise<void> {
  expect(FILL.length, 'the service fills the list to 120').toBeGreaterThan(0);
  await page.route('https://sermons.allmymind.org/**', (route) => route.abort());
  await openUnlocked(page);
  await turnLogosOn(page);
  await keepMeta(page, {
    sermonSources: JSON.stringify(FILL),
    libraryImport: JSON.stringify({ at: Date.UTC(2026, 10, 12), books: 4200, matched: BOOKS.length + EVERY_LOGOS_SERMON.length, newSince: 0, version: CATALOGUE_VERSION }),
  });
  await keepSettings(page, { 'sermons.greg-laurie-logos': 'on', 'sermons.wesley-logos': 'on' });
  await keepImport(page, [...EVERY_LOGOS_SERMON, ...BOOKS.map((e) => e.resource)]);
}

const openList = async (page: Page): Promise<void> => {
  await page.goto('/#/settings?sources=sermons');
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search sermon sources' })).toBeVisible();
};

/** Every control a thumb meets is at least 44 px each way and ends inside the screen, and nothing scrolls sideways. */
async function expectThumbSized(page: Page): Promise<void> {
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('main button, main input, main [role="radio"], header button'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const box = el.getBoundingClientRect();
        return { name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName, width: box.width, height: box.height, right: box.right };
      }),
  );
  expect(found.length).toBeGreaterThan(3);
  for (const c of found) {
    expect(c.height, `${c.name} is at least 44 px high`).toBeGreaterThanOrEqual(43.5);
    expect(c.width, `${c.name} is at least 44 px wide`).toBeGreaterThanOrEqual(43.5);
    expect(c.right, `${c.name} ends inside the screen`).toBeLessThanOrEqual(390.5);
  }
  const wide = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: (document.querySelector('.screen') as HTMLElement).scrollWidth, box: (document.querySelector('.screen') as HTMLElement).clientWidth }));
  expect(wide.page).toBeLessThanOrEqual(390);
  expect(wide.screen).toBeLessThanOrEqual(wide.box);
}

const toTop = (page: Page) => page.locator('.screen').evaluate((box) => void (box.scrollTop = 0));

/** The bar at the top of the screen: the one that holds the screen's title. */
const headerOf = (page: Page) => page.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) });

/** A phone as the Tester's (mw-qtu3zvz.145): Logos On and an import that holds every sermon book, no switch touched, so the two lists on the web are the only sources On. The sermon index service is refused. */
async function hisPhone(page: Page): Promise<void> {
  await page.route('https://sermons.allmymind.org/**', (route) => route.abort());
  await openUnlocked(page);
  await turnLogosOn(page);
}

test('120 sources: the row in Settings, the top of the list, a search, All off and Undo', async ({ page }) => {
  test.setTimeout(120_000);
  await with120(page);

  // the Sermons section of the Study resources page is two rows: the door to the list with its count, and Open web sermons in
  await page.goto('/#/settings?group=study');
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  await expect(section.getByTestId('sources-count')).toHaveText(`${LISTS_ON} of ${TOTAL} on`);
  const door = section.getByRole('button', { name: /^Sermon sources/ });
  expect((await door.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  await expect(section.getByRole('group', { name: 'Open web sermons in', exact: true })).toBeVisible();
  await expect(section.getByRole('group', { name: /Spurgeon|Matthew Henry|Greg Laurie/ })).toHaveCount(0);
  const studyHeader = (await headerOf(page).boundingBox())!.height;
  await section.scrollIntoViewIfNeeded();
  await shot(page, 'sermon-sources-row');
  await door.click();
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();

  // three sermon books On, by the thumb; the list is then opened again, so what is on leads each group
  const books = page.locator('[data-group="books"]');
  for (const entry of BOOKS.slice(0, 3)) {
    const row = books.locator(`[data-source="${entry.resource}"]`);
    await row.scrollIntoViewIfNeeded();
    await row.getByRole('radio', { name: 'On', exact: true }).click();
    await expect(row.getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  }
  const on = LISTS_ON + 3;
  await expect(page.getByTestId('sources-line')).toHaveText(`${on} of ${TOTAL} on`);
  await page.getByRole('button', { name: '‹ Study resources', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Study resources', level: 1 })).toBeVisible();
  await openList(page);

  // the top of the list: the header, the help line, the field, the status line, the two buttons, the first group with its count and its line
  const field = page.getByRole('searchbox', { name: 'Search sermon sources' });
  await expect(field).toHaveAttribute('placeholder', `Search ${TOTAL} sermon sources`);
  await expect(field).not.toBeFocused();
  // the count of those on is said once, on the line under the field; the header holds no count (mw-qtu3zvz.173)
  await expect(page.getByTestId('sources-line')).toHaveText(`${on} of ${TOTAL} on`);
  await expect(page.getByText(`of ${TOTAL} on`)).toHaveCount(1);
  await expect(headerOf(page)).toHaveText('‹ Study resourcesSermon sources');
  // the header is one row, as tall as the Study resources page's: the back button and the title share it, their middles within 4 px (a box's top differs with its height) (mw-qtu3zvz.149)
  const boxes = await Promise.all([page.getByRole('button', { name: '‹ Study resources', exact: true }), page.getByRole('heading', { name: 'Sermon sources', level: 1 })].map((it) => it.boundingBox()));
  const tops = boxes.map((box) => (box ? box.y + box.height / 2 : NaN));
  expect(Math.max(...tops) - Math.min(...tops), `the header's middles are ${tops.join(', ')}`).toBeLessThanOrEqual(4);
  expect((await headerOf(page).boundingBox())!.height, 'the header is as tall as the Study resources page\'s').toBe(studyHeader);
  await expect(page.getByText('The Sermons door at a verse draws on the sources that are on.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'All on', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All off', exact: true })).toBeVisible();
  const listed = page.locator('[data-group="listed"]');
  await expect(listed.getByRole('heading', { name: 'Listed by passage', level: 2 })).toBeVisible();
  await expect(listed.getByTestId('group-count')).toHaveText(`${LISTS_ON} of ${LISTS} on`);
  await expect(listed.getByText('Each sermon is listed at its verse. The count on the Sermons door is these.')).toBeVisible();
  await expect(books.getByRole('heading', { name: 'Logos books, at the verse', level: 2 })).toBeAttached();
  await expect(books.getByTestId('group-count')).toHaveText(`3 of ${BOOKS.length} on`);
  await expect(page.locator('[data-source]')).toHaveCount(TOTAL);
  // every source once, each Off | On and none with a Pin; a list stands for its books
  await expect(page.getByRole('radiogroup')).toHaveCount(TOTAL);
  await expect(page.getByRole('radio', { name: 'Pin', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-source="LLS:GRGLRSRMNRCH"]')).toHaveCount(0);
  const laurie = listed.locator('[data-source="sermons.greg-laurie-logos"]');
  await expect(laurie).toContainText("Greg Laurie's sermons");
  await expect(laurie).toContainText(/^.*[\d,]+ sermons · in Logos/);
  await expect(listed.locator('[data-source="sermons.spurgeon-ccel"]')).toContainText(/[\d,]+ sermons · on the web/);
  // what is on leads each group, then the rest by name
  const order = async (group: 'listed' | 'books') => page.locator(`[data-group="${group}"] [data-source]`).evaluateAll((rows) => rows.map((row) => row.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.trim()));
  for (const group of ['listed', 'books'] as const) {
    const states = await order(group);
    expect(states.lastIndexOf('On'), `in ${group} what is on comes first`).toBeLessThan(states.indexOf('Off'));
  }
  // a name is two lines at most, however long its title
  const tall = await page.locator('[data-source] p.line-clamp-2').evaluateAll((names) => names.filter((p) => p.getBoundingClientRect().height > 2 * parseFloat(getComputedStyle(p).lineHeight) + 1).map((p) => p.textContent));
  expect(tall).toEqual([]);
  await expectThumbSized(page);
  await toTop(page);
  await shot(page, 'sermon-sources-top');

  // scrolled into the list the field and the status line stay at the top of it; the second group begins after the first
  const screen = (await page.locator('.screen').boundingBox())!;
  await books.getByRole('heading', { name: 'Logos books, at the verse', level: 2 }).scrollIntoViewIfNeeded();
  const stuck = (await field.boundingBox())!;
  expect(stuck.y).toBeGreaterThanOrEqual(screen.y - 1);
  expect(stuck.y).toBeLessThan(screen.y + 24);
  await expect(page.getByTestId('sources-line')).toBeInViewport();
  await shot(page, 'sermon-sources-books');
  // the last row is reached above the phone's bar
  await page.locator('.screen').evaluate((box) => void (box.scrollTop = box.scrollHeight));
  const last = (await page.locator('[data-source]').last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(screen.y + screen.height + 0.5);

  // a tap does not move a row: the first source, turned Off, is still the first
  await toTop(page);
  const first = page.locator('[data-source]').first();
  const firstId = await first.getAttribute('data-source');
  await first.getByRole('radio', { name: 'Off', exact: true }).click();
  await expect(first.getByRole('radio', { name: 'Off', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('[data-source]').first()).toHaveAttribute('data-source', firstId!);
  const now = on - 1;
  await expect(page.getByTestId('sources-line')).toHaveText(`${now} of ${TOTAL} on`);

  // a search: the rows that match, the buttons acting on what is shown, each saying how many rows it would change (mw-qtu3zvz.171): one Wesley row is On (the list switched On above), so one would go Off and the rest On
  await field.fill('wesley');
  const shown = await page.locator('[data-source]').count();
  expect(shown).toBeGreaterThanOrEqual(2);
  expect(shown).toBeLessThan(10);
  await expect(page.getByTestId('sources-line')).toHaveText(`${now} of ${TOTAL} on · ${shown} shown`);
  await expect(page.locator('[data-source="sermons.wesley-logos"]')).toBeVisible();
  await expect(page.getByRole('button', { name: `These ${shown - 1} on`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'These 1 off', exact: true })).toBeVisible();
  await expect(page.getByTestId('group-count')).toHaveCount(0);
  await expectThumbSized(page);
  await shot(page, 'sermon-sources-search');
  await page.getByRole('button', { name: 'These 1 off', exact: true }).click();
  await expect(page.getByTestId('sources-undo')).toContainText('Turned off 1.');
  await expect(page.getByTestId('sources-line')).toHaveText(`${now - 1} of ${TOTAL} on · ${shown} shown`);
  // every row shown is Off now: the button that turns them off says 0 and is dimmed, the other counts them all
  await expect(page.getByRole('button', { name: 'These 0 off', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: `These ${shown} on`, exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  await expectThumbSized(page);
  await page.getByTestId('sources-undo').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTestId('sources-line')).toHaveText(`${now} of ${TOTAL} on · ${shown} shown`);
  // no match: the line and Ask for a preacher
  await field.fill('qqqqzzzz');
  await expect(page.getByText('No sermon source matches')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ask for a preacher/ })).toBeVisible();
  await field.fill('');
  await expect(page.locator('[data-source]')).toHaveCount(TOTAL);

  // All off: none on, the line that says what changed with Undo, and why no verse has a door; the rows have not moved
  const before = await page.locator('[data-source]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-source')));
  await page.getByRole('button', { name: 'All off', exact: true }).click();
  await expect(page.getByTestId('sources-line')).toHaveText(`none of ${TOTAL} on`);
  await expect(page.getByTestId('sources-undo')).toContainText(`Turned off ${now}.`);
  await expect(page.getByText('No source is on, so no verse has a Sermons door.')).toBeVisible();
  await expect(listed.getByTestId('group-count')).toHaveText(`none of ${LISTS} on`);
  expect(await page.locator('[data-source]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-source')))).toEqual(before);
  await expectThumbSized(page);
  await toTop(page);
  await shot(page, 'sermon-sources-all-off');

  // Undo puts back exactly what was there
  await page.getByTestId('sources-undo').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTestId('sources-line')).toHaveText(`${now} of ${TOTAL} on`);
  await expect(page.getByTestId('sources-undo')).toHaveCount(0);
  await expect(books.getByTestId('group-count')).toHaveText(`3 of ${BOOKS.length} on`);
  await toTop(page);
  await shot(page, 'sermon-sources-undo');

  // Back is the Study resources page, at the Sermons section
  await page.getByRole('button', { name: '‹ Study resources', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Study resources', level: 1 })).toBeVisible();
  await expect(page.locator('[data-section="sermons"]').getByTestId('sources-count')).toHaveText(`${now} of ${TOTAL} on`);
});

test('Sermon sources at 120: axe finds no WCAG 2.1 A or AA violation, in light, dark and High contrast', async ({ page }) => {
  test.setTimeout(120_000);
  await with120(page);
  await openList(page);
  await expect(page.locator('[data-source]')).toHaveCount(TOTAL);
  const violations = async (): Promise<string[]> => {
    await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
    const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules([...EXCLUDED_RULES]).analyze();
    return result.violations.map((v) => `${v.id} (${v.impact}): ${v.help} at ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join(' | ')}`);
  };
  expect(await violations()).toEqual([]);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await violations()).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'contrast';
  });
  expect(await violations()).toEqual([]);
});

test('no dead address: the old Library > Sermons opens the list, a link to a source opens it at the row, and the Library holds no sermon book', async ({ page }) => {
  test.setTimeout(120_000);
  await with120(page);

  // the address of the page the Library once had opens the one list in its place
  await page.goto('/#/library?kind=sermons');
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/settings\?sources=sermons$/);

  // a link to a source's setting (the tutor's, a Settings search result) opens the list at that source's row, marked and in view
  await page.goto('/#/settings?setting=sermons.whitefield-logos');
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  const row = page.locator('[data-source="sermons.whitefield-logos"]');
  await expect(row).toHaveAttribute('aria-current', 'true');
  await expect(row).toBeInViewport({ ratio: 1 });
  // the field at the top of the list does not cover it
  const [rowBox, fieldBox] = await Promise.all([row.boundingBox(), page.getByRole('searchbox', { name: 'Search sermon sources' }).boundingBox()]);
  expect(rowBox!.y).toBeGreaterThanOrEqual(fieldBox!.y + fieldBox!.height);
  await shot(page, 'sermon-sources-at-row');

  // the Library: a row for every kind but the sermon books, and its search finds no book that is only sermons
  await page.goto('/#/library');
  await expect(page.getByRole('heading', { name: 'Your Logos library', level: 1 })).toBeVisible();
  await expect(page.getByTestId('kind-row')).toHaveCount(KINDS.length - 1);
  await expect(page.getByTestId('kind-row').filter({ hasText: /^Sermon/ })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search your books' }).fill('Princeton Sermons');
  await expect(page.getByRole('button', { name: /^Princeton Sermons/ })).toHaveCount(0);
  await shot(page, 'library-no-sermons');

  // the Settings search answers the book, and opens the list at its row
  await page.goto('/#/settings');
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('Princeton Sermons');
  const found = page.getByRole('button', { name: /^Princeton Sermons · Sermon sources/ });
  await expect(found).toBeVisible();
  await found.click();
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  await expect(page.locator('[data-source][aria-current="true"]')).toContainText('Princeton Sermons');
  await expect(page.locator('[data-source][aria-current="true"]')).toBeInViewport({ ratio: 1 });
});

test('a book with more than sermons is in the list and in the Library, one book with one switch', async ({ page }) => {
  test.setTimeout(120_000);
  await with120(page);
  await openList(page);
  const augustine = CATALOGUE.find((e) => e.resource === 'LLS:SLSRHMTRTSTGSTN')!;
  const row = page.locator(`[data-source="${augustine.resource}"]`);
  await row.scrollIntoViewIfNeeded();
  await expect(row.getByRole('button', { name: 'Also in your Library: Commentaries ›' })).toBeVisible();
  await row.getByRole('radio', { name: 'On', exact: true }).click();
  await expect(row.getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'sermon-sources-also-in-library');

  // its line goes to its page of the Library, where the same switch reads On; Off there is Off in the list
  await row.getByRole('button', { name: 'Also in your Library: Commentaries ›' }).click();
  await expect(page.getByRole('heading', { name: 'Commentaries', level: 1 })).toBeVisible();
  const inLibrary = page.getByRole('radiogroup', { name: augustine.short, exact: true });
  await expect(inLibrary.getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(inLibrary.getByRole('radio', { name: 'Pin', exact: true })).toBeVisible();
  await inLibrary.getByRole('radio', { name: 'Off', exact: true }).click();
  await expect(inLibrary.getByRole('radio', { name: 'Off', exact: true })).toHaveAttribute('aria-checked', 'true');
  await openList(page);
  await expect(page.locator(`[data-source="${augustine.resource}"]`).getByRole('radio', { name: 'Off', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('the count of those on is said once, under the search field, and the header is one row with no count', async ({ page }) => {
  test.setTimeout(120_000);
  await hisPhone(page);
  // another page of Settings, for the height of its header
  await expect(page.getByRole('heading', { name: 'Study resources', level: 1 })).toBeVisible();
  const other = (await headerOf(page).boundingBox())!;
  await openList(page);
  const total = await page.locator('[data-source]').count();
  await expect(page.getByTestId('sources-line')).toHaveText(`2 of ${total} on`);
  // said once: the line under the field has it, the header does not
  await expect(page.getByText(`of ${total} on`)).toHaveCount(1);
  await expect(headerOf(page)).toHaveText('‹ Study resourcesSermon sources');
  // one row: as tall as the other page's header, the back button and the title at one height
  const here = (await headerOf(page).boundingBox())!;
  expect(here.height, 'the header is as tall as the Study resources page\'s').toBe(other.height);
  const [back, title] = await Promise.all([page.getByRole('button', { name: '‹ Study resources', exact: true }).boundingBox(), page.getByRole('heading', { name: 'Sermon sources', level: 1 }).boundingBox()]);
  expect(Math.abs(back!.y + back!.height / 2 - (title!.y + title!.height / 2))).toBeLessThanOrEqual(4);
  expect(title!.x + title!.width, 'the title ends inside the screen').toBeLessThanOrEqual(390);
  await expectThumbSized(page);
  await shot(page, 'sermon-sources-header');
});

test('with a search typed a button counts only the rows it would change, and one that would change none is dimmed', async ({ page }) => {
  test.setTimeout(120_000);
  await hisPhone(page);
  await openList(page);
  const total = await page.locator('[data-source]').count();
  const line = page.getByTestId('sources-line');
  const undo = page.getByTestId('sources-undo');
  const states = page.locator('[data-source] [role="radio"][aria-checked="true"]');
  // the Wesley rows, every one Off on a phone that has not switched them
  await page.getByRole('searchbox', { name: 'Search sermon sources' }).fill('wesley');
  await expect(line).toHaveText(new RegExp(`^2 of ${total} on · \\d+ shown$`));
  const shown = await page.locator('[data-source]').count();
  expect(shown).toBeGreaterThanOrEqual(2);
  expect(shown).toBeLessThan(10);
  const allOff = Array.from({ length: shown }, () => 'Off');
  await expect(states).toHaveText(allOff);
  // the button that would turn them off changes none: it says so and is dimmed, and does not count the rows shown; the other says how many it changes
  const off = page.getByRole('button', { name: /^These \d+ off$/ });
  const on = page.getByRole('button', { name: /^These \d+ on$/ });
  await expect(off).toHaveText('These 0 off');
  await expect(off).toHaveAttribute('aria-disabled', 'true');
  await expect(on).toHaveText(`These ${shown} on`);
  await expect(on).not.toHaveAttribute('aria-disabled', 'true');
  await expectThumbSized(page);
  await shot(page, 'sermon-sources-these-none');
  // a tap on the dimmed one changes nothing and says nothing
  await off.click({ force: true });
  await expect(line).toHaveText(`2 of ${total} on · ${shown} shown`);
  await expect(undo).toHaveCount(0);
  // the other turns them On, says how many, and Undo puts them back
  await on.click();
  await expect(undo).toContainText(`Turned on ${shown}.`);
  await expect(line).toHaveText(`${2 + shown} of ${total} on · ${shown} shown`);
  await expect(on).toHaveText('These 0 on');
  await expect(on).toHaveAttribute('aria-disabled', 'true');
  await expect(off).toHaveText(`These ${shown} off`);
  await expect(off).not.toHaveAttribute('aria-disabled', 'true');
  await undo.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(line).toHaveText(`2 of ${total} on · ${shown} shown`);
  await expect(states).toHaveText(allOff);
});

test('a double tap on All off, or on These 2 off after a search, turns them off once and leaves the Undo', async ({ page }) => {
  test.setTimeout(120_000);
  await hisPhone(page);
  await openList(page);
  const total = await page.locator('[data-source]').count();
  const line = page.getByTestId('sources-line');
  const undo = page.getByTestId('sources-undo');
  const allOff = page.getByRole('button', { name: 'All off', exact: true });
  await expect(line).toHaveText(`2 of ${total} on`);

  // two taps 30 ms apart, as a thumb's: the second finds nothing left to change, and the line that says what the first changed stays
  await allOff.dblclick({ delay: 30 });
  await expect(line).toHaveText(`none of ${total} on`);
  await expect(undo).toContainText('Turned off 2.');
  // a third tap, later: the button is dimmed, and a tap on it leaves the Undo too
  await expect(allOff).toHaveAttribute('aria-disabled', 'true');
  await allOff.click({ force: true });
  await expect(page.getByRole('button', { name: 'All on', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  await expect(undo).toContainText('Turned off 2.');
  await toTop(page);
  await shot(page, 'sermon-sources-double-tap');
  // Undo puts both back
  await undo.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(line).toHaveText(`2 of ${total} on`);
  await expect(undo).toHaveCount(0);
  await expect(page.locator('[data-source="sermons.spurgeon-ccel"]').getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');

  // the same with a search typed: the two lists on the web
  await page.getByRole('searchbox', { name: 'Search sermon sources' }).fill('on the web');
  await expect(line).toHaveText(`2 of ${total} on · 2 shown`);
  await page.getByRole('button', { name: 'These 2 off', exact: true }).dblclick({ delay: 30 });
  await expect(line).toHaveText(`none of ${total} on · 2 shown`);
  await expect(undo).toContainText('Turned off 2.');
  await expect(page.getByRole('button', { name: 'These 0 off', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'These 0 off', exact: true }).click({ force: true });
  await expect(undo).toContainText('Turned off 2.');
  await undo.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(line).toHaveText(`2 of ${total} on · 2 shown`);
  await expect(page.locator('[data-source] [role="radio"][aria-checked="true"]')).toHaveText(['On', 'On']);
});
