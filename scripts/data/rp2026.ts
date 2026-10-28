// scripts/data/rp2026.ts — the Robinson-Pierpont 2026 wording changes laid over the 2018 base (mw-9ji6ek0.2). The 2026 release is a zip of
// ASCII files (byzantinetext.com, the "Clearview Press 2026 Edition" download): each verse is a reference line and wrapped lines of Greek in letters
// (v the final sigma, y theta, q psi, c chi, x xi, f phi), with no accents, capitals or punctuation. The build fetches it into data/raw, checks one
// sha256, reads it as Greek letters, lines each verse up with the 2018 base word by word (their letters only) and writes the words that differ to
// data/rp2026-overlay.json, which is committed and is all of the release that is. The chapter build then lays those entries on the Greek it writes.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { CANON } from '../../src/data/canon';
import type { GreekWord, VariantUnit, Verse } from '../../src/data/chapter';
import { letterKey, parseApparatus } from './variants';

export const RP2026_URL = 'https://byzantinetext.com/wp-content/uploads/2026/10/ByzASCII.zip';
/** The sha256 of the zip's bytes. */
export const RP2026_SHA256 = '527149c3081647b7f36e370d12da9f7e331e0e087f82b5410944fba4e5b306c1';
/** where in the raw directory the zip is kept */
export const RP2026_RAW_FILE = 'rp2026/ByzASCII.zip';
/** The overlay the build writes and reads, relative to the repository. */
export const OVERLAY_FILE = 'data/rp2026-overlay.json';

/** The book files of the zip, by the canon's code (the names are the 2005 release's: the zip is the 2026 text in that release's file names). */
export const RP2026_FILES: Record<string, string> = {
  mat: 'MT05.ASC', mrk: 'MR05.ASC', luk: 'LU05.ASC', jhn: 'JOH05.ASC', act: 'AC05.ASC', rom: 'RO05.ASC', '1co': '1CO05.ASC', '2co': '2CO05.ASC',
  gal: 'GA05.ASC', eph: 'EPH05.ASC', php: 'PHP05.ASC', col: 'COL05.ASC', '1th': '1TH05.ASC', '2th': '2TH05.ASC', '1ti': '1TI05.ASC', '2ti': '2TI05.ASC',
  tit: 'TIT05.ASC', phm: 'PHM05.ASC', heb: 'HEB05.ASC', jas: 'JAS05.ASC', '1pe': '1PE05.ASC', '2pe': '2PE05.ASC', '1jn': '1JO05.ASC', '2jn': '2JO05.ASC',
  '3jn': '3JO05.ASC', jud: 'JUDE05.ASC', rev: 'RE05.ASC',
};

/** One place the 2026 text words a verse otherwise than the 2018 base: a run of the verse's words with a word of what stands around it. `from` are
 *  the 2018 words (accents and capitals as the base has them), `to` the 2026 words (Greek letters, as the release has them). */
export interface OverlayEntry {
  book: string;
  chapter: number;
  verse: number;
  from: string[];
  to: string[];
}

// ---------------------------------------------------------------- the ASCII release

const LETTERS: Record<string, string> = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', y: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', x: 'ξ', o: 'ο', p: 'π', r: 'ρ', s: 'σ',
  v: 'ς', t: 'τ', u: 'υ', f: 'φ', c: 'χ', q: 'ψ', w: 'ω',
};
const BETA: Record<string, string> = Object.fromEntries(Object.entries(LETTERS).map(([ascii, greek]) => [greek, ascii]));

/** A word of the release in Greek letters, NFC: 'yeov' is 'θεος'. A character the release does not use is an error. */
export function greekOf(ascii: string): string {
  return [...ascii]
    .map((c) => {
      const letter = LETTERS[c];
      if (!letter) throw new Error(`RP 2026: ${JSON.stringify(c)} in ${JSON.stringify(ascii)} is not a letter of the release`);
      return letter;
    })
    .join('');
}

/** A word in Greek letters back as the release (and the chapter files' `tr`) writes it: 'θεος' is 'yeov'. Accents and breathings are dropped. */
export function betaOf(greek: string): string {
  return [...greek.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()].map((c) => BETA[c] ?? c).join('');
}

/** One book's file as 'chapter:verse' -> words in Greek letters: a verse is a line that starts with its reference and the lines after it. */
export function parseRp2026(text: string): Map<string, string[]> {
  const verses = new Map<string, string[]>();
  let words: string[] | undefined;
  let ref = '';
  for (const line of text.split(/\r?\n/)) {
    let rest = line;
    const m = /^\s*(\d+:\d+)(?:\s+(.*))?$/.exec(line);
    if (m) {
      ref = m[1];
      verses.set(ref, (words = []));
      rest = m[2] ?? '';
    }
    if (!rest.trim()) continue;
    if (!words) throw new Error(`RP 2026: words before a verse reference: ${JSON.stringify(line)}`);
    for (const token of rest.trim().split(/\s+/)) {
      try {
        words.push(greekOf(token));
      } catch (error) {
        throw new Error(`${(error as Error).message} (verse ${ref})`);
      }
    }
  }
  return verses;
}

// ---------------------------------------------------------------- the zip

/** The files of a zip by name. Only what the release uses: stored or deflated entries, read from the central directory. */
export function unzip(zip: Buffer): Map<string, Buffer> {
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('RP 2026: not a zip (no end of central directory)');
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('RP 2026: the zip’s central directory is damaged');
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new Error(`RP 2026: ${name} uses compression method ${method}`);
    files.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/** The 2026 text of each book by the canon's code, 'chapter:verse' -> words: the zip is fetched into rawDir unless it is there, and must have the pinned sha256. */
export async function loadRp2026(
  rawDir: string,
  download: (url: string, dest: string) => Promise<void>,
  log: (line: string) => void,
  sha256: string = RP2026_SHA256,
): Promise<Map<string, Map<string, string[]>>> {
  const path = join(rawDir, RP2026_RAW_FILE);
  if (!existsSync(path)) {
    log(`downloading ${RP2026_URL}`);
    await download(RP2026_URL, path);
  }
  const bytes = readFileSync(path);
  const got = createHash('sha256').update(bytes).digest('hex');
  if (got !== sha256) throw new Error(`RP 2026 ${RP2026_URL}: the zip’s sha256 is ${got}, not the pinned ${sha256}; delete ${path} to fetch it again`);
  const files = unzip(bytes);
  const books = new Map<string, Map<string, string[]>>();
  for (const [code, file] of Object.entries(RP2026_FILES)) {
    const text = files.get(file);
    if (text === undefined) throw new Error(`RP 2026: the zip lacks ${file}`);
    books.set(code, parseRp2026(text.toString('latin1')));
  }
  return books;
}

// ---------------------------------------------------------------- the diff

/** What two spellings of one word share: letters only, no accents, breathings or case, final sigma as sigma, no elision apostrophe. */
const plain = (word: string): string => letterKey(word).replace(/’/g, '');

/** Each index of `a` matched, by equal keys, to an index of `b`, as the longest common subsequence: pairs in order. */
function common(a: string[], b: string[]): Array<[number, number]> {
  const lcs: Uint16Array[] = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const out: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) out.push([i++, j++]);
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/**
 * The runs of words a verse of the 2018 base has otherwise in the 2026 text, by their letters: each is the words that differ (two runs with one
 * word between them are one) and the word before and the word after them, on both sides, so that the 2018 words say where they are and the
 * 2026 words are findable too.
 */
export function diffVerse(rp2018: string[], rp2026: string[]): Array<Pick<OverlayEntry, 'from' | 'to'>> {
  const k18 = rp2018.map(plain);
  const k26 = rp2026.map(plain);
  const same = common(k18, k26);
  // the runs: [start18, end18, start26, end26) between two matches
  const runs: Array<[number, number, number, number]> = [];
  let a = 0;
  let b = 0;
  for (const [i, j] of [...same, [k18.length, k26.length] as [number, number]]) {
    if (i > a || j > b) runs.push([a, i, b, j]);
    a = i + 1;
    b = j + 1;
  }
  // two runs with one matched word between them are one
  const merged: Array<[number, number, number, number]> = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && run[0] - last[1] === 1 && run[2] - last[3] === 1) merged[merged.length - 1] = [last[0], run[1], last[2], run[3]];
    else merged.push(run);
  }
  return merged.map(([a0, a1, b0, b1]) => {
    const before = Math.min(a0 > 0 && b0 > 0 ? 1 : 0, a0, b0);
    const after = a1 < k18.length && b1 < k26.length ? 1 : 0;
    return { from: rp2018.slice(a0 - before, a1 + after), to: rp2026.slice(b0 - before, b1 + after) };
  });
}

const bookName = (code: string): string => CANON.find((b) => b.code === code)?.name ?? code;

/**
 * The overlay: for every verse of every book, the runs where the 2026 text words it otherwise than the 2018 base. `rp2018` is the base's text by
 * the canon's code ('chapter:verse' -> the verse with the apparatus's units in it, as loadApparatus reads it), `rp2026` the release (loadRp2026).
 * A verse one has and the other lacks is an error, except a verse both leave empty (Luke 17:36 and the others the Byzantine text lacks).
 */
export function diffEdition(rp2018: Map<string, Map<string, string>>, rp2026: Map<string, Map<string, string[]>>): OverlayEntry[] {
  const entries: OverlayEntry[] = [];
  for (const [code, verses] of rp2018) {
    const release = rp2026.get(code);
    const book = bookName(code);
    const refs = [...verses.keys()].sort((x, y) => {
      const [cx, vx] = x.split(':').map(Number);
      const [cy, vy] = y.split(':').map(Number);
      return cx - cy || vx - vy;
    });
    for (const key of refs) {
      const [chapter, verse] = key.split(':').map(Number);
      const base = parseApparatus(verses.get(key)!).words;
      const words = release?.get(key);
      if (words === undefined) throw new Error(`${book} ${chapter}:${verse}: the RP 2026 release lacks the verse`);
      if (!base.length && !words.length) continue;
      if (!base.length || !words.length) throw new Error(`${book} ${chapter}:${verse}: only one of RP 2018 and RP 2026 has words in it`);
      for (const run of diffVerse(base, words)) entries.push({ book, chapter, verse, ...run });
    }
    for (const key of release?.keys() ?? []) {
      if (!verses.has(key) && release!.get(key)!.length) throw new Error(`${book} ${key}: the RP 2018 base lacks the verse`);
    }
  }
  return entries;
}

// ---------------------------------------------------------------- the report

export interface OverlayResult {
  applied: number;
  already: number;
  dropped: number;
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** What the build prints: how many entries, in how many books, what became of them, and where they are. */
export function overlayReport(entries: OverlayEntry[], result: OverlayResult): string[] {
  const books = new Map<string, number>();
  for (const e of entries) books.set(e.book, (books.get(e.book) ?? 0) + 1);
  const where = [...books].map(([book, n]) => `${book} ${n}`).join(', ');
  return [
    `RP 2026 overlay: ${count(entries.length, 'entry', 'entries')} in ${count(books.size, 'book', 'books')} (${where}): ${result.applied} laid on the chapters, ${result.already} already read so, ${count(result.dropped, 'variant unit', 'variant units')} dropped`,
    `  ${entries.map((e) => `${e.book} ${e.chapter}:${e.verse}`).join(', ')}`,
  ];
}

// ---------------------------------------------------------------- laying it on a chapter

/** `word` with the accents and breathings of `from` kept where the letters are the same: the base letters of the two lined up, each letter of the new
 *  spelling taking the marks (and the capital) of the letter it lines up with. 'γεννήματος' as 'γενηματος' is 'γενήματος'. */
export function carryMarks(from: string, spelling: string): string {
  const clusters = from.normalize('NFD').match(/\P{M}\p{M}*/gu) ?? [];
  const bases = clusters.map((c) => plain(c.normalize('NFC')));
  const letters = [...spelling];
  const keys = letters.map((c) => plain(c));
  const lined = new Map(common(bases, keys).map(([i, j]) => [j, i]));
  return letters.map((c, j) => (lined.has(j) ? clusters[lined.get(j)!].replace(/^\P{M}/u, (base) => (base.toLowerCase() === base ? c : c.toUpperCase())) : c)).join('').normalize('NFC');
}

/** Where an entry stands against the words of a verse (before the overlay is laid on it): its 2018 words are there ('laid'), the verse reads its 2026 words already, or neither. */
export function overlayStatus(entry: OverlayEntry, words: string[]): 'laid' | 'already' | 'neither' {
  const keys = words.map(plain);
  if (runAt(keys, entry.from.map(plain)).length) return 'laid';
  return runAt(keys, entry.to.map(plain)).length ? 'already' : 'neither';
}

const runAt = (keys: string[], run: string[]): number[] => {
  const at: number[] = [];
  for (let s = 0; s + run.length <= keys.length; s++) if (run.every((k, i) => keys[s + i] === k)) at.push(s);
  return at;
};

/** The index of the single place `words` stand in `keys`, -1 when nowhere; more than one is an error naming the verse. */
function placeOf(ref: string, keys: string[], words: string[]): number {
  const at = runAt(keys, words.map(plain));
  if (at.length > 1) throw new Error(`${ref}: the RP 2026 overlay’s words ${JSON.stringify(words.join(' '))} stand in the verse more than once`);
  return at.length ? at[0] : -1;
}

/**
 * Lays the overlay's entries for one chapter on its verses (changed in place) and its variant units (returned). Each entry's 2018 words are found
 * in the verse by their letters and become the 2026 words: a word that stands in both keeps its own entry in the verse (its lemma, parsing code and
 * English), also when it has moved; a word spelled otherwise takes the place of one the 2018 words have and keeps its Strong's number, lemma and
 * parsing code, with the old word's accents where the letters are the same; a word the 2018 words have and the 2026 words lack goes. A verse that
 * reads the 2026 words already (the MSB table's Greek follows RP 2005, which the 2026 text agrees with in a few places the 2018 text does not,
 * docs/greek-edition.md) is left as it is. An entry whose words are in the verse neither way fails, naming the verse, as does a word the 2026 text
 * adds, which would have no lemma, and an English chunk left with no Greek.
 * The units are carried to the words' new places; one left with no word, or with every other reading now the text, is dropped.
 */
export function applyOverlay(book: string, chapter: number, verses: Verse[], units: VariantUnit[], entries: OverlayEntry[]): OverlayResult & { units: VariantUnit[] } {
  const result: OverlayResult & { units: VariantUnit[] } = { applied: 0, already: 0, dropped: 0, units };
  for (const entry of entries) {
    if (entry.book !== book || entry.chapter !== chapter) continue;
    const ref = `${book} ${chapter}:${entry.verse}`;
    const verse = verses.find((v) => v.n === entry.verse);
    if (!verse) throw new Error(`${ref}: the RP 2026 overlay names a verse the chapter lacks`);
    const keys = verse.g.map((w) => plain(w.t));
    const start = placeOf(ref, keys, entry.from);
    if (start < 0) {
      if (placeOf(ref, keys, entry.to) >= 0) {
        result.already++;
        continue;
      }
      throw new Error(`${ref}: the RP 2026 overlay’s 2018 words ${JSON.stringify(entry.from.join(' '))} are not in the verse (${JSON.stringify(verse.g.map((w) => w.t).join(' '))}), nor are its 2026 words ${JSON.stringify(entry.to.join(' '))}`);
    }
    // the words of the run: one that stands in both lists is kept (the first not yet taken); the others pair, in order, with the 2018 words left
    const old = entry.from.map((_, i) => start + i);
    const taken = new Set<number>();
    const next: Array<number | string> = entry.to.map((word) => {
      const hit = old.find((i) => !taken.has(i) && keys[i] === plain(word));
      if (hit === undefined) return word;
      taken.add(hit);
      return hit;
    });
    const unpaired = old.filter((i) => !taken.has(i));
    const made = new Map<number, GreekWord>();
    const placed: GreekWord[] = [];
    const newIndex = new Map<number, number>();
    for (const item of next) {
      if (typeof item === 'number') {
        newIndex.set(item, start + placed.length);
        placed.push(verse.g[item]);
        continue;
      }
      const source = unpaired.shift();
      if (source === undefined) throw new Error(`${ref}: the RP 2026 text adds the word ${item}, which has no lemma or parsing code to be given`);
      const word = verse.g[source];
      const changed: GreekWord = { ...word, t: carryMarks(word.t, item), tr: betaOf(item) };
      made.set(source, changed);
      newIndex.set(source, start + placed.length);
      placed.push(changed);
    }
    // the words of the verse in their new places
    const after = start + entry.from.length;
    const g = [...verse.g.slice(0, start), ...placed, ...verse.g.slice(after)];
    const moved = (i: number): number | undefined => (i < start ? i : i >= after ? i - after + start + placed.length : newIndex.get(i));
    const changedWords = new Set([...made.keys(), ...old.filter((i) => moved(i) !== i)]);
    for (const [j, chunk] of verse.e.entries()) {
      const into = chunk.g.map(moved).filter((i): i is number => i !== undefined).sort((x, y) => x - y);
      if (!into.length) throw new Error(`${ref}: the RP 2026 text leaves the English ${JSON.stringify(chunk.t)} with no Greek`);
      if (into.length !== chunk.g.length || into.some((i, k) => i !== chunk.g[k])) verse.e[j] = { ...chunk, g: into };
    }
    verse.g.splice(0, verse.g.length, ...g);
    result.units = result.units.flatMap((unit) => {
      if (unit.v !== entry.verse) return [unit];
      const touches = unit.w.some((i) => changedWords.has(i));
      const w = unit.w.map(moved).filter((i): i is number => i !== undefined).sort((x, y) => x - y);
      if (!w.length) {
        result.dropped++;
        return [];
      }
      if (!touches) return [{ ...unit, w }];
      const text = w.map((i) => g[i].t).join(' ');
      const alts = unit.alts.filter((alt) => plain(alt.text) !== plain(text));
      if (!alts.length) {
        result.dropped++;
        return [];
      }
      return [{ ...unit, w, base: text, alts }];
    });
    result.applied++;
  }
  return result;
}
