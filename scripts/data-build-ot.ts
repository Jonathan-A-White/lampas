// scripts/data-build-ot.ts — npm run data:build:ot
// Turns the Berean Standard Bible tables (public domain; the Hebrew and Aramaic Old Testament word-aligned to the English of the Majority Standard Bible's Old
// Testament, which is the Berean Standard Bible's, with Strong's numbers and parsing) and STEPBible's TBESH lexicon (CC BY 4.0) into one
// public/data/<book>/<chapter>.json per chapter of the 39 books, the Old Testament entries of public/data/index.json, public/data/lexicon-hbo.json (every Hebrew lemma of
// the text with its gloss) and public/data/frequency-hbo.json (every Strong's number with its count). The shape is the New Testament's (scripts/data-build.ts, docs/data.md);
// a chapter says `lang: 'hbo'` and `translation: 'msb'`. The raw downloads go to data/raw (git-ignored, skipped when present); the JSON is committed.
// The table is 85 MB: it is read a line at a time and a chapter is written the moment it is whole.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OT_BOOKS } from '../src/data/books';
import type { BookInfo, Chapter, LexEntry } from '../src/data/chapter';
import type { FrequencyEntry } from '../src/data/frequency';
import type { LemmaLexicon } from '../src/data/lexicon';
import { COLUMNS, addRow, checkHeader, readLines, splitReference, wordOf, type TableGroup, type TableVerse, type TableWord } from './data/bereanTable';
import { buildVerse, chapterFingerprint, fetchTo, mergeIndex, numeric, readIndex, removeStale, sortedKeys, writeIfChanged } from './data/chapterWriter';
import { cleanHebrewGloss, hebrewStem, parseTbes, type Lexicon } from './data/tbes';

export const BSB_URL = 'https://bereanbible.com/bsb_tables.tsv';
export const TBESH_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt';
export const BSB_FILE = 'bsb_tables.tsv';
export const TBESH_FILE = 'tbesh.txt';

/** The columns the build reads, by the names the table had on 2026-10-25; a table that renames one stops the build, naming the column. */
export const OT_EXPECTED_HEADER: Readonly<Record<number, string>> = {
  0: 'Heb Sort',
  2: 'BSB Sort',
  3: 'Verse',
  4: 'Language',
  5: 'WLC / Nestle Base TR RP WH NE NA SBL',
  // the brackets round the sigla are U+29FC/29FD, U+2329/232A and U+2039/203A
  6: 'WLC / Nestle Base {TR} \u29fcRP\u29fd (WH) \u2329NE\u232a [NA] \u2039SBL\u203a [[ECM]]',
  7: 'Translit',
  8: 'Parsing',
  9: 'Parsing',
  10: 'Str Heb',
  12: 'VerseId',
  13: 'Hdg',
  15: 'Par',
  17: 'begQ',
  18: ' BSB version ',
  19: 'pnc',
  20: 'endQ',
  22: 'End text',
};

// The book names the table's references use; the table calls the Psalms 'Psalm'.
const TABLE_NAMES: ReadonlyMap<string, { code: string; name: string }> = new Map([
  ...OT_BOOKS.map((b) => [b.name, { code: b.code, name: b.name }] as const),
  ['Psalm', { code: 'psa', name: 'Psalms' }] as const,
]);

// The table gives two readings of one short parsing code: 'N-msc | 1cs' is a noun with a suffix 1457 times and, once, a 'Preposition' (a slip). A code the build
// does not know to be settled, read two ways, stops it; these are settled.
const PARSE_FIXES: Readonly<Record<string, string>> = {
  'N-msc | 1cs': 'Noun - masculine singular construct | first person common singular',
};

export function otLexicon(text: string): Lexicon {
  return parseTbes(text, { letter: 'H', gloss: (_lemma, gloss) => cleanHebrewGloss(gloss) });
}

export interface BuiltChapter {
  path: string;
  chapter: Chapter;
}

export interface BuiltOt {
  /** the 39 books in canon order, as index.json lists them (no `lang`: mergeIndex adds it) */
  books: BookInfo[];
  lexicon: LemmaLexicon;
  frequency: FrequencyEntry[];
}

type Lines = AsyncIterable<string> | Iterable<string>;

/**
 * Reads the table's lines and hands each chapter to `onChapter` as soon as the next one begins. Hebrew and Aramaic rows are the Old Testament; the table's Greek rows (the New
 * Testament follows it) and its closing sentinel row are left. An Aramaic word is a word of its chapter, like the Hebrew ones.
 */
export async function buildOt(lines: Lines, lex: Lexicon, onChapter: (chapter: BuiltChapter) => void | Promise<void>): Promise<BuiltOt> {
  const longs = new Map<string, string>(Object.entries(PARSE_FIXES));
  const lexicon: LemmaLexicon = {};
  const seen = new Map<string, { count: number; chapters: number }>();
  const infos = new Map<string, { name: string; counts: number[]; fingerprints: string[] }>();
  const done = new Set<string>();

  let group: TableGroup | undefined;
  let open: { code: string; name: string; chapter: number; verses: TableVerse[] } | undefined;

  const closeChapter = async (): Promise<void> => {
    if (!open) return;
    const { code, name, chapter: n, verses } = open;
    open = undefined;
    const seenVerses = new Set<number>();
    for (const v of verses) {
      if (seenVerses.has(v.n)) throw new Error(`${name} ${n}:${v.n} appears twice`);
      seenVerses.add(v.n);
    }
    // A verse the Hebrew text lacks (Nehemiah 7:68) has a row in the table and no words.
    const built = verses.filter((v) => v.words.length > 0).map((v) => hebrewVerse(v, lex));
    const words = built.flatMap((v) => v.g);
    const strongs = [...new Set(words.map((w) => w.s).filter(Boolean))].sort(numeric);
    const codes = [...new Set(words.map((w) => w.p).filter(Boolean))].sort();
    const chapter: Chapter = {
      book: name,
      code,
      chapter: n,
      lang: 'hbo',
      translation: 'msb',
      lex: Object.fromEntries(strongs.map((s): [string, LexEntry] => [s, { g: lex.get(s)!.gloss, d: lex.get(s)!.definition }])),
      parse: Object.fromEntries(codes.map((c) => [c, longs.get(c)!])),
      verses: built,
    };
    // The first use of a lemma, in canon order, names its Strong's number and part of speech.
    for (const w of words) {
      if (w.l && !(w.l in lexicon)) lexicon[w.l] = { g: chapter.lex[w.s].g, s: w.s, c: lex.get(w.s)?.pos ?? '' };
    }
    const here = new Set<string>();
    for (const w of words) {
      if (!w.s) continue;
      const e = seen.get(w.s) ?? { count: 0, chapters: 0 };
      e.count++;
      if (!here.has(w.s)) e.chapters++;
      here.add(w.s);
      seen.set(w.s, e);
    }
    const info = infos.get(code) ?? { name, counts: [], fingerprints: [] };
    info.counts[n - 1] = built.length;
    info.fingerprints[n - 1] = chapterFingerprint(chapter);
    infos.set(code, info);
    done.add(`${code}/${n}`);
    await onChapter({ path: `${code}/${n}.json`, chapter });
  };

  const hebrewVerse = (v: TableVerse, lexicon: Lexicon) =>
    buildVerse(v, (w) => {
      if (w.strongs === '') return { t: w.text, tr: w.translit, s: '', l: '', p: w.parse };
      const entry = lexicon.get(w.strongs);
      if (!entry) throw new Error(`${v.book} ${v.chapter}:${v.n}: ${w.text} has Strong number ${w.strongs}, which the lexicon lacks`);
      // A verb in a stem its definition gives a sense of its own ('(Piel) to appoint' for מָנָה, whose lemma gloss is 'to count') carries that sense as `gl`.
      const stem = hebrewStem(w.parse);
      const gl = stem ? entry.stems?.[stem] : undefined;
      return { t: w.text, tr: w.translit, s: w.strongs, l: entry.lemma, p: w.parse, ...(gl && gl !== entry.gloss ? { gl } : {}) };
    });

  const closeGroup = async (): Promise<void> => {
    if (!group) return;
    const finished = group;
    group = undefined;
    const { book, chapter, n } = splitReference(finished);
    const target = TABLE_NAMES.get(book);
    if (!target) throw new Error(`BSB table: unknown book ${JSON.stringify(book)}`);
    if (!open || open.code !== target.code || open.chapter !== chapter) {
      await closeChapter();
      if (done.has(`${target.code}/${chapter}`)) throw new Error(`BSB table: ${book} ${chapter} comes twice`);
      open = { code: target.code, name: target.name, chapter, verses: [] };
    }
    const words = finished.rows.map((f): TableWord => {
      const parse = f[COLUMNS.parse];
      const long = f[COLUMNS.parseLong];
      if (parse) {
        const known = longs.get(parse);
        if (known === undefined) longs.set(parse, long);
        else if (known !== long && !(parse in PARSE_FIXES)) throw new Error(`BSB table: the parsing code ${JSON.stringify(parse)} reads ${JSON.stringify(known)} and ${JSON.stringify(long)}`);
      }
      const strongs = f[COLUMNS.strongsHeb];
      if (strongs !== '' && !/^[1-9]\d*$/.test(strongs)) throw new Error(`BSB table: ${book} ${chapter}:${n} has the Strong number ${JSON.stringify(strongs)}`);
      return wordOf(f, Number(f[COLUMNS.hebSort]), {
        text: f[COLUMNS.text].normalize('NFC'),
        translit: f[COLUMNS.translit],
        strongs: strongs === '' ? '' : `H${Number(strongs)}`,
      });
    });
    open.verses.push({ book: target.name, chapter, n, words, heading: finished.heading });
  };

  let header = true;
  for await (const raw of lines) {
    const line = raw.replace(/\r$/, '').replace(/^\uFEFF/, '');
    if (header) {
      checkHeader(line.split('\t'), OT_EXPECTED_HEADER, 'BSB table');
      header = false;
      continue;
    }
    if (!line) continue;
    const f = line.split('\t');
    if (f[COLUMNS.language] !== 'Hebrew' && f[COLUMNS.language] !== 'Aramaic') continue;
    if (group && group.id !== f[COLUMNS.group]) await closeGroup();
    group ??= { id: f[COLUMNS.group], ref: '', heading: '', rows: [] };
    addRow(group, f);
  }
  await closeGroup();
  await closeChapter();

  // The books in canon order, the 39 of otBooks.ts; a chapter a test slice lacks is 0 verses with no fingerprint.
  const books: BookInfo[] = [];
  for (const b of OT_BOOKS) {
    const info = infos.get(b.code);
    if (!info) continue;
    const count = info.counts.length;
    const counts = Array.from({ length: count }, (_, i) => info.counts[i] ?? 0);
    const fingerprints = Array.from({ length: count }, (_, i) => info.fingerprints[i] ?? '');
    books.push({ code: b.code, name: b.name, chapters: count, verses: counts, fingerprints });
  }
  const frequency = [...seen]
    .map(([strongs, e]): FrequencyEntry => ({ strongs, lemma: lex.get(strongs)!.lemma, count: e.count, chapters: e.chapters, proper: lex.get(strongs)!.name === true }))
    .sort((a, b) => b.count - a.count || numeric(a.strongs, b.strongs));
  return { books, lexicon: sortedKeys(lexicon), frequency };
}

// ---------------------------------------------------------------- files

export interface BuildOtOptions {
  rawDir: string;
  outDir: string;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  log?: (line: string) => void;
}

export async function runBuildOt(options: BuildOtOptions): Promise<{ chapters: number; written: number; bytes: number }> {
  const { rawDir, outDir, download = fetchTo, log = () => undefined } = options;
  const bsbPath = join(rawDir, BSB_FILE);
  const tbeshPath = join(rawDir, TBESH_FILE);
  for (const [url, path] of [[BSB_URL, bsbPath], [TBESH_URL, tbeshPath]] as const) {
    if (existsSync(path)) continue;
    log(`downloading ${url}`);
    await download(url, path);
  }
  const lex = otLexicon(readFileSync(tbeshPath, 'utf8'));

  const made = new Set<string>();
  let written = 0;
  let bytes = 0;
  const put = (path: string, text: string): void => {
    made.add(path);
    if (writeIfChanged(join(outDir, path), text)) written++;
    bytes += Buffer.byteLength(text);
  };
  let chapters = 0;
  const built = await buildOt(readLines(bsbPath), lex, ({ path, chapter }) => {
    chapters++;
    put(path, JSON.stringify(chapter));
  });
  // index.json lists the 66 books: this build writes the 39 of the Old Testament and keeps the New Testament's from the index on disk (scripts/data-build.ts writes those)
  put('index.json', JSON.stringify(mergeIndex(readIndex(outDir), built.books, 'hbo')));
  put('lexicon-hbo.json', JSON.stringify(built.lexicon));
  put('frequency-hbo.json', JSON.stringify(built.frequency));

  // Anything else of the Old Testament's under outDir is left from an earlier build; the New Testament's files (and ladder/) are not this build's.
  const hebrew = new Set(OT_BOOKS.map((b) => b.code));
  removeStale(outDir, made, (path) => (path.includes('/') ? hebrew.has(path.split('/')[0]) : path === 'lexicon-hbo.json' || path === 'frequency-hbo.json'));
  log(`${chapters} chapters, ${written} files written, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  return { chapters, written, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBuildOt({ rawDir: 'data/raw', outDir: 'public/data', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
