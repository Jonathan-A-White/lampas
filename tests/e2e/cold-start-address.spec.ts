// tests/e2e/cold-start-address.spec.ts — a cold start keeps the address the app was opened on (mw-5r3p30.669), at 390x844:
// a reload on #/share, which draws its sheet at once, stays on Share (the fresh page's leaveStaleSheets, src/ui/sheetBack.ts, steps back over the
// sheet entry the reload left, to the share's own entry, not past it to the Reader), and a Reader address set while the app is still starting
// (view=greek) keeps its view and is not overwritten by the saved one (src/reader/useReaderSettings.ts, src/nav/readerAddress.ts).
import { expect, test, type Page } from '@playwright/test';
import { afterFrames, untilSettled } from '../support/settled';
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

/** What the fresh page's history.go (the step back of leaveStaleSheets) has done: asked for, and landed (a popstate after it). */
interface GoState {
  asked: boolean;
  landed: boolean;
}

/** A loaded host takes its time over a history traversal: every history.go of a fresh page is made to land 500 ms late, and says that it was asked for and that it has landed. */
async function slowGo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state: GoState = { asked: false, landed: false };
    (window as unknown as { __go: GoState }).__go = state;
    const go = window.history.go.bind(window.history);
    window.history.go = (delta?: number) => {
      state.asked = true;
      window.addEventListener('popstate', () => void (state.landed = true), { once: true });
      void window.setTimeout(() => go(delta), 500); // clock: the page's own late traversal, which the spec waits out by its popstate, not by a sleep
    };
  });
}

/** Waits until the step back the fresh page asked for (if it asked for one) has landed, and the frames after it have been drawn: then where he is, is where he stays. */
async function afterGoLanded(page: Page): Promise<void> {
  await untilSettled(
    () => page.evaluate(() => (window as unknown as { __go: GoState }).__go),
    (go) => (go.asked && !go.landed ? 'the step back was asked for and has not landed' : null),
    { message: 'the fresh page steps back' },
  );
  await afterFrames(page);
}

test('a reload on #/share stays on Share', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await putShare(page);
  await page.goto('/#/share?s=cold');
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet).toBeVisible();

  // the fresh page draws the share before the go(-1) of leaveStaleSheets has landed
  await slowGo(page);
  await page.reload();
  await expect(sheet).toBeVisible();
  // leaveStaleSheets goes back asynchronously: look at where he is once the step has landed
  await expect.poll(() => page.evaluate(() => (window as unknown as { __go: GoState }).__go.asked), { message: 'the fresh page asks to step back over the stale sheet entry' }).toBe(true);
  await afterGoLanded(page);
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
  // the saved view is read from the database once the Reader's own switch shows the view the address named, and the address is looked at once the frames after it are drawn
  const label = wanted === 'greek' ? 'Greek' : 'English';
  await expect(page.getByRole('group', { name: 'Language' }).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await afterFrames(page);
  expect(new URL(page.url()).hash).toContain(`view=${wanted}`);
  await shot(page, 'cold-start-view');
});

// Every screen an address opens (src/nav/route.ts Route; tests/unit/routes-listed.test.ts names each route left out and why): one that draws a sheet at once
// leaves a stale sheet entry on a reload, and the fresh page must not go back past its own address to the Reader or another screen.
const SCREENS = ['words', 'import', 'test', 'drill', 'review', 'today', 'paradigms', 'placement', 'goal', 'path', 'ipa', 'diagram-lesson', 'sounds', 'studyway', 'aboutyou', 'memory', 'requests', 'conversations', 'askmore', 'help', 'library', 'lists', 'about', 'preface', 'settings', 'tools'];

test('a reload on any screen keeps its address', async ({ page }) => {
  test.setTimeout(120_000);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await slowGo(page);
  for (const screen of SCREENS) {
    await page.goto(`/#/${screen}`);
    await expect(page.locator('#root > *').first()).toBeVisible();
    // a screen that draws a sheet at once has put its entry on the history (the mark the reload leaves stale) before it is reloaded
    await untilSettled(
      () => page.evaluate(() => ({ sheet: document.querySelector('[role="dialog"]') !== null, depth: (window.history.state as { sheet?: number } | null)?.sheet ?? 0 })),
      (seen) => (seen.sheet && seen.depth === 0 ? 'a sheet is open and has no history entry yet' : null),
      { message: `#/${screen} has settled` },
    );
    await page.reload();
    await afterGoLanded(page);
    expect(new URL(page.url()).hash.split('?')[0], `a reload on #/${screen}`).toBe(`#/${screen}`);
  }
});
