#!/usr/bin/env node
// scripts/build-lemma-forms.mjs — the index from a lemma to every form of it the New Testament text uses (mw-irpgqi.4, docs/paradigms.md 'This word').
//
//   node scripts/build-lemma-forms.mjs     reads public/data/<book>/<n>.json and writes public/lemma-forms/<lemma>.json, one file a lemma
//
// The files are made from the chapter data the Reader loads, so they are generated, not committed (public/lemma-forms is in .gitignore; it is not under public/data, whose every file the tests read as a chapter);
// `npm run build` makes them before it bundles, `npm run forms:build` makes them alone. A form is only ever one the text has: the text's
// own form with its first letter lower-cased (unless the lemma is a name) and a grave accent turned into the acute the dictionary form has.
// The Old Testament's Hebrew is indexed too (mw-gdcyf98.16), by the TBESH headword the chapter files give each word as `l`: a Hebrew form is the text's `t`
// byte for byte (ownFormOf's NFC would re-order its points), a word with no headword (a preposition with its suffix, `l` empty) is left out, and the
// code is the table's own ('V-Qal-Perf-3ms'). One file name rule for both languages, lemmaFileName: the headword in NFC, then '.json'.
// One file is {"l": lemma, "f": [[form, RP code, how many times, book, chapter, verse] ...]}, the forms in the order the text first uses them,
// the book/chapter/verse the first use. A lemma's file is what the app fetches on demand (src/data/paradigms/ownForms.ts), so each stays small.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const GRAVE_ACCENTS = /̀/g;
const ACUTE = '́';

/** The text's form as the table shows it: a grave accent is the acute the dictionary has, and a word that opens a sentence is lower case (a name keeps its capital). */
export function ownFormOf(text, lemma) {
  const decomposed = text.normalize('NFD').replace(GRAVE_ACCENTS, ACUTE);
  const lower = lemma.normalize('NFD')[0] === lemma.normalize('NFD')[0].toLowerCase();
  const form = lower ? decomposed[0].toLowerCase() + decomposed.slice(1) : decomposed;
  return form.normalize('NFC');
}

/**
 * Every lemma's forms from the chapters (in canonical order): Map<lemma, [form, code, count, book, chapter, verse][]>. The same form with the same code is one
 * entry, counted, with the place of its first use; the same form with another code (ἀγαπᾷ, indicative and subjunctive) is another entry.
 */
export function lemmaForms(chapters) {
  const lemmas = new Map();
  for (const chapter of chapters) {
    const hebrew = chapter.lang === 'hbo';
    for (const verse of chapter.verses) {
      for (const word of verse.g) {
        if (!word.l) continue; // a Hebrew word with no headword of its own has no lemma to be a form of
        const form = hebrew ? word.t : ownFormOf(word.t, word.l);
        const entries = lemmas.get(word.l) ?? new Map();
        lemmas.set(word.l, entries);
        const key = `${form}\u0000${word.p}`;
        const known = entries.get(key);
        if (known) known[2] += 1;
        else entries.set(key, [form, word.p, 1, chapter.code, chapter.chapter, verse.n]);
      }
    }
  }
  return new Map([...lemmas].map(([lemma, entries]) => [lemma, [...entries.values()]]));
}

/** The file's text for one lemma. */
export const fileText = (lemma, entries) => `${JSON.stringify({ l: lemma, f: entries })}\n`;

/**
 * The name of a lemma's file under public/lemma-forms: the headword in NFC (the lexicons' own key) and '.json', pointed Hebrew as it stands (a comma, a space or a
 * maqaf in it are fine in a name; the app asks for it with encodeURIComponent). Only a path separator or a NUL cannot be in a name, and no headword has one: one that did
 * is an error, not a file in another directory.
 */
export function lemmaFileName(lemma) {
  const name = lemma.normalize('NFC');
  if (/[/\\\0]/.test(name)) throw new Error(`The lemma ${JSON.stringify(lemma)} cannot be a file name`);
  return `${name}.json`;
}

/** The chapters of public/data in canonical order (index.json's), read from `dataDir`: all 66 books, the Hebrew ones too. */
export function readChapters(dataDir) {
  const index = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8'));
  const chapters = [];
  for (const book of index.books) {
    for (let n = 1; n <= book.chapters; n++) {
      const path = join(dataDir, book.code, `${n}.json`);
      if (existsSync(path)) chapters.push(JSON.parse(readFileSync(path, 'utf8')));
    }
  }
  return chapters;
}

/** Writes a file for each lemma under `outDir` (emptied first, so a lemma the text no longer has leaves no file); returns the counts and the sizes. */
export function writeLemmaForms(dataDir, outDir) {
  const lemmas = lemmaForms(readChapters(dataDir));
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  let bytes = 0;
  let largest = { lemma: '', bytes: 0 };
  for (const [lemma, entries] of lemmas) {
    const text = fileText(lemma, entries);
    const size = Buffer.byteLength(text);
    writeFileSync(join(outDir, lemmaFileName(lemma)), text);
    bytes += size;
    if (size > largest.bytes) largest = { lemma, bytes: size };
  }
  return { lemmas: lemmas.size, bytes, largest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const done = writeLemmaForms('public/data', 'public/lemma-forms');
  console.log(`${done.lemmas} lemma files, ${(done.bytes / 1024).toFixed(0)} KB in all, the largest ${done.largest.lemma} at ${done.largest.bytes} bytes`);
  // a build that leaves a stray file behind would be told at once
  if (readdirSync('public/lemma-forms').length !== done.lemmas) process.exit(1);
}
