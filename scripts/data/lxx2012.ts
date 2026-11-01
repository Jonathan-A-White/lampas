// scripts/data/lxx2012.ts — Brenton's English of the Septuagint per verse (mw-u2w5klk.9, the Septuagint epic R1): eBible's eng-lxx2012 USFM, Sir Lancelot
// Brenton's translation (1851) with American spelling by Michael Paul Johnson, public domain (docs/sources/septuagint-and-webster.md 'LXX2012').
// parseUsfm reads one book's USFM into chapters and verses keyed by the numbers the USFM carries, which are the Greek's, not Lampas's (tvtms.ts maps them):
//  - a verse's text has its footnotes (`\f`) and cross references (`\x`) dropped; the words Brenton supplied (`\add`) stay in the text and their
//    positions are kept in `supplied`, counted among the text split on white space, as the chapter shape's `e[].s` counts them (docs/data.md);
//  - a Psalm's title (`\d`, "(23) A Psalm of David.") is the chapter's `title`, as the source has it: LXX2012 keeps it out of verse 1, so its verse numbers
//    are Brenton's, one lower than the Greek's where the Greek counts the title as verse 1 (tvtms.ts `lxx2012ToGreek` carries that);
//  - the Additions of Esther stay inside their verses in [square brackets] as the source has them (`bracketed` is set on such a verse);
//  - a verse bridge (`\v 8-9`) is one verse with `through`.
// Network only to fetch the pinned zip into data/raw/lxx/eng-lxx2012/ (skipped when it is there); tests read fixtures.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { fetchTo } from './chapterWriter';

/** eBible's translation page: the text is dated 12 Mar 2026 (copr.htm in the zip); the zip fetched on 2026-10-31 was built 2026-10-29. */
export const LXX2012_URL = 'https://ebible.org/Scriptures/eng-lxx2012_usfm.zip';
export const LXX2012_RELEASE = 'eng-lxx2012, text dated 2026-03-12, zip built 2026-10-29';
/** SHA-256 of that zip: a fetch that differs still reads, with a warning (the URL is not versioned). */
export const LXX2012_SHA256 = '4eb06a8f7f477105ac6a057255c2825331f6283a309f8e244534de4e9511e506';
export const LXX2012_RAW = join('lxx', 'eng-lxx2012');

export interface UsfmVerse {
  chapter: number;
  verse: number;
  /** the last verse of a bridge (`\v 8-9`), when the USFM has one */
  through?: number;
  text: string;
  /** positions, from 0, of the supplied words among `text` split on white space; sorted, empty when none */
  supplied: number[];
  /** the text holds a bracketed passage (an Addition of Esther) */
  bracketed: boolean;
}
export interface UsfmChapter {
  chapter: number;
  /** a Psalm's title as the source has it, "(23) A Psalm of David." */
  title?: string;
  verses: UsfmVerse[];
}
export interface UsfmBook {
  /** lower case, as Lampas codes a book: `gen`, `1sa` */
  code: string;
  chapters: UsfmChapter[];
}

const START = '';
const STOP = '';

/** The text of one verse as it is read (footnotes gone, supplied words marked by START/STOP), as plain text and the positions of the supplied words. */
function cleanVerse(raw: string): { text: string; supplied: number[] } {
  let s = raw
    // a footnote or cross reference: its text goes, and one space stays unless a mark of punctuation follows it
    .replace(/\s*\\([fx])\s.*?\\\1\*(\s*)(?=(.?))/gs, (_all, _tag: string, after: string, next: string) => (after === '' && /[,.;:!?)]/.test(next) ? '' : ' '))
    .replace(/\\vp\s.*?\\vp\*/gs, '')
    .replace(/\\\+?add\s+/g, START)
    .replace(/\s*\\\+?add\*/g, STOP)
    .replace(/\\\+?[a-z]+\d*\*?\s?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = s.replace(new RegExp(`${STOP}${START}`, 'g'), ' ');
  const words: string[] = [];
  const supplied: number[] = [];
  let word = '';
  let inAdd = false;
  let wordSupplied = false;
  const flush = (): void => {
    if (word) {
      if (wordSupplied) supplied.push(words.length);
      words.push(word);
    }
    word = '';
    wordSupplied = false;
  };
  for (const ch of s) {
    if (ch === START) inAdd = true;
    else if (ch === STOP) inAdd = false;
    else if (ch === ' ') flush();
    else {
      word += ch;
      if (inAdd && /[\p{L}\p{N}]/u.test(ch)) wordSupplied = true;
    }
  }
  flush();
  return { text: words.join(' '), supplied };
}

/** One book's USFM. */
export function parseUsfm(usfm: string): UsfmBook {
  const book: UsfmBook = { code: '', chapters: [] };
  let chapter: UsfmChapter | undefined;
  let open: { chapter: number; verse: number; through?: number; raw: string } | undefined;
  const close = (): void => {
    if (open && chapter) {
      const { text, supplied } = cleanVerse(open.raw);
      chapter.verses.push({ chapter: open.chapter, verse: open.verse, ...(open.through ? { through: open.through } : {}), text, supplied, bracketed: text.includes('[') });
    }
    open = undefined;
  };
  for (const line of usfm.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = /^\\([a-z]+\d*)\s*(.*)$/.exec(line);
    if (!m) {
      if (open && line.trim()) open.raw += ` ${line.trim()}`;
      continue;
    }
    const [, tag, rest] = m;
    if (tag === 'id') {
      book.code = rest.trim().split(/\s+/)[0].toLowerCase();
    } else if (tag === 'c') {
      close();
      chapter = { chapter: Number(rest.trim()), verses: [] };
      book.chapters.push(chapter);
    } else if (tag === 'd' && chapter) {
      chapter.title = cleanVerse(rest).text;
    } else if (tag === 'v' && chapter) {
      close();
      const v = /^(\d+)(?:-(\d+))?\s*(.*)$/.exec(rest);
      if (!v) throw new Error(`${book.code} ${chapter.chapter}: a verse line with no number: ${line}`);
      open = { chapter: chapter.chapter, verse: Number(v[1]), ...(v[2] ? { through: Number(v[2]) } : {}), raw: v[3] };
    } else if (open && /^(p|q\d?|m|nb|li\d?)$/.test(tag) && rest.trim()) {
      // text of a paragraph that carries no verse number belongs to the verse before it (1 Kings 2's unnumbered paragraphs)
      open.raw += ` ${rest.trim()}`;
    }
  }
  close();
  return book;
}

/**
 * The USFM's chapter and verse as the Greek (Swete tradition, TVTMS's `Greek` column) numbers them, where the USFM does not already. LXX2012 pulls the
 * Prayer of Azariah and the Song of the Three out into its own book (S3Y) and numbers what is left of Daniel 3 as the English does, so its 3:24-33 are the
 * Greek's 3:91-100 (the Greek 3:24-90 are S3Y). A Psalm's title and Brenton's own order are carried by tvtms.ts `lxx2012ToGreek`.
 */
export function carriedAsGreek(book: string, chapter: number, verse: number): { chapter: number; verse: number } {
  if (book === 'dan' && chapter === 3 && verse >= 24 && verse <= 33) return { chapter, verse: verse + 67 };
  return { chapter, verse };
}

// ---------------------------------------------------------------- the files

/** The entries of a zip as name and bytes (stored or deflated; the zip eBible serves has no other kind), read from its central directory. */
export function unzip(zip: Buffer): Array<{ name: string; data: Buffer }> {
  let eocd = zip.length - 22;
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record');
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const out: Array<{ name: string; data: Buffer }> = [];
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: bad central directory entry');
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extraLength = zip.readUInt16LE(p + 30);
    const commentLength = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString('utf8', p + 46, p + 46 + nameLength);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(start, start + size);
    out.push({ name, data: method === 0 ? Buffer.from(body) : inflateRawSync(body) });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return out;
}

/** Fetches the zip into <raw>/lxx/eng-lxx2012/ unless the USFM is there; returns the directory. */
export async function ensureLxx2012(rawDir: string): Promise<string> {
  const dir = join(rawDir, LXX2012_RAW);
  if (existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.usfm'))) return dir;
  mkdirSync(dir, { recursive: true });
  const zipPath = join(dir, 'eng-lxx2012_usfm.zip');
  await fetchTo(LXX2012_URL, zipPath);
  const zip = readFileSync(zipPath);
  if (createHash('sha256').update(zip).digest('hex') !== LXX2012_SHA256) console.warn(`lxx2012: ${LXX2012_URL} is not the zip pinned in scripts/data/lxx2012.ts (${LXX2012_RELEASE}); read anyway`);
  for (const { name, data } of unzip(zip)) if (name.endsWith('.usfm')) writeFileSync(join(dir, name), data);
  rmSync(zipPath);
  return dir;
}

/** The USFM of one book of the fetched directory (`gen` finds 02-GENeng-lxx2012.usfm), undefined when LXX2012 has none. */
export function usfmFileOf(dir: string, code: string): string | undefined {
  const file = readdirSync(dir).find((f) => f.endsWith('.usfm') && new RegExp(`^\\d+-${code}eng-`, 'i').test(f));
  return file ? join(dir, file) : undefined;
}
