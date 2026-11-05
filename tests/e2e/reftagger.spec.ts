import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
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
    await expect(popup).toContainText('has passed out of death into life');
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
    await page.locator('#kings a').tap();
    await expect(page.locator(POPUP)).toHaveCount(1);
    await expect(popup).toContainText('1 Kings 17:17-24');
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

  for (const [name, headers] of [['the host sends no Access-Control-Allow-Origin (a cross-origin fetch the browser refuses)', {}], ['the host answers 404', null]] as const) {
    test(`when the text cannot be fetched, ${name}, the popup still has the reference and the button`, async ({ page }) => {
      const failed: string[] = [];
      page.on('pageerror', (e) => failed.push(e.message));
      if (headers === null) await page.route(DATA, (route) => route.fulfill({ status: 404, headers: CORS, body: 'no' }));
      else await serveData(page, headers);
      await page.route(/^https:\/\/lampas\.allmymind\.org\/(?:#.*)?$/, (route) => route.fulfill({ contentType: 'text/html', body: '<title>Lampas</title>' }));
      await openPost(page);
      await page.locator('#plain a').tap();
      const popup = page.locator(POPUP);
      await expect(popup).toContainText('John 5:25');
      await expect(popup.locator('a', { hasText: 'Open in Lampas' })).toHaveAttribute('href', `${REF}John.5.25`);
      await expect(popup.locator('[data-verse]')).toHaveCount(0);
      await expect(popup).not.toContainText(/undefined|null|NET|Logos|error/i);
      const box = await popup.boundingBox();
      expect(box!.height).toBeGreaterThan(40);
      // the page's own text and the links are as they were
      expect(failed).toEqual([]);
      expect(await page.locator('#plain').textContent()).toBe('Read John 5:25 today.');
      expect(await hrefs(page, 'plain')).toEqual([`${REF}John.5.25`]);
    });
  }
});

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

  test('Esc and a click outside close it; one popup at a time', async ({ page }) => {
    await serveData(page);
    await openPost(page);
    const popup = page.locator(POPUP);
    await page.locator('#plain a').hover();
    await expect(popup).toBeVisible();
    await page.locator('#kings a').hover();
    await expect(page.locator(POPUP)).toHaveCount(1);
    await expect(popup).toContainText('1 Kings 17:17-24');
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
