// scripts/data-build-lxx.ts — npm run data:build:lxx (story mw-u2w5klk.10, the Septuagint epic's R2; docs/data.md 'The Septuagint data').
// Writes the Septuagint into public/data-lxx/ in the shape of the Old Testament's build (scripts/data-build-ot.ts): for each book whose annotation file exists
// (data/lxx/annotations/<book>.tsv, written by `npm run lxx:release` with the rows of the Greek chapters above the chapter bar, mw-u2w5klk.265), one <book>/<n>.json per SHIPPED GREEK chapter (lang 'grc', translation 'lxx2012',
// edition 'swete'; each word Swete's own form with its lemma, parsing, layer and confidence; the English of a verse Brenton's, one chunk), index.json (the shipped books
// with their chapters, verses, the chapter(s) of Lampas's Old Testament each is in (empty for a chapter not shipped) and `shipped`, the Greek chapters shipped), lexicon-grc-lxx.json (every lemma with TBESG's gloss and definition), and
// beside them eliranwong's LICENSE (GPL-3.0) and README for Swete's text, byte for byte (LICENSE-swete.txt, README-swete.md). public/data-lxx/README.md is written by hand.
// Deterministic: a second run writes the same bytes. The raw downloads go to data/raw (git-ignored, skipped when present); the JSON is committed.
// No paid API is called; network only to fetch the pinned sources.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseLexicon } from './data-build';
import { removeStale, sortedKeys, writeIfChanged } from './data/chapterWriter';
import { LXX2012_RELEASE, ensureLxx2012, parseUsfm, usfmFileOf, type UsfmBook } from './data/lxx2012';
import { buildLxxBook, chapterRanges, parseAnnotations, parseTranslit, shippedChaptersLine, sweteBooks, usfmCodeOf, type LampasVerses, type LxxBookInfo } from './data/lxxChapter';
import { TVTMS_COMMIT, buildMaps, ensureTvtms, parseTvtms, type TvtmsMaps } from './data/tvtms';
import { ANNOTATIONS_DIR } from './lxx/release';
import {
  STEP, SWETE, SWETE_LICENCE, SWETE_README, SWETE_TRANSLIT, SWETE_TRANSLIT_FILE, SWETE_VERSIFICATION, SWETE_WORDS, fetchPinned, pinnedPath, readPinned, type Fetcher,
} from './lxx/sources';
import { TBESG_FILE } from './lxx/tbesg';
import type { BookIndex } from '../src/data/chapter';

export const LEXICON_FILE = 'lexicon-grc-lxx.json';
export const LICENCE_FILE = 'LICENSE-swete.txt';
export const README_FILE = 'README-swete.md';

/** What public/data-lxx/index.json holds. */
export interface LxxIndex {
  /** the sources, by name: what each file of the folder is made of */
  sources: Record<string, string>;
  books: LxxBookInfo[];
}

/** One lemma of lexicon-grc-lxx.json. */
export interface LxxLexiconEntry {
  /** TBESG's gloss ('' where TBESG has no entry for the lemma) */
  g: string;
  /** TBESG's definition, plain text, cut at about 300 characters */
  d: string;
  /** TBESG's Strong's number, no padding ('G746'); '' where TBESG has none */
  s: string;
}

/** The sources of a run as text, so a test gives its own and the command reads the pinned files. */
export interface LxxInput {
  /** Swete's 00-Swete_versification.csv and 01-Swete_word_with_punctuations.csv */
  versification: string;
  words: string;
  /** 03-Swete_SBL_transliterations.csv */
  translit: string;
  /** the annotation file's text of each book that has one, by Swete's code in lower case */
  annotations: Readonly<Record<string, string>>;
  /** the LXX2012 USFM of a book by its USFM code (`gen`), when there is one */
  usfm: Readonly<Record<string, string>>;
  tvtms: string;
  tbesg: string;
  /** eliranwong's LICENSE and README for Swete's text */
  licence: Buffer;
  readme: Buffer;
  /** Lampas's verse counts (public/data/index.json): a Greek verse whose Lampas verse does not exist is `none`; when absent the map is trusted */
  lampasVerses?: LampasVerses;
}

export interface BuiltLxx {
  /** path under public/data-lxx -> text: the chapters, index.json and the lexicon */
  files: Map<string, string>;
  /** the books of Swete's file the build wrote, in his order */
  shipped: string[];
  /** the books of Swete's file with no annotation file: left out, named */
  skipped: string[];
  /** lines for the log: a book with no English, verses of Brenton with no Greek verse, lemmas TBESG lacks */
  notes: string[];
}

/** The sources of the Septuagint data by name, as index.json states them. */
export const SOURCES: Readonly<Record<string, string>> = {
  greek: "Swete, The Old Testament in Greek (1909-1912), public domain, as packaged by eliranwong/LXX-Swete-1930 (GPL-3.0; its LICENSE and README are beside these files)",
  transliteration: "the SBL transliteration of eliranwong/LXX-Swete-1930 (GPL-3.0)",
  annotations: "Lampas's own lemma, parsing, layer and confidence (data/lxx/annotations, MIT; docs/lxx-derivation.md)",
  english: `Brenton's translation as eBible's eng-lxx2012 (public domain; ${LXX2012_RELEASE})`,
  versification: `STEPBible's TVTMS at ${TVTMS_COMMIT.slice(0, 7)} (CC BY 4.0, Tyndale House Cambridge)`,
  lexicon: "STEPBible's TBESG (CC BY 4.0, Tyndale House Cambridge), applied to the Septuagint by Lampas's derivation",
};

/** Every lemma of TBESG with its first entry's gloss and definition (a lemma on several rows takes the first, as a Strong's number does). */
function lemmaTable(tbesg: string): Map<string, LxxLexiconEntry> {
  const table = new Map<string, LxxLexiconEntry>();
  for (const [strongs, entry] of parseLexicon(tbesg).entries?.() ?? []) {
    if (!table.has(entry.lemma)) table.set(entry.lemma, { g: entry.gloss, d: entry.definition, s: strongs });
  }
  return table;
}

/** The TBESG entry of a lemma. A lemma the derivation writes as several forms ('ὕδωρ, ὕδατος', 'οὕτω, οὕτως') is looked up whole and then by each form in turn. */
export function lexiconEntry(table: ReadonlyMap<string, LxxLexiconEntry>, lemma: string): LxxLexiconEntry | undefined {
  return table.get(lemma) ?? lemma.split(',').map((part) => table.get(part.trim())).find((entry) => entry !== undefined);
}

/** Builds the Septuagint data of the books that have an annotation file. Throws, naming the reference, where an annotation row and Swete's text do not match. */
export function buildLxx(input: LxxInput): BuiltLxx {
  const maps: TvtmsMaps = buildMaps(parseTvtms(input.tvtms));
  const translit = parseTranslit(input.translit);
  const swete = sweteBooks(input.versification, input.words);
  const lexicon = lemmaTable(input.tbesg);

  const files = new Map<string, string>();
  const shipped: string[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];
  const infos: LxxBookInfo[] = [];
  const lemmas = new Set<string>();
  for (const [code, words] of swete) {
    const annotationText = input.annotations[code];
    if (annotationText === undefined) {
      skipped.push(code);
      continue;
    }
    const usfmText = input.usfm[usfmCodeOf(code)];
    const english: UsfmBook | undefined = usfmText === undefined ? undefined : parseUsfm(usfmText);
    if (!english) notes.push(`${code}: no LXX2012 file, so no English`);
    const book = buildLxxBook({ code, words, translit, annotations: parseAnnotations(annotationText, code), english }, maps, input.lampasVerses);
    // the line lxx:release writes first (`# shipped chapters: 1-6 of 50`) must name the chapters the rows hold: a hand-edited file stops the build
    const line = shippedChaptersLine(annotationText);
    if (line) {
      const present = [...new Set(words.map((w) => Number(/^[^.]+\.(\d+):/.exec(w.verse)![1])))].sort((a, b) => a - b);
      const named = line.chapters === 'all' ? present : line.chapters;
      if (chapterRanges(named) !== chapterRanges(book.info.shipped) || line.of !== book.info.chapters) {
        throw new Error(`${code}: the annotation file's line names chapters ${chapterRanges(named)} of ${line.of}, its rows hold ${chapterRanges(book.info.shipped)} of ${book.info.chapters}`);
      }
    }
    for (const { path, chapter } of book.chapters) files.set(path, JSON.stringify(chapter));
    for (const lemma of book.lemmas) lemmas.add(lemma);
    if (book.unplaced.length) notes.push(`${code}: LXX2012 verses with no Greek verse to stand at: ${book.unplaced.join(', ')}`);
    infos.push(book.info);
    shipped.push(code);
  }
  if (skipped.length) notes.push(`skipped, no annotation file: ${skipped.join(', ')}`);

  const index: LxxIndex = { sources: { ...SOURCES }, books: infos };
  files.set('index.json', JSON.stringify(index));
  const missing: string[] = [];
  const lexiconFile: Record<string, LxxLexiconEntry> = {};
  for (const lemma of lemmas) {
    const entry = lexiconEntry(lexicon, lemma);
    if (!entry) missing.push(lemma);
    lexiconFile[lemma] = entry ?? { g: '', d: '', s: '' };
  }
  if (missing.length) notes.push(`TBESG has no entry for ${missing.length} lemma${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', ...' : ''}`);
  files.set(LEXICON_FILE, JSON.stringify(sortedKeys(lexiconFile)));
  return { files, shipped, skipped, notes };
}

// ---------------------------------------------------------------- files

export interface BuildLxxOptions {
  /** where the downloads are kept; default data/raw */
  rawDir?: string;
  outDir?: string;
  annotationsDir?: string;
  /** public/data/index.json, whose verse counts say which Lampas verses exist; omitted when it is not there */
  lampasIndex?: string;
  download?: Fetcher;
  log?: (line: string) => void;
}

function writeBytesIfChanged(path: string, bytes: Buffer): boolean {
  if (existsSync(path) && readFileSync(path).equals(bytes)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return true;
}

/** Fetches the pinned sources (those not in rawDir yet) and reads them. */
export async function loadLxxInput(options: BuildLxxOptions = {}): Promise<LxxInput> {
  const { rawDir = 'data/raw', annotationsDir = ANNOTATIONS_DIR, lampasIndex = join('public', 'data', 'index.json'), download, log = () => undefined } = options;
  const pinnedDir = join(rawDir, 'lxx');
  for (const src of [SWETE, SWETE_TRANSLIT, { ...STEP, files: [TBESG_FILE] }]) await fetchPinned(pinnedDir, src, download, log);
  const dir = await ensureLxx2012(rawDir);
  const tvtms = readFileSync(await ensureTvtms(rawDir), 'utf8');
  const annotations: Record<string, string> = {};
  if (existsSync(annotationsDir)) {
    for (const file of readdirSync(annotationsDir).sort()) if (file.endsWith('.tsv')) annotations[file.slice(0, -4)] = readFileSync(join(annotationsDir, file), 'utf8');
  }
  const usfm: Record<string, string> = {};
  for (const code of Object.keys(annotations)) {
    const file = usfmFileOf(dir, usfmCodeOf(code));
    if (file) usfm[usfmCodeOf(code)] = readFileSync(file, 'utf8');
  }
  let lampasVerses: LampasVerses | undefined;
  if (existsSync(lampasIndex)) {
    const index = JSON.parse(readFileSync(lampasIndex, 'utf8')) as BookIndex;
    lampasVerses = Object.fromEntries(index.books.filter((b) => b.lang === 'hbo').map((b) => [b.code, b.verses]));
  }
  const input: LxxInput = {
    versification: readPinned(pinnedDir, SWETE, SWETE_VERSIFICATION),
    words: readPinned(pinnedDir, SWETE, SWETE_WORDS),
    translit: readPinned(pinnedDir, SWETE_TRANSLIT, SWETE_TRANSLIT_FILE),
    annotations,
    usfm,
    tvtms,
    tbesg: readPinned(pinnedDir, { ...STEP, files: [TBESG_FILE] }, TBESG_FILE),
    licence: readFileSync(pinnedPath(pinnedDir, SWETE, SWETE_LICENCE)),
    readme: readFileSync(pinnedPath(pinnedDir, SWETE, SWETE_README)),
    lampasVerses,
  };
  return input;
}

export interface Written {
  chapters: number;
  written: number;
  bytes: number;
  shipped: string[];
  skipped: string[];
}

/** Builds the data from the sources given and writes it under outDir: only files whose bytes changed, and a .json an earlier build wrote that this one does not is removed. */
export function writeLxx(input: LxxInput, outDir: string, log: (line: string) => void = () => undefined): Written {
  const built = buildLxx(input);
  for (const note of built.notes) log(note);
  const made = new Set<string>();
  let written = 0;
  let bytes = 0;
  let chapters = 0;
  for (const [path, text] of built.files) {
    made.add(path);
    if (path.includes('/')) chapters++;
    if (writeIfChanged(join(outDir, path), text)) written++;
    bytes += Buffer.byteLength(text);
  }
  // Swete's text goes with eliranwong's GPL-3.0 licence and README, byte for byte
  for (const [file, content] of [[LICENCE_FILE, input.licence], [README_FILE, input.readme]] as const) {
    if (writeBytesIfChanged(join(outDir, file), content)) written++;
  }
  removeStale(outDir, made, () => true);
  log(`${chapters} chapters of ${built.shipped.length} book${built.shipped.length === 1 ? '' : 's'}, ${written} files written, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  return { chapters, written, bytes, shipped: built.shipped, skipped: built.skipped };
}

export async function runBuildLxx(options: BuildLxxOptions = {}): Promise<Written> {
  return writeLxx(await loadLxxInput(options), options.outDir ?? join('public', 'data-lxx'), options.log);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBuildLxx({ log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
