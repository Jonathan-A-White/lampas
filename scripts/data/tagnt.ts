// scripts/data/tagnt.ts — STEPBible's TAGNT (Translators Amalgamated Greek New Testament, CC BY 4.0), the second source of a variant word's Strong's number (mw-9ji6ek0.44).
// TAGNT gives every word of the standard editions (NA27/28, TR, SBL, WH, Byz and others) its Strong's number and parsing, and it keeps the readings the editions disagree on:
// a word that only some editions read is a row of its own, and the spellings and words the other editions have in its place sit in two columns of that row. So a form the New
// Testament text of the chapters never has (the NA's εἶπαν, βιβλαρίδιον) is still found here, with its number. The file is two tab-separated text files, one row a word:
//   ref#nn=type<TAB>Greek (translit)<TAB>English<TAB>G0974=N-ASN<TAB>lemma=gloss<TAB>editions<TAB>other WORD (kind=translit) gloss - G0975=N-ASN in: Byz<TAB>other spellings: 'Tyn+TR: εἶπον ;'<TAB>…
// The rows are read by their shape (a reference and '=' at the front), so the file's long header and its '#' comment rows are skipped.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TAGNT_RAW_DIR = 'tagnt';
const TAGNT_BASE = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/';
/**
 * The two files, in canon order, the name each is kept under in rawDir/tagnt, and the commit of STEPBible-Data whose bytes the pin is of (mw-5r3p30.1004): the last
 * commit before STEPBible's 2026-11-02 change of the licence header, which only the file's header rows differ by. A commit's URL always serves the same bytes; master does not.
 */
export const TAGNT_FILES: ReadonlyArray<{ remote: string; local: string; commit: string }> = [
  { remote: 'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt', local: 'tagnt-mat-jhn.txt', commit: '051e2bcabd2b5f32d19e5d21c2cd7580ae6cf890' },
  { remote: 'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt', local: 'tagnt-act-rev.txt', commit: '5af032662c1dfe89cfc00a1dfa35104e72d0df00' },
];
export const tagntUrl = (remote: string): string => {
  const file = TAGNT_FILES.find((f) => f.remote === remote);
  if (!file) throw new Error(`TAGNT: ${remote} is not one of the pinned files`);
  return `${TAGNT_BASE}${file.commit}/Translators%20Amalgamated%20OT%2BNT/${encodeURIComponent(remote)}`;
};
/** The two files' bytes one after another (2026-10-31): the build stops on any other, as it does for the apparatus, and says to delete rawDir/tagnt to fetch them again. */
export const TAGNT_SHA256 = 'ebf7d752faf67dc62883e54b8e82038eef5b48f54453849f872be2450c90005f';

/** One form TAGNT knows, with the number and parsing it has there, and the book (the canon's code) it is read in. */
export interface TagntWord {
  form: string;
  /** Strong's number, no padding: 'G974' */
  s: string;
  /** the parsing code TAGNT gives: 'N-ASN' */
  p: string;
  book: string;
}

/** 'G0974' -> 'G974' */
const unpadded = (strongs: string): string => `G${Number(strongs.slice(1))}`;
/** A form as TAGNT prints it: 'βιβλαρίδιον.' and 'λέγουσαν·' lose their punctuation; the transliteration in brackets goes. */
const formOf = (cell: string): string => cell.replace(/\s*\(.*$/, '').replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '').normalize('NFC');

const ROW = /^([1-3]?[A-Za-z]{2,3})\.\d+\.\d+#\d+=/;
const NUMBER_AND_PARSING = /^(G\d{4})=(\S+)$/;
/** An other word of a column of meanings: 'βιβλίον (o=biblion) a scroll - G0975=N-ASN in: Byz'. */
const OTHER_WORD = /^(\S+)\s+\([^)]*\).*\s-\s(G\d{4})=(\S+)\s+in:/;

/**
 * The words of a TAGNT file (its text): each row's own word, the other words its column of variants names (with their own number and parsing), and the other spellings
 * its next column names (the row's number and parsing: a spelling is the same word).
 */
export function parseTagnt(text: string): TagntWord[] {
  const words: TagntWord[] = [];
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const head = ROW.exec(line);
    if (!head) continue;
    const c = line.split('\t');
    const own = NUMBER_AND_PARSING.exec((c[3] ?? '').trim());
    if (!own) continue;
    const book = head[1].toLowerCase();
    const s = unpadded(own[1]);
    const add = (form: string, strongs: string, parsing: string): void => {
      if (form) words.push({ form, s: strongs, p: parsing, book });
    };
    add(formOf(c[1] ?? ''), s, own[2]);
    const other = OTHER_WORD.exec((c[6] ?? '').trim());
    if (other) add(formOf(other[1]), unpadded(other[2]), other[3]);
    for (const spelling of (c[7] ?? '').split(';')) {
      const form = /^[^:]+:\s*(\S+)/.exec(spelling.trim())?.[1];
      if (form) add(formOf(form), s, own[2]);
    }
  }
  return words;
}

/** The words of both files in rawDir/tagnt, fetched first unless they are there; the files together must have the pinned sha256. */
export async function loadTagnt(
  rawDir: string,
  download: (url: string, dest: string) => Promise<void>,
  log: (line: string) => void,
  sha256: string = TAGNT_SHA256,
): Promise<TagntWord[]> {
  const hash = createHash('sha256');
  const words: TagntWord[] = [];
  for (const { remote, local } of TAGNT_FILES) {
    const path = join(rawDir, TAGNT_RAW_DIR, local);
    if (!existsSync(path)) {
      log(`downloading ${tagntUrl(remote)}`);
      await download(tagntUrl(remote), path);
    }
    const bytes = readFileSync(path);
    hash.update(bytes);
    words.push(...parseTagnt(bytes.toString('utf8')));
  }
  const got = hash.digest('hex');
  if (got !== sha256) throw new Error(`TAGNT: the files' sha256 is ${got}, not the pinned ${sha256}; delete ${join(rawDir, TAGNT_RAW_DIR)} to fetch them again`);
  return words;
}
