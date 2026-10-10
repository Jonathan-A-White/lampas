// tests/e2e/share-target.spec.ts — Share > Lampas (mw-y3qno5.2) at the phone's width, 390 px, through the REAL worker (this spec lets the built worker run; the
// others block it): the share is POSTed to the share target as the phone's share sheet does it (a form navigation, multipart/form-data, a picture and
// words), the worker parks it and redirects, and the 'Share to Lampas' sheet is on screen with 'Continue: <the newest talk>' first. Continue puts the
// picture in that talk's composer and the words in its field, not sent.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const ENTRY = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');

test.use({ serviceWorkers: 'allow' });

/** Keeps a past talk about Romans 8:28 in the phone's database, as the Talk sheet leaves it. */
async function keepPastTalk(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('talks', 'readwrite');
          tx.objectStore('talks').add({ ref: 'rom.8.28', q: 'Why do all things work together?', a: 'Because God works in them.', words: [], when: Date.now() - 2.5 * 3_600_000 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** What the phone's share sheet does: navigates to the share target with a POSTed multipart form holding a picture and words. */
async function share(page: Page): Promise<void> {
  await page.evaluate(
    async ({ bytes, text }) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/share-target';
      form.enctype = 'multipart/form-data';
      const input = document.createElement('input');
      input.type = 'file';
      input.name = 'files';
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(bytes)], 'lexicon-entry.png', { type: 'image/png' }));
      input.files = data.files;
      const words = document.createElement('input');
      words.name = 'text';
      words.value = text;
      form.append(input, words);
      document.body.append(form);
      form.submit();
    },
    { bytes: Array.from(ENTRY), text: 'ἀγάπη in BDAG' },
  );
}

test('Share > Lampas opens the Share to Lampas sheet, and Continue puts the picture and words in the newest talk, not sent', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  // the worker is in control of the page, as an installed app's is
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await keepPastTalk(page);

  await share(page);
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet).toBeVisible();
  const choices = sheet.getByRole('button');
  await expect(choices.nth(0)).toHaveText(/^Continue: Romans 8:28 · 2 hours ago$/);
  await expect(choices.nth(1)).toHaveText('New talk');
  await expect(choices.nth(2)).toHaveText('Choose a talk');
  // thumb-sized, and inside the phone
  for (let i = 0; i < 3; i++) {
    const box = await choices.nth(i).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await shot(page, 'share-target-sheet');

  await choices.nth(0).click();
  const talk = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(talk).toBeVisible();
  await expect(talk.getByText('Why do all things work together?')).toBeVisible();
  await expect(talk.getByRole('group', { name: 'Pictures to send' }).getByRole('img')).toHaveCount(1);
  await expect(talk.getByRole('textbox', { name: 'Your message' })).toHaveValue('ἀγάπη in BDAG');
  await shot(page, 'share-target-talk');
});
