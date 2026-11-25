// scripts/enduring-word-sections.ts — npm run ew:sections (mw-1l901so.7, docs/resources.md 'Enduring Word')
// Reads every chapter page of Enduring Word that ENDURING_WORD_SLUGS names and keeps from each only the verse ranges of its outline headings (h4 id=section-N, `2. (24-31) ...`), written to
// src/resources/enduringWordSections.json, which the app opens a chapter's page at the section of his verse by. The phone cannot read the page itself (the site sends no CORS header), so it is read here.
// A chapter whose address leads to a page of several chapters (Joshua 15-17, 18-19, 1 Chronicles 4-8) takes that page's headings of its own chapter.
// Politely: one page at a time, DELAY_MS between two requests, a plain client name, and a cache (data/raw/enduring-word, git-ignored; delete it to read the pages again) so a second run asks only for
// the pages that failed. NO WORDS of the commentary are kept, in the table or in the cache: of a heading only its leading number and parenthesis, any word in it blanked (marksOfPage).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOOKS } from '../src/data/books';
import { ENDURING_WORD_SLUGS, rangesOfHeadings } from '../src/resources/enduringWord';

/** The name the requests go under: plain, with nothing of whoever runs it. */
export const CLIENT_NAME = 'outline-ranges/1.0 (reads the verse ranges of outline headings, one page at a time)';
/** The wait between two requests. */
export const DELAY_MS = 1000;
/** How long to wait when the site says to slow down and names no time, and how many times one page is asked again then. */
const BUSY_WAIT_SECONDS = 60;
const BUSY_RETRIES = 2;
const BUSY = new Set([429, 502, 503, 504]);
/** After this many pages failed in a row the site is left alone: the rest are reported as failed, not asked. */
const FAILURES_IN_A_ROW = 10;
const TIMEOUT_MS = 60_000;

/** What came back for a page: `url` is where the request ended after any redirect. */
export interface Page {
  status: number;
  url: string;
  text: string;
  retryAfterSeconds?: number;
}

/** The pages' slugs ('genesis-1' ... 'revelation-22'), every chapter of every book the site names, in canon order. */
export function chaptersToRead(): string[] {
  return BOOKS.flatMap((book) => {
    const slug = ENDURING_WORD_SLUGS[book.code];
    return slug === undefined ? [] : Array.from({ length: book.chapters }, (_, i) => `${slug}-${i + 1}`);
  });
}

const ENTITIES: Readonly<Record<string, string>> = { nbsp: ' ', ndash: '–', mdash: '—', lpar: '(', rpar: ')' };

const textOf = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (all, name: string) => ENTITIES[name] ?? all);

/** The leading number and parenthesis of a heading, '2. (24-31)': what names its verses. Any word in it (two letters or more) is blanked. */
function markOf(heading: string): string {
  const lead = /^\s*(?:\d+\s*\.\s*)?(?:\([^()]{0,40}\))?/.exec(heading)?.[0] ?? '';
  return lead.replace(/\p{L}{2,}/gu, '…').replace(/\s+/g, ' ').trim();
}

/** What is kept of a page: the mark of the heading with id section-N, at index N-1 ('' for a number no heading has); [] for a page with no outline. */
export function marksOfPage(html: string): string[] {
  const marks: string[] = [];
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*?\sid\s*=\s*(["'])section-(\d+)\2[^>]*>([\s\S]*?)<\/\1\s*>/gi)) {
    marks[Number(m[3]) - 1] = markOf(textOf(m[4] ?? ''));
  }
  return Array.from(marks, (mark) => mark ?? '');
}

export interface SectionsOptions {
  /** the pages' slugs; every chapter by default */
  chapters?: readonly string[];
  /** where each page's marks are kept, one file a page */
  cacheDir: string;
  /** src/resources/enduringWordSections.json */
  outFile: string;
  fetchPage?: (url: string) => Promise<Page>;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
}

export interface SectionsReport {
  /** the chapters whose page was read (from the site or the cache) */
  read: string[];
  /** read, and no heading names a verse: the chapter opens at its top */
  noOutline: string[];
  failed: { page: string; why: string }[];
  /** a heading that has a bracket at its head which no range was read from, to be looked at */
  unread: { page: string; mark: string }[];
}

async function fetchPlainly(url: string): Promise<Page> {
  const response = await fetch(url, { headers: { 'User-Agent': CLIENT_NAME, Accept: 'text/html' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const after = Number(response.headers.get('retry-after'));
  return { status: response.status, url: response.url, text: await response.text(), ...(after > 0 ? { retryAfterSeconds: after } : {}) };
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

function writeWhole(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const part = `${path}.part`;
  writeFileSync(part, text);
  renameSync(part, path);
}

const addressOf = (page: string): string => `https://enduringword.com/bible-commentary/${page}/`;
const pathOf = (url: string): string => new URL(url).pathname.replace(/\/*$/, '/');
/** 'isaiah-6' is chapter 6 of 'isaiah'. */
const partsOf = (page: string): { book: string; chapter: number } => ({ book: page.slice(0, page.lastIndexOf('-')), chapter: Number(page.slice(page.lastIndexOf('-') + 1)) });

/** The slug of the one page the site holds several chapters on ('joshua-15-16-17', '1-chronicles-4-8': the first to the last), where `path` is such a page of the chapter's book that holds it. */
function combinedPageOf(page: string, path: string): string | undefined {
  const { book, chapter } = partsOf(page);
  const m = new RegExp(`^/bible-commentary/(${book}((?:-\\d+){2,}))/$`).exec(path);
  if (!m) return undefined;
  const chapters = (m[2] ?? '').split('-').slice(1).map(Number);
  return chapter >= Math.min(...chapters) && chapter <= Math.max(...chapters) ? m[1] : undefined;
}

/** A page's marks as cached; `combined` names the page of several chapters the chapter's address led to. */
interface Kept {
  marks: string[];
  combined?: string;
}

export async function buildSections(options: SectionsOptions): Promise<SectionsReport> {
  const { cacheDir, outFile, fetchPage = fetchPlainly, delayMs = DELAY_MS, log = () => undefined } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const chapters = options.chapters ?? chaptersToRead();
  const report: SectionsReport = { read: [], noOutline: [], failed: [], unread: [] };
  // a page that fails keeps what the table had of it
  const table: Record<string, string> = existsSync(outFile) ? readJson(outFile) : {};
  let asked = false;
  let inARow = 0;

  /** The page from the site, asked again after a wait while it says it is busy. */
  async function ask(page: string): Promise<Kept | { why: string }> {
    if (asked) await sleep(delayMs);
    asked = true;
    const url = addressOf(page);
    try {
      let answer = await fetchPage(url);
      for (let again = 0; again < BUSY_RETRIES && BUSY.has(answer.status); again += 1) {
        await sleep((answer.retryAfterSeconds ?? BUSY_WAIT_SECONDS) * 1000);
        answer = await fetchPage(url);
      }
      if (answer.status !== 200) return { why: String(answer.status) };
      if (pathOf(answer.url) === pathOf(url)) return { marks: marksOfPage(answer.text) };
      // another page's outline is not this chapter's, unless it is the one page of several chapters that holds it
      const combined = combinedPageOf(page, pathOf(answer.url));
      return combined === undefined ? { why: `redirected to ${pathOf(answer.url)}` } : { marks: marksOfPage(answer.text), combined };
    } catch (error) {
      return { why: error instanceof Error ? error.message : String(error) };
    }
  }

  for (const [i, page] of chapters.entries()) {
    if (i > 0 && i % 100 === 0) log(`... ${i} of ${chapters.length}`);
    const cached = join(cacheDir, `${page}.json`);
    let kept: Kept;
    if (existsSync(cached)) kept = readJson<Kept>(cached);
    else {
      const got = inARow >= FAILURES_IN_A_ROW ? { why: 'not asked: too many pages failed in a row' } : await ask(page);
      if ('why' in got) {
        inARow += 1;
        report.failed.push({ page, why: got.why });
        continue;
      }
      inARow = 0;
      kept = got;
      writeWhole(cached, `${JSON.stringify(kept)}\n`);
    }
    report.read.push(page);
    // on a page of several chapters a heading that names no chapter cannot be told to be this one's
    const marks = kept.combined === undefined ? kept.marks : kept.marks.map((mark) => (/\(\s*\d+:/.test(mark) ? mark : ''));
    const ranges = rangesOfHeadings(marks, partsOf(page).chapter);
    marks.forEach((mark, n) => {
      // a bracket naming a chapter ('(36:1)' on Exodus 35) may rightly hold no verse of this one
      if (mark.includes('(') && !mark.includes(':') && ranges[n] === undefined) report.unread.push({ page, mark });
    });
    if (ranges.every((range) => range === undefined)) {
      report.noOutline.push(page);
      delete table[page];
    } else table[page] = ranges.map((range) => range ?? '').join(',').replace(/,+$/, '');
  }

  // one line a chapter, in canon order
  const order = new Map(chaptersToRead().map((page, i) => [page, i]));
  const sorted = Object.entries(table).sort(([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity));
  writeWhole(outFile, `${JSON.stringify(Object.fromEntries(sorted), null, 1)}\n`);

  const list = (items: readonly string[]) => (items.length === 0 ? '0' : `${items.length}: ${items.join(', ')}`);
  log(`chapters read: ${report.read.length}`);
  log(`with no outline (open at the top): ${list(report.noOutline)}`);
  log(`pages failed: ${list(report.failed.map((f) => `${f.page} (${f.why})`))}`);
  log(`headings with a bracket that names no range: ${list(report.unread.map((u) => `${u.page} "${u.mark}"`))}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildSections({ cacheDir: 'data/raw/enduring-word', outFile: 'src/resources/enduringWordSections.json', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
