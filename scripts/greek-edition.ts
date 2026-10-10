// scripts/greek-edition.ts — npm run greek:edition (mw-5r3p30.136)
// Finds which Robinson-Pierpont edition the Greek of the MSB tables (the file scripts/data-build.ts reads) follows, by comparing it
// word by word with RP2018 (github.com/byztxt/byzantine-majority-text, tag v3.3.2) and with RP2005 (the same repository's v2.0.3,
// the release its README names as closest to the 2005 text), and writes docs/greek-edition.md. Not part of the app build;
// it needs the network (the downloads are kept in data/raw, which git ignores).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOOKS, MSB_URL, parseMsb } from './data-build';

export type DiffKind = 'accent' | 'punctuation' | 'spelling' | 'capitals' | 'added' | 'missing';
export const KINDS: readonly DiffKind[] = ['accent', 'punctuation', 'spelling', 'capitals', 'added', 'missing'];
export interface Diff {
  kind: DiffKind;
  /** the table's word, absent for a word the table lacks */
  msb?: string;
  /** the edition's word, absent for a word the edition lacks */
  rp?: string;
}
export interface RpWord {
  word: string;
  marks: string;
}
export type Edition = '2005' | '2018';
export interface Place {
  follows: Edition | 'neither';
  msb: string;
  rp2005: string;
  rp2018: string;
}

// ---------------------------------------------------------------- words

const APOSTROPHES = /['ʼ᾽’]/g;
const MARK_CHARS = /[,.;:!?()[\]{}\u00AB\u00BB"\u201C\u201D\u2018\u00B6\-\u00B7\u0387\u037E\u2014\u2013\u2026\u2E31]/gu;
/** accents, breathings, diaeresis and iota subscript off (NFD, the combining marks dropped), case kept */
const noMarks = (w: string): string => w.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
const foldSigma = (w: string): string => w.replace(/ς/g, 'σ');
/** what two spellings of one word share: letters only, no accents, no case, final sigma as sigma */
const keyOf = (w: string): string => foldSigma(noMarks(w).toLowerCase());

/** A verse's text cut into words; the punctuation beside a word is kept apart (the elision apostrophe stays in the word). */
export function rpWords(text: string): RpWord[] {
  const out: RpWord[] = [];
  for (const token of text.normalize('NFC').split(/\s+/)) {
    if (!token) continue;
    const marks = (token.match(MARK_CHARS) ?? []).join('').replace(/·/g, '·').replace(/;/g, ';');
    const word = token.replace(MARK_CHARS, '').replace(APOSTROPHES, '’');
    if (word) out.push({ word, marks });
  }
  return out;
}

// ---------------------------------------------------------------- aligning

interface Pair {
  a: number | null;
  b: number | null;
}

/** Words with equal keys are matched by longest common subsequence; the unmatched words between two matches pair up in order. */
function align(a: RpWord[], b: RpWord[]): Pair[] {
  const ka = a.map((w) => keyOf(w.word));
  const kb = b.map((w) => keyOf(w.word));
  const n = ka.length;
  const m = kb.length;
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const pairs: Pair[] = [];
  let i = 0;
  let j = 0;
  let gapA: number[] = [];
  let gapB: number[] = [];
  const flush = (): void => {
    const common = Math.min(gapA.length, gapB.length);
    for (let k = 0; k < common; k++) pairs.push({ a: gapA[k], b: gapB[k] });
    for (const x of gapA.slice(common)) pairs.push({ a: x, b: null });
    for (const y of gapB.slice(common)) pairs.push({ a: null, b: y });
    gapA = [];
    gapB = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && ka[i] === kb[j]) {
      flush();
      pairs.push({ a: i++, b: j++ });
    } else if (j >= m || (i < n && lcs[i + 1][j] >= lcs[i][j + 1])) {
      gapA.push(i++);
    } else {
      gapB.push(j++);
    }
  }
  flush();
  return pairs;
}

const shown = (w: RpWord): string => w.word + w.marks;

/** How two aligned words differ, or null when they are the same. A word is counted once, by the most basic difference. */
function classify(a: RpWord, b: RpWord): DiffKind | null {
  if (a.word === b.word) return a.marks === b.marks ? null : 'punctuation';
  if (noMarks(a.word) === noMarks(b.word)) return 'accent';
  if (noMarks(a.word).toLowerCase() === noMarks(b.word).toLowerCase()) return 'capitals';
  return 'spelling';
}

/** The differences between the table's Greek for a verse and an edition's, by kind. `added`: the table has a word the edition lacks. */
export function compareVerse(msbText: string, rpText: string): Diff[] {
  const a = rpWords(msbText);
  const b = rpWords(rpText);
  const out: Diff[] = [];
  for (const { a: i, b: j } of align(a, b)) {
    if (i !== null && j !== null) {
      const kind = classify(a[i], b[j]);
      if (kind) out.push({ kind, msb: shown(a[i]), rp: shown(b[j]) });
    } else if (i !== null) {
      out.push({ kind: 'added', msb: shown(a[i]) });
    } else if (j !== null) {
      out.push({ kind: 'missing', rp: shown(b[j]) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- the deciding places

/** Where RP2005 and RP2018 differ in more than punctuation, and which of them the table's word agrees with. */
export function decidingPlaces(msbText: string, rp2005Text: string, rp2018Text: string): Place[] {
  const msb = rpWords(msbText);
  const r05 = rpWords(rp2005Text);
  const r18 = rpWords(rp2018Text);
  /** edition index -> table index, for the words the table has a word beside */
  const toMsb = (rp: RpWord[]): Map<number, number> => {
    const map = new Map<number, number>();
    for (const { a, b } of align(msb, rp)) if (a !== null && b !== null) map.set(b, a);
    return map;
  };
  const m05 = toMsb(r05);
  const m18 = toMsb(r18);
  const agrees = (rp: RpWord[], map: Map<number, number>, j: number): boolean => {
    const i = map.get(j);
    return i !== undefined && msb[i].word === rp[j].word;
  };
  const out: Place[] = [];
  for (const { a, b } of align(r05, r18)) {
    if (a !== null && b !== null && r05[a].word === r18[b].word) continue; // the same word, whatever its marks
    // an edition that lacks the word agrees when the table lacks the other edition's word too
    const with05 = a !== null ? agrees(r05, m05, a) : b !== null && !m18.has(b);
    const with18 = b !== null ? agrees(r18, m18, b) : a !== null && !m05.has(a);
    const follows: Place['follows'] = with05 && !with18 ? '2005' : with18 && !with05 ? '2018' : 'neither';
    const from05 = a !== null ? m05.get(a) : undefined;
    const from18 = b !== null ? m18.get(b) : undefined;
    const tableIndex = follows === '2005' ? from05 : follows === '2018' ? from18 : (from18 ?? from05);
    out.push({
      follows,
      msb: tableIndex !== undefined ? msb[tableIndex].word : '',
      rp2005: a !== null ? r05[a].word : '',
      rp2018: b !== null ? r18[b].word : '',
    });
  }
  return out;
}

/** The edition the table agrees with at more of the deciding places; 'undecided' with none or a tie. */
export function editionVerdict(counts: Record<Edition | 'neither', number>): Edition | 'undecided' {
  if (counts['2005'] === counts['2018']) return 'undecided';
  return counts['2018'] > counts['2005'] ? '2018' : '2005';
}

// ---------------------------------------------------------------- the editions on GitHub

const RP_REPO = 'https://raw.githubusercontent.com/byztxt/byzantine-majority-text';
export const RP_SOURCES: Record<Edition, { tag: string; dir: string; files: Record<string, string>; extra: Record<string, string[]> }> = {
  '2018': {
    tag: 'v3.3.2',
    dir: 'csv-unicode/ccat/no-variants',
    files: {
      mat: 'MAT', mrk: 'MAR', luk: 'LUK', jhn: 'JOH', act: 'ACT', rom: 'ROM', '1co': '1CO', '2co': '2CO', gal: 'GAL', eph: 'EPH', php: 'PHP',
      col: 'COL', '1th': '1TH', '2th': '2TH', '1ti': '1TI', '2ti': '2TI', tit: 'TIT', phm: 'PHM', heb: 'HEB', jas: 'JAM', '1pe': '1PE',
      '2pe': '2PE', '1jn': '1JO', '2jn': '2JO', '3jn': '3JO', jud: 'JUD', rev: 'REV',
    },
    extra: { jhn: ['PA'], act: ['ACT24'] },
  },
  '2005': {
    tag: 'v2.0.3',
    dir: 'csv-unicode/accents/no-variants',
    files: {
      mat: 'MT', mrk: 'MR', luk: 'LU', jhn: 'JOH', act: 'AC', rom: 'RO', '1co': '1CO', '2co': '2CO', gal: 'GA', eph: 'EPH', php: 'PHP',
      col: 'COL', '1th': '1TH', '2th': '2TH', '1ti': '1TI', '2ti': '2TI', tit: 'TIT', phm: 'PHM', heb: 'HEB', jas: 'JAS', '1pe': '1PE',
      '2pe': '2PE', '1jn': '1JO', '2jn': '2JO', '3jn': '3JO', jud: 'JUDE', rev: 'RE',
    },
    extra: { jhn: ['PA'], act: ['AC24'] },
  },
};

/** The rows of one of the repository's chapter,verse,text files, as 'chapter:verse' -> text. */
export function parseRpCsv(csv: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of csv.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
    const m = /^(\d+),(\d+),(.*)$/.exec(line);
    if (!m) continue;
    const text = m[3].startsWith('"') && m[3].endsWith('"') ? m[3].slice(1, -1).replace(/""/g, '"') : m[3];
    out.set(`${m[1]}:${m[2]}`, text);
  }
  return out;
}

async function download(url: string, cacheFile: string): Promise<string> {
  if (existsSync(cacheFile)) return readFileSync(cacheFile, 'utf8');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const text = await response.text();
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, text);
  return text;
}

async function loadEdition(edition: Edition, rawDir: string): Promise<Map<string, Map<string, string>>> {
  const source = RP_SOURCES[edition];
  const books = new Map<string, Map<string, string>>();
  for (const [code, file] of Object.entries(source.files)) {
    const verses = new Map<string, string>();
    for (const name of [file, ...(source.extra[code] ?? [])]) {
      const url = `${RP_REPO}/${source.tag}/${source.dir}/${name}.csv`;
      const csv = await download(url, join(rawDir, `rp${edition}`, `${name}.csv`));
      for (const [key, text] of parseRpCsv(csv)) if (!verses.has(key)) verses.set(key, text);
    }
    books.set(code, verses);
  }
  return books;
}

// ---------------------------------------------------------------- the report

export interface Example {
  ref: string;
  kind: DiffKind;
  msb?: string;
  rp?: string;
}
export interface EditionReport {
  edition: Edition;
  words: number;
  verses: number;
  versesDiffering: number;
  /** verses in the table that the edition's files do not have, and the reverse */
  tableOnly: string[];
  editionOnly: string[];
  counts: Record<DiffKind, number>;
  /** paragraph signs (¶) in the edition's verses that the table has too */
  paragraphSigns: number;
  examples: Record<DiffKind, Example[]>;
}
export interface Report {
  editions: Record<Edition, EditionReport>;
  places: { ref: string; place: Place }[];
  tally: Record<Edition | 'neither', number>;
  verdict: Edition | 'undecided';
  decidingVerses: number;
}

const EXAMPLES_PER_KIND = 10;
/** n items spread evenly through the list (the first, then every step), not the first n. */
export function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, k) => items[Math.floor((k * items.length) / n)]);
}

interface TableVerse {
  code: string;
  chapter: number;
  verse: number;
  ref: string;
  text: string;
}

export function buildReport(table: TableVerse[], rp: Record<Edition, Map<string, Map<string, string>>>): Report {
  const editions = {} as Record<Edition, EditionReport>;
  const all: Record<Edition, Record<DiffKind, Example[]>> = { '2005': emptyLists(), '2018': emptyLists() };
  for (const edition of ['2018', '2005'] as const) {
    editions[edition] = {
      edition,
      words: 0,
      verses: 0,
      versesDiffering: 0,
      tableOnly: [],
      editionOnly: [],
      counts: Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<DiffKind, number>,
      paragraphSigns: 0,
      examples: emptyLists(),
    };
  }
  const tableKeys = new Set(table.map((t) => `${t.code} ${t.chapter}:${t.verse}`));
  const places: { ref: string; place: Place }[] = [];
  const tally: Record<Edition | 'neither', number> = { '2005': 0, '2018': 0, neither: 0 };
  const decidingRefs = new Set<string>();
  for (const t of table) {
    const text: Record<Edition, string | undefined> = {
      '2005': rp['2005'].get(t.code)?.get(`${t.chapter}:${t.verse}`),
      '2018': rp['2018'].get(t.code)?.get(`${t.chapter}:${t.verse}`),
    };
    for (const edition of ['2018', '2005'] as const) {
      const report = editions[edition];
      report.verses++;
      report.words += rpWords(t.text).length;
      const rpText = text[edition];
      if (rpText === undefined) {
        report.tableOnly.push(t.ref);
        continue;
      }
      report.paragraphSigns += rpText.split('\u00B6').length - 1;
      const diffs = compareVerse(t.text, rpText);
      if (diffs.length) report.versesDiffering++;
      for (const d of diffs) {
        report.counts[d.kind]++;
        all[edition][d.kind].push({ ref: t.ref, kind: d.kind, msb: d.msb, rp: d.rp });
      }
    }
    if (text['2005'] !== undefined && text['2018'] !== undefined) {
      for (const place of decidingPlaces(t.text, text['2005'], text['2018'])) {
        tally[place.follows]++;
        places.push({ ref: t.ref, place });
        decidingRefs.add(t.ref);
      }
    }
  }
  for (const edition of ['2018', '2005'] as const) {
    for (const kind of KINDS) editions[edition].examples[kind] = spread(all[edition][kind], EXAMPLES_PER_KIND);
    for (const [code, verses] of rp[edition]) {
      for (const key of verses.keys()) if (!tableKeys.has(`${code} ${key}`)) editions[edition].editionOnly.push(`${bookName(code)} ${key}`);
    }
  }
  return { editions, places, tally, verdict: editionVerdict(tally), decidingVerses: decidingRefs.size };
}

function emptyLists(): Record<DiffKind, Example[]> {
  return Object.fromEntries(KINDS.map((k) => [k, [] as Example[]])) as Record<DiffKind, Example[]>;
}

const bookName = (code: string): string => BOOKS.find(([c]) => c === code)?.[1] ?? code;

const KIND_TITLES: Record<DiffKind, string> = {
  accent: 'accent/breathing (the same letters, a different accent, breathing, diaeresis or iota subscript)',
  punctuation: 'punctuation (the same word, different marks beside it)',
  spelling: 'spelling (a different word or different letters)',
  capitals: 'capitals (the same word, a capital letter on one side only)',
  added: 'word added (the table has a word the edition lacks)',
  missing: 'word missing (the edition has a word the table lacks)',
};
const KIND_SHORT: Record<DiffKind, string> = {
  accent: 'accent/breathing',
  punctuation: 'punctuation',
  spelling: 'spelling',
  capitals: 'capitals',
  added: 'word added',
  missing: 'word missing',
};

const cell = (s: string | undefined): string => (s ? `\`${s}\`` : '(none)');
const n = (x: number): string => x.toLocaleString('en-US');

export function renderReport(report: Report): string {
  const e18 = report.editions['2018'];
  const e05 = report.editions['2005'];
  const total = (e: EditionReport, ignoringAccents: boolean): number =>
    KINDS.reduce((sum, k) => sum + (ignoringAccents && k === 'accent' ? 0 : e.counts[k]), 0);
  const words = (e: EditionReport): number => e.counts.spelling + e.counts.capitals + e.counts.added + e.counts.missing;
  const lines: string[] = [];
  const out = (s = ''): void => void lines.push(s);

  out('# Which Robinson-Pierpont edition the Greek follows');
  out();
  out('Generated by `npm run greek:edition` (`scripts/greek-edition.ts`). It needs the network and rewrites this file; do not edit it by hand.');
  out();
  out('## Verdict');
  out();
  if (report.verdict === 'undecided') {
    out('Edition: undecided');
    out();
    out('The two editions do not differ, or the table agrees with each at the same number of the places where they do.');
  } else {
    const other = report.verdict === '2018' ? '2005' : '2018';
    out(`Edition: ${report.verdict}`);
    out();
    out(
      `**The Greek of the MSB tables (<${MSB_URL}>) follows the Robinson-Pierpont ${report.verdict} edition.** ` +
        `Of the ${n(report.tally['2005'] + report.tally['2018'] + report.tally.neither)} places where RP2005 and RP2018 differ in more than punctuation, ` +
        `the table has the ${report.verdict} reading at ${n(report.tally[report.verdict])}, the ${other} reading at ${n(report.tally[other])}, and neither at ${n(report.tally.neither)}.`,
    );
  }
  out();
  out('How it was found:');
  out();
  out(`- RP2018 is the repository <https://github.com/byztxt/byzantine-majority-text> at tag \`${RP_SOURCES['2018'].tag}\` (\`${RP_SOURCES['2018'].dir}\`, with the Pericope Adulterae and Acts 24:6-8 from their own files).`);
  out(`- RP2005 is the same repository at tag \`${RP_SOURCES['2005'].tag}\` (\`${RP_SOURCES['2005'].dir}\`): its README names release 2.0.3 as the one closest to the 2005 text.`);
  out('- The table is `msb_nt_tables.tsv`, its "MT Greek" column, each verse\'s words in Greek order.');
  out('- Each verse of the table is lined up with the same verse of an edition word by word (words with the same letters, ignoring accents, breathings and case, are matched; the words between two matches are paired in order). Every word that differs is counted once, by the most basic difference, in the order of the list below.');
  out('- Everything is in NFC. The elision apostrophe is one character in both. Punctuation is taken off each word and compared apart.');
  out();

  out('## The table against each edition');
  out();
  out(`The table has ${n(e18.words)} Greek words in ${n(e18.verses)} verses.`);
  out();
  out('| Difference | RP2018 | RP2005 |');
  out('| --- | ---: | ---: |');
  for (const k of KINDS) out(`| ${KIND_SHORT[k]} | ${n(e18.counts[k])} | ${n(e05.counts[k])} |`);
  out(`| **all, exact** | **${n(total(e18, false))}** | **${n(total(e05, false))}** |`);
  out(`| **all, ignoring accents and breathing** | **${n(total(e18, true))}** | **${n(total(e05, true))}** |`);
  out(`| **words that differ, ignoring accents, breathing and punctuation** | **${n(words(e18))}** | **${n(words(e05))}** |`);
  out(`| verses with any difference | ${n(e18.versesDiffering)} | ${n(e05.versesDiffering)} |`);
  out(`| table verses the edition's files lack | ${n(e18.tableOnly.length)} | ${n(e05.tableOnly.length)} |`);
  out(`| edition verses the table lacks | ${n(e18.editionOnly.length)} | ${n(e05.editionOnly.length)} |`);
  out();
  out(`The table's Greek column has almost no punctuation (it keeps the Greek question mark and the elision apostrophe, little else), while Robinson's texts are punctuated; so the punctuation row says how the table was made, not which edition it follows. RP2018's files also carry a paragraph sign (¶) at the start of paragraphs (${n(e18.paragraphSigns)} in the verses compared; ${n(e05.paragraphSigns)} in RP2005's), which the table's Greek never has; that is most of the gap between the two punctuation columns.`);
  out();
  for (const e of [e18, e05]) {
    const list = [...e.tableOnly, ...e.editionOnly];
    if (list.length) {
      out(`Verses on one side only against RP${e.edition} (first ten): ${spread(list, 10).join(', ')}.`);
      out();
    }
  }

  for (const e of [e18, e05]) {
    out(`## Examples against RP${e.edition}`);
    out();
    out(`Up to ten of each kind, spread through the New Testament. "Table" is the MSB table's word, "RP${e.edition}" the edition's.`);
    out();
    for (const k of KINDS) {
      out(`### ${KIND_TITLES[k]}: ${n(e.counts[k])}`);
      out();
      if (!e.examples[k].length) {
        out('None.');
        out();
        continue;
      }
      out(`| Verse | Table | RP${e.edition} |`);
      out('| --- | --- | --- |');
      for (const x of e.examples[k]) out(`| ${x.ref} | ${cell(x.msb)} | ${cell(x.rp)} |`);
      out();
    }
  }

  out('## Where RP2005 and RP2018 differ, and what the table has');
  out();
  out('How much this proves: the repository\'s two texts differ in only a handful of words (the places below), so the table can follow one of them at only a few places. Everywhere else the table is the same text as both: the few hundred "added" and "missing" words are the same against each edition and are words the table sets in another place or another verse (for example Matthew 4:3, where a word stands elsewhere in the verse, and Hebrews 1:1-2, where one stands in the next verse), not an edition\'s reading.');
  out();
  out(
    `RP2005 and RP2018 differ in more than punctuation at ${n(report.places.length)} places in ${n(report.decidingVerses)} verses. ` +
      `At each, the table's word is compared with both. Table follows RP2018: ${n(report.tally['2018'])}. Table follows RP2005: ${n(report.tally['2005'])}. Neither: ${n(report.tally.neither)}.`,
  );
  out();
  for (const follows of ['2018', '2005', 'neither'] as const) {
    const list = report.places.filter((p) => p.place.follows === follows);
    out(`### The table follows ${follows === 'neither' ? 'neither edition' : `RP${follows}`}: ${n(list.length)}`);
    out();
    if (!list.length) {
      out('None.');
      out();
      continue;
    }
    out('Up to twenty, spread through the New Testament.');
    out();
    out('| Verse | Table | RP2005 | RP2018 |');
    out('| --- | --- | --- | --- |');
    for (const { ref, place } of spread(list, 20)) out(`| ${ref} | ${cell(place.msb)} | ${cell(place.rp2005)} | ${cell(place.rp2018)} |`);
    out();
  }
  out('## Licence');
  out();
  out('Both editions are in the public domain (the repository\'s README and LICENSE.txt), as is the MSB table.');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- the run

export async function run(options: { rawDir: string; outFile: string; log: (line: string) => void }): Promise<Report> {
  const { rawDir, outFile, log } = options;
  log(`reading the MSB table (${MSB_URL})`);
  const tsv = await download(MSB_URL, join(rawDir, 'msb_nt_tables.tsv'));
  const table: TableVerse[] = parseMsb(tsv).map((v) => {
    const code = BOOKS.find(([, name]) => name === v.book)?.[0];
    if (!code) throw new Error(`MSB table: unknown book ${JSON.stringify(v.book)}`);
    const text = [...v.words].sort((a, b) => a.greekSort - b.greekSort).map((w) => w.greek).join(' ');
    return { code, chapter: v.chapter, verse: v.n, ref: `${v.book} ${v.chapter}:${v.n}`, text };
  });
  log(`${table.length} verses; reading RP2018 and RP2005 from GitHub`);
  const rp = { '2018': await loadEdition('2018', rawDir), '2005': await loadEdition('2005', rawDir) };
  const report = buildReport(table, rp);
  writeFileSync(outFile, renderReport(report));
  log(`verdict: ${report.verdict}; ${report.places.length} deciding places (${JSON.stringify(report.tally)}); wrote ${outFile}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run({ rawDir: 'data/raw', outFile: 'docs/greek-edition.md', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
