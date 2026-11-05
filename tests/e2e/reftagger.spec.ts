import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { shot } from './shot';

// The blog's script (mw-5r3p30.1043): https://lampas.allmymind.org/reftagger.js turns a bare 'John 5:25' in a post's text (Ghost's .gh-content) into a link to Lampas.
// The fixture page is served from another origin with no Lampas around it, as the blog is, and names the script by its real address; the route answers that address with the
// build's own dist/reftagger.js (a page of another origin cannot load a script from the loopback preview: Chromium's private-network rule), and the last test asks the preview for it.
const BLOG = 'https://blog.test/post.html';
const SCRIPT = 'https://lampas.allmymind.org/reftagger.js';
const REF = 'https://lampas.allmymind.org/#/?ref=';

async function openPost(page: Page) {
  const html = readFileSync('tests/fixtures/reftagger.html', 'utf8');
  await page.route(SCRIPT, (route) => route.fulfill({ contentType: 'text/javascript', body: readFileSync('dist/reftagger.js', 'utf8') }));
  await page.route(BLOG, (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(BLOG);
  await expect(page.locator('a[data-lampas-ref]').first()).toBeVisible();
}

const hrefs = (page: Page, id: string) => page.locator(`#${id} a`).evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).getAttribute('href')));
const texts = (page: Page, id: string) => page.locator(`#${id} a`).evaluateAll((links) => links.map((a) => a.textContent));

test('a bare reference in a post is a link to that passage in Lampas', async ({ page }) => {
  await openPost(page);
  expect(await hrefs(page, 'plain')).toEqual([`${REF}John.5.25`]);
  expect(await hrefs(page, 'range')).toEqual([`${REF}John.5.24-29`]);
  expect(await hrefs(page, 'kings')).toEqual([`${REF}1Kgs.17.17-24`]);
  expect(await hrefs(page, 'chapter')).toEqual([`${REF}John.11`]);
  expect(await hrefs(page, 'abbr')).toEqual([`${REF}1Cor.14.33-36`, `${REF}Rom.8.1`]);
  expect(await hrefs(page, 'semi')).toEqual([`${REF}Rom.8.1`, `${REF}Rom.10.9-10`]);
  expect(await texts(page, 'semi')).toEqual(['Romans 8:1', '10:9-10']);
  expect(await hrefs(page, 'comma')).toEqual([`${REF}John.5.24`, `${REF}John.5.28`]);
  expect(await texts(page, 'comma')).toEqual(['John 5:24', '28']);
  await shot(page, 'reftagger');
});

test('a numbered book after a verse and a comma is one link to that book, not a verse of the first (mw-5r3p30.1045)', async ({ page }) => {
  await openPost(page);
  expect(await hrefs(page, 'numbered')).toEqual([
    `${REF}Rom.8.1`, `${REF}2Cor.5.17`, `${REF}John.3.16`, `${REF}1John.4.8`, `${REF}Gen.1.1`, `${REF}2Kgs.2.11`,
  ]);
  expect(await texts(page, 'numbered')).toEqual(['Rom 8:1', '2 Cor 5:17', 'John 3:16', '1 John 4:8', 'Gen 1:1', '2 Kings 2:11']);
  expect(await hrefs(page, 'first')).toEqual([`${REF}1John.5.25`, `${REF}1John.5.25`]);
  expect(await texts(page, 'first')).toEqual(['First John 5:25', 'I John 5:25']);
});

test('a range across a chapter, a backwards range and verse 0 never make a ref that is no passage (mw-5r3p30.1046)', async ({ page }) => {
  await openPost(page);
  expect(await hrefs(page, 'crossing')).toEqual([`${REF}John.3.16`, `${REF}John.5.25`, `${REF}John.5.25`]);
  expect(await texts(page, 'crossing')).toEqual(['John 3:16', 'John 5:25', 'John 5:25']);
});

test('plain English with a number after a book is no chapter link; a chapter alone and a chapter range still are (mw-5r3p30.1047)', async ({ page }) => {
  await openPost(page);
  expect(await page.locator('#english a').count()).toBe(0);
  expect(await hrefs(page, 'alone')).toEqual([`${REF}Mark.5`, `${REF}Job.3`, `${REF}Matt.5`]);
  expect(await texts(page, 'alone')).toEqual(['Mark 5', 'Job 3', 'Matthew 5-7']);
});

test('a numbered book with a chapter alone is linked whole to its own book, not to the book without its number (mw-5r3p30.1061)', async ({ page }) => {
  await openPost(page);
  expect(await texts(page, 'numchapter')).toEqual(['1 John 4', '2 Cor 5', '1 John 4-5', 'John 3:16', '1 John 4']);
  expect(await hrefs(page, 'numchapter')).toEqual([`${REF}1John.4`, `${REF}2Cor.5`, `${REF}1John.4`, `${REF}John.3.16`, `${REF}1John.4`]);
});

test('a number that begins a numbered book after a verse and a comma is no verse of the first book (mw-5r3p30.1062)', async ({ page }) => {
  await openPost(page);
  expect(await texts(page, 'nobook')).toEqual(['Romans 8:1', 'John 3:16', 'John 3:16']);
  expect(await hrefs(page, 'nobook')).toEqual([`${REF}Rom.8.1`, `${REF}John.3.16`, `${REF}John.3.16`]);
  // a plain list is still read: 'John 5:24, 28' links 28, and 'Rom 8:1, 2 Cor 5:17' links 2 Cor 5:17 whole
  expect(await texts(page, 'comma')).toEqual(['John 5:24', '28']);
  expect(await texts(page, 'numbered')).toContain('2 Cor 5:17');
});

test('a chapter before a count or quantity word is no link; a chapter alone still is (mw-5r3p30.1063)', async ({ page }) => {
  await openPost(page);
  expect(await page.locator('#counts a').count()).toBe(0);
  expect(await texts(page, 'alone')).toEqual(['Mark 5', 'Job 3', 'Matthew 5-7']);
});

test('text in a link, code, a heading or outside the post is left as it is, and no false link is made', async ({ page }) => {
  await openPost(page);
  expect(await hrefs(page, 'existing')).toEqual(['https://example.com/x']);
  expect(await texts(page, 'existing')).toEqual(['John 3:16']);
  for (const id of ['code', 'pre', 'h2', 'h3', 'false', 'inert-script', 'inert-style', 'nav', 'footer', 'comments']) {
    expect(await page.locator(`#${id} a`).count(), id).toBe(0);
  }
  await expect(page.locator('.post-title a')).toHaveCount(0);
});

test('each link opens in a new tab, keeps the page link style and changes no text', async ({ page }) => {
  await openPost(page);
  const first = page.locator('#plain a');
  await expect(first).toHaveAttribute('target', '_blank');
  await expect(first).toHaveAttribute('rel', 'noopener');
  const all = await page.locator('a[data-lampas-ref]').evaluateAll((links) => links.map((a) => [a.getAttribute('target'), a.getAttribute('rel'), a.getAttribute('class'), a.getAttribute('style')]));
  expect(all.length).toBeGreaterThan(8);
  for (const link of all) expect(link).toEqual(['_blank', 'noopener', null, null]);
  // the theme's own link rule (.gh-content a) is what styles it: no colour of the tagger's
  await expect(first).toHaveCSS('color', 'rgb(1, 2, 3)');
  const [before, after] = await page.evaluate(() => [(window as unknown as { __before: string }).__before, document.querySelector('.gh-content')?.textContent]);
  expect(after).toBe(before);
});

test('the script is small, served to any page, and the service worker does not touch it', async ({ baseURL, request }) => {
  const built = readFileSync('dist/reftagger.js');
  expect(gzipSync(built).length).toBeLessThan(40 * 1024);
  const served = await request.get(`${baseURL}/reftagger.js`);
  expect(served.status()).toBe(200);
  expect(served.headers()['content-type']).toMatch(/javascript/);
  const worker = readFileSync('dist/sw.js', 'utf8');
  expect(worker).not.toContain('reftagger');
});

// The popup (mw-5r3p30.1048): a tap on a tagged verse opens a small card with the verse in the Majority Standard Bible and an Open in Lampas button. The text is the chapter's
// own JSON (https://lampas.allmymind.org/data/<book>/<chapter>.json), fetched from the blog's page, so it is a real cross-origin fetch: the page is blog.test, the data is
// lampas.allmymind.org, and the browser enforces CORS on what the route answers (the host must send Access-Control-Allow-Origin, and a host that does not leaves the card with
// the reference and the button).
const DATA = /^https:\/\/lampas\.allmymind\.org\/data\/.*\.json$/;
const CORS = { 'access-control-allow-origin': '*' };
const POPUP = '[data-lampas-popup] [role="dialog"]';
const chapterFile = (url: string) => readFileSync(`public/data/${url.split('/data/')[1]}`, 'utf8');

async function serveData(page: Page, headers: Record<string, string> = CORS) {
  await page.route(DATA, (route: Route) => route.fulfill({ contentType: 'application/json', headers, body: chapterFile(route.request().url()) }));
  // what a click on Open in Lampas, or on the link with a mouse, opens: a page of that address (the app itself is not under test here)
  await page.route(/^https:\/\/lampas\.allmymind\.org\/(?:#.*)?$/, (route) => route.fulfill({ contentType: 'text/html', body: '<title>Lampas</title>' }));
}

const inView = async (page: Page) => {
  const box = await page.locator(POPUP).boundingBox();
  const size = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
};

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('a tap on a verse opens a popup with the reference and the verse in the MSB, and stays on the page', async ({ page, context }) => {
    await serveData(page);
    await openPost(page);
    await page.locator('#plain a').tap();
    const popup = page.locator(POPUP);
    await expect(popup).toBeVisible();
    await expect(popup).toContainText('John 5:25');
    await expect(popup).toContainText('the dead will hear the voice of the Son of God');
    await expect(popup).toContainText('Majority Standard Bible');
    expect(page.url()).toBe(BLOG);
    expect(context.pages()).toHaveLength(1);
    await inView(page);
    await shot(page, 'reftagger-popup');
  });

  test('a range shows each of its verses, and a link to the chapter shows its first', async ({ page }) => {
    await serveData(page);
    await openPost(page);
    await page.locator('#range a').tap();
    const popup = page.locator(POPUP);
    await expect(popup).toContainText('John 5:24-29');
    await expect(popup).toContainText('he has crossed over from death to life');
    await expect(popup).toContainText('the hour is coming');
    await expect(popup).toContainText('resurrection of judgment');
    for (const n of [24, 25, 26, 27, 28, 29]) await expect(popup.locator(`[data-verse="${n}"]`)).toHaveCount(1);
    await expect(popup.locator('[data-verse="30"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.locator('#chapter a').tap();
    await expect(popup).toContainText('John 11');
    await expect(popup).toContainText('Lazarus');
  });

  test('the Open in Lampas button is the link the text had, in a new tab', async ({ page, context }) => {
    await serveData(page);
    await openPost(page);
    await page.locator('#range a').tap();
    const open = page.locator(`${POPUP} a`, { hasText: 'Open in Lampas' });
    await expect(open).toHaveCount(1);
    await expect(open).toHaveAttribute('href', `${REF}John.5.24-29`);
    await expect(open).toHaveAttribute('target', '_blank');
    await expect(open).toHaveAttribute('rel', 'noopener');
    const opened = context.waitForEvent('page');
    await open.tap();
    expect((await opened).url()).toBe(`${REF}John.5.24-29`);
  });

  test('a tap outside, Escape or a second verse closes it; only one is open at a time', async ({ page }) => {
    await serveData(page);
    await openPost(page);
    const popup = page.locator(POPUP);
    await page.locator('#plain a').tap();
    await expect(popup).toBeVisible();
    await page.locator('#english').tap({ position: { x: 5, y: 5 } });
    await expect(popup).toHaveCount(0);
    await page.locator('#plain a').tap();
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await page.locator('#plain a').tap();
    await expect(popup).toContainText('John 5:25');
    // a link the card does not cover: its own card replaces the first
    await page.locator('#alone a').first().tap();
    await expect(page.locator(POPUP)).toHaveCount(1);
    await expect(popup).toContainText('Mark 5');
    await expect(popup).not.toContainText('John 5:25');
  });

  test('it stays on the screen at the right edge, the left edge and the foot of the page', async ({ page }) => {
    await serveData(page);
    await openPost(page);
    for (const id of ['edge-right', 'edge-left', 'bottom']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      if (id === 'bottom') await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.locator(`#${id} a`).tap();
      await expect(page.locator(POPUP)).toContainText('the dead will hear');
      await inView(page);
      await page.keyboard.press('Escape');
    }
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`it is readable on a ${scheme} page`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await serveData(page);
      await openPost(page);
      await page.locator('#plain a').tap();
      const popup = page.locator(POPUP);
      await expect(popup).toBeVisible();
      const [bg, fg] = await popup.evaluate((el) => {
        const lum = (css: string) => {
          const [r, g, b] = (css.match(/[\d.]+/g) ?? []).map(Number).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const text = el.querySelector('[data-verse]') as HTMLElement;
        return [lum(getComputedStyle(el).backgroundColor), lum(getComputedStyle(text).color)];
      });
      if (scheme === 'dark') expect(bg).toBeLessThan(0.2); else expect(bg).toBeGreaterThan(0.6);
      const [hi, lo] = bg > fg ? [bg, fg] : [fg, bg];
      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThan(7);
      await shot(page, `reftagger-popup-${scheme}`);
    });
  }

  test('when the text cannot be fetched (the host answers 404), the popup still has the reference and the button', async ({ page }) => {
    const failed: string[] = [];
    page.on('pageerror', (e) => failed.push(e.message));
    await page.route(DATA, (route) => route.fulfill({ status: 404, headers: CORS, body: 'no' }));
    await openPost(page);
    await page.locator('#plain a').tap();
    await expectBare(page);
    expect(failed).toEqual([]);
  });

  // A route's answer is not held to CORS (Playwright hands the browser the response as if it had passed), so these two run a real cross-origin fetch: the blog on one local server,
  // the script and the chapter files on another, as on the web. The page is http://localhost:<blog>, the data http://127.0.0.1:<host>: two origins, and the browser decides.
  test('a host that sends Access-Control-Allow-Origin gives the verse across origins', async ({ page }) => {
    const { blog, close } = await realOrigins(true);
    try {
      await page.goto(blog);
      await page.locator('#plain a').tap();
      await expect(page.locator(POPUP)).toContainText('the dead will hear the voice of the Son of God');
    } finally {
      await close();
    }
  });

  test('a host that sends no Access-Control-Allow-Origin is refused by the browser, and the popup still has the reference and the button', async ({ page }) => {
    const { blog, close } = await realOrigins(false);
    const refused: string[] = [];
    const failed: string[] = [];
    page.on('requestfailed', (r) => refused.push(r.url()));
    page.on('pageerror', (e) => failed.push(e.message));
    try {
      await page.goto(blog);
      await page.locator('#plain a').tap();
      await expectBare(page);
      expect(refused.filter((u) => u.includes('/data/jhn/5.json'))).toHaveLength(1);
      expect(failed).toEqual([]);
    } finally {
      await close();
    }
  });
});

/** The popup with no text: the reference, the button, no verse, and none of the words a broken card would show; the page's own text and links untouched. */
async function expectBare(page: Page) {
  const popup = page.locator(POPUP);
  await expect(popup).toContainText('John 5:25');
  await expect(popup.locator('a', { hasText: 'Open in Lampas' })).toHaveAttribute('href', `${REF}John.5.25`);
  await expect(popup).not.toContainText('Loading');
  await expect(popup.locator('[data-verse]')).toHaveCount(0);
  await expect(popup).not.toContainText(/undefined|null|NET|Logos|error/i);
  expect((await popup.boundingBox())!.height).toBeGreaterThan(40);
  expect(await page.locator('#plain').textContent()).toBe('Read John 5:25 today.');
  expect(await hrefs(page, 'plain')).toEqual([`${REF}John.5.25`]);
}

/** Two real servers on two origins: `blog` is the fixture page (localhost), whose script tag names the other (127.0.0.1), which serves dist/reftagger.js and public/data. */
async function realOrigins(cors: boolean): Promise<{ blog: string; close: () => Promise<void> }> {
  const listen = (server: Server, host: string) => new Promise<number>((done) => server.listen(0, host, () => done((server.address() as AddressInfo).port)));
  const host = createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    try {
      const file = path === '/reftagger.js' ? 'dist/reftagger.js' : path.startsWith('/data/') ? `public${path}` : null;
      if (!file || path.includes('..')) throw new Error('no');
      res.writeHead(200, { 'content-type': path.endsWith('.js') ? 'text/javascript' : 'application/json', ...(cors ? CORS : {}) });
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  const hostPort = await listen(host, '127.0.0.1');
  const html = readFileSync('tests/fixtures/reftagger.html', 'utf8').replace(SCRIPT, `http://127.0.0.1:${hostPort}/reftagger.js`);
  const blog = createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(html));
  const blogPort = await listen(blog, 'localhost');
  const stop = (server: Server) => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); });
  return { blog: `http://localhost:${blogPort}/post.html`, close: async () => { await stop(host); await stop(blog); } };
}

test.describe('with a mouse', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('hover opens it, leaving it closes it, and a click on the link still goes to Lampas', async ({ page, context }) => {
    await serveData(page);
    await openPost(page);
    const popup = page.locator(POPUP);
    await page.locator('#plain a').hover();
    await expect(popup).toContainText('the dead will hear the voice of the Son of God');
    await page.mouse.move(900, 600);
    await expect(popup).toHaveCount(0);
    // it can be reached: from the link into the card the pointer crosses the gap and the card stays
    await page.locator('#plain a').hover();
    await expect(popup).toBeVisible();
    await page.locator(`${POPUP} a`, { hasText: 'Open in Lampas' }).hover();
    await expect(popup).toBeVisible();
    await page.mouse.move(900, 600);
    await expect(popup).toHaveCount(0);
    // a click on the link is the old behaviour: Lampas in a new tab, no popup on the blog's page
    const opened = context.waitForEvent('page');
    await page.locator('#plain a').click();
    expect((await opened).url()).toBe(`${REF}John.5.25`);
    expect(page.url()).toBe(BLOG);
  });

  test('Esc closes it; one popup at a time', async ({ page }) => {
    await serveData(page);
    await openPost(page);
    const popup = page.locator(POPUP);
    await page.locator('#plain a').hover();
    await expect(popup).toBeVisible();
    await page.locator('#alone a').first().hover();
    await expect(popup).toContainText('Mark 5');
    await expect(page.locator(POPUP)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await shot(page, 'reftagger-popup-mouse');
  });

  test('a keyboard user gets the card from Enter and can reach its button', async ({ page, context }) => {
    await serveData(page);
    await openPost(page);
    await page.locator('#plain a').focus();
    await page.keyboard.press('Enter');
    const popup = page.locator(POPUP);
    await expect(popup).toContainText('John 5:25');
    await expect(popup.locator('a', { hasText: 'Open in Lampas' })).toBeFocused();
    expect(context.pages()).toHaveLength(1);
  });
});
