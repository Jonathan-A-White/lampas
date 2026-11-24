// scripts/lxx/align-choose.ts — npm run lxx:align-choose -- --list --book <code> --chapter <n>   |   --book <code> --chapter <n> --from <file>   (story mw-u2w5klk.274.2; docs/lxx-align.md, 'The model pass')
// The model pass over what the aligner (align.ts) could not pair. A verse's English the aligner left in remainder chunks (y 'align?', one for each run of unpaired English words) and the Greek words it
// left with no English: a Builder's own session reads each verse (`--list` prints it) and writes one line a run, the probe's way (choose.ts):
//   `ref#run text @positions [?|guess]`    `Gen.1:2#1 was @3 / and unfurnished, @5,6 ?`
// The run is cut into chunks at the slashes; each chunk is the English words it holds and, after `@`, the positions in the verse's `g` of the Greek words it renders (`-` for none: English the translators
// supplied or Brenton's own); `Gen.1:2 *` says that every run of the verse with no line of its own renders no Greek (`@-`); `?` marks a chunk the model is unsure of and `guess` one it is guessing. A run of one chunk may leave the text out: `Gen.1:2#3 @4`. The file is held against the chapter and
// written as data/lxx/align/<book>-<chapter>.tsv, one row a chunk, with the confidence (0.8 chosen, 0.5 unsure, 0.4 guess, as choose.ts). A position outside the verse's words, a Greek word the aligner
// already paired, a word in two chunks, chunks that do not read as the run, a run with no line or a line for none are each refused with their reference, and nothing is written on any refusal.
// `lxx:ship` reads the rows (align.ts alignChapter → applyModel): each run is replaced by the model's chunks, `{ t, g, s?, c, y: 'model' }`, and each paired Greek word's `e` points at its chunk; a run whose
// text is no longer what the aligner leaves (the aligner has changed) is kept as the aligner left it and named in the ship's notes as stale, never dropped. PROVISIONAL, Governor to confirm: the shape, `c`, `y`.
// The model is a Lampas Builder's own session; no paid API is called.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Chapter, EnglishChunk, GreekWord, Verse } from '../../src/data/chapter';
import { CONFIDENCE_CHOSEN, CONFIDENCE_GUESS, CONFIDENCE_UNSURE, type ChoiceMark } from './choices';
import { MORPHEUS_DIR, morpheusBuildCommand } from './morpheus';
import type { ShipOptions } from './ship';
import { requireSources } from './sources';

/** Where the model pass's rows are kept: `<book>-<chapter>.tsv`, one file a chapter, so the stories of one book never touch the same file. */
export const ALIGN_CHOICES_DIR = join('data', 'lxx', 'align');

export const alignChoicesName = (code: string, chapter: number): string => `${code.toLowerCase()}-${String(chapter).padStart(2, '0')}.tsv`;

export const MODEL_HEADER = ['ref', 'run', 'text', 'g', 'mark', 'confidence'];

/** The `run` of a row that is a fix, not a run's chunk; the file writes it `fix` (applyFixes, mw-u2w5klk.349.32). */
export const FIX_RUN = 0;

/** One chunk of a run, as the session wrote it. `text` is absent where a run of one chunk leaves it out. */
export interface ModelChunk {
  text: string | undefined;
  g: number[];
  mark: ChoiceMark;
}

/** One line of a session's file: the cut of one run. */
export interface ModelLine {
  ref: string;
  run: number;
  chunks: ModelChunk[];
  /** the line's number in the file, from 1 */
  line: number;
}

/** A row of the model's file: one chunk of one run, or (`run` FIX_RUN, written `fix`) one fix of the aligner's pairing (applyFixes). */
export interface ModelRow {
  /** the verse, `Gen.1:2` */
  ref: string;
  /** which remainder of the verse, from 1; FIX_RUN (0) for a fix */
  run: number;
  text: string;
  g: number[];
  mark: ChoiceMark;
  confidence: number;
}

/** A run: the `run`th remainder chunk of a verse, at chunk position `chunk` of its `e`. */
export interface Run {
  run: number;
  chunk: number;
}

const round2 = (x: number): number => Math.round(x * 100) / 100;
const words = (text: string): string => text.split(/\s+/).filter(Boolean).join(' ');
const capital = (code: string): string => code.charAt(0).toUpperCase() + code.slice(1);

/** A verse's reference as the model's file has it: `Gen.1:2`. */
export const verseRef = (chapter: Pick<Chapter, 'code' | 'chapter'>, verse: Pick<Verse, 'n'>): string => `${capital(chapter.code)}.${chapter.chapter}:${verse.n}`;

/** The remainders of a verse, in English order, numbered from 1: the runs the model is to cut. */
export function runsOf(verse: Verse): Run[] {
  const out: Run[] = [];
  verse.e.forEach((chunk, i) => {
    if (chunk.y === 'align?') out.push({ run: out.length + 1, chunk: i });
  });
  return out;
}

export const confidenceOf = (mark: ChoiceMark): number => (mark === 'guess' ? CONFIDENCE_GUESS : mark === 'unsure' ? CONFIDENCE_UNSURE : CONFIDENCE_CHOSEN);

const REF = /^([1-3A-Za-z]{3}\.\d+:\d+)#(\d+)\s*(.*)$/;
const REST = /^([1-3A-Za-z]{3}\.\d+:\d+)\s+\*$/;
const CHUNK = /^(.*?)\s*@(-|\d+(?:,\d+)*)(?:\s+(\?|guess))?$/;

/** The lines of a session's file; `#` at the start of a line is a comment. A line that is not a run, or a chunk with no positions, is an offence naming its line. */
export function parseModelLines(text: string): { lines: ModelLine[]; offences: string[] } {
  const lines: ModelLine[] = [];
  const offences: string[] = [];
  text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const line = i + 1;
      const rest = REST.exec(trimmed);
      if (rest) return void lines.push({ ref: rest[1], run: 0, chunks: [], line });
      const head = REF.exec(trimmed);
      if (!head) return void offences.push(`line ${line}: '${trimmed}' does not start with a run like Gen.1:2#1`);
      const parts = head[3].split(' / ');
      const chunks: ModelChunk[] = [];
      for (const part of parts) {
        const m = CHUNK.exec(part.trim());
        if (!m) return void offences.push(`line ${line}: ${head[1]}#${head[2]}: '${part.trim()}' has no Greek positions (@3,4, or @- for none)`);
        const text = words(m[1]);
        if (text === '' && parts.length > 1) return void offences.push(`line ${line}: ${head[1]}#${head[2]}: a chunk of a run cut in several has no text`);
        chunks.push({ text: text === '' ? undefined : text, g: m[2] === '-' ? [] : m[2].split(',').map(Number), mark: m[3] === '?' ? 'unsure' : m[3] === 'guess' ? 'guess' : '' });
      }
      lines.push({ ref: head[1], run: Number(head[2]), chunks, line });
    });
  return { lines, offences };
}

/** What is wrong with the chunks of one run, each beginning with the Greek word or the text it is about. `taken` holds the Greek words the verse's other runs have, and takes this run's. */
function offencesOfRun(verse: Verse, runText: string, chunks: readonly ModelChunk[], taken: Set<number>): string[] {
  const out: string[] = [];
  const read = chunks.map((c) => c.text ?? runText).join(' ');
  if (words(read) !== words(runText)) out.push(`the chunks read '${words(read)}', the run is '${words(runText)}'`);
  const mine = new Set<number>();
  for (const chunk of chunks) {
    for (const g of chunk.g) {
      if (!Number.isInteger(g) || g < 0 || g >= verse.g.length) out.push(`Greek word ${g} is outside the verse's word positions (0 to ${verse.g.length - 1})`);
      else if (verse.g[g].e !== undefined) out.push(`Greek word ${g} (${verse.g[g].t}) is already paired by the aligner`);
      else if (taken.has(g) || mine.has(g)) out.push(`Greek word ${g} is in two chunks`);
      mine.add(g);
    }
  }
  if (out.length === 0) mine.forEach((g) => taken.add(g));
  return out;
}

/**
 * A session's lines held against the chapter the aligner made (without the model): every run needs exactly one line, a line needs a verse and a run of that verse, and each line's chunks must pass
 * offencesOfRun. The rows come in the chapter's order.
 */
export function checkModelLines(chapter: Chapter, lines: readonly ModelLine[]): { rows: ModelRow[]; offences: string[] } {
  const offences: string[] = [];
  const byVerse = new Map(chapter.verses.map((v) => [verseRef(chapter, v).toLowerCase(), v]));
  const first = new Map<string, ModelLine>();
  const rest = new Map<string, ModelLine>();
  for (const line of lines) {
    if (line.run === 0) {
      if (!byVerse.has(line.ref.toLowerCase())) offences.push(`${line.ref} *: not a verse of this chapter (line ${line.line})`);
      else if (rest.has(line.ref.toLowerCase())) offences.push(`${line.ref} *: given twice (lines ${rest.get(line.ref.toLowerCase())!.line} and ${line.line})`);
      else rest.set(line.ref.toLowerCase(), line);
      continue;
    }
    const key = `${line.ref.toLowerCase()}#${line.run}`;
    const earlier = first.get(key);
    if (earlier) offences.push(`${line.ref}#${line.run}: given twice (lines ${earlier.line} and ${line.line})`);
    else {
      first.set(key, line);
      const verse = byVerse.get(line.ref.toLowerCase());
      if (!verse) offences.push(`${line.ref}#${line.run}: not a verse of this chapter (line ${line.line})`);
      else if (!runsOf(verse).some((r) => r.run === line.run)) offences.push(`${line.ref}#${line.run}: the verse has no such run (line ${line.line})`);
    }
  }
  const rows: ModelRow[] = [];
  for (const verse of chapter.verses) {
    const ref = verseRef(chapter, verse);
    const taken = new Set<number>();
    for (const { run, chunk } of runsOf(verse)) {
      const own = first.get(`${ref.toLowerCase()}#${run}`);
      const none = rest.get(ref.toLowerCase());
      const line: ModelLine | undefined = own ?? (none ? { ref, run, chunks: [{ text: undefined, g: [], mark: '' }], line: none.line } : undefined);
      const runText = verse.e[chunk].t;
      if (!line) {
        offences.push(`${ref}#${run}: no choice for run '${runText}'`);
        continue;
      }
      const bad = offencesOfRun(verse, runText, line.chunks, taken);
      if (bad.length > 0) {
        offences.push(...bad.map((b) => `${ref}#${run}: ${b} (line ${line.line})`));
        continue;
      }
      for (const c of line.chunks) rows.push({ ref, run, text: words(c.text ?? runText), g: [...c.g].sort((a, b) => a - b), mark: c.mark, confidence: confidenceOf(c.mark) });
    }
  }
  return { rows: offences.length > 0 ? [] : rows, offences };
}

/** The model's file: tab-separated, a header row, one row a chunk in the chapter's order, a newline at the end. */
export const modelRowsTsv = (rows: readonly ModelRow[]): string =>
  [MODEL_HEADER, ...rows.map((r) => [r.ref, r.run === FIX_RUN ? 'fix' : String(r.run), r.text, r.g.length > 0 ? r.g.join(',') : '-', r.mark, r.confidence.toFixed(2)])].map((r) => r.join('\t')).join('\n') + '\n';

/** The rows of a model's file. A malformed line is an error naming it. */
export function readModelRows(text: string, source = 'model file'): ModelRow[] {
  const rows: ModelRow[] = [];
  let header = false;
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim() || raw.startsWith('#')) return;
    const c = raw.split('\t');
    if (!header) {
      header = true;
      if (c[0] === 'ref') return;
    }
    const where = `${source}, line ${i + 1}`;
    const [ref, run, t, g, mark = '', confidence] = c;
    if (!ref || !/^[1-3A-Za-z]{3}\.\d+:\d+$/.test(ref) || !/^(\d+|fix)$/.test(run ?? '')) throw new Error(`${where}: '${raw}' is not a row like Gen.1:2<TAB>1<TAB>text<TAB>3,4<TAB>mark<TAB>0.80 (run a number, or fix)`);
    if (!t?.trim()) throw new Error(`${where}: ${ref}#${run} has no text`);
    if (g !== '-' && !/^\d+(,\d+)*$/.test(g ?? '')) throw new Error(`${where}: the positions '${g}' are not a list like 3,4 or -`);
    if (mark !== '' && mark !== 'unsure' && mark !== 'guess') throw new Error(`${where}: the mark '${mark}' is not unsure or guess`);
    const conf = Number(confidence);
    if (!(conf > 0 && conf <= 1)) throw new Error(`${where}: the confidence '${confidence}' is not above 0 and at most 1`);
    rows.push({ ref, run: run === 'fix' ? FIX_RUN : Number(run), text: t, g: g === '-' ? [] : g.split(',').map(Number), mark: mark as ChoiceMark, confidence: conf });
  });
  return rows;
}

/** Every file of the directory, by `<book>/<chapter>` (the book's lower-case code and the chapter number as a plain number): the rows the ship applies. A missing directory has none. */
export function readModelDir(dir: string): Map<string, ModelRow[]> {
  const out = new Map<string, ModelRow[]>();
  if (!dir || !existsSync(dir)) return out;
  for (const file of readdirSync(dir).sort()) {
    const m = /^([1-3a-z]{3})-(\d+)\.tsv$/.exec(file);
    if (m) out.set(`${m[1]}/${Number(m[2])}`, readModelRows(readFileSync(join(dir, file), 'utf8'), join(dir, file)));
  }
  return out;
}

/** What `applyModel` gives: the chapter, the runs it kept as the aligner left them (named, with why), and nothing else changed. */
export interface Modelled {
  chapter: Chapter;
  stale: string[];
}

/**
 * Puts the model's chunks into the chapter's verses. The rows of a run replace its remainder chunk when they hold up against the verse (offencesOfRun: the same English, Greek words that exist, are free and
 * are in one chunk only); a run whose rows do not, a run with no rows in a chapter that has some, and rows for a run that is not there, leave the aligner's chunk as it was and are named as stale. A chunk's
 * supplied words (`s`) go to the chunk they fall in. Each Greek word's `e` is then the position of its chunk. A chapter given no rows is given back as it is.
 */
export function applyModel(chapter: Chapter, allRows: readonly ModelRow[]): Modelled {
  // a fix is not a run's chunk: applyFixes has it, after the runs
  const rows = allRows.filter((r) => r.run !== FIX_RUN);
  if (rows.length === 0) return { chapter, stale: [] };
  const stale: string[] = [];
  const byRun = new Map<string, ModelRow[]>();
  for (const r of rows) byRun.set(`${r.ref.toLowerCase()}#${r.run}`, [...(byRun.get(`${r.ref.toLowerCase()}#${r.run}`) ?? []), r]);
  const known = new Set<string>();
  const verses = chapter.verses.map((verse) => {
    const ref = verseRef(chapter, verse);
    const taken = new Set<number>();
    const replace = new Map<number, EnglishChunk[]>();
    for (const { run, chunk } of runsOf(verse)) {
      const key = `${ref.toLowerCase()}#${run}`;
      known.add(key);
      const mine = byRun.get(key);
      const old = verse.e[chunk];
      if (!mine) {
        stale.push(`${ref}#${run} has no choice by the model pass ('${old.t}'): kept as the aligner left it`);
        continue;
      }
      const bad = offencesOfRun(verse, old.t, mine.map((r) => ({ text: r.text, g: r.g, mark: r.mark })), taken);
      if (bad.length > 0) {
        stale.push(`${ref}#${run} is stale (${bad[0]}): kept as the aligner left it`);
        continue;
      }
      // the supplied words of the run are the ones at these positions among its words; each chunk takes those that fall in it
      const supplied = new Set(Array.isArray(old.s) ? old.s : []);
      let at = 0;
      replace.set(
        chunk,
        mine.map((r): EnglishChunk => {
          const count = r.text.split(/\s+/).filter(Boolean).length;
          const s = Array.from({ length: count }, (_, k) => k).filter((k) => supplied.has(at + k));
          at += count;
          const out: EnglishChunk = { t: r.text, g: [...r.g] };
          if (s.length > 0) out.s = s;
          out.c = round2(r.confidence);
          out.y = 'model';
          return out;
        }),
      );
    }
    if (replace.size === 0) return verse;
    const e = verse.e.flatMap((chunk, i) => replace.get(i) ?? [chunk]);
    const g = verse.g.map((w) => {
      const word: GreekWord = { ...w };
      delete word.e;
      return word;
    });
    e.forEach((chunk, i) => chunk.g.forEach((k) => (g[k].e = i)));
    return { ...verse, g, e };
  });
  for (const key of byRun.keys()) if (!known.has(key)) stale.push(`${key.replace(/^(.)/, (c) => c.toUpperCase())} is no run of this chapter: its rows are not used`);
  return { chapter: { ...chapter, verses }, stale };
}

/**
 * The fixes of the aligner's own pairs (mw-u2w5klk.349.32). The model pass re-chooses remainders and never a pair, but the aligner sometimes pairs a Greek word to the wrong English word of a phrase
 * ('tent,' to ἀποσκηνώσας in 'having removed his tent,', 'up' to ἀναβλέψας in 'lifted up', 'Return' to κυρίαν, 'offering' to ὁλοκάρπωσιν in 'a whole burnt offering'), and then the English word that
 * renders it has no Greek and a tap on it opens the Verse view, or the Greek word of a neighbour. A fix row (`run` written `fix`) names English words of the verse, as they read in a row of its chunks, and
 * the Greek positions they render: the chunks that read so are replaced by ONE chunk `{ t, g, s?, c, y: 'model' }` (the supplied words go to it); `g` `-` makes of them a chunk that renders no Greek word.
 * A fix's words are whole chunks; where no whole chunks read so, a fix may begin or end inside a chunk that renders no Greek word (Genesis 17:13: 'money' of the run's chunk 'money shall'), and the words it
 * leaves are a chunk of their own, of the same kind. A chunk that renders a Greek word is never cut.
 * Fixes come after the runs and before joinSupplied, so a run's number is still the aligner's own. A verse's fixes are applied together and kept only if every one finds its words once in the verse, no
 * Greek word is then in two chunks, and no Greek word that had English is left without; otherwise the verse is kept as it was and named as stale (the aligner changed since the fix), never dropped.
 */
export function applyFixes(chapter: Chapter, rows: readonly ModelRow[]): Modelled {
  const fixes = rows.filter((r) => r.run === FIX_RUN);
  if (fixes.length === 0) return { chapter, stale: [] };
  const stale: string[] = [];
  const verses = chapter.verses.map((verse) => {
    const ref = verseRef(chapter, verse);
    const mine = fixes.filter((r) => r.ref.toLowerCase() === ref.toLowerCase());
    if (mine.length === 0) return verse;
    const stalled = (why: string): Verse => {
      stale.push(`${ref} fixes are stale (${why}): the verse is kept as the model pass left it`);
      return verse;
    };
    let e = verse.e.map((c) => ({ ...c }));
    for (const r of mine) {
      const want = words(r.text).split(' ');
      // every word of the verse's English, with the chunk it is in and its place there
      const spots = e.flatMap((c, i) => words(c.t).split(' ').map((w, k) => ({ w, i, k })));
      const size = e.map((c) => words(c.t).split(' ').length);
      // the fix's first and last word, by their place among the verse's words, and whether its words are whole chunks
      const found: Array<{ from: number; to: number; whole: boolean }> = [];
      for (let s = 0; s + want.length <= spots.length; s++) {
        if (!want.every((w, k) => spots[s + k].w === w)) continue;
        const first = spots[s];
        const last = spots[s + want.length - 1];
        const front = first.k === 0;
        const back = last.k === size[last.i] - 1;
        // a chunk that renders a Greek word is never cut: only the words of one that renders none may be left out of the fix (mw-u2w5klk.349.40)
        const cuttable = (front || e[first.i].g.length === 0) && (back || e[last.i].g.length === 0);
        if ((front && back) || cuttable) found.push({ from: s, to: s + want.length - 1, whole: front && back });
      }
      // a fix whose words are whole chunks reads as it always did; only when none is, may it cut into a chunk of no Greek word
      const whole = found.filter((f) => f.whole);
      const at = whole.length > 0 ? whole : found;
      if (at.length !== 1) {
        stale.push(`${ref} fix '${r.text}' ${at.length === 0 ? 'finds no such chunks' : 'finds them in several places'}: the verse is kept as the model pass left it`);
        return verse;
      }
      const hit = at[0];
      const { from: first, to: last } = hit;
      const [firstSpot, lastSpot] = [spots[first], spots[last]];
      const span = e.slice(firstSpot.i, lastSpot.i + 1);
      // the supplied words of the span, by their place among the fix's words
      const supplied: number[] = [];
      for (let t = first; t <= last; t++) if ((e[spots[t].i].s ?? []).includes(spots[t].k)) supplied.push(t - first);
      const chunk: EnglishChunk = { t: want.join(' '), g: [...r.g].sort((a, b) => a - b) };
      if (supplied.length > 0) chunk.s = supplied;
      chunk.c = round2(r.confidence);
      chunk.y = 'model';
      // the words of a cut chunk that are not the fix's stay as a chunk of their own, of the same kind
      const piece = (c: EnglishChunk, from: number, to: number): EnglishChunk => {
        const out: EnglishChunk = { ...c, t: words(c.t).split(' ').slice(from, to).join(' '), g: [] };
        const s = (c.s ?? []).filter((k) => k >= from && k < to).map((k) => k - from);
        if (s.length > 0) out.s = s;
        else delete out.s;
        return out;
      };
      const before = firstSpot.k > 0 ? [piece(span[0], 0, firstSpot.k)] : [];
      const after = lastSpot.k < size[lastSpot.i] - 1 ? [piece(span[span.length - 1], lastSpot.k + 1, size[lastSpot.i])] : [];
      e = [...e.slice(0, firstSpot.i), ...before, chunk, ...after, ...e.slice(lastSpot.i + 1)];
    }
    const seen = new Set<number>();
    for (const c of e) {
      for (const k of c.g) {
        if (!Number.isInteger(k) || k < 0 || k >= verse.g.length) return stalled(`Greek word ${k} is outside the verse's word positions`);
        if (seen.has(k)) return stalled(`Greek word ${k} (${verse.g[k].t}) is in two chunks`);
        seen.add(k);
      }
    }
    const lost = verse.g.findIndex((w, k) => w.e !== undefined && !seen.has(k));
    if (lost >= 0) return stalled(`Greek word ${lost} (${verse.g[lost].t}) is left with no English`);
    const g = verse.g.map((w) => {
      const word: GreekWord = { ...w };
      delete word.e;
      return word;
    });
    e.forEach((chunk, i) => chunk.g.forEach((k) => (g[k].e = i)));
    return { ...verse, g, e };
  });
  const refs = new Set(chapter.verses.map((v) => verseRef(chapter, v).toLowerCase()));
  for (const r of fixes) if (!refs.has(r.ref.toLowerCase())) stale.push(`${r.ref} fix '${r.text}' is for no verse of this chapter: not used`);
  return { chapter: { ...chapter, verses }, stale };
}

// ---------------------------------------------------------------- the listing

/**
 * What a verse's fix rows say of the aligner's own chunks, as a session reads them in the listing (mw-u2w5klk.349.33): a fix whose English is, word for word, a run of the aligner's own chunks (none a remainder,
 * so the run numbers stay the ship's) is shown at the first of them with the Greek positions the fix gives, `Peradventure⟨0,1 fix⟩` for the aligner's `Peradventure⟨2⟩`. A fix that finds its words in more than
 * one place, in none, or among a remainder is not shown: the ship applies it after the runs (applyFixes), where the model pass's chunks are the ones it names.
 */
export function previewFixes(verse: Verse, ref: string, rows: readonly ModelRow[]): Map<number, { text: string; span: number; g: number[] }> {
  const out = new Map<number, { text: string; span: number; g: number[] }>();
  const taken = new Set<number>();
  for (const r of rows) {
    if (r.run !== FIX_RUN || r.ref.toLowerCase() !== ref.toLowerCase()) continue;
    const want = words(r.text).split(' ');
    const at: Array<{ i: number; span: number }> = [];
    for (let i = 0; i < verse.e.length; i++) {
      let got: string[] = [];
      let j = i;
      for (; j < verse.e.length && got.length < want.length && verse.e[j].y !== 'align?'; j++) got = got.concat(words(verse.e[j].t).split(' '));
      if (got.length === want.length && got.every((w, k) => w === want[k])) at.push({ i, span: j - i });
    }
    if (at.length !== 1) continue;
    const { i, span } = at[0];
    const cover = Array.from({ length: span }, (_, k) => i + k);
    if (cover.some((k) => taken.has(k))) continue;
    cover.forEach((k) => taken.add(k));
    out.set(i, { text: words(r.text), span, g: [...r.g].sort((x, y) => x - y) });
  }
  return out;
}

/**
 * The verses that still have a run, for a session to read: the Greek words with the ones that have no English marked, and the English with each run numbered. `fixes` are the rows of the chapter's file
 * (applyFixes): an aligner pair a fix row moves is shown on the Greek positions the fix gives and marked `fix`.
 */
export function listRemainders(chapter: Chapter, fixes: readonly ModelRow[] = []): string {
  const out: string[] = [];
  for (const verse of chapter.verses) {
    const runs = runsOf(verse);
    if (runs.length === 0) continue;
    const ref = verseRef(chapter, verse);
    const free = verse.g.map((w, i) => ({ w, i })).filter(({ w }) => w.e === undefined);
    const fixed = previewFixes(verse, ref, fixes);
    const english: string[] = [];
    for (let i = 0; i < verse.e.length; i++) {
      const c = verse.e[i];
      const fix = fixed.get(i);
      if (fix) {
        english.push(`${fix.text}⟨${fix.g.length > 0 ? fix.g.join(',') : '-'} fix⟩`);
        i += fix.span - 1;
      } else english.push(c.y === 'align?' ? `{#${runs.find((r) => r.chunk === i)!.run} ${c.t}}` : `${c.t}⟨${c.g.join(',')}⟩`);
    }
    out.push(
      ref,
      `  Greek: ${verse.g.map((w, i) => `${i}:${w.t}${w.e === undefined ? '*' : ''}`).join(' ')}`,
      `  no English yet: ${free.length === 0 ? '(none)' : free.map(({ w, i }) => `${i} ${w.l} ${w.p}`).join(' · ')}`,
      `  English: ${english.join(' ')}`,
    );
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- the command

export const ALIGN_CHOOSE_USAGE = 'usage: npm run lxx:align-choose -- --list --book <code> --chapter <n>   |   npm run lxx:align-choose -- --book <code> --chapter <n> --from <file>';

export interface AlignChooseOptions {
  /** where the model's files are written; default data/lxx/align */
  outDir?: string;
  /** where the listing goes; default console.log */
  print?: (text: string) => void;
  log?: (line: string) => void;
  /** the ship that makes the chapter the model reads (a test gives its sources) */
  ship?: ShipOptions;
}

export interface AlignChooseArgs {
  book: string;
  chapter: number;
  list: boolean;
  from?: string;
  rest: string[];
}

export function parseAlignChooseArgs(argv: readonly string[]): AlignChooseArgs {
  const args: AlignChooseArgs = { book: '', chapter: 0, list: false, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--list') args.list = true;
    else if (flag === '--no-morpheus') args.rest.push(flag);
    else if (flag === '--book' || flag === '--chapter' || flag === '--from') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(ALIGN_CHOOSE_USAGE);
      if (flag === '--book') args.book = value.toLowerCase();
      else if (flag === '--chapter') args.chapter = Number(value);
      else args.from = value;
    } else throw new Error(ALIGN_CHOOSE_USAGE);
  }
  if (!/^[1-3a-z]{3}$/.test(args.book) || !Number.isInteger(args.chapter) || args.chapter < 1 || (args.list === (args.from !== undefined))) throw new Error(ALIGN_CHOOSE_USAGE);
  return args;
}

export class AlignChooseRefused extends Error {
  offences: string[];
  constructor(what: string, offences: string[]) {
    super([`lxx:align-choose ${what}: refused, nothing written:`, ...offences.map((o) => `  ${o}`)].join('\n'));
    this.offences = offences;
  }
}

/** The one line for a book with no Morpheus cache in `dir`, or undefined when it has one. A fresh worktree gets the cache by `npm run lxx:link`; `--no-morpheus` goes on without it. */
export function missingMorpheusLink(book: string, dir: string): string | undefined {
  const file = join(dir, `${book.toLowerCase()}.tsv`);
  if (existsSync(file)) return undefined;
  return `lxx:align-choose: no Morpheus cache for ${book} (${file}): run npm run lxx:link (or build it: ${morpheusBuildCommand(book)}); --no-morpheus goes on without it. Nothing was downloaded.`;
}

/** The chapter as the aligner leaves it, at the stage `lxx:ship` applies the rows at: no rows, and before joinSupplied (align.ts alignRuns; a ship into a temporary directory). */
async function chapterWithoutModel(args: AlignChooseArgs, options: AlignChooseOptions): Promise<Chapter> {
  const { scratch = tmpdir(), ...ship } = options.ship ?? {};
  const dir = mkdtempSync(join(scratch, 'lampas-lxx-align-choose-'));
  try {
    const { runShip } = await import('./ship');
    await runShip(['--out', dir, ...args.rest], { ...ship, scratch, alignDir: '', runsOnly: true, log: () => undefined });
    const file = join(dir, args.book, `${args.chapter}.json`);
    if (!existsSync(file)) throw new Error(`lxx:align-choose: ${args.book} ${args.chapter} is not a shipped chapter`);
    return JSON.parse(readFileSync(file, 'utf8')) as Chapter;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function runAlignChoose(argv: readonly string[], options: AlignChooseOptions = {}): Promise<{ path?: string; rows: ModelRow[] }> {
  const { outDir = ALIGN_CHOICES_DIR, print = console.log, log = () => undefined } = options;
  const args = parseAlignChooseArgs(argv);
  // before anything is read or downloaded: no cache, and the ship would fetch data/raw into this worktree and then call real chapters 'not a shipped chapter' (mw-u2w5klk.349.25)
  const missing = args.rest.includes('--no-morpheus') ? undefined : missingMorpheusLink(args.book, options.ship?.morpheusDir ?? MORPHEUS_DIR);
  if (missing) throw new Error(missing);
  let text = '';
  if (args.from) {
    try {
      text = readFileSync(args.from, 'utf8');
    } catch (error) {
      throw new Error(`lxx:align-choose: cannot read ${args.from}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const chapter = await chapterWithoutModel(args, options);
  if (args.list) {
    // the chapter's file may hold fix rows (applyFixes): the listing shows the aligner pairs they move (previewFixes)
    const file = join(outDir, alignChoicesName(args.book, args.chapter));
    const fixes = existsSync(file) ? readModelRows(readFileSync(file, 'utf8'), file).filter((r) => r.run === FIX_RUN) : [];
    print(listRemainders(chapter, fixes));
    return { rows: [] };
  }
  const parsed = parseModelLines(text);
  const checked = checkModelLines(chapter, parsed.lines);
  const offences = [...parsed.offences, ...checked.offences];
  if (offences.length > 0) throw new AlignChooseRefused(`--book ${args.book} --chapter ${args.chapter}`, offences);
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, alignChoicesName(args.book, args.chapter));
  // the file may already hold the chapter's fix rows (applyFixes, mw-u2w5klk.349.32): the session's file has runs only, so they are read back and kept, after the runs (mw-u2w5klk.349.39)
  const fixes = existsSync(path) ? readModelRows(readFileSync(path, 'utf8'), path).filter((r) => r.run === FIX_RUN) : [];
  writeFileSync(path, modelRowsTsv([...checked.rows, ...fixes]));
  const count = (mark: ChoiceMark): number => checked.rows.filter((r) => r.mark === mark).length;
  log(`wrote ${path}: ${checked.rows.length} chunks of ${runsOfChapter(chapter)} runs; ${count('')} chosen (0.8), ${count('unsure')} unsure (0.5), ${count('guess')} guesses (0.4)${fixes.length > 0 ? `; kept ${fixes.length} fix rows` : ''}`);
  return { path, rows: [...checked.rows, ...fixes] };
}

const runsOfChapter = (chapter: Chapter): number => chapter.verses.reduce((a, v) => a + runsOf(v).length, 0);

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  requireSources('lxx:align-choose', process.argv.slice(2));
  runAlignChoose(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
