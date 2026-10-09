// scripts/data-build.ts — npm run data:build
// Turns the Majority Standard Bible NT tables (public domain; Byzantine Greek word-aligned to the MSB English,
// with Strong's and RP parsing codes) and STEPBible's TBESG lexicon (CC BY 4.0) into public/data/index.json
// and one public/data/<book>/<chapter>.json per chapter, public/data/lexicon.json (every lemma of the text with its gloss) and public/data/frequency.json (every Strong's number with its count). The raw downloads go to data/raw (git-ignored,
// skipped when present); the JSON is committed. The shape is in docs/data.md and src/data/chapter.ts.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodeParse, splitParse } from '../src/data/parseCode';
import type { BookIndex, Chapter, EnglishChunk, GreekWord, LexEntry, Verse } from '../src/data/chapter';
import type { LemmaLexicon } from '../src/data/lexicon';
import type { FrequencyEntry } from '../src/data/frequency';

export const MSB_URL = 'https://majoritybible.com/msb_nt_tables.tsv';
export const TBESG_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt';
const MSB_FILE = 'msb_nt_tables.tsv';
const TBESG_FILE = 'tbesg.txt';
const DEFINITION_MAX = 300;

// The 27 books in canonical order, with the names the MSB verse references use.
export const BOOKS: ReadonlyArray<readonly [code: string, name: string]> = [
  ['mat', 'Matthew'], ['mrk', 'Mark'], ['luk', 'Luke'], ['jhn', 'John'], ['act', 'Acts'], ['rom', 'Romans'],
  ['1co', '1 Corinthians'], ['2co', '2 Corinthians'], ['gal', 'Galatians'], ['eph', 'Ephesians'],
  ['php', 'Philippians'], ['col', 'Colossians'], ['1th', '1 Thessalonians'], ['2th', '2 Thessalonians'],
  ['1ti', '1 Timothy'], ['2ti', '2 Timothy'], ['tit', 'Titus'], ['phm', 'Philemon'], ['heb', 'Hebrews'],
  ['jas', 'James'], ['1pe', '1 Peter'], ['2pe', '2 Peter'], ['1jn', '1 John'], ['2jn', '2 John'],
  ['3jn', '3 John'], ['jud', 'Jude'], ['rev', 'Revelation'],
];

// ---------------------------------------------------------------- the lexicon (TBESG)

export interface Lexicon {
  get(strongs: string): { lemma: string; gloss: string; definition: string } | undefined;
}

/** Removes markup, scripture references, daggers and source tags; cuts at a word boundary near 300 characters. */
export function cleanDefinition(raw: string): string {
  const text = raw
    .replace(/<ref[^>]*>.*?<\/ref>/gis, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/†/g, '')
    .replace(/\((?:AS|ML)\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([,;])(?:\s*[,;])+/g, '$1') // what a removed reference leaves behind
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
  if (text.length <= DEFINITION_MAX) return text;
  const cut = text.slice(0, DEFINITION_MAX);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, '')}…`;
}

/** 'G0686' -> 'G686' */
const unpad = (key: string): string => `G${Number(key.slice(1))}`;

/** A Strong's number with several TBESG entries resolves to its first. */
export function parseLexicon(text: string): Lexicon {
  const entries = new Map<string, { lemma: string; gloss: string; definition: string }>();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const f = line.split('\t');
    if (f.length < 8 || !/^G\d{4}$/.test(f[0])) continue;
    const key = unpad(f[0]);
    if (entries.has(key)) continue;
    entries.set(key, {
      lemma: f[3].trim().normalize('NFC'),
      gloss: f[6].trim().normalize('NFC'),
      definition: cleanDefinition(f[7]).normalize('NFC'),
    });
  }
  return { get: (strongs) => entries.get(strongs) };
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

const COLUMNS = {
  greekSort: 1,
  msbSort: 2,
  group: 3,
  language: 4,
  greek: 6,
  translit: 7,
  parse: 8,
  strongs: 11,
  verseId: 12,
  heading: 13,
  paragraph: 15,
  begQ: 17,
  english: 18,
  pnc: 19,
  endQ: 20,
  endText: 22,
} as const;
const EXPECTED_HEADER: Record<number, string> = {
  1: 'Greek Sort', 2: 'MSB Sort', 3: 'Verse', 4: 'Language', 6: 'MT Greek', 7: 'Translit', 8: 'Parsing',
  11: 'Str Grk', 12: 'VerseId', 13: 'Hdg', 15: 'Par', 18: ' MSB version ', 19: 'pnc', 20: 'endQ', 22: 'End text',
};

interface MsbWord {
  greekSort: number;
  msbSort: number;
  greek: string;
  translit: string;
  parse: string;
  strongs: string; // 'G686', or '' when the table lost it
  english: string;
  begQ: string;
  tail: string; // pnc + endQ + endText
  par: string; // the MSB's paragraph markup on this word, '' when none
}
interface MsbVerse {
  book: string;
  chapter: number;
  n: number;
  words: MsbWord[];
  heading: string; // the section heading that comes before this verse, '' when none
}

// In the MSB's English [square brackets] mark words supplied for the English, and {curly braces} words moved
// here from another place; the marks come off, and only the first is kept (as the chunk's `s` flag).
const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '');
const spaced = (s: string): string => stripTags(s).replace(/[[\]{}]/g, '');
// A verse starts a paragraph when the MSB puts a paragraph tag that opens one (prose, or the first line of an
// indented block) on its first word. The indented lines inside a poetry block (indent1, indent2) do not.
const PARAGRAPH_OPENER = /^<p class=\|(?:reg|red|(?:indent|tab|list)1stline(?:red)?)\|>/;
const headingOf = (cell: string): string => stripTags(cell).replace(/\s+/g, ' ').trim().normalize('NFC');
const tidy = (s: string): string => spaced(s).replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

export function parseMsb(tsv: string): MsbVerse[] {
  const lines = tsv.replace(/^\uFEFF/, '').split(/\r?\n/);
  const header = lines[0].split('\t');
  for (const [col, name] of Object.entries(EXPECTED_HEADER)) {
    if (header[Number(col)] !== name) throw new Error(`MSB table: column ${col} should be ${JSON.stringify(name)}, is ${JSON.stringify(header[Number(col)])}`);
  }
  const groups = new Map<string, { ref: string; heading: string; rows: string[][] }>();
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const f = line.split('\t');
    if (f[COLUMNS.language] !== 'Greek') continue; // the table ends with a sentinel row
    let group = groups.get(f[COLUMNS.group]);
    if (!group) groups.set(f[COLUMNS.group], (group = { ref: '', heading: '', rows: [] }));
    if (f[COLUMNS.verseId]) {
      if (group.ref) throw new Error(`MSB table: verse group ${f[COLUMNS.group]} has two references`);
      group.ref = f[COLUMNS.verseId];
    }
    if (f[COLUMNS.heading] && !group.heading) group.heading = headingOf(f[COLUMNS.heading]);
    if (f[COLUMNS.greek]) group.rows.push(f);
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
      if (/^[1-9]\d*$/.test(f[COLUMNS.strongs])) {
        note(formKey(f[COLUMNS.greek], f[COLUMNS.parse]), `G${Number(f[COLUMNS.strongs])}`);
        note(formKey(f[COLUMNS.greek], ''), `G${Number(f[COLUMNS.strongs])}`);
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

  const verses: MsbVerse[] = [];
  for (const [id, { ref, heading, rows }] of groups) {
    const m = /^(.+) (\d+):(\d+)$/.exec(ref);
    if (!m) throw new Error(`MSB table: verse group ${id} has no usable reference (${JSON.stringify(ref)})`);
    const words = rows.map((f): MsbWord => {
      const shifted = /^\(\d+:\d+\)$/.test(f[COLUMNS.translit]);
      const greek = f[COLUMNS.greek].normalize('NFC');
      const parse = f[COLUMNS.parse];
      return {
        greekSort: Number(f[COLUMNS.greekSort]),
        msbSort: Number(f[COLUMNS.msbSort]),
        greek,
        translit: shifted ? f[COLUMNS.strongs] : f[COLUMNS.translit],
        parse,
        strongs: strongsOf(f[COLUMNS.strongs], greek, parse),
        english: f[COLUMNS.english],
        begQ: f[COLUMNS.begQ],
        tail: f[COLUMNS.pnc] + f[COLUMNS.endQ] + f[COLUMNS.endText],
        par: f[COLUMNS.paragraph],
      };
    });
    verses.push({ book: m[1], chapter: Number(m[2]), n: Number(m[3]), words, heading });
  }
  return verses;
}

// ---------------------------------------------------------------- one verse

function buildVerse(v: MsbVerse, lex: Lexicon): Verse {
  const inGreekOrder = [...v.words].sort((a, b) => a.greekSort - b.greekSort);
  const g: GreekWord[] = inGreekOrder.map((w) => {
    const entry = lex.get(w.strongs);
    if (!entry) throw new Error(`${v.book} ${v.chapter}:${v.n}: ${w.greek} has Strong number ${w.strongs}, which the lexicon lacks`);
    return { t: w.greek, tr: w.translit, s: w.strongs, l: entry.lemma, p: w.parse };
  });
  const greekIndex = new Map(inGreekOrder.map((w, i) => [w, i]));

  // English order: a word with '-' or 'vvv' has no English of its own; one with '. . .' is rendered by the
  // chunk that completes it, which comes later in English order. Quotes and punctuation they carry move to
  // the chunk before (punctuation) or after (opening quotes).
  const e: Array<{ t: string; g: number[]; s: boolean }> = [];
  let ellipsis: number[] = [];
  let opening = '';
  for (const w of [...v.words].sort((a, b) => a.msbSort - b.msbSort)) {
    const raw = w.english.trim();
    const gi = greekIndex.get(w)!;
    const tail = spaced(w.tail);
    if (raw === '' || raw === '-' || raw === 'vvv' || raw === '. . .') {
      if (raw === '. . .') ellipsis.push(gi);
      opening += tidy(w.begQ);
      if (tail) {
        if (e.length) e[e.length - 1].t += tail;
        else opening += tail;
      }
      continue;
    }
    e.push({ t: opening + tidy(w.begQ) + spaced(raw) + tail, g: [...ellipsis, gi], s: raw.includes('[') });
    ellipsis = [];
    opening = '';
  }
  if (ellipsis.length && e.length) e[e.length - 1].g.push(...ellipsis);

  const english: EnglishChunk[] = e.map((c, j) => {
    c.g.sort((a, b) => a - b);
    c.g.forEach((i) => (g[i].e = j));
    const chunk: EnglishChunk = { t: tidy(c.t), g: c.g };
    if (c.s) chunk.s = 1;
    return chunk;
  });
  const first = [...v.words].sort((a, b) => a.msbSort - b.msbSort)[0];
  // A fixed key order: n, h, p, g, e.
  return {
    n: v.n,
    ...(v.heading ? { h: v.heading } : {}),
    ...(first && PARAGRAPH_OPENER.test(first.par) ? { p: 1 as const } : {}),
    g: g.map(ordered),
    e: english,
  };
}

// A fixed key order, so the output bytes never depend on the order the keys were set in.
const ordered = (w: GreekWord): GreekWord => {
  const out: GreekWord = { t: w.t, tr: w.tr, s: w.s, l: w.l, p: w.p };
  if (w.e !== undefined) out.e = w.e;
  return out;
};

// ---------------------------------------------------------------- the whole build

export interface BuiltChapter {
  path: string;
  chapter: Chapter;
}
export interface BuiltData {
  index: BookIndex;
  chapters: BuiltChapter[];
  /** every lemma of the text -> gloss, Strong's number and part of speech: public/data/lexicon.json */
  lexicon: LemmaLexicon;
  /** every Strong's number of the text with its count: public/data/frequency.json */
  frequency: FrequencyEntry[];
}

const sortedKeys = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const numeric = (a: string, b: string) => Number(a.slice(1)) - Number(b.slice(1));

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

export function buildData(msbTsv: string, lex: Lexicon): BuiltData {
  const byBook = new Map<string, Map<number, MsbVerse[]>>();
  for (const v of parseMsb(msbTsv)) {
    const chapters = byBook.get(v.book) ?? new Map<number, MsbVerse[]>();
    chapters.set(v.chapter, [...(chapters.get(v.chapter) ?? []), v]);
    byBook.set(v.book, chapters);
  }
  for (const name of byBook.keys()) {
    if (!BOOKS.some(([, n]) => n === name)) throw new Error(`MSB table: unknown book ${JSON.stringify(name)}`);
  }

  const index: BookIndex = { books: [] };
  const chapters: BuiltChapter[] = [];
  const lexicon: LemmaLexicon = {};
  for (const [code, name] of BOOKS) {
    const book = byBook.get(name);
    if (!book) continue;
    const count = Math.max(...book.keys());
    const counts: number[] = [];
    for (let n = 1; n <= count; n++) {
      const verses = book.get(n);
      if (!verses) {
        counts.push(0); // only a partial table (a test slice) skips a chapter
        continue;
      }
      const seen = new Set<number>();
      for (const v of verses) {
        if (seen.has(v.n)) throw new Error(`${name} ${n}:${v.n} appears twice`);
        seen.add(v.n);
      }
      // A verse the Byzantine text lacks (Luke 17:36, Acts 8:37, 15:34, 24:7) has a row in the table and no words.
      const built = verses.filter((v) => v.words.length > 0).map((v) => buildVerse(v, lex));
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
      // The first use of a lemma, in canonical order, names its Strong's number and part of speech.
      for (const w of built.flatMap((v) => v.g)) {
        if (!(w.l in lexicon)) lexicon[w.l] = { g: chapter.lex[w.s].g, s: w.s, c: splitParse(w.p).pos };
      }
      counts.push(built.length);
      chapters.push({ path: `${code}/${n}.json`, chapter });
    }
    index.books.push({ code, name, chapters: count, verses: counts });
  }
  return { index, chapters, lexicon: sortedKeys(lexicon), frequency: countWords(chapters, lex) };
}

// ---------------------------------------------------------------- files

export interface BuildOptions {
  rawDir: string;
  outDir: string;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  log?: (line: string) => void;
}

async function fetchTo(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  writeFileSync(part, Buffer.from(await response.arrayBuffer()));
  renameSync(part, dest);
}

function writeIfChanged(path: string, text: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return true;
}

export async function runBuild(options: BuildOptions): Promise<{ chapters: number; written: number; bytes: number }> {
  const { rawDir, outDir, download = fetchTo, log = () => undefined } = options;
  const msbPath = join(rawDir, MSB_FILE);
  const tbesgPath = join(rawDir, TBESG_FILE);
  for (const [url, path] of [[MSB_URL, msbPath], [TBESG_URL, tbesgPath]] as const) {
    if (existsSync(path)) continue;
    log(`downloading ${url}`);
    await download(url, path);
  }
  const built = buildData(readFileSync(msbPath, 'utf8'), parseLexicon(readFileSync(tbesgPath, 'utf8')));

  const files = new Map<string, string>([['index.json', JSON.stringify(built.index)], ['lexicon.json', JSON.stringify(built.lexicon)], ['frequency.json', JSON.stringify(built.frequency)]]);
  for (const { path, chapter } of built.chapters) files.set(path, JSON.stringify(chapter));

  let written = 0;
  let bytes = 0;
  for (const [path, text] of files) {
    if (writeIfChanged(join(outDir, path), text)) written++;
    bytes += Buffer.byteLength(text);
  }
  // Anything else under outDir is left from an earlier build.
  if (existsSync(outDir)) {
    for (const p of readdirSync(outDir, { recursive: true }).map(String)) {
      if (p.endsWith('.json') && !files.has(p.split('\\').join('/'))) rmSync(join(outDir, p));
    }
  }
  log(`${built.chapters.length} chapters, ${written} files written, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  return { chapters: built.chapters.length, written, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBuild({ rawDir: 'data/raw', outDir: 'public/data', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
