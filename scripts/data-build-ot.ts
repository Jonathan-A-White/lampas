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
import type { BookInfo, Chapter, LexEntry, Verse } from '../src/data/chapter';
import type { FrequencyEntry } from '../src/data/frequency';
import type { LemmaLexicon } from '../src/data/lexicon';
import { COLUMNS, addRow, checkHeader, readLines, splitReference, tidy, wordOf, type TableGroup, type TableVerse, type TableWord } from './data/bereanTable';
import { buildVerse, chapterFingerprint, fetchTo, listFingerprint, mergeIndex, numeric, readIndex, removeStale, sortedKeys, writeIfChanged } from './data/chapterWriter';
import type { VersionedList } from '../src/data/versionedLists';
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

/**
 * Verses where the table puts an English chunk on the wrong Hebrew word (a slip of the source, not of the build): `swap` names two Strong's numbers of the verse that trade their English
 * (its place in the English order, its text, the punctuation after it and the paragraph or poetry tag that opens its line), as scripts/data-build.ts ALIGNMENT_FIXES does for the New Testament. The words are named by Strong's number, which
 * is unique in these verses. `waits` names one '. . .' word of the verse whose English the table meant for the chunk AFTER it, which every other '. . .' word's join to the chunk before it would miss:
 * Genesis 21:11 'distressed [in the eyes of] Abraham' (H5869 בְּעֵינֵי; mw-fnvjof.17.193). A rule that picks the side by Hebrew adjacency was tried and dropped (docs/sources/msb-chunk-pairs.md), so each is named.
 * Isaiah 33:8 'and human life is disregarded.' (לֹא חָשַׁב אֱנוֹשׁ): the table gives 'and human life' to לֹא (H3808) and 'is disregarded' to חָשַׁב, and leaves אֱנוֹשׁ (H582, 'human') '. . .'
 * at the end; swapped, אֱנוֹשׁ is 'and human life' and לֹא is the '. . .' that goes with 'is disregarded' (mw-fnvjof.17.161).
 */
type PairingFix = { ref: string } & ({ swap: [string, string]; waits?: undefined } | { waits: string; swap?: undefined });
export const PAIRING_FIXES: readonly PairingFix[] = [
  { ref: 'Isaiah 33:8', swap: ['H3808', 'H582'] },
  { ref: 'Genesis 21:11', waits: 'H5869' },
];

/** Applies the PAIRING_FIXES of this verse to its words; a fix whose words the verse lacks stops the build. */
export function fixPairing(book: string, chapter: number, n: number, words: TableWord[]): void {
  for (const fix of PAIRING_FIXES) {
    if (fix.ref !== `${book} ${chapter}:${n}`) continue;
    const named = (strongs: string): TableWord => {
      const found = words.filter((w) => w.strongs === strongs);
      if (found.length !== 1) throw new Error(`${fix.ref}: the pairing fix names ${strongs}, which the table holds ${found.length} times`);
      return found[0];
    };
    if (fix.waits !== undefined) {
      const word = named(fix.waits);
      if (word.english.trim() !== '. . .') throw new Error(`${fix.ref}: the pairing fix says ${fix.waits} is a '. . .' word, and the table gives it ${JSON.stringify(word.english.trim())}`);
      word.waits = true;
      continue;
    }
    const [a, b] = fix.swap.map(named);
    for (const key of ['englishSort', 'english', 'begQ', 'tail', 'par'] as const) {
      const keep = a[key];
      (a[key] as string | number) = b[key];
      (b[key] as string | number) = keep;
    }
  }
}

// ---------------------------------------------------------------- the sweep (mw-fnvjof.17.210)

const GLOSS_STOP = new Set(['to', 'be', 'the', 'one', 'who', 'that', 'for', 'and', 'with', 'his', 'her', 'its', 'this', 'out', 'up', 'off', 'not', 'any', 'some', 'of']);
/** A word of English as its stem: letters only, lower case, a plural or a past tense or '-ing' taken off ('eyes' and 'eye' meet). */
const stemOf = (word: string): string => word.toLowerCase().replace(/[^a-z]/g, '').replace(/(?:ing|ed|es|s|d)$/, '');
const stemsOf = (text: string): Set<string> => new Set(text.split(/[^A-Za-z]+/).map(stemOf).filter((s) => s.length >= 3));
/** The stems a lexicon gloss ('to be evil, bad') answers to, each in the English that would carry it: the words of the gloss but its function words. */
export function glossStems(gloss: string): Set<string> {
  return new Set(gloss.split(/[^A-Za-z]+/).filter((w) => w.length >= 3 && !GLOSS_STOP.has(w.toLowerCase())).map(stemOf).filter((s) => s.length >= 3));
}

export interface MisplacedChunk {
  /** 'Isaiah 33:8' */
  ref: string;
  strongs: string;
  /** the Hebrew word of `chunk` whose gloss is not in it */
  word: string;
  gloss: string;
  /** the English chunk the table gave the word, which does not hold its gloss */
  chunk: string;
  /** another chunk of the verse that does */
  holder: string;
}

/** A word that is not a noun, verb or adjective (a preposition, conjunction, article, particle, pronoun, adverb): the English for these varies too much for a gloss to say where it belongs. */
const FUNCTION_WORD = /^(?:Prep|Conj|Art|Adv|Pro|Interj|Prt|Rel|Interrog|Neg|Dem|Part)/;

/**
 * A word of a verse whose gloss (`glossOf`, the lexicon's) is not in the English chunk it is in, while another chunk of the verse holds it and that other chunk also holds a word of its own whose gloss it lacks:
 * the sign of two chunks put on each other's Hebrew word (Isaiah 33:8: 'and human life' sat on לֹא while אֱנוֹשׁ 'human' was in 'is disregarded.'; mw-fnvjof.17.192). Only nouns, verbs and adjectives
 * are asked (a preposition's English varies too much). `npm run pairing:sweep` prints these; the fix for one the sweep rightly finds is a PAIRING_FIXES entry, and the sweep prints none once each is fixed or read right.
 */
export function misplacedChunks(ref: string, verse: Verse, glossOf: (strongs: string) => string): MisplacedChunk[] {
  const stems = verse.e.map((c) => stemsOf(c.t));
  const holds = (j: number, own: Set<string>): boolean => [...own].some((s) => stems[j].has(s));
  const off = (w: Verse['g'][number], j: number): Set<string> | undefined => {
    if (!w.s) return undefined;
    const own = glossStems(glossOf(w.s));
    return own.size && !holds(j, own) ? own : undefined;
  };
  const out: MisplacedChunk[] = [];
  verse.e.forEach((chunk, j) => {
    for (const gi of chunk.g) {
      const w = verse.g[gi];
      if (FUNCTION_WORD.test(w.p)) continue;
      const own = off(w, j);
      if (!own) continue;
      // the other chunk holds this word's gloss, and has a word of its own that is off whose gloss THIS chunk holds: the two chunks sit on each other's Hebrew
      const at = verse.e.findIndex(
        (c, k) => k !== j && holds(k, own) && !c.g.some((i) => verse.g[i].s === w.s) && c.g.some((i) => { const o = off(verse.g[i], k); return !FUNCTION_WORD.test(verse.g[i].p) && o !== undefined && holds(j, o); }),
      );
      if (at < 0) continue;
      out.push({ ref, strongs: w.s, word: w.t, gloss: glossOf(w.s), chunk: chunk.t, holder: verse.e[at].t });
    }
  });
  return out;
}

/**
 * The verses misplacedChunks finds that were read against the table and are right as they stand (mw-fnvjof.17.210): each is Hebrew parallelism whose two words the English renders by the other's near synonym
 * ('Give ear,' / 'listen' for הַאֲזִינָה and אָזְנְכֶם, Psalm 78:1), or a word the English renders as two ('deserve to die' / 'put you to death', 1 Kings 2:26). `npm run pairing:sweep` leaves them out.
 */
export const MISPLACED_READ_RIGHT: ReadonlySet<string> = new Set([
  '1 Kings 2:26', 'Daniel 9:19', 'Ezekiel 17:24', 'Isaiah 22:2', 'Isaiah 33:10', 'Isaiah 49:10', 'Jeremiah 21:7', 'Jeremiah 42:11', 'Proverbs 21:24', 'Psalms 78:1',
]);

/** A row whose English is a real chunk of its own (not blank, '-', 'vvv' or '. . .'). */
const hasEnglish = (w: TableWord): boolean => !['', '-', 'vvv', '. . .'].includes(w.english.trim());

/** The nearest rows with English before and after `word` in English order. */
function neighbours(word: TableWord, inEnglish: readonly TableWord[]): { before?: TableWord; after?: TableWord } {
  const at = inEnglish.indexOf(word);
  return { before: inEnglish.slice(0, at).reverse().find(hasEnglish), after: inEnglish.slice(at + 1).find(hasEnglish) };
}

/**
 * The shared fix for a '. . .' word the table meant for the chunk AFTER it (mw-fnvjof.17.210, the Genesis 21:11 kind; every other '. . .' word joins the chunk before, buildVerse). A '. . .' word waits when its
 * lexicon gloss (`glossOf`) is in the English of the next chunk and not in the English of the one before: Exodus 21:26 'as compensation for [עֵינוֹ] / the eye.', Numbers 14:15 'of Your fame [לֵאמֹר] / will say,',
 * 2 Kings 15:1 'In the twenty-seventh [שָׁנָה] / year'. A chunk before that holds a digit is left (Genesis 5:6 '105 [שָׁנִים] / years old': the numeral's English counts the years). A read of the 156 words this
 * matched in the whole Old Testament found them right but those of the numerals; the words it does not match stay joined to the chunk before, and PAIRING_FIXES names the ones read by hand.
 */
export function markWaitingByGloss(words: readonly TableWord[], glossOf: (strongs: string) => string): number {
  const inEnglish = [...words].sort((a, b) => a.englishSort - b.englishSort);
  let marked = 0;
  for (const word of inEnglish) {
    if (word.english.trim() !== '. . .' || word.waits || !word.strongs) continue;
    const { before, after } = neighbours(word, inEnglish);
    if (!before || !after || /\d/.test(before.english)) continue;
    const own = glossStems(glossOf(word.strongs));
    if (own.size === 0) continue;
    const inBefore = stemsOf(before.english);
    const inAfter = stemsOf(after.english);
    if ([...own].some((s) => inAfter.has(s)) && ![...own].some((s) => inBefore.has(s))) {
      word.waits = true;
      marked++;
    }
  }
  return marked;
}

export interface DotsRow {
  ref: string;
  strongs: string;
  /** the Hebrew word whose English the table gave as '. . .' */
  word: string;
  gloss: string;
  /** the English of the nearest row before it and the nearest row after it, in English order */
  before: string;
  after: string;
  /** 'waits' when the build joins the word to the chunk after (PAIRING_FIXES or markWaitingByGloss); 'next' when it joins the chunk before though the Hebrew word next to it is the owner of the chunk after and the one before it is not (the Genesis 21:11 shape, unresolved) */
  kind: 'waits' | 'next';
}

/** The '. . .' words of a verse (after fixPairing and markWaitingByGloss) the sweep lists, with the English before and after them: `npm run pairing:sweep -- --dots` (mw-fnvjof.17.208). */
export function dotsRows(ref: string, words: readonly TableWord[], glossOf: (strongs: string) => string): DotsRow[] {
  const inEnglish = [...words].sort((a, b) => a.englishSort - b.englishSort);
  const inHebrew = [...words].sort((a, b) => a.sourceSort - b.sourceSort);
  const out: DotsRow[] = [];
  for (const word of inEnglish) {
    if (word.english.trim() !== '. . .') continue;
    const { before, after } = neighbours(word, inEnglish);
    if (!before || !after) continue;
    const at = inHebrew.indexOf(word);
    const kind = word.waits ? 'waits' : inHebrew[at + 1] === after && inHebrew[at - 1] !== before && inHebrew[at - 1]?.english.trim() !== '. . .' ? 'next' : undefined;
    if (kind) out.push({ ref, strongs: word.strongs, word: word.text, gloss: glossOf(word.strongs), before: tidy(before.english), after: tidy(after.english), kind });
  }
  return out;
}

export function otLexicon(text: string): Lexicon {
  return parseTbes(text, { letter: 'H', gloss: (_lemma, gloss) => cleanHebrewGloss(gloss) });
}

/**
 * Adds to the lemma lexicon each other spelling TBESH gives a number its text uses (mw-fnvjof.17.40): H3384 is יָרָא in the text and יָרָה in the dictionaries, so a link by יָרָה
 * (src/nav/links.ts findWord) finds nothing unless יָרָה is a key too. The entry is the spelling's own gloss and part of speech under the same Strong's number, marked `v` so a lookup
 * by number still gives the text's spelling. A spelling the lexicon already keys (the text's own lemma of another number) is left: the text's word comes first.
 */
export function addSpellings(lexicon: LemmaLexicon, lex: Lexicon): LemmaLexicon {
  const out: LemmaLexicon = { ...lexicon };
  for (const number of new Set(Object.values(lexicon).map((e) => e.s))) {
    for (const spelling of lex.spellings?.(number) ?? []) {
      if (!(spelling.lemma in out)) out[spelling.lemma] = { g: spelling.gloss, s: number, c: spelling.pos ?? '', v: true };
    }
  }
  return out;
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
export async function buildOt(
  lines: Lines,
  lex: Lexicon,
  onChapter: (chapter: BuiltChapter) => void | Promise<void>,
  options: { onVerse?: (table: TableVerse, built: Verse) => void } = {},
): Promise<BuiltOt> {
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
    const built = verses
      .filter((v) => v.words.length > 0)
      .map((v) => {
        const made = hebrewVerse(v, lex);
        options.onVerse?.(v, made);
        return made;
      });
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

  // dotsBefore: a '. . .' word's English is in the chunk BEFORE it, as in the New Testament's build ('travel' holds עֹבֵר and אֹרַח, not 'has ceased.' with אֹרַח; mw-fnvjof.17.161, docs/sources/msb-chunk-pairs.md)
  const hebrewVerse = (v: TableVerse, lexicon: Lexicon) =>
    buildVerse(v, (w) => {
      if (w.strongs === '') return { t: w.text, tr: w.translit, s: '', l: '', p: w.parse };
      const entry = lexicon.get(w.strongs);
      if (!entry) throw new Error(`${v.book} ${v.chapter}:${v.n}: ${w.text} has Strong number ${w.strongs}, which the lexicon lacks`);
      // A verb in a stem its definition gives a sense of its own ('(Piel) to appoint' for מָנָה, whose lemma gloss is 'to count') carries that sense as `gl`.
      const stem = hebrewStem(w.parse);
      const gl = stem ? entry.stems?.[stem] : undefined;
      return { t: w.text, tr: w.translit, s: w.strongs, l: entry.lemma, p: w.parse, ...(gl && gl !== entry.gloss ? { gl } : {}) };
    }, { dotsBefore: true });

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
    fixPairing(target.name, chapter, n, words);
    markWaitingByGloss(words, (strongs) => lex.get(strongs)?.gloss ?? '');
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
  return { books, lexicon: sortedKeys(addSpellings(lexicon, lex)), frequency };
}

// ---------------------------------------------------------------- files

/** A verse's pairing as the chapter file keeps it: each Hebrew word's `e` and each chunk's `g`. */
const pairingOf = (v: Chapter['verses'][number]): string => JSON.stringify([v.g.map((w) => w.e ?? null), v.e.map((c) => c.g)]);

/** The verses of `now` whose English-to-Hebrew pairing is not the one `before` (the chapter file the build found on disk) holds; a verse the file lacks counts as changed. */
export function changedPairings(before: Chapter | undefined, now: Chapter): number[] {
  const had = new Map((before?.verses ?? []).map((v) => [v.n, pairingOf(v)]));
  return now.verses.filter((v) => had.get(v.n) !== pairingOf(v)).map((v) => v.n);
}

export interface BuildOtOptions {
  rawDir: string;
  outDir: string;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  log?: (line: string) => void;
}

export async function runBuildOt(options: BuildOtOptions): Promise<{ chapters: number; written: number; bytes: number; changedVerses: Record<string, number> }> {
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
  // how many verses' pairing of English chunk to Hebrew word differs from the file on disk, by book (a build that changes how the table is joined says how far it reached)
  const changedVerses: Record<string, number> = {};
  const built = await buildOt(readLines(bsbPath), lex, ({ path, chapter }) => {
    chapters++;
    const file = join(outDir, path);
    const changed = changedPairings(existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Chapter) : undefined, chapter).length;
    if (changed) changedVerses[chapter.code] = (changedVerses[chapter.code] ?? 0) + changed;
    put(path, JSON.stringify(chapter));
  });
  // index.json lists the 66 books: this build writes the 39 of the Old Testament and keeps the New Testament's from the index on disk (scripts/data-build.ts writes those)
  // and carries the fingerprints of the two Hebrew lists it writes, which the app asks for them by (src/data/chapter.ts listUrl, mw-fnvjof.17.41)
  const lists: Record<VersionedList, string> = {
    'lexicon-hbo': listFingerprint(JSON.stringify(built.lexicon)),
    'frequency-hbo': listFingerprint(JSON.stringify(built.frequency)),
  };
  put('index.json', JSON.stringify({ ...mergeIndex(readIndex(outDir), built.books, 'hbo'), lists }));
  put('lexicon-hbo.json', JSON.stringify(built.lexicon));
  put('frequency-hbo.json', JSON.stringify(built.frequency));

  // Anything else of the Old Testament's under outDir is left from an earlier build; the New Testament's files (and ladder/) are not this build's.
  const hebrew = new Set(OT_BOOKS.map((b) => b.code));
  removeStale(outDir, made, (path) => (path.includes('/') ? hebrew.has(path.split('/')[0]) : path === 'lexicon-hbo.json' || path === 'frequency-hbo.json'));
  log(`${chapters} chapters, ${written} files written, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  const total = Object.values(changedVerses).reduce((sum, n) => sum + n, 0);
  log(`${total} verses changed their English-to-Hebrew pairing${total ? ': ' + OT_BOOKS.filter((b) => changedVerses[b.code]).map((b) => `${b.code} ${changedVerses[b.code]}`).join(', ') : ''}`);
  return { chapters, written, bytes, changedVerses };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBuildOt({ rawDir: 'data/raw', outDir: 'public/data', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
