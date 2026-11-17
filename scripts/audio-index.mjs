#!/usr/bin/env node
// scripts/audio-index.mjs: the index of the recorded voice's timings, made from the book files (mw-zbgo4ep.49, docs/audio-run.md 'Promoting a book').
//
//   node scripts/audio-index.mjs            writes public/data/audio/msb-david/index.json from the <book>.json files beside it
//   node scripts/audio-index.mjs --check    writes nothing; exits 1 and says why when a book file is not a book's timings or index.json is not what the book files make
//
// public/data/audio/msb-david/index.json is GENERATED and git-ignored: no book's story edits it, so two books' branches never touch one file and merge in any order.
// A book is listed by its own file, <book>.json, and the index lists the chapters that file holds, as the maker once wrote them into both. `npm run build`, `npm run dev`
// and the tests' global setup (tests/global-setup.ts) make it; the shape is src/data/audioTimings.ts's isTimingsIndex.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EDITION = 'msb-david';
export const VOICE = 'David';
export const INDEX_DIR = `public/data/audio/${EDITION}`;

/** The text of the index the book files in `dir` make (one line and a newline, books in order of their codes, chapters rising); throws, naming the file, when a book file is not a book's timings. */
export function indexText(dir = INDEX_DIR) {
  const books = {};
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json').sort() : [];
  for (const name of names) {
    const code = name.slice(0, -'.json'.length);
    let file;
    try {
      file = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    } catch (error) {
      throw new Error(`${join(dir, name)} is not JSON: ${error.message}`);
    }
    if (!file || file.edition !== EDITION || file.book !== code || !file.chapters || typeof file.chapters !== 'object') {
      throw new Error(`${join(dir, name)} is not the ${EDITION} timings of book ${code} (edition, book and chapters are wrong)`);
    }
    const chapters = Object.keys(file.chapters).map(Number).sort((a, b) => a - b);
    if (chapters.length === 0) throw new Error(`${join(dir, name)} holds no chapter: delete the file instead of emptying it`);
    books[code] = chapters;
  }
  return `${JSON.stringify({ v: 1, edition: EDITION, voice: VOICE, books })}\n`;
}

/** Writes the index of `dir` (kept as it is when it is already right); returns its path. */
export function writeIndex(dir = INDEX_DIR) {
  const text = indexText(dir);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'index.json');
  if (!existsSync(path) || readFileSync(path, 'utf8') !== text) writeFileSync(path, text, 'utf8');
  return path;
}

/** Whether index.json in `dir` is what the book files make: null when it is, else what is wrong. */
export function checkIndex(dir = INDEX_DIR) {
  const text = indexText(dir);
  const path = join(dir, 'index.json');
  if (!existsSync(path)) return `${path} is missing: run node scripts/audio-index.mjs`;
  if (readFileSync(path, 'utf8') !== text) return `${path} is not what the book files make: run node scripts/audio-index.mjs`;
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--check')) {
      const wrong = checkIndex();
      if (wrong) {
        console.error(`audio-index: ${wrong}`);
        process.exit(1);
      }
      console.log('audio-index: index.json is what the book files make');
    } else {
      const path = writeIndex();
      const { books } = JSON.parse(readFileSync(path, 'utf8'));
      console.log(`audio-index: ${path} lists ${Object.keys(books).length} books: ${Object.keys(books).join(' ')}`);
    }
  } catch (error) {
    console.error(`audio-index: ${error.message}`);
    process.exit(1);
  }
}
