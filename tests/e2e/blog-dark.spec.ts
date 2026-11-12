import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';

// The blog's dark mode (mw-fnvjof.17.89): https://lampas.allmymind.org/blog-dark.css, public/blog-dark.css, a stylesheet whose rules all sit inside
// @media (prefers-color-scheme: dark), linked from the Ghost blog's Code injection beside reftagger.js. tests/fixtures/blog-post.html is a fixture of the
// Source theme's page kinds (the markup and the theme's own colour rules); like the blog it is a page of another origin that names the stylesheet by its real address,
// and the route answers that address with the file in public/ (a page of another origin cannot load from the loopback preview, as tests/e2e/reftagger.spec.ts found).
const BLOG = 'https://blog.test/post.html';
const SHEET = 'https://lampas.allmymind.org/blog-dark.css';
const KINDS = ['post', 'page', 'home', 'tag', 'author', '404'] as const;
const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];
const AA = 4.5;

const DARK_CSS = readFileSync('public/blog-dark.css', 'utf8');

type Pair = { what: string; fg: string; bg: string; ratio: number };

async function open(page: Page, kind: string, scheme: 'light' | 'dark', sheet: string | null = DARK_CSS) {
  await page.emulateMedia({ colorScheme: scheme });
  await page.route(SHEET, (route) => route.fulfill({ contentType: 'text/css', body: sheet ?? '' }));
  await page.route((url) => url.href.startsWith(BLOG), (route) => route.fulfill({ contentType: 'text/html', body: readFileSync('tests/fixtures/blog-post.html', 'utf8') }));
  await page.goto(`${BLOG}?kind=${kind}#${kind}`);
  await expect(page.locator('.gh-footer-signup-header')).toBeVisible();
}

// Every visible element that holds text of its own (and each field's text and placeholder), with the contrast of its colour over what is behind it:
// the backdrop is the backgrounds of its ancestors laid over white, and an ancestor's opacity thins the text, as the Source footer's subhead is thinned.
const measure = (page: Page): Promise<Pair[]> =>
  page.evaluate(() => {
    type Rgba = [number, number, number, number];
    const parse = (css: string): Rgba => {
      const n = css.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
      return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n[3] ?? 1];
    };
    const over = (top: Rgba, under: Rgba): Rgba => {
      const a = top[3] + under[3] * (1 - top[3]);
      const mix = (i: 0 | 1 | 2) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / (a || 1);
      return [mix(0), mix(1), mix(2), a];
    };
    const lum = (c: Rgba) => {
      const ch = c.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
    };
    const backdrop = (el: Element): Rgba => {
      const chain: Element[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
      let bg: Rgba = [255, 255, 255, 1];
      for (const e of chain) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c[3] > 0) bg = over(c, bg);
      }
      return bg;
    };
    const opacityOf = (el: Element) => {
      let o = 1;
      for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return o;
    };
    const name = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`;
    };
    const ratio = (fg: Rgba, bg: Rgba) => {
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    const pairs: { what: string; fg: string; bg: string; ratio: number }[] = [];
    const add = (what: string, color: string, el: Element, extraOpacity = 1) => {
      const bg = backdrop(el);
      const c = parse(color);
      const text = over([c[0], c[1], c[2], c[3] * opacityOf(el) * extraOpacity], bg);
      pairs.push({
        what,
        fg: `rgb(${text.slice(0, 3).map(Math.round).join(', ')})`,
        bg: `rgb(${bg.slice(0, 3).map(Math.round).join(', ')})`,
        ratio: Math.round(ratio(text, bg) * 100) / 100,
      });
    };
    for (const el of document.body.querySelectorAll('*')) {
      if (['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(el.tagName.toUpperCase())) continue;
      const style = getComputedStyle(el);
      if (style.visibility !== 'visible' || el.getClientRects().length === 0) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '').map((n) => (n.textContent ?? '').trim()).join(' ');
      if (own) add(`${name(el)} "${own.slice(0, 30)}"`, style.color, el);
      if (el instanceof HTMLInputElement) {
        add(`${name(el)} (typed text)`, style.color, el);
        add(`${name(el)} (placeholder)`, getComputedStyle(el, '::placeholder').color, el);
      }
    }
    return pairs;
  });

const under = (pairs: Pair[]) => pairs.filter((p) => p.ratio < AA).map((p) => `${p.what}: ${p.fg} on ${p.bg} = ${p.ratio}`);
const contrastOf = (pairs: Pair[], what: string) => {
  const found = pairs.filter((p) => p.what.startsWith(what));
  expect(found.length, `no measured pair for ${what}`).toBeGreaterThan(0);
  return Math.min(...found.map((p) => p.ratio));
};

// What the page looks like, for every element: the colours a stylesheet could change.
const snapshot = (page: Page) =>
  page.evaluate(() => {
    const props = ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'borderBottomColor', 'outlineColor', 'textDecorationColor', 'boxShadow', 'opacity', 'fill', 'colorScheme', 'filter'] as const;
    return [...document.querySelectorAll('*')].map((el) => {
      const s = getComputedStyle(el);
      return [el.tagName, ...props.map((p) => s[p]), el instanceof HTMLInputElement ? getComputedStyle(el, '::placeholder').color : ''].join('|');
    });
  });

test.describe('the file', () => {
  test('every rule of public/blog-dark.css is inside the one @media (prefers-color-scheme: dark) block, so in light it changes nothing', () => {
    const rules = DARK_CSS.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const head = rules.match(/^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/);
    expect(head, 'the file starts with the @media (prefers-color-scheme: dark) block').not.toBeNull();
    let depth = 0;
    let closedAt = -1;
    for (let i = 0; i < rules.length; i++) {
      if (rules[i] === '{') depth++;
      if (rules[i] === '}' && --depth === 0) {
        closedAt = i;
        break;
      }
    }
    expect(closedAt, 'the block closes at the end of the file, and nothing follows it').toBe(rules.length - 1);
  });
});

for (const size of WIDTHS) {
  test.describe(`at ${size.width}x${size.height} (${size.name})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const kind of KINDS) {
      test(`${kind}: light is what it was without the stylesheet`, async ({ page }) => {
        await open(page, kind, 'light', '');
        const without = await snapshot(page);
        await page.unroute(SHEET);
        await page.route(SHEET, (route) => route.fulfill({ contentType: 'text/css', body: DARK_CSS }));
        await page.reload();
        await expect(page.locator('.gh-footer-signup-header')).toBeVisible();
        const withSheet = await snapshot(page);
        expect(withSheet.length).toBeGreaterThan(20);
        expect(withSheet).toEqual(without);
        // and the page is the light theme's: a white page with the theme's dark text
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
      });

      test(`${kind}: dark is a dark page with light text, and no text or link colour pair is under 4.5:1`, async ({ page }) => {
        await open(page, kind, 'dark');
        const body = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color }));
        const channels = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        expect(Math.max(...channels(body.bg)), `body background ${body.bg} is dark`).toBeLessThan(60);
        expect(Math.min(...channels(body.fg)), `body text ${body.fg} is light`).toBeGreaterThan(190);
        const pairs = await measure(page);
        expect(pairs.length).toBeGreaterThan(5);
        expect(under(pairs)).toEqual([]);
      });
    }

    test('post: the body text, a link, a tagged verse, the quote and the code block each pass AA in dark', async ({ page }) => {
      await open(page, 'post', 'dark');
      const pairs = await measure(page);
      expect(contrastOf(pairs, 'p#first')).toBeGreaterThanOrEqual(AA);
      expect(contrastOf(pairs, 'a#plain-link')).toBeGreaterThanOrEqual(AA);
      expect(contrastOf(pairs, 'a#tagged-verse')).toBeGreaterThanOrEqual(AA);
      expect(contrastOf(pairs, 'p "Truly, truly')).toBeGreaterThanOrEqual(AA);
      expect(contrastOf(pairs, 'code "https://lampas')).toBeGreaterThanOrEqual(AA);
      expect(contrastOf(pairs, 'code#inline-code')).toBeGreaterThanOrEqual(AA);
      // the quote keeps its rule, in the light accent
      expect(await page.locator('#quote').evaluate((q) => getComputedStyle(q).borderLeftColor)).toBe('rgb(159, 176, 255)');
      await shot(page, `blog-dark-${size.name}`);
    });
  });
}

test('the check fails on a stylesheet that does not meet AA: one that only darkens the page leaves the accent links and the quote unreadable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const darkPageOnly = '@media (prefers-color-scheme: dark) { :root:root { --background-color: #15171a; } html:root body { background-color: #15171a; color: #e8eaed; } }';
  await open(page, 'post', 'dark', darkPageOnly);
  const failing = under(await measure(page));
  expect(failing.length).toBeGreaterThan(0);
  expect(failing.join('\n')).toContain('a#plain-link');
  expect(failing.join('\n')).toContain('a#tagged-verse');
});
