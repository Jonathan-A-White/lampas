#!/usr/bin/env node
// scripts/build-lemma-forms.mjs — the index from a lemma to every form of it the New Testament text uses (mw-irpgqi.4, docs/paradigms.md 'This word').
//
//   node scripts/build-lemma-forms.mjs     reads public/data/<book>/<n>.json (and the Septuagint's public/data-lxx/<book>/<n>.json) and writes public/lemma-forms/<lemma>.json, one file a lemma
//
// The files are made from the chapter data the Reader loads, so they are generated, not committed (public/lemma-forms is in .gitignore; it is not under public/data, whose every file the tests read as a chapter);
// `npm run build` makes them before it bundles, `npm run forms:build` makes them alone. A form is only ever one the text has: the text's
// own form with its first letter lower-cased (unless the lemma is a name) and a grave accent turned into the acute the dictionary form has.
// The Old Testament's Hebrew is indexed too (mw-gdcyf98.16), by the TBESH headword the chapter files give each word as `l`: a Hebrew form is the text's `t`
// byte for byte (ownFormOf's NFC would re-order its points), a word with no headword (a preposition with its suffix, `l` empty) is left out, and the
// code is the table's own ('V-Qal-Perf-3ms'). One file name rule for both languages, lemmaFileName: the headword in NFC, then '.json'.
// One file is {"l": lemma, "f": [[form, RP code, how many times, book, chapter, verse] ...]}, the forms in the order the text first uses them,
// the book/chapter/verse the first use. A lemma's file is what the app fetches on demand (src/data/paradigms/ownForms.ts), so each stays small.
// The Septuagint's forms (mw-u2w5klk.289) come from the shipped chapters of public/data-lxx and ride in the same file under "lxx", entries of the same shape: the book is Lampas's own
// (Swete's `sol` is `sng`) and the chapter and verse the Lampas ones the Greek verse answers (Greek Ps 22:1 is Psalms 23:1), so a reference opens the Reader where it says; a lemma the New
// Testament lacks has "f": []. A lemma with no Septuagint form has no "lxx" key, so its file is byte for byte what it was. The codes are the New Testament's scheme (TAGNT's), so none is translated.
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
 * `formOf(text, lemma, hebrew, code)` gives the form a word is indexed under (undefined: left out) and `placeOf(chapter, verse)` the [book, chapter, verse] of a use.
 */
function collect(chapters, formOf, placeOf) {
  const lemmas = new Map();
  for (const chapter of chapters) {
    const hebrew = chapter.lang === 'hbo';
    for (const verse of chapter.verses) {
      const place = placeOf(chapter, verse);
      for (const word of verse.g) {
        if (!word.l) continue; // a Hebrew word with no headword of its own has no lemma to be a form of
        const form = formOf(word.t, word.l, hebrew, word.p);
        if (form === undefined) continue;
        const entries = lemmas.get(word.l) ?? new Map();
        lemmas.set(word.l, entries);
        const key = `${form}\u0000${word.p}`;
        const known = entries.get(key);
        if (known) known[2] += 1;
        else entries.set(key, [form, word.p, 1, ...place]);
      }
    }
  }
  return new Map([...lemmas].map(([lemma, entries]) => [lemma, [...entries.values()]]));
}

export const lemmaForms = (chapters) => collect(chapters, (t, l, hebrew) => (hebrew ? t : ownFormOf(t, l)), (chapter, verse) => [chapter.code, chapter.chapter, verse.n]);

/** What Swete's printing adds to a word (docs/lxx-derivation.md 'Swete's tokens'): punctuation, brackets and the editor's signs (scripts/lxx/swete.ts PUNCT). */
const SWETE_MARKS = /[.,;:!?()[\]{}"\u00B7\u0387\u037E\u201C\u201D\u00AB\u00BB\u2014\u2013\-\u2E00-\u2E7F\u00B6\u00A7*+\u2020\u2021]/g;

/** A word's letters with every mark dropped, lower case and final sigma as sigma: what a word printed in capitals (no accent, breathing or iota subscript) can be matched on. */
export const bareOf = (text) => text.normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase().replace(/\u03C2/g, '\u03C3');

/** Whether a token is printed wholly in capitals (a book's opening, ΕΝ ΑΡΧΗ): one letter alone is an ordinary capital. */
const inCapitals = (bare) => bare.length > 1 && bare === bare.toUpperCase() && bare !== bare.toLowerCase();

/**
 * The form a Septuagint token is indexed under: the token without Swete's marks, then ownFormOf. A word printed wholly in capitals has no accent or breathing to read, so it is
 * matched to the form of its lemma with its parsing that the text does have (`accented`: those forms, accents kept; ΑΡΧΗ with N-DSF is ἀρχῇ, not ἀρχή) and is left out (undefined)
 * when there is none, rather than indexed as a spelling no one writes.
 */
export function septuagintFormOf(text, lemma, accented = []) {
  const bare = text.replace(SWETE_MARKS, '');
  if (bare === '') return undefined;
  if (inCapitals(bare)) return accented.find((form) => bareOf(form) === bareOf(bare));
  return ownFormOf(bare, lemma);
}

const accentKey = (lemma, code) => `${lemma}\u0000${code}`;

/** The forms the text has for each lemma and parsing, accents kept: the New Testament's (`nt`, as lemmaForms gives it) and the Septuagint's own words in small letters. Map<accentKey, form[]>. */
function accentedForms(chapters, nt) {
  const accented = new Map();
  const note = (lemma, code, form) => {
    const forms = accented.get(accentKey(lemma, code)) ?? [];
    accented.set(accentKey(lemma, code), forms);
    if (!forms.includes(form)) forms.push(form);
  };
  for (const [lemma, entries] of nt) for (const [form, code] of entries) note(lemma, code, form);
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      for (const word of verse.g) {
        const form = word.l ? septuagintFormOf(word.t, word.l) : undefined;
        if (form !== undefined) note(word.l, word.p, form);
      }
    }
  }
  return accented;
}

/**
 * Every lemma's forms in the Septuagint chapters (mw-u2w5klk.289): as lemmaForms, with the Lampas verse a Greek verse answers as its place (the Greek numbers where Lampas has none).
 * A word in capitals takes its accent from the forms of its lemma and parsing in the New Testament (`nt`) or in the Septuagint's own small letters (mw-u2w5klk.296).
 */
export function septuagintForms(chapters, nt = new Map()) {
  const accented = accentedForms(chapters, nt);
  return collect(chapters, (t, l, hebrew, code) => septuagintFormOf(t, l, accented.get(accentKey(l, code))), (chapter, verse) => (verse.ref && verse.ref !== 'none' ? [verse.ref.book, verse.ref.chapter, verse.ref.verse] : [chapter.code, chapter.chapter, verse.n]));
}

/** Every word printed in capitals in the Septuagint chapters, with the form septuagintForms matches it to (undefined: left out), for the build to tell and the tests to sweep. */
export function septuagintCapitals(chapters, nt = new Map()) {
  const accented = accentedForms(chapters, nt);
  const told = [];
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      for (const word of verse.g) {
        const token = word.t.replace(SWETE_MARKS, '');
        if (!word.l || !inCapitals(token)) continue;
        told.push({ token, lemma: word.l, code: word.p, form: septuagintFormOf(token, word.l, accented.get(accentKey(word.l, word.p))), place: `${chapter.code} ${chapter.chapter}:${verse.n}` });
      }
    }
  }
  return told;
}

/** The file's text for one lemma: its New Testament (or Hebrew) forms under "f", and under "lxx" its Septuagint forms when it has any. */
export const fileText = (lemma, entries, septuagint = []) => `${JSON.stringify(septuagint.length > 0 ? { l: lemma, f: entries, lxx: septuagint } : { l: lemma, f: entries })}\n`;

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

/**
 * The shipped Septuagint chapters of public/data-lxx in the index's order (Swete's books as the index lists them, the Greek chapters in order; a chapter with no file is not shipped and is left out).
 * A chapter's `code` is Lampas's own for the book (`sng` for Swete's `sol`; Swete's own for a book Lampas has none of), as the app's loadSeptuagintChapter makes it.
 */
export function readSeptuagintChapters(lxxDir) {
  const path = join(lxxDir, 'index.json');
  if (!existsSync(path)) return [];
  const chapters = [];
  for (const book of JSON.parse(readFileSync(path, 'utf8')).books) {
    for (let n = 1; n <= book.chapters; n++) {
      const file = join(lxxDir, book.code, `${n}.json`);
      if (existsSync(file)) chapters.push({ ...JSON.parse(readFileSync(file, 'utf8')), code: book.lampas ?? book.code });
    }
  }
  return chapters;
}

/** Writes a file for each lemma under `outDir` (emptied first, so a lemma the text no longer has leaves no file); returns the counts and the sizes. `lxxDir` is the Septuagint's folder, whose forms ride in the lemma's file. */
export function writeLemmaForms(dataDir, outDir, lxxDir) {
  const nt = lemmaForms(readChapters(dataDir));
  const lxxChapters = lxxDir ? readSeptuagintChapters(lxxDir) : [];
  const lxx = septuagintForms(lxxChapters, nt);
  const lemmas = new Map([...nt, ...[...lxx].filter(([lemma]) => !nt.has(lemma)).map(([lemma]) => [lemma, []])]);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  let bytes = 0;
  let largest = { lemma: '', bytes: 0 };
  for (const [lemma, entries] of lemmas) {
    const text = fileText(lemma, entries, lxx.get(lemma));
    const size = Buffer.byteLength(text);
    writeFileSync(join(outDir, lemmaFileName(lemma)), text);
    bytes += size;
    if (size > largest.bytes) largest = { lemma, bytes: size };
  }
  const capitals = septuagintCapitals(lxxChapters, nt);
  return { lemmas: lemmas.size, bytes, largest, capitals: capitals.length, unmatched: capitals.filter((c) => c.form === undefined) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const done = writeLemmaForms('public/data', 'public/lemma-forms', 'public/data-lxx');
  console.log(`${done.lemmas} lemma files, ${(done.bytes / 1024).toFixed(0)} KB in all, the largest ${done.largest.lemma} at ${done.largest.bytes} bytes`);
  // the Septuagint's words printed in capitals take their accent from a form of the lemma the text has; those with none are left out of the files
  console.log(`${done.capitals} Septuagint words in capitals, ${done.unmatched.length} with no accented form to match${done.unmatched.length > 0 ? `: ${[...new Set(done.unmatched.map((c) => c.token))].slice(0, 20).join(' ')}` : ''}`);
  // a build that leaves a stray file behind would be told at once
  if (readdirSync('public/lemma-forms').length !== done.lemmas) process.exit(1);
}
