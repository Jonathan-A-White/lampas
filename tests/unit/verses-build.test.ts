// tests/unit/verses-build.test.ts — the blog popup's small file of each chapter's English (scripts/verses-build.ts, mw-5r3p30.1088) is committed beside the chapters and must be what the
// script makes from them: a chapter rebuilt without `npm run data:verses` fails here, naming the file. Each is far smaller than its chapter, so the card does not fetch the chapter file.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { buildVerses, smallFileOf } from '../../scripts/verses-build';

const DATA = 'public/data';
const chapterFiles = (): { book: string; n: string }[] =>
  readdirSync(DATA, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'ladder')
    .flatMap((d) => readdirSync(`${DATA}/${d.name}`).flatMap((f) => (/^\d+\.json$/.test(f) ? [{ book: d.name, n: f.replace('.json', '') }] : [])));

describe('the small file of each chapter\'s English', () => {
  it('is there for each of the 1189 chapters, equal to what the script makes, and a fraction of the chapter\'s size', { timeout: 120_000 }, () => {
    const files = chapterFiles();
    expect(files).toHaveLength(1189);
    const stale: string[] = [];
    let small = 0;
    let whole = 0;
    for (const { book, n } of files) {
      const path = `${DATA}/verses-${book}-${n}.json`;
      const chapterPath = `${DATA}/${book}/${n}.json`;
      const made = smallFileOf(JSON.parse(readFileSync(chapterPath, 'utf8')) as Chapter);
      if (!existsSync(path) || readFileSync(path, 'utf8') !== made) stale.push(path);
      else {
        small += statSync(path).size;
        whole += statSync(chapterPath).size;
      }
    }
    expect(stale, 'run npm run data:verses').toEqual([]);
    expect(small).toBeLessThan(whole / 10);
  });

  it('a second run changes nothing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'verses-'));
    try {
      mkdirSync(`${dir}/gen`);
      writeFileSync(`${dir}/gen/1.json`, readFileSync(`${DATA}/gen/1.json`));
      mkdirSync(`${dir}/ladder`);
      writeFileSync(`${dir}/ladder/el.json`, '[]');
      expect(buildVerses(dir)).toEqual({ chapters: 1, written: 1 });
      expect(buildVerses(dir)).toEqual({ chapters: 1, written: 0 });
      expect(readFileSync(`${dir}/verses-gen-1.json`, 'utf8')).toBe(readFileSync(`${DATA}/verses-gen-1.json`, 'utf8'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
