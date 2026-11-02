// scripts/render-copywork-examples.ts — draws the twelve test pages of the copywork grind (grinds/examples/copywork/*.jpg) (mw-5r3p30.952).
//
//   npx tsx scripts/render-copywork-examples.ts          # rewrite every page
//   npx tsx scripts/render-copywork-examples.ts --check  # draw them to a temp dir and fail if one differs from the committed page
//
// A page is the example's request.words written out by hand-ish: the repo's own fonts (Literata, Gentium Plus, Noto Serif Hebrew) on
// ruled paper (the rule runs below the vowel points, not through them), each word nudged off the line by a fixed pseudo-random amount (and tilted, in Latin and Greek, by up to 1.5 degrees; a Hebrew page is not tilted: it was read wrong less often so, mw-5r3p30.989), drawn at the width the phone sends (TALK_MAX_EDGE, 1600 px
// on the long edge) with type big enough that a vowel point is a blob of 8 px or more, as it is when a page is photographed to fill the
// frame. A page that holds a mistake says which in PAGES below (the words are replaced or left out); the example's `expect` holds the rest.
// Running it twice gives the same bytes.
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TALK_MAX_EDGE } from '../src/talk/pictures';

const DIR = 'grinds/examples/copywork';
const FONT_DIR = 'src/fonts';
const HEIGHT = 1000;
const LINE = 190;
const TOP = 40;
const QUALITY = 82;

type Language = 'en' | 'grc' | 'hbo';
/** What a page shows: the example's words, with `replace` words swapped for what he wrote and `stopAt` words kept (a page that stops short). */
export interface PageSpec {
  language: Language;
  replace?: Record<number, string>;
  leaveOut?: number[];
  stopAt?: number;
}

export const COPYWORK_PAGES: Record<string, PageSpec> = {
  'en-perfect-john-1-1': { language: 'en' },
  'en-errors-john-1-1': { language: 'en', replace: { 2: 'begining' }, stopAt: 16 },
  'en-dictation-perfect-john-1-1': { language: 'en' },
  'en-dictation-sounds-alike-genesis-1-3': { language: 'en', replace: { 2: 'sed,', 4: 'their' } },
  'grc-perfect-john-1-1': { language: 'grc' },
  'grc-errors-john-1-1': { language: 'grc', replace: { 1: 'ἀρχή', 9: 'πρός' } },
  'grc-dictation-perfect-john-1-1': { language: 'grc' },
  'grc-dictation-sounds-alike-john-1-5': { language: 'grc', replace: { 5: 'σκοτεία', 6: 'φένει' } },
  'hbo-perfect-genesis-1-1': { language: 'hbo' },
  'hbo-errors-genesis-1-1': { language: 'hbo', replace: { 1: 'ברא' }, leaveOut: [5] },
  'hbo-dictation-perfect-genesis-1-3': { language: 'hbo' },
  'hbo-dictation-sounds-alike-genesis-1-1': { language: 'hbo', replace: { 1: 'בָּרָע', 3: 'אֶת' } },
};

const FONTS: Record<Language, { family: string; size: number; files: string[]; weight: number }> = {
  en: { family: 'Literata', size: 88, weight: 400, files: ['literata-latin-400-normal.woff2'] },
  grc: { family: 'Gentium Plus', size: 96, weight: 400, files: ['gentium-plus-greek-400-normal.woff2', 'gentium-plus-greek-ext-400-normal.woff2'] },
  hbo: { family: 'Noto Serif Hebrew', size: 124, weight: 400, files: ['noto-serif-hebrew-hebrew-400-normal.woff2'] },
};

/** A small fixed-seed generator, so the nudges are the same on every run. */
function generator(seed: string): () => number {
  let a = 0;
  for (const c of seed) a = (Math.imul(a, 31) + c.codePointAt(0)!) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The words written on a page. */
export function writtenWords(words: string[], spec: PageSpec): string[] {
  const kept = words.slice(0, spec.stopAt ?? words.length).map((w, i) => spec.replace?.[i] ?? w);
  return kept.filter((_, i) => !spec.leaveOut?.includes(i));
}

/** The page's HTML: ruled paper, one word to a box, each nudged off the line. */
export function pageHtml(name: string, words: string[], spec: PageSpec): string {
  const font = FONTS[spec.language];
  const rtl = spec.language === 'hbo';
  const rand = generator(name);
  const tilt = rtl ? 0 : 1;
  const faces = font.files
    .map((f) => `@font-face{font-family:'${font.family}';font-weight:${font.weight};src:url(data:font/woff2;base64,${readFileSync(join(FONT_DIR, f)).toString('base64')}) format('woff2');}`)
    .join('\n');
  const spans = words
    .map((w) => `<span style="transform:translateY(${(rand() * 20 - 10).toFixed(1)}px) rotate(${((rand() * 3 - 1.5) * tilt).toFixed(2)}deg);margin-inline-end:${(52 + rand() * 40).toFixed(0)}px">${w}</span>`)
    .join('');
  return `<!doctype html><html lang="${spec.language === 'hbo' ? 'he' : spec.language === 'grc' ? 'el' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><meta charset="utf-8"><style>
${faces}
html,body{margin:0;background:#fbf5e6}
#page{box-sizing:border-box;width:${TALK_MAX_EDGE}px;height:${HEIGHT}px;padding:${TOP}px 90px 0;overflow:hidden;
  background:repeating-linear-gradient(to bottom,transparent 0,transparent ${LINE - 3}px,#a9c4de ${LINE - 3}px,#a9c4de ${LINE}px);background-position:0 ${TOP - 12}px;
  font-family:'${font.family}',serif;font-size:${font.size}px;color:#1e2a8c;line-height:${LINE}px;font-kerning:normal}
#text{display:block}
#text span{display:inline-block;white-space:nowrap;line-height:${LINE}px;height:${LINE}px;vertical-align:top}
</style><body><div id="page"><div id="text">${spans}</div></div></body></html>`;
}

/** Draws every page into `outDir` and returns the names written. */
export async function renderPages(outDir: string): Promise<string[]> {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: TALK_MAX_EDGE, height: HEIGHT }, deviceScaleFactor: 1 });
    const names = Object.keys(COPYWORK_PAGES).sort();
    for (const name of names) {
      const spec = COPYWORK_PAGES[name];
      const example = JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as { photos: string[]; request: { language: string; words: string[] } };
      if (example.request.language !== spec.language) throw new Error(`${name}: the page says ${spec.language}, the request ${example.request.language}`);
      await page.setContent(pageHtml(name, writtenWords(example.request.words, spec), spec));
      await page.evaluate(() => document.fonts.ready);
      const fits = await page.evaluate(() => {
        const text = document.getElementById('text')!;
        return text.scrollHeight <= text.parentElement!.clientHeight;
      });
      if (!fits) throw new Error(`${name}: the words do not fit on the page`);
      await page.screenshot({ path: join(outDir, example.photos[0]), type: 'jpeg', quality: QUALITY });
    }
    return names;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const out = check ? mkdtempSync(join(tmpdir(), 'copywork-pages-')) : DIR;
  mkdirSync(out, { recursive: true });
  const names = await renderPages(out);
  if (!check) {
    console.log(`drew ${names.length} pages into ${DIR}`);
    return;
  }
  const differ = names.filter((name) => {
    const photo = (JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as { photos: string[] }).photos[0];
    return !readFileSync(join(out, photo)).equals(readFileSync(join(DIR, photo)));
  });
  if (differ.length) {
    console.error(`pages that differ from a fresh render (${out}): ${differ.join(', ')}`);
    process.exit(1);
  }
  console.log(`all ${names.length} pages match a fresh render`);
}

if (process.argv[1]?.endsWith('render-copywork-examples.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
