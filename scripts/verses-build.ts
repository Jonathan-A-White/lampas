// scripts/verses-build.ts — the small file of each chapter's English for the blog's verse popup (mw-5r3p30.1088, src/reftagger/popup.ts): public/data/verses-<book>-<chapter>.json, made from the
// committed chapter files (public/data/<book>/<chapter>.json), which hold the Greek or Hebrew, every word's parsing and the English chunks (about 177 KB for John 5); the popup needs one verse
// of English (the small file is a few KB). Run by `npm run data:verses` after data:build and data:build:ot, never at runtime. Deterministic: the same chapters give the same bytes, and a
// second run changes nothing. The translation of a file is the one the Reader names (englishSource.ts translationOf): the Old Testament's English is the Berean Standard Bible's.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourceLanguage, type Chapter } from '../src/data/chapter';
import { translationOf } from '../src/reader/englishSource';
import { plainVerses } from '../src/reftagger/verses';

/** The small file's text for one chapter file's content. */
export const smallFileOf = (chapter: Chapter): string => `${JSON.stringify(plainVerses(chapter, translationOf(sourceLanguage(chapter))))}\n`;

/** Writes (or leaves, when its bytes are already right) the small file of every chapter under `dir`; returns how many it wrote and how many chapters it read. */
export function buildVerses(dir: string): { chapters: number; written: number } {
  let chapters = 0;
  let written = 0;
  for (const book of readdirSync(dir, { withFileTypes: true })) {
    if (!book.isDirectory() || book.name === 'ladder') continue;
    for (const file of readdirSync(`${dir}/${book.name}`)) {
      const m = /^(\d+)\.json$/.exec(file);
      if (!m) continue;
      const chapter = JSON.parse(readFileSync(`${dir}/${book.name}/${file}`, 'utf8')) as Chapter;
      const out = `${dir}/verses-${book.name}-${m[1]}.json`;
      const text = smallFileOf(chapter);
      chapters += 1;
      if (existsSync(out) && readFileSync(out, 'utf8') === text) continue;
      writeFileSync(out, text);
      written += 1;
    }
  }
  return { chapters, written };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { chapters, written } = buildVerses('public/data');
  console.log(`${chapters} chapters read, ${written} small files written`);
}
