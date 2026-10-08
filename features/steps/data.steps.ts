// features/steps/data.steps.ts — runs features/data.feature against the committed public/data, the
// source slices in tests/fixtures/data/, and a real build of the service worker.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { runBuild } from '../../scripts/data-build';
import type { BookIndex, Chapter } from '../../src/data/chapter';

// A real vite build takes a few seconds.
vi.setConfig({ testTimeout: 90_000 });

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const chapterPath = (code: string, n: number) => `public/data/${code}/${n}.json`;
const greekOf = (chapter: Chapter, verse: number, words: number) =>
  (chapter.verses.find((v) => v.n === verse)?.g ?? []).slice(0, words).map((w) => w.t).join(' ');

const tmpDirs: string[] = [];
const tmp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'lampas-data-steps-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => tmpDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

let index: BookIndex;
let chapter: Chapter;
let first: string;
let second: string;
let outDir: string;
let swText: string;

const feature = await loadFeature('features/data.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The index lists the whole New Testament', ({ Given, Then }) => {
    Given('the committed index', () => {
      index = readJson<BookIndex>('public/data/index.json');
    });
    Then('it lists 27 books in canonical order with 260 chapters', () => {
      expect(index.books.map((b) => b.code)).toEqual([
        'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th',
        '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev',
      ]);
      expect(index.books.reduce((n, b) => n + b.chapters, 0)).toBe(260);
      for (const b of index.books) expect(b.verses).toHaveLength(b.chapters);
      const rom = index.books.find((b) => b.code === 'rom');
      expect(rom?.name).toBe('Romans');
      expect(rom?.verses[7]).toBe(39);
    });
  });

  Scenario('Every chapter file is there and parses', ({ Given, Then }) => {
    Given('the committed index', () => {
      index = readJson<BookIndex>('public/data/index.json');
    });
    Then('each of its chapters has a file that parses with the shape the app reads', () => {
      let files = 0;
      for (const b of index.books) {
        for (let n = 1; n <= b.chapters; n++) {
          const c = readJson<Chapter>(chapterPath(b.code, n));
          expect(c.code).toBe(b.code);
          expect(c.book).toBe(b.name);
          expect(c.chapter).toBe(n);
          expect(c.verses).toHaveLength(b.verses[n - 1]);
          for (const v of c.verses) {
            expect(v.g.length).toBeGreaterThan(0);
            for (const w of v.g) {
              expect(w.e === undefined || (v.e[w.e]?.g ?? []).includes(v.g.indexOf(w))).toBe(true);
            }
          }
          files++;
        }
      }
      expect(files).toBe(260);
      const onDisk = readdirSync('public/data', { recursive: true }).map(String).filter((p) => p.endsWith('.json'));
      expect(onDisk).toHaveLength(262);
    });
  });

  Scenario('Romans 8 is the chapter the demo reads', ({ Given, Then, And }) => {
    Given('the committed chapter rom 8', () => {
      chapter = readJson<Chapter>(chapterPath('rom', 8));
    });
    Then('it has 39 verses and verse 1 begins with the Greek words {string}', (_ctx, words: string) => {
      expect(chapter.verses).toHaveLength(39);
      expect(greekOf(chapter, 1, 2)).toBe(words);
    });
    And('it is under 400 KB', () => {
      expect(statSync(chapterPath('rom', 8)).size).toBeLessThan(400 * 1024);
    });
  });

  Scenario('John 1 begins in the beginning', ({ Given, Then }) => {
    Given('the committed chapter jhn 1', () => {
      chapter = readJson<Chapter>(chapterPath('jhn', 1));
    });
    Then('verse 1 begins with the Greek words {string}', (_ctx, words: string) => {
      expect(greekOf(chapter, 1, 2)).toBe(words);
    });
  });

  Scenario('Romans 8:1 carries the Byzantine clause and a glossed ἄρα', ({ Given, Then, And }) => {
    Given('the committed chapter rom 8', () => {
      chapter = readJson<Chapter>(chapterPath('rom', 8));
    });
    Then('verse 1 has the word {string} carrying {string} and the gloss {string}', (_ctx, text: string, strongs: string, gloss: string) => {
      const word = chapter.verses[0].g.find((w) => w.t === text);
      expect(word?.s).toBe(strongs);
      expect(chapter.lex[strongs].g).toBe(gloss);
    });
    And('the English of verse 1 contains {string}', (_ctx, clause: string) => {
      expect(chapter.verses[0].e.map((c) => c.t).join(' ')).toContain(clause);
    });
  });

  Scenario('Every Greek word has a lemma and a gloss', ({ Given, Then }) => {
    Given('the committed index', () => {
      index = readJson<BookIndex>('public/data/index.json');
    });
    Then('no Greek word in any of its chapters lacks a lemma or a gloss', () => {
      let words = 0;
      const misses: string[] = [];
      for (const b of index.books) {
        for (let n = 1; n <= b.chapters; n++) {
          const c = readJson<Chapter>(chapterPath(b.code, n));
          for (const v of c.verses) {
            for (const w of v.g) {
              words++;
              if (!w.l || !c.lex[w.s]?.g) misses.push(`${b.code} ${n}:${v.n} ${w.t} ${w.s}`);
            }
          }
        }
      }
      expect(words).toBeGreaterThan(130_000);
      expect(misses).toEqual([]);
    });
  });

  Scenario('Every parsing code in the text decodes to words', ({ Given, Then }) => {
    Given('the committed index', () => {
      index = readJson<BookIndex>('public/data/index.json');
    });
    Then('every parsing code in its chapters has a decoding', () => {
      const unknown: string[] = [];
      for (const b of index.books) {
        for (let n = 1; n <= b.chapters; n++) {
          const c = readJson<Chapter>(chapterPath(b.code, n));
          for (const v of c.verses) for (const w of v.g) if (!c.parse[w.p]) unknown.push(`${b.code} ${n}:${v.n} ${w.p}`);
        }
      }
      expect(unknown).toEqual([]);
    });
  });

  Scenario('Building twice changes nothing', ({ Given, When, Then }) => {
    Given('the source slices', () => {
      const raw = tmp();
      mkdirSync(raw, { recursive: true });
      writeFileSync(join(raw, 'msb_nt_tables.tsv'), readFileSync('tests/fixtures/data/msb-slice.tsv'));
      writeFileSync(join(raw, 'tbesg.txt'), readFileSync('tests/fixtures/data/tbesg-slice.txt'));
      outDir = raw;
    });
    When('the data is built twice', async () => {
      const download = async () => {
        throw new Error('the raw files are there; nothing should be downloaded');
      };
      const dump = (dir: string) =>
        readdirSync(dir, { recursive: true })
          .map(String)
          .filter((p) => p.endsWith('.json'))
          .sort()
          .map((p) => `${p}\n${readFileSync(join(dir, p), 'utf8')}`)
          .join('\n');
      const a = join(outDir, 'out-a');
      await runBuild({ rawDir: outDir, outDir: a, download });
      first = dump(a);
      // The second run writes over the first run's own output directory.
      await runBuild({ rawDir: outDir, outDir: a, download });
      second = dump(a);
    });
    Then('the second run writes the same bytes as the first', () => {
      expect(first.length).toBeGreaterThan(1000);
      expect(second).toBe(first);
    });
  });

  Scenario('Only the index, the lemma lexicon and Romans 8 are precached', ({ Given, Then, And }) => {
    Given('the app is built', () => {
      outDir = tmp();
      execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
      swText = readFileSync(join(outDir, 'sw.js'), 'utf8');
    });
    Then('the service worker precaches data/index.json, data/lexicon.json and data/rom/8.json and no other chapter', () => {
      const urls = [...swText.matchAll(/"url":"([^"]+)"/g)].map((m) => m[1]);
      const data = urls.filter((u) => u.startsWith('data/')).sort();
      expect(data).toEqual(['data/index.json', 'data/lexicon.json', 'data/rom/8.json']);
      expect(urls.length).toBeGreaterThan(4);
    });
    And('the service worker serves other chapters cache-first from a runtime cache', () => {
      expect(readFileSync('src/sw.ts', 'utf8')).toMatch(/CacheFirst/);
      expect(swText).toMatch(/\/data\//);
    });
  });
});
