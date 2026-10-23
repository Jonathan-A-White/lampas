// tests/e2e/share-target.spec.ts — Share > Lampas (mw-y3qno5.2) at the phone's width, 390 px, through the REAL worker (this spec lets the built worker run; the
// others block it): the share is POSTed to the share target as the phone's share sheet does it (a form navigation, multipart/form-data, a picture and
// words), the worker parks it and redirects, and the 'Share to Lampas' sheet is on screen with 'Continue: <the newest talk>' first. Continue puts the
// picture in that talk's composer and the words in its field, not sent.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';

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

/** What the phone's share sheet does: navigates to the share target with a POSTed multipart form holding one file and words. */
async function share(page: Page, file: { name: string; type: string; bytes: number[] }, text: string): Promise<void> {
  await page.evaluate(
    async ({ file, text }) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/share-target';
      form.enctype = 'multipart/form-data';
      const input = document.createElement('input');
      input.type = 'file';
      input.name = 'files';
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(file.bytes)], file.name, { type: file.type }));
      input.files = data.files;
      const words = document.createElement('input');
      words.name = 'text';
      words.value = text;
      form.append(input, words);
      document.body.append(form);
      form.submit();
    },
    { file, text },
  );
}

const sharePicture = (page: Page): Promise<void> => share(page, { name: 'lexicon-entry.png', type: 'image/png', bytes: Array.from(ENTRY) }, 'ἀγάπη in BDAG');

/** The worker is in control of the page, as an installed app's is. */
async function openWithWorker(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

test('Share > Lampas opens the Share to Lampas sheet, and Continue puts the picture and words in the newest talk, not sent', async ({ page }) => {
  await openWithWorker(page);
  await keepPastTalk(page);

  await sharePicture(page);
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
  await expect((await talkField(talk))).toHaveValue('ἀγάπη in BDAG');
  await shot(page, 'share-target-talk');
});

/** The shares the phone holds, by file name and kind. */
const parked = (page: Page): Promise<{ id: string; files: { name: string; type: string; size: number }[] }[]> =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const all = db.transaction('shares').objectStore('shares').getAll();
          all.onsuccess = () => {
            db.close();
            resolve((all.result as { id: string; files: { name: string; type: string; bytes: ArrayBuffer }[] }[]).map((r) => ({ id: r.id, files: r.files.map((f) => ({ name: f.name, type: f.type, size: f.bytes.byteLength })) })));
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );

test('Share > Lampas with a CSV parks it and opens the library import on it, not the talk chooser', async ({ page }) => {
  const list = readFileSync('tests/fixtures/logos-export-head.csv');
  await openWithWorker(page);
  await keepPastTalk(page);

  await share(page, { name: 'Logos list.csv', type: 'text/csv', bytes: Array.from(list) }, '');
  await expect(page.getByRole('heading', { name: 'Import your library', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/library\?import=[^&]+$/);
  const [row] = await parked(page);
  expect(new URL(page.url()).hash).toBe(`#/library?import=${encodeURIComponent(row.id)}`);
  expect(row.files).toEqual([{ name: 'Logos list.csv', type: 'text/csv', size: list.byteLength }]);
  // the shared list is read as if he had chosen it
  await expect(page.getByTestId('import-read')).toHaveText('60 books read from your Logos list.');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toHaveCount(0);
  await shot(page, 'share-target-csv');
});

test('a CSV that Windows labels application/vnd.ms-excel still opens the import by its .csv name', async ({ page }) => {
  const list = readFileSync('tests/fixtures/logos-export-head.csv');
  await openWithWorker(page);
  await share(page, { name: 'library.csv', type: 'application/vnd.ms-excel', bytes: Array.from(list) }, '');
  await expect(page.getByRole('heading', { name: 'Import your library', level: 1 })).toBeVisible();
  await expect(page.getByTestId('import-read')).toHaveText('60 books read from your Logos list.');
});
