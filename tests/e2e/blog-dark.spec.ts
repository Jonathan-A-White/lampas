import { expect, test, type Locator, type Page } from '@playwright/test';
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

// Ghost's widgets (the comments box's sign-up prompt, the Portal Subscribe pill, the search popup) are IFRAMES with a light document inside: the page's CSS reaches
// the iframe element and nothing in it, and a page set to color-scheme: dark gives an iframe whose document is light an opaque white canvas. So what is read here is
// what is drawn: a screenshot of the element's box, its backdrop pixel and the pixel farthest from it (the ink).
type Rgb = [number, number, number];
const lumOf = (c: Rgb) => {
  const ch = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
};
const ratioOf = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [lumOf(a), lumOf(b)].sort((x, y) => y - x);
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
};
const isBlue = ([r, g, b]: Rgb) => b >= r + 60 && b >= g + 20;
const isDark = (c: Rgb) => Math.max(...c) < 60;

// The element's drawn pixels: `backdrop` is the pixel at `at` (the box's corner, or just inside it for a button) and `ink` the pixel farthest from it by contrast.
async function paint(page: Page, el: Locator, inside = false): Promise<{ backdrop: Rgb; ink: Rgb; ratio: number }> {
  const box = await el.boundingBox();
  expect(box, 'the element has a box').not.toBeNull();
  const png = await page.screenshot({ clip: { x: Math.floor(box!.x), y: Math.floor(box!.y), width: Math.ceil(box!.width), height: Math.ceil(box!.height) } });
  const [bx, by] = inside ? [4, Math.floor(box!.height / 2)] : [0, 0];
  const got = await page.evaluate(
    async ({ b64, bx, by }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const cv = document.createElement('canvas');
      cv.width = bmp.width;
      cv.height = bmp.height;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
      const lum = (r: number, g: number, b: number) => [r, g, b].map((v) => v / 255).map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const at = (by * bmp.width + bx) * 4;
      const back: Rgb = [d[at]!, d[at + 1]!, d[at + 2]!];
      const lb = lum(...back);
      let ink: Rgb = back;
      let best = 1;
      for (let i = 0; i < d.length; i += 4) {
        const l = lum(d[i]!, d[i + 1]!, d[i + 2]!);
        const r = (Math.max(l, lb) + 0.05) / (Math.min(l, lb) + 0.05);
        if (r > best) {
          best = r;
          ink = [d[i]!, d[i + 1]!, d[i + 2]!];
        }
      }
      return { backdrop: back, ink };
    },
    { b64: png.toString('base64'), bx, by },
  );
  return { ...got, ratio: ratioOf(got.ink, got.backdrop) };
}

const commentsFrame = (page: Page) => page.frameLocator('iframe[title="comments-frame"]');
// The widgets fill their iframes in when these have loaded; the sign-up box is scrolled to the middle of the window, clear of the fixed Subscribe pill.
async function openSignUpBox(page: Page) {
  await expect(commentsFrame(page).getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.locator('iframe[title="comments-frame"]').evaluate((f) => f.scrollIntoView({ block: 'center' }));
}
// The colour drawn at one point of the window.
async function pixelAt(page: Page, x: number, y: number): Promise<Rgb> {
  const png = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } });
  return page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }));
    const cv = document.createElement('canvas');
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0]!, d[1]!, d[2]!] as [number, number, number];
  }, png.toString('base64'));
}

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

for (const size of WIDTHS) {
  test.describe(`Ghost's iframes at ${size.width}x${size.height} (${size.name})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('post, dark: the sign-up box at the end of the post is dark like the page, its words and the Sign in link are readable, and the Sign up now button keeps its blue', async ({ page }) => {
      await open(page, 'post', 'dark');
      await openSignUpBox(page);
      const frame = commentsFrame(page);
      const pageBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const box = await paint(page, page.locator('iframe[title="comments-frame"]'));
      expect(isDark(box.backdrop), `the box's backdrop ${box.backdrop} is dark (the page is ${pageBg})`).toBe(true);
      const heading = await paint(page, frame.getByRole('heading', { name: 'Start the conversation' }));
      expect(heading.ratio, `heading ${heading.ink} on ${heading.backdrop}`).toBeGreaterThanOrEqual(AA);
      const lead = await paint(page, frame.getByText('Become a member of'));
      expect(lead.ratio, `lead ${lead.ink} on ${lead.backdrop}`).toBeGreaterThanOrEqual(AA);
      const signIn = await paint(page, frame.getByRole('button', { name: 'Sign in' }));
      expect(signIn.ratio, `Sign in ${signIn.ink} on ${signIn.backdrop}`).toBeGreaterThanOrEqual(AA);
      const signUp = await paint(page, frame.getByRole('button', { name: 'Sign up now' }), true);
      expect(isBlue(signUp.backdrop), `the Sign up now button ${signUp.backdrop} is blue`).toBe(true);
      expect(signUp.ratio, `Sign up now ${signUp.ink} on ${signUp.backdrop}`).toBeGreaterThanOrEqual(AA);
      // Ghost's own "Already a member?" is a 40% tint of the text colour: 3.5:1 here, the most a page's CSS can get from it (listed as found, not fixed)
      const hint = await paint(page, frame.getByText('Already a member?'));
      expect(hint.ratio, `hint ${hint.ink} on ${hint.backdrop}`).toBeGreaterThanOrEqual(3.5);
      await shot(page, `blog-dark-signup-${size.name}`);
    });

    test('post, light: the sign-up box is the widget as Ghost draws it, on the white page, with no filter on it', async ({ page }) => {
      await open(page, 'post', 'light');
      await openSignUpBox(page);
      const frame = page.locator('iframe[title="comments-frame"]');
      expect(await frame.evaluate((f) => getComputedStyle(f).filter)).toBe('none');
      const box = await paint(page, frame);
      expect(box.backdrop).toEqual([255, 255, 255]);
      const heading = await paint(page, commentsFrame(page).getByRole('heading', { name: 'Start the conversation' }));
      expect(heading.ink, 'the heading is black, as Ghost draws it').toEqual([0, 0, 0]);
    });

    test('post, dark: the Portal Subscribe pill sits on the page, with no light rectangle around it, and keeps its blue', async ({ page }) => {
      await open(page, 'post', 'dark');
      const trigger = page.locator('iframe[title="portal-trigger"]');
      await expect(page.frameLocator('iframe[title="portal-trigger"]').getByText('Subscribe')).toBeVisible();
      // the iframe's colour scheme is its document's (light), so the browser paints no canvas of its own behind it
      expect(await trigger.evaluate((f) => getComputedStyle(f).colorScheme)).toBe('light');
      const frameBox = (await trigger.boundingBox())!;
      // a pixel beside the pill: the iframe's top-left corner, above and left of it
      const beside = await pixelAt(page, frameBox.x + 2, frameBox.y + 2);
      expect(isDark(beside), `beside the pill ${beside} is dark`).toBe(true);
      const pill = await paint(page, page.frameLocator('iframe[title="portal-trigger"]').locator('[data-testid="portal-trigger-button"]'), true);
      expect(isBlue(pill.backdrop), `the pill ${pill.backdrop} keeps its blue`).toBe(true);
    });

    test('post, dark: the search popup (the magnifier) shows no white card or light scrim from the iframe\'s own canvas', async ({ page }) => {
      await open(page, 'post', 'dark');
      await page.getByRole('button', { name: 'Search this site' }).click();
      const popup = page.locator('iframe[title="portal-popup"]');
      await expect(page.frameLocator('iframe[title="portal-popup"]').getByTestId('search-card')).toBeVisible();
      expect(await popup.evaluate((f) => getComputedStyle(f).colorScheme)).toBe('light');
      // the scrim's top-left corner (far from the card): the page's header, darkened by the scrim, not a white canvas
      const px = await pixelAt(page, 2, 2);
      expect(isDark(px), `the popup's scrim corner ${px} is dark`).toBe(true);
    });

    test('post, light: the Portal pill and the search popup keep their own light canvas and colour scheme (colour-scheme is untouched)', async ({ page }) => {
      await open(page, 'post', 'light');
      expect(await page.locator('iframe[title="portal-trigger"]').evaluate((f) => getComputedStyle(f).colorScheme)).toBe('normal');
    });

    test('home, dark: the picture banner\'s email field is dark, its words and placeholder pass AA, and the arrow button keeps its blue', async ({ page }) => {
      await open(page, 'home', 'dark');
      const form = await page.locator('#header-email').evaluate((input) => {
        const f = input.closest('.gh-form')!;
        const b = f.querySelector('.gh-button')!;
        return { bg: getComputedStyle(f).backgroundColor, button: getComputedStyle(b).backgroundColor, buttonInk: getComputedStyle(b).color };
      });
      const rgb = (css: string): Rgb => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number) as Rgb;
      expect(isDark(rgb(form.bg)), `the banner form's background ${form.bg} is dark, not the theme's #fff`).toBe(true);
      const pairs = await measure(page);
      expect(contrastOf(pairs, 'input#header-email.gh-form-input (typed text)')).toBeGreaterThanOrEqual(AA);
      expect(contrastOf(pairs, 'input#header-email.gh-form-input (placeholder)')).toBeGreaterThanOrEqual(AA);
      expect(isBlue(rgb(form.button)), `the arrow button ${form.button} keeps its blue`).toBe(true);
      expect(ratioOf(rgb(form.buttonInk), rgb(form.button))).toBeGreaterThanOrEqual(AA);
      await shot(page, `blog-dark-banner-${size.name}`);
    });
  });
}

// The pictures the theme places behind or among content (mw-fnvjof.17.102): the home banner (an <img> at z-index -1 inside .gh-header, which the page's OWN background
// would paint over if body had one in dark), the post's feature image, the tag and author cover and the list cards' pictures. Each is read by screenshot pixel in dark
// and in light, because a computed style cannot say whether a background is painted over a picture.
const near = (a: Rgb, b: Rgb, tol = 12) => a.every((v, i) => Math.abs(v - b[i]!) <= tol);
const PAGE_BG: Rgb = [0x15, 0x17, 0x1a];
const PICTURES = [
  { kind: 'home', what: 'the banner picture', selector: '.gh-header-image' },
  { kind: 'post', what: "the post's feature image", selector: '#post-feature img' },
  { kind: 'tag', what: "the tag page's cover", selector: '#tag-cover img' },
  { kind: 'author', what: "the author page's cover", selector: '#author-cover img' },
  { kind: 'home', what: "a list card's picture", selector: '.card-picture img' },
] as const;

for (const size of WIDTHS) {
  test.describe(`pictures at ${size.width}x${size.height} (${size.name})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    // a pixel inside the picture's box, in its top-left corner, away from the home banner's quote and email field (centred) and off the box's edge
    const cornerOf = async (page: Page, selector: string) => {
      const target = page.locator(selector).first();
      await target.scrollIntoViewIfNeeded();
      const box = (await target.boundingBox())!;
      return pixelAt(page, box.x + 20, box.y + 20);
    };

    for (const pic of PICTURES) {
      test(`${pic.kind}: ${pic.what} is painted in dark, as in light`, async ({ page }) => {
        await open(page, pic.kind, 'light');
        const light = await cornerOf(page, pic.selector);
        await open(page, pic.kind, 'dark');
        const dark = await cornerOf(page, pic.selector);
        expect(near(dark, PAGE_BG, 8), `${pic.what} in dark is ${dark}: the page background ${PAGE_BG}, not the picture`).toBe(false);
        expect(near(dark, light), `${pic.what} in dark ${dark} matches light ${light}`).toBe(true);
      });
    }

    test('home, dark: the quote over the banner stays white, as in light, and the banner shows its picture beside it', async ({ page }) => {
      await open(page, 'home', 'dark');
      expect(await page.locator('.gh-header-title').evaluate((t) => getComputedStyle(t).color)).toBe('rgb(255, 255, 255)');
      const pairs = await measure(page);
      expect(contrastOf(pairs, 'h1.gh-header-title')).toBeGreaterThanOrEqual(AA);
      await shot(page, `blog-dark-banner-picture-${size.name}`);
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
