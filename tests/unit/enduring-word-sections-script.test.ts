// npm run ew:sections (mw-1l901so.7, scripts/enduring-word-sections.ts): it reads the chapter pages one at a time with a delay and a cache, keeps from each only the section-N verse ranges, and writes the table
// the app reads. No words of the commentary are kept, in the table or in the cache. The pages here are made up for the test; none of the site's own.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSections, chaptersToRead, CLIENT_NAME, DELAY_MS, marksOfPage, type Page, type SectionsOptions } from '../../scripts/enduring-word-sections';
import { BOOKS } from '../../src/data/books';
import { rangesOfHeadings } from '../../src/resources/enduringWord';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

const made: string[] = [];
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
}, HOOK_TIMEOUT_MS);

const heading = (n: number, text: string) => `<h4 id="section-${n}">${text}</h4>\n<p>Zebra prose under heading ${n} (7).</p>`;
const page = (...headings: string[]) => `<html><body><h1>Pelican title</h1><h4 class="summary">Walrus</h4>\n${headings.map((text, i) => heading(i + 1, text)).join('\n')}</body></html>`;
const PAGES: Record<string, string> = {
  'isaiah-1': page('1. (1) Otter: <strong>Heron</strong>.', '2. (2-4)&nbsp;Badger.', '3. A heading with no range (see Lemur 3:1).', '1. (5&#8211;6a) Marmot.', '2. (6b-9) Ferret’s end'),
  'isaiah-2': '<html><body><h4>Stoat with no outline</h4></body></html>',
};

/** A site that answers from PAGES and notes each request and each wait. */
function site(answers: Record<string, Page | Page[]> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ew-sections-'));
  made.push(dir);
  const events: string[] = [];
  const logged: string[] = [];
  const asked = new Map<string, number>();
  const options: SectionsOptions = {
    chapters: ['isaiah-1', 'isaiah-2', 'isaiah-3'],
    cacheDir: join(dir, 'cache'),
    outFile: join(dir, 'table.json'),
    fetchPage: (url) => {
      events.push(url);
      const slug = url.replace('https://enduringword.com/bible-commentary/', '').replace('/', '');
      const times = asked.get(slug) ?? 0;
      asked.set(slug, times + 1);
      const given = answers[slug];
      const answer = Array.isArray(given) ? (given[times] ?? given[given.length - 1]) : given;
      const text = PAGES[slug];
      return Promise.resolve(answer ?? (text === undefined ? { status: 404, url, text: 'Gone' } : { status: 200, url, text }));
    },
    sleep: (ms) => {
      events.push(`wait ${ms}`);
      return Promise.resolve();
    },
    log: (line) => logged.push(line),
  };
  return { options, events, logged, table: () => JSON.parse(readFileSync(options.outFile, 'utf8')) as Record<string, string> };
}

const url = (slug: string) => `https://enduringword.com/bible-commentary/${slug}/`;

describe('what is kept of a page', () => {
  it('is each section heading’s leading number and parenthesis, no word of it', () => {
    const marks = marksOfPage(PAGES['isaiah-1'] ?? '');
    expect(marks).toEqual(['1. (1)', '2. (2-4)', '3.', '1. (5–6a)', '2. (6b-9)']);
    expect(rangesOfHeadings(marks)).toEqual(['1', '2-4', undefined, '5-6', '6-9']);
  });

  it('is placed by the section’s own number, whatever the page’s order', () => {
    expect(marksOfPage('<h4 id="section-3">2. (9) C</h4><h4 class="x" id="section-1">1. (1-2) A</h4>')).toEqual(['1. (1-2)', '', '2. (9)']);
  });

  it('is nothing for a page with no outline', () => {
    expect(marksOfPage(PAGES['isaiah-2'] ?? '')).toEqual([]);
  });
});

describe('the chapters it reads', () => {
  it('are every chapter of every book the slugs name', () => {
    const chapters = chaptersToRead();
    expect(chapters).toHaveLength(BOOKS.reduce((sum, b) => sum + b.chapters, 0));
    expect(chapters.slice(0, 2)).toEqual(['genesis-1', 'genesis-2']);
    expect(chapters).toContain('psalm-150');
    expect(chapters).toContain('revelation-22');
  });
});

describe('a run', () => {
  it('writes the ranges and no word of the commentary, and counts read, no outline and failed', async () => {
    const { options, table, logged } = site();
    const report = await buildSections(options);
    expect(table()).toEqual({ 'isaiah-1': '1,2-4,,5-6,6-9' });
    expect(report.read).toEqual(['isaiah-1', 'isaiah-2']);
    expect(report.noOutline).toEqual(['isaiah-2']);
    expect(report.failed).toEqual([{ page: 'isaiah-3', why: '404' }]);
    expect(logged).toContain('chapters read: 2');
    expect(logged).toContain('with no outline (open at the top): 1: isaiah-2');
    expect(logged).toContain('pages failed: 1: isaiah-3 (404)');
  });

  it('keeps no word of a page in its cache', async () => {
    const { options } = site();
    await buildSections(options);
    const files = readdirSync(options.cacheDir).sort();
    expect(files).toEqual(['isaiah-1.json', 'isaiah-2.json']);
    for (const file of files) {
      expect(readFileSync(join(options.cacheDir, file), 'utf8')).not.toMatch(/zebra|pelican|walrus|otter|heron|badger|lemur|marmot|ferret|stoat/i);
    }
  });

  it('asks one page at a time with a delay between, and reads none twice', async () => {
    const first = site();
    await buildSections(first.options);
    expect(first.events).toEqual([url('isaiah-1'), `wait ${DELAY_MS}`, url('isaiah-2'), `wait ${DELAY_MS}`, url('isaiah-3')]);
    expect(DELAY_MS).toBeGreaterThanOrEqual(1000);
    first.events.length = 0;
    // the second run asks only for the page that failed
    await buildSections(first.options);
    expect(first.events).toEqual([url('isaiah-3')]);
  });

  it('waits and asks again where the site says to slow down', async () => {
    const answers = { 'isaiah-1': [{ status: 429, url: url('isaiah-1'), text: '', retryAfterSeconds: 90 }, { status: 200, url: url('isaiah-1'), text: PAGES['isaiah-1'] ?? '' }] };
    const { options, events, table } = site(answers);
    await buildSections({ ...options, chapters: ['isaiah-1'] });
    expect(events).toEqual([url('isaiah-1'), 'wait 90000', url('isaiah-1')]);
    expect(table()).toEqual({ 'isaiah-1': '1,2-4,,5-6,6-9' });
  });

  it('keeps what the table had of a page that fails, and does not take another page’s outline for a redirected one', async () => {
    const answers = { 'isaiah-2': { status: 200, url: url('isaiah-1'), text: PAGES['isaiah-1'] ?? '' } };
    const { options, table } = site(answers);
    writeFileSync(options.outFile, JSON.stringify({ 'isaiah-3': '1-5' }));
    const report = await buildSections(options);
    expect(table()).toEqual({ 'isaiah-1': '1,2-4,,5-6,6-9', 'isaiah-3': '1-5' });
    expect(report.failed.map((f) => f.page)).toEqual(['isaiah-2', 'isaiah-3']);
  });

  it('takes a combined page’s headings of the chapter asked for, where the chapter’s address leads to one', async () => {
    const combined = page('1. (2:1-9) Mole', '2. (3:1-5) Vole', '3. (6-8) a heading that names no chapter', '4. (3:6-4:2) Newt');
    const answers = Object.fromEntries([2, 3, 5].map((n) => [`isaiah-${n}`, { status: 200, url: url('isaiah-2-3-4'), text: combined }]));
    const { options, table } = site(answers);
    const report = await buildSections({ ...options, chapters: ['isaiah-2', 'isaiah-3', 'isaiah-5'] });
    expect(table()).toEqual({ 'isaiah-2': '1-9', 'isaiah-3': ',1-5,,6-' });
    expect(report.read).toEqual(['isaiah-2', 'isaiah-3']);
    expect(report.failed).toEqual([{ page: 'isaiah-5', why: 'redirected to /bible-commentary/isaiah-2-3-4/' }]);
    // the cache says which page it was, so a second run reads it the same way
    await buildSections({ ...options, chapters: ['isaiah-3'] });
    expect(table()['isaiah-3']).toBe(',1-5,,6-');
  });

  it('stops asking after many failures in a row', async () => {
    const { options, events } = site();
    const chapters = Array.from({ length: 30 }, (_, i) => `jude-${i + 1}`);
    const report = await buildSections({ ...options, chapters });
    expect(events.filter((e) => e.startsWith('https'))).toHaveLength(10);
    expect(report.failed).toHaveLength(30);
    expect(existsSync(options.outFile)).toBe(true);
  });

  it('names itself plainly, with nothing of whoever runs it', () => {
    expect(CLIENT_NAME).toMatch(/^outline-ranges\/\d/);
    expect(CLIENT_NAME).not.toMatch(/@|github|lampas|jonathan/i);
  });
});
