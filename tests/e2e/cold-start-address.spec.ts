// tests/e2e/cold-start-address.spec.ts — a cold start keeps the address the app was opened on (mw-5r3p30.669), at 390x844:
// a reload on #/share, which draws its sheet at once, stays on Share (the fresh page's leaveStaleSheets, src/ui/sheetBack.ts, steps back over the
// sheet entry the reload left, to the share's own entry, not past it to the Reader), and a Reader address set while the app is still starting
// (view=greek) keeps its view and is not overwritten by the saved one (src/reader/useReaderSettings.ts, src/nav/readerAddress.ts).
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const WORDS = 'And we know that all things work together for good (Rom. 8:28 ESV).';

/** Puts a share in the phone's database, as the share target leaves it. */
async function putShare(page: Page): Promise<void> {
  await page.evaluate(
    (text) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'cold', createdAt: Date.now(), text, files: [] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    WORDS,
  );
}

test('a reload on #/share stays on Share', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await putShare(page);
  await page.goto('/#/share?s=cold');
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet).toBeVisible();

  // a loaded host takes its time over a history traversal: the fresh page draws the share before the go(-1) of leaveStaleSheets has landed
  await page.addInitScript(() => {
    const go = window.history.go.bind(window.history);
    window.history.go = (delta?: number) => void window.setTimeout(() => go(delta), 500);
  });
  await page.reload();
  await expect(sheet).toBeVisible();
  // leaveStaleSheets goes back asynchronously: give it the time it needs to land before looking at where he is
  await page.waitForTimeout(1500);
  await expect(sheet).toBeVisible();
  expect(new URL(page.url()).hash).toContain('#/share');
  await shot(page, 'cold-start-share');
});

test('a Reader address set during the cold start keeps its view', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/\?.*view=.*weave=/);
  const saved = new URL(page.url()).hash.match(/view=(english|greek)/)![1];
  const wanted = saved === 'greek' ? 'english' : 'greek';
  // a fresh page: the address changes to the other view the moment the Reader is first drawn, before its saved view is read from the database
  await page.addInitScript((view) => {
    const watch = new MutationObserver(() => {
      if (!document.getElementById('root')?.firstChild) return;
      watch.disconnect();
      window.location.hash = `#/?b=Rom&c=8&view=${view}&weave=off`;
    });
    watch.observe(document, { childList: true, subtree: true });
  }, wanted);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(new URL(page.url()).hash).toContain(`view=${wanted}`);
  await shot(page, 'cold-start-view');
});

// Every screen an address opens (src/nav/route.ts Route; tests/unit/routes-listed.test.ts names each route left out and why): one that draws a sheet at once
// leaves a stale sheet entry on a reload, and the fresh page must not go back past its own address to the Reader or another screen.
const SCREENS = ['words', 'import', 'test', 'drill', 'review', 'today', 'paradigms', 'placement', 'goal', 'path', 'ipa', 'diagram-lesson', 'sounds', 'studyway', 'aboutyou', 'memory', 'requests', 'conversations', 'askmore', 'help', 'library', 'lists', 'about', 'preface', 'settings'];

test('a reload on any screen keeps its address', async ({ page }) => {
  test.setTimeout(120_000);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.addInitScript(() => {
    const go = window.history.go.bind(window.history);
    window.history.go = (delta?: number) => void window.setTimeout(() => go(delta), 500);
  });
  for (const screen of SCREENS) {
    await page.goto(`/#/${screen}`);
    await expect(page.locator('#root > *').first()).toBeVisible();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(1000);
    expect(new URL(page.url()).hash.split('?')[0], `a reload on #/${screen}`).toBe(`#/${screen}`);
  }
});
