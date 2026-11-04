// tests/e2e/share-pieces.spec.ts — the Verse view's Share opens a small sheet first (mw-5r3p30.1026, his word 2026-11-03): The whole, Just the link, Just the text, Just the
// reference, each row showing the piece it will send; a tap on a row hands the phone's share exactly that piece. At 390x844 on a verse, a passage and a whole chapter, with
// navigator.share stubbed; Back and a tap outside close it; at 844x390 every row fits and is 48 px or more (text at 200% is a screen of large-text.spec.ts). A phone-width layout claim.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

interface Shared {
  title?: string;
  text?: string;
  url?: string;
}

async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

async function start(page: Page, code: string, chapter: number, heading: string, settings: Record<string, string> = {}): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __shared: unknown[] };
    w.__shared = [];
    Object.defineProperty(navigator, 'share', { value: (data: unknown) => (w.__shared.push(data), Promise.resolve()), configurable: true });
  });
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveHint: 'off', ...settings });
  await page.goto(`/#/?b=${code}&c=${chapter}&view=english&weave=off`);
  await page.reload();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const shared = (page: Page) => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared) as Promise<Shared[]>;
const view = (page: Page) => page.getByRole('region', { name: 'Verse view' });
const sheet = (page: Page) => page.getByRole('dialog', { name: /^Share / });
const row = (page: Page, name: string) => sheet(page).getByRole('button', { name: new RegExp(`^${name}`) });

async function openSheet(page: Page): Promise<Locator> {
  await view(page).getByRole('group', { name: 'Tools', exact: true }).getByRole('button', { name: 'Share', exact: true }).click();
  await expect(sheet(page)).toBeVisible();
  return sheet(page);
}

/** Taps each row in turn (the sheet closes after one, so it is opened again) and returns what the share was handed. */
async function shareEach(page: Page): Promise<Record<string, Shared>> {
  const got: Record<string, Shared> = {};
  for (const name of ['The whole', 'Just the link', 'Just the text', 'Just the reference']) {
    await openSheet(page);
    const before = (await shared(page)).length;
    await row(page, name).click();
    await expect.poll(async () => (await shared(page)).length).toBe(before + 1);
    got[name] = (await shared(page))[before];
    await expect(sheet(page)).toHaveCount(0);
  }
  return got;
}

function expectPieces(got: Record<string, Shared>, o: { words: string; reference: string; link: string; numbered?: boolean }) {
  const whole = got['The whole'];
  expect(whole.text).toContain(o.words);
  expect(whole.text).toContain(`— ${o.reference}`);
  expect(whole.text).not.toContain('https://');
  expect(whole.url).toBe(o.link);

  expect(got['Just the link']).toEqual({ url: o.link });

  const text = got['Just the text'];
  expect(Object.keys(text)).toEqual(['text']);
  expect(text.text).toContain(o.words);
  expect(text.text).not.toContain('MSB');
  expect(text.text).not.toContain('https://');
  expect(text.text).not.toContain('—');

  expect(got['Just the reference']).toEqual({ text: o.reference });
}

test('a verse: each row hands the share its piece and nothing else', async ({ page }) => {
  await start(page, 'rom', 8, 'Romans 8');
  await page.getByRole('button', { name: 'Verse 11', exact: true }).click();
  await expect(view(page)).toBeVisible();
  const open = await openSheet(page);
  // each row shows the piece it will send before it is tapped
  await expect(row(page, 'The whole')).toContainText('— Romans 8:11 (MSB)');
  await expect(row(page, 'Just the link')).toContainText('https://lampas.allmymind.org/#/?ref=Rom.8.11');
  await expect(row(page, 'Just the text')).not.toContainText('MSB');
  await expect(row(page, 'Just the reference')).toHaveText(/Romans 8:11 \(MSB\)$/);
  await shot(page, 'share-pieces-verse');
  await page.keyboard.press('Escape');
  await expect(open).toHaveCount(0);
  const got = await shareEach(page);
  expectPieces(got, { words: 'the Spirit of Him who raised Jesus', reference: 'Romans 8:11 (MSB)', link: 'https://lampas.allmymind.org/#/?ref=Rom.8.11' });
});

test('a passage: numbers follow Verse numbers, the link is the passage\'s, a long row is cut short and what is sent is whole', async ({ page }) => {
  await start(page, 'rom', 8, 'Romans 8');
  await page.getByRole('button', { name: 'Walking by the Spirit' }).click();
  await expect(view(page)).toBeVisible();
  await openSheet(page);
  const shown = (await row(page, 'Just the text').innerText()).length;
  expect(shown).toBeLessThan(260);
  await page.keyboard.press('Escape');
  const got = await shareEach(page);
  expectPieces(got, { words: '2 For in Christ Jesus the law of the Spirit', reference: 'Romans 8:1-11 (MSB)', link: 'https://lampas.allmymind.org/#/?ref=Rom.8.1-11' });
  expect(got['Just the text'].text).toMatch(/^1 Therefore there is now no condemnation/);
  expect(got['Just the text'].text?.length).toBeGreaterThan(shown * 2);
});

test('a passage with Verse numbers off: just the text has no numbers', async ({ page }) => {
  await start(page, 'rom', 8, 'Romans 8', { copyNumbers: 'off' });
  await page.getByRole('button', { name: 'Walking by the Spirit' }).click();
  await openSheet(page);
  await row(page, 'Just the text').click();
  await expect.poll(async () => (await shared(page)).length).toBe(1);
  expect((await shared(page))[0].text).toMatch(/^Therefore there is now no condemnation/);
});

test('a whole chapter, Link off: the link row is still there, and the whole has no link', async ({ page }) => {
  await start(page, 'rom', 8, 'Romans 8', { copyLink: 'off' });
  await page.locator('[data-place-line]').click();
  await expect(view(page)).toBeVisible();
  await openSheet(page);
  await expect(row(page, 'Just the link')).toContainText('https://lampas.allmymind.org/#/?ref=Rom.8.1-39');
  await page.keyboard.press('Escape');
  const got = await shareEach(page);
  expect(got['The whole'].url).toBeUndefined();
  expect(got['The whole'].text).not.toContain('https://');
  expect(got['Just the link']).toEqual({ url: 'https://lampas.allmymind.org/#/?ref=Rom.8.1-39' });
  expect(got['Just the reference']).toEqual({ text: 'Romans 8 (MSB)' });
  expect(got['Just the text'].text).toMatch(/^1 Therefore there is now no condemnation/);
  expect(got['Just the text'].text).not.toContain('MSB');
});

test('an Old Testament verse in English: every row works and the link is the Verse view\'s', async ({ page }) => {
  await start(page, 'gen', 1, 'Genesis 1');
  await page.getByRole('button', { name: 'Verse 3', exact: true }).click();
  await expect(view(page)).toBeVisible();
  const got = await shareEach(page);
  expect(got['Just the link']).toEqual({ url: 'https://lampas.allmymind.org/#/?ref=Gen.1.3' });
  expect(got['Just the reference']).toEqual({ text: 'Genesis 1:3 (MSB)' });
  expect(got['Just the text'].text).toContain('light');
  expect(got['The whole'].url).toBe('https://lampas.allmymind.org/#/?ref=Gen.1.3');
});

test('Back and a tap outside close the sheet and leave the verse where it was', async ({ page }) => {
  await start(page, 'rom', 8, 'Romans 8');
  await page.getByRole('button', { name: 'Verse 11', exact: true }).click();
  await expect(view(page)).toBeVisible();
  await openSheet(page);
  await page.goBack();
  await expect(sheet(page)).toHaveCount(0);
  await expect(view(page)).toBeVisible();
  await expect(view(page).getByRole('heading', { name: 'Romans 8:11' })).toBeVisible();
  await openSheet(page);
  await page.touchscreen.tap(195, 40);
  await expect(sheet(page)).toHaveCount(0);
  await expect(view(page)).toBeVisible();
  expect(await shared(page)).toEqual([]);
});

async function expectFits(page: Page, width: number, height: number) {
  const box = await sheet(page).boundingBox();
  if (!box) throw new Error('no sheet');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 0.5);
  for (const name of ['The whole', 'Just the link', 'Just the text', 'Just the reference']) {
    const b = await row(page, name).boundingBox();
    if (!b) throw new Error(`no row ${name}`);
    expect(b.height, `${name} height`).toBeGreaterThanOrEqual(47.5);
    expect(b.x, `${name} left`).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, `${name} right`).toBeLessThanOrEqual(width + 0.5);
    expect(b.y, `${name} top`).toBeGreaterThanOrEqual(box.y - 0.5);
    expect(b.y + b.height, `${name} bottom`).toBeLessThanOrEqual(Math.min(box.y + box.height, height) + 0.5);
  }
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(sideways).toBe(true);
}

test('sideways at 844x390: the sheet fits, nothing is clipped, each row is 48 px or more', async ({ page }) => {
  await start(page, 'rom', 8, 'Romans 8');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Walking by the Spirit' }).click();
  await openSheet(page);
  await expectFits(page, 844, 390);
  await shot(page, 'share-pieces-landscape');
});
