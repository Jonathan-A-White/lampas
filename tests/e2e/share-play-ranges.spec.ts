// tests/e2e/share-play-ranges.spec.ts — Share to Lampas, Play all on chapter ranges (mw-fnvjof.18), at 390x844: a picture whose page names 'Judges 1–5; 1 Samuel 1–2; 1 Samuel 8;
// 1 Samuel 12–17; 1 Samuel 31; 2 Samuel 5–12' is read by the (stubbed) find-refs grist, and Play all queues the six passages whole, in page order: Judges 1:1 to 5:31 is read
// before 1 Samuel 1 begins, and so on to the last verse of 2 Samuel 12. It was read as the first verse of each.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const PICTURE = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');
// the grist keeps the first verse (or chapter) in `ref` and the range whole in `printed`
const ANSWER = {
  references: [
    { printed: 'Judges 1–5', ref: 'Judg.1' },
    { printed: '1 Samuel 1–2', ref: '1Sam.1' },
    { printed: '1 Samuel 8', ref: '1Sam.8' },
    { printed: '1 Samuel 12–17', ref: '1Sam.12' },
    { printed: '1 Samuel 31', ref: '1Sam.31' },
    { printed: '2 Samuel 5–12', ref: '2Sam.5' },
  ],
};
// [heading as the player says it, book dir, first chapter, last chapter]
const PASSAGES: [string, string, number, number][] = [
  ['Judges 1-5', 'jdg', 1, 5],
  ['1 Samuel 1-2', '1sa', 1, 2],
  ['1 Samuel 8', '1sa', 8, 8],
  ['1 Samuel 12-17', '1sa', 12, 17],
  ['1 Samuel 31', '1sa', 31, 31],
  ['2 Samuel 5-12', '2sa', 5, 12],
];

interface Verse {
  n: number;
  e: { t: string }[];
}
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const versesOf = (book: string, chapter: number): Verse[] => (JSON.parse(readFileSync(`public/data/${book}/${chapter}.json`, 'utf8')) as { verses: Verse[] }).verses;
const englishOf = (v: Verse): string => squash(v.e.map((c) => c.t).join(' '));

async function openShare(page: Page): Promise<void> {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 1 });
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    (bytes) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'pic', createdAt: Date.now(), files: [{ name: 'page.png', type: 'image/png', bytes: new Uint8Array(bytes).buffer }] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    Array.from(PICTURE),
  );
  await page.goto('/#/share?s=pic');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

test("Play all on 'Judges 1–5; 1 Samuel 1–2; ...' reads the six passages whole, in page order", async ({ page }) => {
  test.setTimeout(240_000);
  const fake = makeFakePostern();
  fake.kindReplies['find-refs'] = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openShare(page);
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet.getByRole('heading', { name: 'Bible references (6)' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Play all' }).click();
  const bar = sheet.getByRole('status', { name: 'Playing the list' });
  await expect(bar).toContainText('Reading Judges 1-5 · 1 of 6');
  await shot(page, 'share-play-ranges');

  const said = async (): Promise<string> => squash((await spoken(page)).map((s) => s.text).join(' '));
  let at = -1;
  for (const [heading, book, first, last] of PASSAGES) {
    const verses = [...Array(last - first + 1)].flatMap((_, i) => versesOf(book, first + i));
    const lastVerse = englishOf(verses.at(-1)!);
    await expect.poll(said, { timeout: 120_000 }).toContain(lastVerse.slice(0, 40));
    const text = await said();
    // its heading came before its first verse, after the passage before it, and its first verse and last chapter's last verse are both there
    const headed = text.indexOf(heading, at + 1);
    expect(headed, heading).toBeGreaterThan(at);
    const firstAt = text.indexOf(englishOf(versesOf(book, first)[0]).slice(0, 40), headed);
    expect(firstAt, `${heading} first verse`).toBeGreaterThan(headed);
    const lastAt = text.indexOf(lastVerse.slice(0, 40), firstAt);
    expect(lastAt, `${heading} last verse`).toBeGreaterThan(firstAt);
    at = lastAt;
  }
  await expect(sheet.getByRole('button', { name: 'Play all' })).toBeVisible({ timeout: 60_000 });
});
