import { expect, test, type Page } from '@playwright/test';
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
