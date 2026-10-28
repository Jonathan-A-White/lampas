// scripts/data-build.ts — npm run data:build
// Turns the Majority Standard Bible NT tables (public domain; Byzantine Greek word-aligned to the MSB English,
// with Strong's and RP parsing codes) and STEPBible's TBESG lexicon (CC BY 4.0) into public/data/index.json
// and one public/data/<book>/<chapter>.json per chapter (with the Robinson-Pierpont 2018 apparatus laid on its words, scripts/data/variants.ts), public/data/lexicon.json (every lemma of the text with its gloss) and public/data/frequency.json (every Strong's number with its count). The raw downloads go to data/raw (git-ignored,
// skipped when present); the JSON is committed. The shape is in docs/data.md and src/data/chapter.ts.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { withAoristNote } from '../src/data/irregular-aorists';
import { decodeParse, splitParse } from '../src/data/parseCode';
import { CANON } from '../src/data/canon';
import { OT_BOOKS } from '../src/data/books';
import type { BookIndex, Chapter, LexEntry, VariantUnit } from '../src/data/chapter';
import type { LemmaLexicon } from '../src/data/lexicon';
import type { FrequencyEntry } from '../src/data/frequency';
import { COLUMNS, addRow, checkHeader, splitReference, wordOf, type TableGroup, type TableVerse, type TableWord } from './data/bereanTable';
import { buildVerse, chapterFingerprint, fetchTo, mergeIndex, numeric, readIndex, removeStale, sortedKeys, writeIfChanged } from './data/chapterWriter';
import { parseTbes, type Lexicon } from './data/tbes';
import { OVERLAY_FILE, applyOverlay, diffEdition, loadRp2026, overlayReport, type OverlayEntry, type OverlayResult, type PlacedUnit } from './data/rp2026';
import { VARIANT_ENGLISH_FILE, englishReport, englishStats, finishUnit, layEnglish, readLampasEnglish, type LampasEnglishFile, type MissingEnglish, type WordNote } from './data/variantEnglish';
import { addCounts, alignChapter, loadApparatus, variantsReport, type CodeCounts, type VariantStats } from './data/variants';

export { suppliedWords } from './data/bereanTable';
export { chapterFingerprint } from './data/chapterWriter';
export { cleanDefinition, type Lexicon } from './data/tbes';

export const MSB_URL = 'https://majoritybible.com/msb_nt_tables.tsv';
export const TBESG_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt';
const MSB_FILE = 'msb_nt_tables.tsv';
const TBESG_FILE = 'tbesg.txt';

// The 27 books in canonical order, with the names the MSB verse references use (the canon's 'grc' books, src/data/canon.ts).
export const BOOKS: ReadonlyArray<readonly [code: string, name: string]> = CANON.filter((b) => b.lang === 'grc').map((b) => [b.code, b.name] as const);

// ---------------------------------------------------------------- the lexicon (TBESG)

/** A Strong's number with several TBESG entries resolves to its first. Its gloss is cleaned of the source's 'range: chosen' form (src/data/gloss.ts) and, for a verb whose aorist cannot be guessed, ends with it. */
export function parseLexicon(text: string): Lexicon {
  // 'spirit/breath: spirit' is 'spirit, breath' (src/data/gloss.ts); a verb whose aorist cannot be guessed ends '(aorist ἦλθον)' (src/data/irregular-aorists.ts)
  return parseTbes(text, { letter: 'G', gloss: withAoristNote });
}

/** The lemma of a Strong's number ('G686'), accents kept, NFC. */
export function lemmaFor(lexicon: Lexicon, strongs: string): string | undefined {
  return lexicon.get(strongs)?.lemma;
}

// ---------------------------------------------------------------- the MSB tables

// Seven Greek forms the table gives the Strong number 0; these are their TBESG entries.
const STRONGS_FIXES: Record<string, string> = {
  'ἐνενήκοντα': 'G1768',
  'ἐκπερισσοῦ': 'G6029',
  'κόπρια': 'G2874',
  'ἔνθεν': 'G1782',
  'αὐτοφόρῳ': 'G1888',
  'διαυγής': 'G6897',
  'διαπαρατριβαὶ': 'G6856',
};

// Verses where the table pairs an English word with the wrong Greek word. `swap` names two Greek words of the verse that
// trade their English (its place in the English order, its text and the punctuation after it); `noEnglish` names words
// whose English is taken away, so the chunk that rendered them renders only the word it is for.
// 1 John 2:6 "must walk as Jesus walked": the table gives "walk" to the aorist περιεπάτησεν and "walked." to the present
// infinitive περιπατεῖν, and "walked." also carries the words οὕτως and αὐτὸς (mw-5r3p30.334).
interface AlignmentFix {
  ref: string;
  swap?: [string, string];
  noEnglish?: string[];
}
const ALIGNMENT_FIXES: AlignmentFix[] = [
  { ref: '1 John 2:6', swap: ['περιεπάτησεν', 'περιπατεῖν'], noEnglish: ['οὕτως', 'αὐτὸς'] },
];

function fixAlignment(book: string, chapter: number, n: number, words: TableWord[]): void {
  for (const fix of ALIGNMENT_FIXES) {
    if (fix.ref !== `${book} ${chapter}:${n}`) continue;
    const find = (greek: string): TableWord => {
      const word = words.find((w) => w.text === greek);
      if (!word) throw new Error(`${fix.ref}: the alignment fix names ${greek}, which the table lacks`);
      return word;
    };
    if (fix.swap) {
      const [a, b] = fix.swap.map(find);
      for (const key of ['englishSort', 'english', 'begQ', 'tail'] as const) {
        const keep = a[key];
        (a[key] as string | number) = b[key];
        (b[key] as string | number) = keep;
      }
    }
    for (const greek of fix.noEnglish ?? []) Object.assign(find(greek), { english: '-' });
  }
}

const EXPECTED_HEADER: Record<number, string> = {
  1: 'Greek Sort', 2: 'MSB Sort', 3: 'Verse', 4: 'Language', 6: 'MT Greek', 7: 'Translit', 8: 'Parsing',
  11: 'Str Grk', 12: 'VerseId', 13: 'Hdg', 15: 'Par', 18: ' MSB version ', 19: 'pnc', 20: 'endQ', 22: 'End text',
};

export function parseMsb(tsv: string): TableVerse[] {
  const lines = tsv.replace(/^\uFEFF/, '').split(/\r?\n/);
  checkHeader(lines[0].split('\t'), EXPECTED_HEADER, 'MSB table');
  const groups = new Map<string, TableGroup>();
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const f = line.split('\t');
    if (f[COLUMNS.language] !== 'Greek') continue; // the table ends with a sentinel row
    let group = groups.get(f[COLUMNS.group]);
    if (!group) groups.set(f[COLUMNS.group], (group = { id: f[COLUMNS.group], ref: '', heading: '', rows: [] }));
    addRow(group, f);
  }

  // A few rows are shifted a column (translit is '(23:14)', the Strong number is gone): the Strong number
  // is taken from the most common reading of the same Greek form and parsing elsewhere in the table.
  const seen = new Map<string, Map<string, number>>();
  const note = (key: string, strongs: string) => {
    const counts = seen.get(key) ?? new Map<string, number>();
    counts.set(strongs, (counts.get(strongs) ?? 0) + 1);
    seen.set(key, counts);
  };
  const formKey = (greek: string, parse: string) => `${greek.normalize('NFC').toLowerCase()}|${parse}`;
  for (const { rows } of groups.values()) {
    for (const f of rows) {
      if (/^[1-9]\d*$/.test(f[COLUMNS.strongsGrk])) {
        note(formKey(f[COLUMNS.text], f[COLUMNS.parse]), `G${Number(f[COLUMNS.strongsGrk])}`);
        note(formKey(f[COLUMNS.text], ''), `G${Number(f[COLUMNS.strongsGrk])}`);
      }
    }
  }
  const recover = (greek: string, parse: string): string => {
    for (const key of [formKey(greek, parse), formKey(greek, '')]) {
      const counts = seen.get(key);
      if (counts) return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    }
    throw new Error(`MSB table: no Strong number for ${greek} (${parse})`);
  };

  const strongsOf = (cell: string, greek: string, parse: string): string => {
    if (/^[1-9]\d*$/.test(cell)) return `G${Number(cell)}`;
    return STRONGS_FIXES[greek] ?? recover(greek, parse);
  };

  const verses: TableVerse[] = [];
  for (const group of groups.values()) {
    const { book, chapter, n } = splitReference(group);
    const words = group.rows.map((f): TableWord => {
      const shifted = /^\(\d+:\d+\)$/.test(f[COLUMNS.translit]);
      const greek = f[COLUMNS.text].normalize('NFC');
      return wordOf(f, Number(f[COLUMNS.sourceSort]), {
        text: greek,
        translit: shifted ? f[COLUMNS.strongsGrk] : f[COLUMNS.translit],
        strongs: strongsOf(f[COLUMNS.strongsGrk], greek, f[COLUMNS.parse]),
      });
    });
    fixAlignment(book, chapter, n, words);
    verses.push({ book, chapter, n, words, heading: group.heading });
  }
  return verses;
}

// ---------------------------------------------------------------- one verse

const greekVerse = (v: TableVerse, lex: Lexicon) =>
  buildVerse(v, (w) => {
    const entry = lex.get(w.strongs);
    if (!entry) throw new Error(`${v.book} ${v.chapter}:${v.n}: ${w.text} has Strong number ${w.strongs}, which the lexicon lacks`);
    return { t: w.text, tr: w.translit, s: w.strongs, l: entry.lemma, p: w.parse };
  });

// ---------------------------------------------------------------- the whole build

export interface BuiltChapter {
  path: string;
  chapter: Chapter;
}
/** Where the English of a variant unit comes from besides the MSB's footnotes: data/variant-english.json (scripts/data/variantEnglish.ts). A strict build stops on a unit with no English, naming the verse. */
export interface EnglishOptions {
  lampas: LampasEnglishFile;
  strict: boolean;
}

export interface BuiltData {
  index: BookIndex;
  chapters: BuiltChapter[];
  /** every lemma of the text -> gloss, Strong's number and part of speech: public/data/lexicon.json */
  lexicon: LemmaLexicon;
  /** every Strong's number of the text with its count: public/data/frequency.json */
  frequency: FrequencyEntry[];
  /** the apparatus's units by code, how many were aligned, and those that were not; absent when the build was given no apparatus */
  variants?: VariantStats;
  /** the units with no English (only when the build was not strict: `npm run variants:english` renders them) */
  missingEnglish: MissingEnglish[];
  /** the units that took an entry of data/variant-english.json, with its key: an entry not listed is stale */
  lampasUsed: MissingEnglish[];
  /** what became of the RP 2026 overlay's entries; absent when the build was given no overlay */
  overlay?: OverlayResult;
}

/** A name: any use of the word is coded N-PRI (an indeclinable proper noun, 'Ἀβραάμ'), or a use is coded as a noun (N-...) and the
 *  lexicon's lemma is capitalised ('Ἰησοῦς', 'Παῦλος', 'Ἱεροσόλυμα'). A capitalised TBESG gloss was tried and is not used: it also marks
 *  θεός 'God', ἔθνος 'Gentiles' and σάββατον 'Sabbath'. Docs/data.md. */
export function isProperNounWord(lemma: string, parseCodes: Iterable<string>): boolean {
  const codes = [...parseCodes];
  return codes.includes('N-PRI') || (/^\p{Lu}/u.test(lemma) && codes.some((c) => c.startsWith('N-')));
}

/** The article ὁ (G3588) is used 20,286 times, more than twice as often as καί (9,217), and is not a word the frontier would offer to learn:
 *  the table leaves it out, so that καί comes first. Docs/data.md. */
export const FREQUENCY_LEAVES_OUT = ['G3588'];

/** The count of every Strong's number (but the article's) over all chapters and the chapters it appears in, commonest first (ties by number). */
export function countWords(chapters: BuiltChapter[], lex: Lexicon): FrequencyEntry[] {
  const seen = new Map<string, { count: number; chapters: number; codes: Set<string> }>();
  for (const { chapter } of chapters) {
    const here = new Set<string>();
    for (const v of chapter.verses) {
      for (const w of v.g) {
        if (FREQUENCY_LEAVES_OUT.includes(w.s)) continue;
        const e = seen.get(w.s) ?? { count: 0, chapters: 0, codes: new Set<string>() };
        e.count++;
        if (!here.has(w.s)) e.chapters++;
        here.add(w.s);
        e.codes.add(w.p);
        seen.set(w.s, e);
      }
    }
  }
  return [...seen]
    .map(([strongs, e]): FrequencyEntry => {
      const lemma = lex.get(strongs)!.lemma;
      return { strongs, lemma, count: e.count, chapters: e.chapters, proper: isProperNounWord(lemma, e.codes) };
    })
    .sort((a, b) => b.count - a.count || numeric(a.strongs, b.strongs));
}

/** The MSB table's footnotes of a verse, each with the place of its word among the verse's Greek words (the order of `g`). */
const notesOf = (v: TableVerse): WordNote[] =>
  [...v.words].sort((a, b) => a.sourceSort - b.sourceSort).flatMap((w, i): WordNote[] => (w.note ? [{ w: i, note: w.note }] : []));

/**
 * `apparatus`: the Robinson-Pierpont 2018 apparatus of each book by its code, 'chapter:verse' -> text (loadApparatus); without it no chapter has `variants`.
 * `overlay`: the RP 2026 wording changes (scripts/data/rp2026.ts) laid on the Greek of the chapters they name, after the apparatus is laid on it.
 * `english`: the English made for the units the MSB's footnotes do not speak for; a strict build (the default) fails on a unit with no English.
 */
export function buildData(
  msbTsv: string,
  lex: Lexicon,
  apparatus?: Map<string, Map<string, string>>,
  overlay?: OverlayEntry[],
  english: EnglishOptions = { lampas: {}, strict: true },
): BuiltData {
  const byBook = new Map<string, Map<number, TableVerse[]>>();
  for (const v of parseMsb(msbTsv)) {
    const chapters = byBook.get(v.book) ?? new Map<number, TableVerse[]>();
    chapters.set(v.chapter, [...(chapters.get(v.chapter) ?? []), v]);
    byBook.set(v.book, chapters);
  }
  for (const name of byBook.keys()) {
    if (!BOOKS.some(([, n]) => n === name)) throw new Error(`MSB table: unknown book ${JSON.stringify(name)}`);
  }

  const index: BookIndex = { books: [] };
  const chapters: BuiltChapter[] = [];
  const lexicon: LemmaLexicon = {};
  const variants: VariantStats = { counts: {}, aligned: {}, unaligned: [], books: [] };
  const laid: OverlayResult = { applied: 0, already: 0, dropped: 0 };
  const missingEnglish: MissingEnglish[] = [];
  const lampasUsed: MissingEnglish[] = [];
  for (const [code, name] of BOOKS) {
    const book = byBook.get(name);
    if (!book) continue;
    const bookCounts: CodeCounts = {};
    const count = Math.max(...book.keys());
    const counts: number[] = [];
    const fingerprints: string[] = [];
    for (let n = 1; n <= count; n++) {
      const verses = book.get(n);
      if (!verses) {
        counts.push(0); // only a partial table (a test slice) skips a chapter
        fingerprints.push('');
        continue;
      }
      const seen = new Set<number>();
      for (const v of verses) {
        if (seen.has(v.n)) throw new Error(`${name} ${n}:${v.n} appears twice`);
        seen.add(v.n);
      }
      // A verse the Byzantine text lacks (Luke 17:36, Acts 8:37, 15:34, 24:7) has a row in the table and no words.
      const withWords = verses.filter((v) => v.words.length > 0);
      const built = withWords.map((v) => greekVerse(v, lex));
      let units: PlacedUnit[] = [];
      const rp = apparatus?.get(code);
      if (rp) {
        const found = alignChapter(name, n, built.map((v) => ({ n: v.n, words: v.g.map((w) => w.t) })), rp);
        const laidEnglish = layEnglish(found.units, {
          book: name,
          code,
          chapter: n,
          verses: built,
          notes: new Map(withWords.map((v) => [v.n, notesOf(v)])),
          lampas: english.lampas,
        });
        units = laidEnglish.units;
        missingEnglish.push(...laidEnglish.missing);
        lampasUsed.push(...laidEnglish.used);
        if (english.strict && laidEnglish.missing.length) {
          const first = laidEnglish.missing[0];
          throw new Error(`${first.ref}: the variant unit "${first.unit.base}" has no English (${laidEnglish.missing.length} in ${name} ${n}); run npm run variants:english`);
        }
        addCounts(bookCounts, found.counts);
        addCounts(variants.counts, found.counts);
        addCounts(variants.aligned, found.aligned);
        variants.unaligned.push(...found.unaligned);
      }
      if (overlay) {
        const result = applyOverlay(name, n, built, units, overlay);
        units = result.units;
        laid.applied += result.applied;
        laid.already += result.already;
        laid.dropped += result.dropped;
      }
      const strongs = [...new Set(built.flatMap((v) => v.g.map((w) => w.s)))].sort(numeric);
      const codes = [...new Set(built.flatMap((v) => v.g.map((w) => w.p)))].sort();
      const chapter: Chapter = {
        book: name,
        code,
        chapter: n,
        lex: Object.fromEntries(
          strongs.map((s): [string, LexEntry] => [s, { g: lex.get(s)!.gloss, d: lex.get(s)!.definition }]),
        ),
        parse: Object.fromEntries(codes.map((c) => [c, decodeParse(c)])),
        verses: built,
      };
      if (units.length) chapter.variants = units.flatMap((u): VariantUnit[] => (u.english ? [finishUnit({ ...u, english: u.english })] : []));
      // The first use of a lemma, in canonical order, names its Strong's number and part of speech.
      for (const w of built.flatMap((v) => v.g)) {
        if (!(w.l in lexicon)) lexicon[w.l] = { g: chapter.lex[w.s].g, s: w.s, c: splitParse(w.p).pos };
      }
      counts.push(built.length);
      fingerprints.push(chapterFingerprint(chapter));
      chapters.push({ path: `${code}/${n}.json`, chapter });
    }
    index.books.push({ code, name, chapters: count, verses: counts, fingerprints, lang: 'grc' });
    if (apparatus?.has(code)) variants.books.push({ name, counts: bookCounts });
  }
  return { index, chapters, lexicon: sortedKeys(lexicon), frequency: countWords(chapters, lex), missingEnglish, lampasUsed, ...(apparatus ? { variants } : {}), ...(overlay ? { overlay: laid } : {}) };
}

// ---------------------------------------------------------------- files

export interface BuildOptions {
  rawDir: string;
  outDir: string;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  log?: (line: string) => void;
  /** lay the Robinson-Pierpont 2018 apparatus on the chapters (fetched into rawDir/byztxt-v3.3.2); default true. Tests of the rest of the build pass false. */
  variants?: boolean;
  /** the sha256 the apparatus files must have; default VARIANTS_SHA256 (a test's own files have their own) */
  variantsSha256?: string;
  /** lay the RP 2026 wording changes on the chapters (the release is fetched into rawDir/rp2026 and the overlay written to overlayFile); default: when `variants` is on, since the overlay is laid over the 2018 base */
  rp2026?: boolean;
  /** the sha256 the RP 2026 zip must have; default RP2026_SHA256 (a test's own zip has its own) */
  rp2026Sha256?: string;
  /** where the overlay is written; default data/rp2026-overlay.json */
  overlayFile?: string;
  /** the English made for variant units (data/variant-english.json, written by npm run variants:english); default VARIANT_ENGLISH_FILE */
  englishFile?: string;
}

/** What a build reads: the MSB table and TBESG (fetched into rawDir unless they are there), the apparatus and the RP 2026 overlay (written to overlayFile). Also read by `npm run variants:english`. */
export async function loadInputs(
  options: Pick<BuildOptions, 'rawDir' | 'download' | 'log' | 'variants' | 'variantsSha256' | 'rp2026' | 'rp2026Sha256' | 'overlayFile'>,
): Promise<{ msbTsv: string; lex: Lexicon; apparatus?: Map<string, Map<string, string>>; overlay?: OverlayEntry[] }> {
  const { rawDir, download = fetchTo, log = () => undefined, variants = true, rp2026 = variants, overlayFile = OVERLAY_FILE } = options;
  const msbPath = join(rawDir, MSB_FILE);
  const tbesgPath = join(rawDir, TBESG_FILE);
  for (const [url, path] of [[MSB_URL, msbPath], [TBESG_URL, tbesgPath]] as const) {
    if (existsSync(path)) continue;
    log(`downloading ${url}`);
    await download(url, path);
  }
  const apparatus = variants ? await loadApparatus(rawDir, download, log, options.variantsSha256) : undefined;
  let overlay: OverlayEntry[] | undefined;
  if (rp2026) {
    if (!apparatus) throw new Error('the RP 2026 overlay is laid over the RP 2018 base: it needs the variants (the apparatus holds the 2018 text)');
    overlay = diffEdition(apparatus, await loadRp2026(rawDir, download, log, options.rp2026Sha256));
    writeIfChanged(overlayFile, `${JSON.stringify(overlay, null, 1)}\n`);
  }
  return { msbTsv: readFileSync(msbPath, 'utf8'), lex: parseLexicon(readFileSync(tbesgPath, 'utf8')), apparatus, overlay };
}

export async function runBuild(options: BuildOptions): Promise<{ chapters: number; written: number; bytes: number }> {
  const { outDir, log = () => undefined } = options;
  const { msbTsv, lex, apparatus, overlay } = await loadInputs(options);
  const lampas = readLampasEnglish(options.englishFile ?? VARIANT_ENGLISH_FILE);
  const built = buildData(msbTsv, lex, apparatus, overlay, { lampas, strict: true });
  if (built.variants) for (const line of variantsReport(built.variants)) log(line);
  if (built.variants) for (const line of englishReport(englishStats(built.chapters.flatMap((c) => c.chapter.variants ?? [])))) log(line);
  if (overlay && built.overlay) for (const line of overlayReport(overlay, built.overlay)) log(line);

  // index.json lists the 66 books: this build writes the 27 read in Greek and keeps the Old Testament's from the index on disk (scripts/data-build-ot.ts writes those)
  const index = mergeIndex(readIndex(outDir), built.index.books, 'grc');
  const files = new Map<string, string>([['index.json', JSON.stringify(index)], ['lexicon.json', JSON.stringify(built.lexicon)], ['frequency.json', JSON.stringify(built.frequency)]]);
  for (const { path, chapter } of built.chapters) files.set(path, JSON.stringify(chapter));

  let written = 0;
  let bytes = 0;
  for (const [path, text] of files) {
    if (writeIfChanged(join(outDir, path), text)) written++;
    bytes += Buffer.byteLength(text);
  }
  // Anything else under outDir is left from an earlier build, but the Old Testament's files are scripts/data-build-ot.ts's (and ladder/ is scripts/ladder-el.ts's, removeStale).
  const hebrew = new Set(OT_BOOKS.map((b) => b.code));
  removeStale(outDir, new Set(files.keys()), (path) => !(path.includes('/') ? hebrew.has(path.split('/')[0]) : path === 'lexicon-hbo.json' || path === 'frequency-hbo.json'));
  log(`${built.chapters.length} chapters, ${written} files written, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  return { chapters: built.chapters.length, written, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBuild({ rawDir: 'data/raw', outDir: 'public/data', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
