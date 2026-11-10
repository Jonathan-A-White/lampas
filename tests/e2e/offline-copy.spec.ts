import { expect, test, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Reading > Keep on this phone (mw-lcv9z3g.2, five choices since mw-lcv9z3g.6): the choices with their sizes; choosing New Testament runs the whole offline copy against the built app, all 260 chapters of the
// real index.json, and the row counts 'N of 260 chapters' and ends 'Up to date · checked <time>'. The 34 MB full run took 32 s here, too near the 60 s test budget on a loaded host, so each
// chapter file is answered with a 20 KB stand-in (the index, the addresses and the fetching are the real ones). Service workers are blocked in e2e, so nothing is kept in the cache:
// the count and the row's states are what is proved here. A phone-width layout claim: the long choices wrap inside the frame at 390x844.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** All five chips are there, in this order, and none is clipped at the phone's width (they wrap inside the row). */
async function expectFiveChips(row: Locator, labels: (string | RegExp)[] = ['Nothing extra', 'Old Testament: Hebrew (77 MB)', /^Old Testament: Septuagint/, 'New Testament (36 MB)', /^All/]): Promise<void> {
  const chips = row.getByRole('button');
  await expect(chips).toHaveCount(5);
  for (const [i, label] of labels.entries()) {
    if (typeof label === 'string') await expect(chips.nth(i)).toHaveText(label);
    else await expect(chips.nth(i)).toHaveText(label);
    const box = await chips.nth(i).boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 390, `chip ${i} fits the phone's width`).toBe(true);
  }
  const frame = await row.boundingBox();
  expect(frame && frame.x >= 0 && frame.x + frame.width <= 390).toBe(true);
}

test('Keep on this phone offers five choices with their sizes, counts the New Testament to 260 and says Up to date', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  const row = page.getByRole('group', { name: 'Keep on this phone', exact: true });
  await expect(row.getByRole('button', { name: 'Nothing extra', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // the Septuagint's megabytes come from its index, which public/data-lxx ships empty in the gate: 0 MB here
  await expectFiveChips(row);

  // set only now: the Reader would choke on a stand-in chapter
  await page.route(/\/data\/[0-9a-z]+\/\d+\.json\?v=[0-9a-f]{12}$/, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ filler: 'x'.repeat(20_000) }) }));
  const status = page.locator('[data-setting="offlineCopy"] [data-offline-status]');
  await row.getByRole('button', { name: 'New Testament (36 MB)', exact: true }).click();
  await expect(row.getByRole('button', { name: 'New Testament (36 MB)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText(/\d+ of 260 chapters/);
  await expect(status).toContainText('Keep the app open');
  await shot(page, 'offline-copy-running');

  await expect(status).toContainText(/Up to date · checked \S/, { timeout: 30_000 });
  await expect(status).not.toContainText('Keep the app open');
  await shot(page, 'offline-copy');

  await page.reload();
  const again = page.getByRole('group', { name: 'Keep on this phone', exact: true });
  await expect(again.getByRole('button', { name: 'New Testament (36 MB)', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

// mw-lcv9z3g.10: a double tap on All stops the first run at once, before its index is read; the row used to read that stopped run as finished and say 'Up to date' for a moment with nothing kept.
test('a double tap on All never reads Up to date before the count shows', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  const row = page.getByRole('group', { name: 'Keep on this phone', exact: true });
  await expect(row.getByRole('button', { name: 'Nothing extra', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // set only now, once the Copy preview further up this screen has its chapter (Colossians 3): it would choke on a stand-in chapter
  await expect(page.locator('[data-copy-preview]')).toBeVisible();
  await page.route(/\/data\/[0-9a-z]+\/\d+\.json\?v=[0-9a-f]{12}$/, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ filler: 'x'.repeat(20_000) }) }));
  const status = page.locator('[data-setting="offlineCopy"] [data-offline-status]');
  // every line the row shows from now on, so a line that flashes by between two polls is still seen
  await status.evaluate((node) => {
    const seen: string[] = [];
    (window as unknown as { __offlineLines: string[] }).__offlineLines = seen;
    new MutationObserver(() => seen.push(node.textContent ?? '')).observe(node, { childList: true, subtree: true, characterData: true });
  });
  await row.getByRole('button', { name: /^All/ }).dblclick();
  await expect(row.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText(/\d+ of \d+ chapters/);
  const lines = await page.evaluate(() => (window as unknown as { __offlineLines: string[] }).__offlineLines);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => line.includes('Up to date'))).toEqual([]);
  await shot(page, 'offline-copy-double-tap');
});

// The Septuagint (mw-lcv9z3g.6), through the REAL worker (this spec lets the built worker run: it keeps /data-lxx/ chapters, and the index and lexicon network first). public/data-lxx ships no chapter in the gate, so the
// context answers the Septuagint's files from tests/fixtures/data-lxx (the route is the context's: the worker's own trips to the network go through it too): Genesis 1 renumbered into 18 chapters, the same fingerprint for each.
test.describe('Old Testament: Septuagint', () => {
  test.use({ serviceWorkers: 'allow' });

  test('chosen, it is kept until Up to date, and with the phone offline Genesis 18 draws in English and Greek and a word sheet opens', async ({ page, context }) => {
    let offline = false;
    const asked: string[] = [];
    await context.route('**/data-lxx/**', (route) => {
      if (offline) return route.abort('internetdisconnected');
      const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
      asked.push(path);
      if (path === 'lexicon-grc-lxx.json') return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync('public/data-lxx/lexicon-grc-lxx.json', 'utf8') });
      if (path === 'index.json') {
        const index = JSON.parse(readFileSync('tests/fixtures/data-lxx/index.json', 'utf8')) as { books: { code: string; chapters: number; verses: number[]; fingerprints: string[]; lampasChapters: number[][] }[] };
        index.books = index.books.filter((b) => b.code === 'gen');
        const gen = index.books[0];
        gen.chapters = 18;
        gen.verses = Array.from({ length: 18 }, () => 31);
        gen.fingerprints = Array.from({ length: 18 }, () => gen.fingerprints[0]);
        gen.lampasChapters = Array.from({ length: 18 }, (_, i) => [i + 1]);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(index) });
      }
      const chapter = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as { chapter: number };
      chapter.chapter = Number(/^gen\/(\d+)\.json$/.exec(path)![1]);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(chapter) });
    });
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    await page.goto('/#/settings?group=reading');
    const row = page.getByRole('group', { name: 'Keep on this phone', exact: true });
    // the Septuagint's index is read, so its chip and All's carry their megabytes
    await expect(row.getByRole('button', { name: /^Old Testament: Septuagint \(\d/ })).toBeVisible();
    await expectFiveChips(row, ['Nothing extra', 'Old Testament: Hebrew (77 MB)', /^Old Testament: Septuagint \(\d+(\.\d)? MB\)$/, 'New Testament (36 MB)', /^All \(\d+ MB\)$/]);
    const status = page.locator('[data-setting="offlineCopy"] [data-offline-status]');
    await row.getByRole('button', { name: /^Old Testament: Septuagint/ }).click();
    await expect(row.getByRole('button', { name: /^Old Testament: Septuagint/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(status).toContainText(/Up to date · checked \S/);
    await shot(page, 'offline-copy-septuagint');
    // nothing of the Hebrew or the Greek New Testament was asked for: only the Septuagint's files, 18 chapters, the index and the lexicon
    expect([...new Set(asked.filter((p) => /^gen\/\d+\.json$/.test(p)))]).toHaveLength(18);

    // Septuagint On, then the phone goes offline: nothing of the Septuagint is reachable but what the worker kept
    await page.goto('/#/settings');
    const septuagint = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
    await septuagint.getByRole('button', { name: 'On', exact: true }).click();
    await expect(septuagint.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
    offline = true;
    await context.setOffline(true);
    await page.goto('/#/?b=gen&c=18&weave=solid');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Genesis 18');
    const verse = page.locator('[data-verse="1"]');
    await expect(verse).toBeVisible();
    // English and Greek both draw: Brenton's English, then Swete's Greek
    await expect(verse).toContainText('In the beginning God made');
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
    await expect(verse.locator('[data-word="0"]')).toHaveText('ΕΝ');
    await verse.getByRole('button', { name: /^ἐποίησεν/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Word' });
    await expect(sheet.getByTestId('sheet-word')).toHaveText('ἐποίησεν');
    await shot(page, 'offline-copy-septuagint-offline');
    await context.setOffline(false);
  });
});
