// scripts/data/variants.ts — the Robinson-Pierpont 2018 apparatus (github.com/byztxt/byzantine-majority-text, tag v3.3.2,
// csv-unicode/ccat/with-variants), read by the New Testament build (scripts/data-build.ts): each unit {CODE base > reading = reading }
// is parsed, its base words are found among the MSB Greek words of the same verse by their letters (no accents, breathings or case,
// final sigma as sigma), and each chapter file gets its `variants` (docs/data.md 'Variants'). The files are fetched into data/raw and
// checked against one pinned sha256; nothing of them is committed.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VariantCode, VariantPlace } from '../../src/data/chapter';

export const VARIANTS_TAG = 'v3.3.2';
export const VARIANTS_DIR = 'csv-unicode/ccat/with-variants';
/** where in the raw directory the files are kept */
export const VARIANTS_RAW_DIR = `byztxt-${VARIANTS_TAG}`;
/** The sha256 of the 27 files' bytes, one after another in the order of VARIANTS_FILES. */
export const VARIANTS_SHA256 = 'ef05d3a361c425bd3c2925251b3415efcd700899d360d524aab2da0aa9e99397';

/** The book files, by the canon's code. PA.csv (the Pericope Adulterae's own Byzantine text) and ACT24.csv (Acts 24:6-8 as the minority
 *  has it) are other texts with their own units, not the apparatus of the text the table has, and are not read: JOH.csv holds John 7:53-8:11. */
export const VARIANTS_FILES: Record<string, string> = {
  mat: 'MAT', mrk: 'MAR', luk: 'LUK', jhn: 'JOH', act: 'ACT', rom: 'ROM', '1co': '1CO', '2co': '2CO', gal: 'GAL', eph: 'EPH', php: 'PHP',
  col: 'COL', '1th': '1TH', '2th': '2TH', '1ti': '1TI', '2ti': '2TI', tit: 'TIT', phm: 'PHM', heb: 'HEB', jas: 'JAM', '1pe': '1PE',
  '2pe': '2PE', '1jn': '1JO', '2jn': '2JO', '3jn': '3JO', jud: 'JUD', rev: 'REV',
};

export const variantsUrl = (file: string): string =>
  `https://raw.githubusercontent.com/byztxt/byzantine-majority-text/${VARIANTS_TAG}/${VARIANTS_DIR}/${file}.csv`;

/** The sigla of the CSV files (the converter's expansions of Robinson's CCAT letters) and the letter a chapter file keeps. */
export const CODES: Record<string, VariantCode> = { Byz: 'B', NA: 'N', 'NA27/28': 'C', NA27: 'S', NA28: 'E', ECM: 'M' };
export const CODE_ORDER: readonly VariantCode[] = ['B', 'N', 'C', 'S', 'E', 'M'];

// ---------------------------------------------------------------- reading the files

/** The rows of a chapter,verse,text file, as 'chapter:verse' -> text. */
export function parseVariantsCsv(csv: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of csv.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
    const m = /^(\d+),(\d+),(.*)$/.exec(line);
    if (!m) continue;
    const text = m[3].startsWith('"') && m[3].endsWith('"') ? m[3].slice(1, -1).replace(/""/g, '"') : m[3];
    out.set(`${m[1]}:${m[2]}`, text);
  }
  return out;
}

export interface ApparatusUnit {
  code: VariantCode;
  /** the edition's words the unit is about, as the apparatus writes them; '' for a unit on the whole verse */
  base: string;
  /** the index, among the verse's words, of the word the brace follows (-1 before the first) */
  after: number;
  /** the other readings; '' is a reading that leaves the base out */
  alts: string[];
  /** {NA ~ }: the reading leaves out the whole verse */
  whole: boolean;
}

const MARKS = /[,.;:!?()[\]{}«»"“”‘¶\-··;—–…⸱]/gu;
const APOSTROPHES = /['ʼ᾽’]/g;
/** a word with the marks beside it taken off (the elision apostrophe stays, as one character) */
const bare = (token: string): string => token.normalize('NFC').replace(MARKS, '').replace(APOSTROPHES, '’');
/** what two spellings of one word share: letters only, no accents, breathings or case, final sigma as sigma */
export const letterKey = (word: string): string => bare(word).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');
/** the words of a reading or a base, each with the marks beside it off */
export const wordsOf = (text: string): string[] => text.split(/\s+/).map(bare).filter(Boolean);

/** A verse of the apparatus: the edition's words (the units taken out, the marks beside each word off) and its units in order. */
export function parseApparatus(text: string): { words: string[]; units: ApparatusUnit[] } {
  const words: string[] = [];
  const units: ApparatusUnit[] = [];
  for (const [token] of text.normalize('NFC').matchAll(/\{[^}]*\}|[^\s{]+/g)) {
    if (!token.startsWith('{')) {
      const word = bare(token);
      if (word) words.push(word);
      continue;
    }
    const inner = token.slice(1, -1).trim();
    const space = inner.indexOf(' ');
    const siglum = space < 0 ? inner : inner.slice(0, space);
    const code = CODES[siglum];
    if (!code) throw new Error(`apparatus: unknown code ${JSON.stringify(siglum)} in ${JSON.stringify(token)}`);
    const rest = space < 0 ? '' : inner.slice(space + 1).trim();
    if (rest === '~') {
      units.push({ code, base: '', after: words.length - 1, alts: [''], whole: true });
      continue;
    }
    const split = rest.split(' > ');
    if (split.length !== 2 || !split[0].trim()) throw new Error(`apparatus: no 'base > reading' in ${JSON.stringify(token)}`);
    const alts = split[1].split(' = ').map((a) => a.trim()).map((a) => (a === '-' ? '' : a));
    units.push({ code, base: split[0].trim(), after: words.length - 1, alts, whole: false });
  }
  return { words, units };
}

// ---------------------------------------------------------------- aligning to the table's words

/** Each index of `a` matched, by equal keys, to an index of `b`: the longest common subsequence. */
function matches(a: string[], b: string[]): Map<number, number> {
  const n = a.length;
  const m = b.length;
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const out = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) out.set(i++, j++);
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/** Where the run `needle` stands in `hay` from `from` on, the start nearest `near` (a run that holds `near` is nearest), or -1. */
function nearestRun(hay: string[], needle: string[], near: number, from = 0): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let s = from; s + needle.length <= hay.length; s++) {
    if (!needle.every((k, i) => hay[s + i] === k)) continue;
    const distance = near < s ? s - near : near >= s + needle.length ? near - (s + needle.length - 1) : 0;
    if (distance < bestDistance) [best, bestDistance] = [s, distance];
  }
  return best;
}

/** A base in pieces ('ἐν... ἐν... ἐν'): the first piece nearest `near`, each later one the first run after the piece before; the indexes of all, or null. */
function findPieces(hay: string[], pieces: string[][], near: number): number[] | null {
  const out: number[] = [];
  for (const piece of pieces) {
    const from = out.length ? out[out.length - 1] + 1 : 0;
    const s = out.length ? nearestRun(hay, piece, from, from) : nearestRun(hay, piece, near);
    if (s < 0) return null;
    out.push(...piece.map((_, i) => s + i));
  }
  return out;
}

/** Words that stand together in a piece of the base stand together in the table: a piece whose words came out apart (two words with the same
 *  letters, where the lining up took the other one) is the run of its letters nearest where its last word came out, when there is one. */
function together(keys: string[], pieces: string[][], w: number[]): number[] {
  const out: number[] = [];
  let k = 0;
  for (const piece of pieces) {
    const got = w.slice(k, (k += piece.length));
    const apart = got.some((j, i) => i > 0 && j !== got[i - 1] + 1);
    const s = apart ? nearestRun(keys, piece, got[got.length - 1]) : -1;
    out.push(...(s < 0 ? got : piece.map((_, i) => s + i)));
  }
  return out;
}

export interface Unaligned {
  ref: string;
  code: VariantCode;
  base: string;
  why: string;
}
export type CodeCounts = Partial<Record<VariantCode, number>>;
export interface ChapterVariants {
  units: VariantPlace[];
  unaligned: Unaligned[];
  /** apparatus units (braces) by code */
  counts: CodeCounts;
  /** of them, those whose base was found among the table's words */
  aligned: CodeCounts;
}

const bump = (counts: CodeCounts, code: VariantCode): void => {
  counts[code] = (counts[code] ?? 0) + 1;
};

/** The table's words of one verse, in Greek order (the order of a chapter file's `g`). */
export interface TableWords {
  n: number;
  words: string[];
}

/**
 * The units of a chapter's apparatus, laid on the table's words. A unit's base is found among the edition's words nearest its brace (a base
 * written in pieces, 'ὁ μὲν... ὁ δὲ', piece after piece), and each of those words is carried to the table's word it matches, the two verses
 * lined up by their letters. A base whose words do not all carry over is looked for again with the edition's verse lined up against the
 * table's verse before, the verse itself and the verse after as one run (the table sets a few words across a verse's end, Matthew 15:5-6,
 * Mark 7:21-22): it is laid there when all its words land in one verse, and is otherwise not aligned. Units on the same words are one, with
 * the readings of each in the apparatus's order.
 */
export function alignChapter(book: string, chapter: number, verses: TableWords[], rp: Map<string, string>): ChapterVariants {
  const out: ChapterVariants = { units: [], unaligned: [], counts: {}, aligned: {} };
  const table = new Map(verses.map((v) => [v.n, v.words.map(letterKey)]));
  const words = new Map(verses.map((v) => [v.n, v.words]));
  const keyed = [...rp.entries()]
    .map(([key, text]) => [key.split(':').map(Number), text] as const)
    .filter(([[c]]) => c === chapter)
    .sort(([[, a]], [[, b]]) => a - b);
  for (const [[, n], text] of keyed) {
    const verse = parseApparatus(text);
    if (!verse.units.length) continue;
    const ref = `${book} ${chapter}:${n}`;
    const msbKeys = table.get(n);
    const rpKeys = verse.words.map(letterKey);
    const toMsb = matches(rpKeys, msbKeys ?? []);
    let window: { toWindow: Map<number, number>; at: Array<{ v: number; i: number }> } | undefined;
    const acrossVerses = () => {
      if (window) return window;
      const at = [n - 1, n, n + 1].flatMap((v) => (table.get(v) ?? []).map((_, i) => ({ v, i })));
      return (window = { toWindow: matches(rpKeys, at.map(({ v, i }) => table.get(v)![i])), at });
    };
    for (const unit of verse.units) {
      bump(out.counts, unit.code);
      const miss = (why: string): void => void out.unaligned.push({ ref, code: unit.code, base: unit.base || '~', why });
      if (!msbKeys) {
        miss('the MSB table lacks the verse');
        continue;
      }
      let place: { v: number; w: number[] };
      if (unit.whole) {
        place = { v: n, w: msbKeys.map((_, i) => i) };
      } else {
        const pieces = unit.base.split(/\s*(?:\.\.\.|\u2026)\s*/).map((p) => wordsOf(p).map(letterKey)).filter((p) => p.length);
        const inEdition = findPieces(rpKeys, pieces, Math.max(unit.after, 0));
        if (!inEdition) {
          miss('the edition’s verse lacks the base');
          continue;
        }
        const carried = inEdition.map((i) => toMsb.get(i));
        if (carried.every((j) => j !== undefined)) {
          place = { v: n, w: together(msbKeys, pieces, carried as number[]) };
        } else {
          const { toWindow, at } = acrossVerses();
          const landed = inEdition.map((i) => toWindow.get(i)).map((j) => (j === undefined ? undefined : at[j]));
          if (landed.some((l) => l === undefined) || new Set(landed.map((l) => l!.v)).size !== 1) {
            miss('the MSB verse lacks the base');
            continue;
          }
          const v = landed[0]!.v;
          place = { v, w: together(table.get(v)!, pieces, landed.map((l) => l!.i)) };
        }
      }
      bump(out.aligned, unit.code);
      const base = unit.whole ? words.get(n)!.join(' ') : unit.base;
      const alts = unit.alts.map((text) => ({ code: unit.code, text }));
      const same = out.units.find((u) => u.v === place.v && u.w.join() === place.w.join());
      if (same) same.alts.push(...alts);
      else out.units.push({ v: place.v, w: place.w, base, alts });
    }
  }
  // by verse, then by the first word (a stable sort keeps the apparatus's order on the same word)
  out.units.sort((a, b) => a.v - b.v || a.w[0] - b.w[0]);
  return out;
}

// ---------------------------------------------------------------- the whole New Testament

export interface VariantStats {
  counts: CodeCounts;
  aligned: CodeCounts;
  unaligned: Unaligned[];
  books: Array<{ name: string; counts: CodeCounts }>;
}

export function addCounts(into: CodeCounts, from: CodeCounts): void {
  for (const code of CODE_ORDER) if (from[code]) into[code] = (into[code] ?? 0) + from[code];
}

const total = (counts: CodeCounts): number => CODE_ORDER.reduce((sum, c) => sum + (counts[c] ?? 0), 0);
const byCode = (counts: CodeCounts): string =>
  CODE_ORDER.filter((c) => counts[c])
    .map((c) => `${c} ${counts[c]}`)
    .join(', ');

/** What the build prints: the units by code, the share aligned, each book's units by code and every unit not aligned. */
export function variantsReport(stats: VariantStats): string[] {
  const all = total(stats.counts);
  const aligned = total(stats.aligned);
  const share = all ? ((aligned / all) * 100).toFixed(1) : '100.0';
  return [
    `variants (byztxt ${VARIANTS_TAG}): ${all} units: ${byCode(stats.counts)}`,
    `variants aligned: ${aligned} of ${all} (${share}%), ${all - aligned} not aligned`,
    ...stats.books.map((b) => `  ${b.name}: ${byCode(b.counts)}`),
    ...stats.unaligned.map((u) => `  not aligned: ${u.ref} ${u.code} "${u.base}": ${u.why}`),
  ];
}

// ---------------------------------------------------------------- fetching

/**
 * The apparatus of each book, by the canon's code ('chapter:verse' -> text): each file is fetched into rawDir/byztxt-v3.3.2 unless it is
 * there, and the files together must have the pinned sha256.
 */
export async function loadApparatus(
  rawDir: string,
  download: (url: string, dest: string) => Promise<void>,
  log: (line: string) => void,
  sha256: string = VARIANTS_SHA256,
): Promise<Map<string, Map<string, string>>> {
  const dir = join(rawDir, VARIANTS_RAW_DIR);
  const hash = createHash('sha256');
  const books = new Map<string, Map<string, string>>();
  for (const [code, file] of Object.entries(VARIANTS_FILES)) {
    const path = join(dir, `${file}.csv`);
    if (!existsSync(path)) {
      log(`downloading ${variantsUrl(file)}`);
      await download(variantsUrl(file), path);
    }
    const bytes = readFileSync(path);
    hash.update(bytes);
    books.set(code, parseVariantsCsv(bytes.toString('utf8')));
  }
  const got = hash.digest('hex');
  if (got !== sha256) throw new Error(`byztxt ${VARIANTS_TAG} with-variants: the files' sha256 is ${got}, not the pinned ${sha256}; delete ${dir} to fetch them again`);
  return books;
}
