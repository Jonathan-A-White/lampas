// A phone that already holds the Hebrew lexicon from before batch 465 gets the new one (mw-fnvjof.17.41), through the REAL built worker (this spec lets it run; most block it).
// The data cache holds what such a phone held: /data/lexicon-hbo.json under its plain address with no יָרָה. The app asks for the list by the fingerprint in index.json now, so the worker
// fetches it once, a #/?word= link by יָרָה opens the sheet of H3384 with no notice, and a chapter the phone kept is still there (DATA_CACHE_VERSION is not raised).
import { expect, test, type Page } from '@playwright/test';
import { DATA_CACHE } from '../../src/dataCache';
import { appReady, WORKER_INSTALL_MS, workerControls, workerReady } from './app-ready';
import { openUnlocked } from './unlocked';

test.use({ serviceWorkers: 'allow', viewport: { width: 390, height: 844 } });
// the worker's install is waited for to WORKER_INSTALL_MS, so the test may take that and the rest of its steps
test.setTimeout(WORKER_INSTALL_MS * 2);

/** The worker is in control of the page, as an installed app's is. */
async function openWithWorker(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await appReady(page);
  await workerReady(page);
  await page.reload();
  await workerControls(page);
  await appReady(page);
}

test('a #/?word= link by יָרָה opens the sheet of H3384 on a phone that kept the old Hebrew lexicon, and a kept chapter stays', async ({ page }) => {
  await openWithWorker(page);
  // what the phone held: the old lexicon under its plain address, and a chapter it had read
  await page.evaluate(async (name) => {
    const old = (await (await fetch('/data/lexicon-hbo.json?old')).json()) as Record<string, { v?: true }>;
    for (const lemma of Object.keys(old)) if (old[lemma].v) delete old[lemma];
    const cache = await caches.open(name);
    await cache.put('/data/lexicon-hbo.json', new Response(JSON.stringify(old)));
    await cache.put('/data/jhn/1.json?v=0123456789ab', new Response('{"kept":true}'));
  }, DATA_CACHE);

  await page.goto(`/#/?word=${encodeURIComponent('יָרָה')}`);
  await page.reload();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('יָרָה');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('to show');
  await expect(page.locator('[data-link-notice]')).toHaveCount(0);
  await expect(page.getByText('is not in Lampas')).toHaveCount(0);

  const kept = await page.evaluate(async (name) => {
    const cache = await caches.open(name);
    return { chapter: await (await cache.match('/data/jhn/1.json?v=0123456789ab'))?.text(), lists: (await cache.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search).filter((u) => u.includes('-hbo')) };
  }, DATA_CACHE);
  expect(kept.chapter).toBe('{"kept":true}');
  expect(kept.lists).toHaveLength(1);
  expect(kept.lists[0]).toMatch(/^\/data\/lexicon-hbo\.json\?v=[0-9a-f]{12}$/);
});
