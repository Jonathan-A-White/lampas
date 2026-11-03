// scripts/lxx/audit-sample.ts — the hand audit of the settled words (story mw-u2w5klk.24; docs/sources/lxx-settled-audit.md).
//
//   npx tsx scripts/lxx/audit-sample.ts                   the sample: for each of the 39 books of the Old Testament, 6 words drawn uniformly at random from the
//                                                         words layer 1 settled and 6 from those layer 2 or the agreement check (2a) settled; each with its verse in
//                                                         Swete's Greek (the word marked) and Brenton's English (LXX2012)
//   npx tsx scripts/lxx/audit-sample.ts --book Gen        the same sample, only that book's words printed (the draw is the same: every book is drawn in order)
//   npx tsx scripts/lxx/audit-sample.ts --morpheus        with Morpheus's readings of each sampled form (needs Docker and the image: docs/lxx-derivation.md 'Morpheus')
//   npx tsx scripts/lxx/audit-sample.ts --count <file.md> the counts of the audit file's verdicts: per book and per layer, with the 95% (Wilson) interval
//
// The draw is seeded (SEED), so every run prints the same sample. The books are derived as a fresh checkout derives them: layers 1 and 2 and the agreement
// check, with no Morpheus cache (data/lxx/morpheus is git-ignored, so a word settled through it would not be the same on every checkout) and no choices file
// (a choice is layer 3, which this audit does not sample). Nothing is filtered or weighted: a word is in a pool when its layer says so. Writes nothing.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseUsfm, usfmFileOf, carriedAsGreek, LXX2012_RAW } from '../data/lxx2012';
import { OT_BOOKS } from '../data/tvtms';
import { AGREEMENT_LAYER } from './agreement';
import { deriveBook, loadInput, splitBooks, train, supportOf, type DerivedWord } from './derive';
import { dockerEngine, formOf, fromBeta, mapAnalysis, morpheusKey, parseCruncher, toBeta } from './morpheus';
import { OLD_TESTAMENT } from './report';
import { RAW_DIR } from './sources';
import type { SweteWord } from './swete';

/** The seed the story names (mw-u2w5klk.24): the day of the Governor's word, 2026-11-03. */
export const SEED = 20261103;
/** Words drawn from each pool of each book. */
export const PER_POOL = 6;

export type Pool = 'layer 1' | 'layer 2 or 2a';
export const POOLS: readonly Pool[] = ['layer 1', 'layer 2 or 2a'];

export const poolOf = (w: Pick<DerivedWord, 'layer'>): Pool | undefined =>
  w.layer === 1 ? 'layer 1' : w.layer === 2 || w.layer === AGREEMENT_LAYER ? 'layer 2 or 2a' : undefined;

/** mulberry32: a small seeded generator, uniform on [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** k of n positions, uniformly without replacement (the first k steps of a Fisher-Yates shuffle), in ascending order. */
export function draw(n: number, k: number, rand: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  const take = Math.min(k, n);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, take).sort((a, b) => a - b);
}

export interface Sampled {
  book: string;
  pool: Pool;
  word: SweteWord;
  derived: DerivedWord;
  /** the word's position in its verse's words */
  verseWords: SweteWord[];
}

export interface BookDraw {
  book: string;
  sizes: Record<Pool, number>;
  picked: Sampled[];
}

/** The whole sample, every book in OLD_TESTAMENT's order and each book's pools in POOLS' order, from one generator. */
export async function sample(rawDir: string = RAW_DIR): Promise<BookDraw[]> {
  const input = await loadInput(rawDir);
  const trained = train(input);
  const books = splitBooks(input);
  const rand = mulberry32(SEED);
  const out: BookDraw[] = [];
  for (const [code] of OLD_TESTAMENT) {
    const tokens = books.get(code);
    if (!tokens) throw new Error(`no book '${code}' in Swete's file`);
    const result = deriveBook(input, code, undefined, trained, tokens);
    const wordOf = new Map(result.words.map((w) => [w.ref, w]));
    const byVerse = new Map<string, SweteWord[]>();
    for (const w of result.words) byVerse.set(w.verse, [...(byVerse.get(w.verse) ?? []), w]);
    const sizes = { 'layer 1': 0, 'layer 2 or 2a': 0 } as Record<Pool, number>;
    const picked: Sampled[] = [];
    for (const pool of POOLS) {
      const members = result.derived.filter((w) => poolOf(w) === pool);
      sizes[pool] = members.length;
      for (const i of draw(members.length, PER_POOL, rand)) {
        const derived = members[i];
        const word = wordOf.get(derived.ref)!;
        picked.push({ book: code, pool, word, derived, verseWords: byVerse.get(word.verse)! });
      }
    }
    out.push({ book: code, sizes, picked });
  }
  return out;
}

/** Brenton's English (LXX2012) of a book, by the Greek's 'chapter:verse'; a verse bridge answers each verse it spans. */
function brentonOf(rawDir: string, code: string): Map<string, string> {
  const usfmCode = OT_BOOKS[OLD_TESTAMENT.findIndex(([c]) => c === code)];
  const file = usfmFileOf(resolve(dirname(rawDir), LXX2012_RAW), usfmCode);
  const out = new Map<string, string>();
  if (!file) return out;
  for (const chapter of parseUsfm(readFileSync(file, 'utf8')).chapters) {
    if (chapter.title) out.set(`${chapter.chapter}:0`, chapter.title);
    for (const v of chapter.verses) {
      for (let n = v.verse; n <= (v.through ?? v.verse); n++) {
        const g = carriedAsGreek(usfmCode, v.chapter, n);
        out.set(`${g.chapter}:${g.verse}`, v.text);
      }
    }
  }
  return out;
}

const cv = (verse: string): string => verse.slice(verse.indexOf('.') + 1);

/** Words of the verse printed on each side of the sampled word. */
export const WINDOW = 10;

/** The verse round the sampled word (WINDOW words each side, '…' where it is cut), the word marked ⟦ ⟧. */
function verseLine(s: Sampled): string {
  const at = s.verseWords.findIndex((w) => w.ref === s.word.ref);
  const from = Math.max(0, at - WINDOW);
  const to = Math.min(s.verseWords.length, at + WINDOW + 1);
  const shown = s.verseWords.slice(from, to).map((w) => (w.ref === s.word.ref ? `⟦${w.display}⟧` : w.display));
  return `${from > 0 ? '… ' : ''}${shown.join(' ')}${to < s.verseWords.length ? ' …' : ''}`;
}

/** Morpheus's readings of each form, mapped (TAGNT codes) and as it printed them. */
function morpheusReadings(forms: readonly string[]): Map<string, string> {
  const engine = dockerEngine();
  const why = engine.unavailable();
  if (why) throw new Error(`Morpheus: ${why}`);
  const keys = [...new Set(forms.map(morpheusKey))];
  const sent = keys.flatMap((k) => {
    const beta = toBeta(k);
    return beta ? [[k, beta] as const] : [];
  });
  const entries = parseCruncher(engine.crunch(sent.map(([, b]) => b)), sent.map(([, b]) => b));
  const out = new Map<string, string>();
  sent.forEach(([k], i) => {
    const mapped = formOf(entries[i]).analyses.map((m) => `${m.lemma}/${m.code}`);
    // what the mapping leaves out, as Morpheus printed it (a perfect, a dialect, a pronoun), once each
    const left = [...new Set(entries[i].raws.filter((r) => r.pos !== 'E' && !mapAnalysis(r)).map((r) => `${fromBeta(r.lemma)} ${r.features}`))];
    out.set(k, entries[i].raws.length ? `${mapped.join(' | ') || '-'}${left.length ? `; unmapped: ${left.join(' ; ')}` : ''}` : 'unknown to Morpheus');
  });
  return out;
}

export function printSample(draws: readonly BookDraw[], rawDir: string, only?: string, morpheus?: Map<string, string>): string[] {
  const lines: string[] = [`seed ${SEED}; ${PER_POOL} words from each pool of each book; derived with no Morpheus cache and no choices`];
  for (const d of draws) {
    if (only && d.book.toLowerCase() !== only.toLowerCase()) continue;
    const brenton = brentonOf(rawDir, d.book);
    lines.push('', `## ${d.book}: layer 1 ${d.sizes['layer 1']} words, layer 2 or 2a ${d.sizes['layer 2 or 2a']} words`);
    for (const pool of POOLS) {
      const n = d.picked.filter((s) => s.pool === pool).length;
      if (n < PER_POOL) lines.push(`${d.book} is short of ${pool}: ${n} of ${PER_POOL} (all it has)`);
    }
    for (const s of d.picked) {
      const w = s.derived;
      const cands = w.candidates.slice(0, 4).map((c) => `${c.lemma}/${c.morph}/${supportOf(c)}`).join(' | ') + (w.candidates.length > 4 ? ` | … ${w.candidates.length - 4} more` : '');
      lines.push(
        `${w.ref}\t${s.pool === 'layer 1' ? 'L1' : `L${w.layer}`}\t${s.word.form}\t${w.lemma}\t${w.morph}\tconf ${w.confidence.toFixed(2)}${w.notes.length ? `\tnotes: ${w.notes.join('; ')}` : ''}`,
        `  candidates: ${cands}`,
        `  Greek: ${verseLine(s)}`,
        `  Brenton ${cv(s.word.verse)}: ${brenton.get(cv(s.word.verse)) ?? '(no verse)'}`,
      );
      if (morpheus) lines.push(`  Morpheus: ${morpheus.get(morpheusKey(s.word.form)) ?? 'not asked (no beta code)'}`);
    }
  }
  return lines;
}

// ------------------------------------------------------------------------------------------------------------------------------- the count

export type Verdict = 'right' | 'wrong' | 'unsure';
export interface Row {
  ref: string;
  pool: Pool;
  /** the layer column as written: 1, 2 or 2a */
  layer: string;
  lemma: Verdict;
  parsing: Verdict;
}

/** The audit file's word rows: `| ref | form | lemma | parsing | layer | lemma verdict | parsing verdict | evidence |`. */
export function readRows(markdown: string): Row[] {
  const rows: Row[] = [];
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 9 || !/^[1-3A-Z][A-Za-z]{2}\.\d+:\d+#\d+$/.test(cells[1])) continue;
    const verdict = (v: string): Verdict => {
      if (v !== 'right' && v !== 'wrong' && v !== 'unsure') throw new Error(`${cells[1]}: verdict '${v}' is not right, wrong or unsure`);
      return v;
    };
    const layer = cells[5];
    if (layer !== '1' && layer !== '2' && layer !== '2a') throw new Error(`${cells[1]}: layer '${layer}' is not 1, 2 or 2a`);
    rows.push({ ref: cells[1], pool: layer === '1' ? 'layer 1' : 'layer 2 or 2a', layer, lemma: verdict(cells[6]), parsing: verdict(cells[7]) });
  }
  return rows;
}

/** Wilson's 95% interval for k of n. */
export function wilson(k: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.959964;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

/** A word is right when its lemma and its parsing are both right, wrong when either is wrong, and unsure otherwise. */
export const wordVerdict = (r: Row): Verdict => (r.lemma === 'wrong' || r.parsing === 'wrong' ? 'wrong' : r.lemma === 'right' && r.parsing === 'right' ? 'right' : 'unsure');

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

function tally(rows: readonly Row[], of: (r: Row) => Verdict): { right: number; wrong: number; unsure: number } {
  const t = { right: 0, wrong: 0, unsure: 0 };
  for (const r of rows) t[of(r)]++;
  return t;
}

/** One line of counts: right, wrong, unsure; the rate right over the words judged (unsure left out), with its interval; and right over all, unsure counted as not right. */
function rateLine(label: string, rows: readonly Row[], of: (r: Row) => Verdict): string {
  const t = tally(rows, of);
  const judged = t.right + t.wrong;
  const [lo, hi] = wilson(t.right, judged);
  const [alo, ahi] = wilson(t.right, rows.length);
  return `| ${label} | ${rows.length} | ${t.right} | ${t.wrong} | ${t.unsure} | ${judged ? pct(t.right / judged) : '-'} (${pct(lo)} to ${pct(hi)}) | ${rows.length ? pct(t.right / rows.length) : '-'} (${pct(alo)} to ${pct(ahi)}) |`;
}

export function countLines(rows: readonly Row[]): string[] {
  const head = ['| | words | right | wrong | unsure | right of those judged (95% interval) | right of all, unsure as not right (95% interval) |', '| --- | ---: | ---: | ---: | ---: | --- | --- |'];
  const lines: string[] = ['### The whole word (lemma and parsing both right)', '', ...head];
  // the two pools the sample was drawn from, and the second pool split by the layer that settled each word (its share of the pool was not fixed by the draw)
  const groups: Array<[string, Row[]]> = [
    ['all', [...rows]],
    ...POOLS.map((p): [string, Row[]] => [p, rows.filter((r) => r.pool === p)]),
    ['of which layer 2', rows.filter((r) => r.layer === '2')],
    ['of which layer 2a', rows.filter((r) => r.layer === '2a')],
  ];
  for (const [label, rs] of groups) lines.push(rateLine(label, rs, wordVerdict));
  lines.push('', '### The lemma alone', '', ...head);
  for (const [label, rs] of groups) lines.push(rateLine(label, rs, (r) => r.lemma));
  lines.push('', '### The parsing alone', '', ...head);
  for (const [label, rs] of groups) lines.push(rateLine(label, rs, (r) => r.parsing));
  lines.push('', '### By book (the whole word)', '', '| book | layer 1: right / wrong / unsure | layer 2 or 2a: right / wrong / unsure |', '| --- | --- | --- |');
  for (const [code] of OLD_TESTAMENT) {
    const of = (p: Pool): string => {
      const rs = rows.filter((r) => r.pool === p && r.ref.startsWith(`${code}.`));
      const t = tally(rs, wordVerdict);
      return `${t.right} / ${t.wrong} / ${t.unsure}${rs.length < PER_POOL ? ` (${rs.length} words)` : ''}`;
    };
    lines.push(`| ${code} | ${of('layer 1')} | ${of('layer 2 or 2a')} |`);
  }
  return lines;
}

async function main(argv: readonly string[]): Promise<void> {
  const at = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const countFile = at('--count');
  if (countFile) {
    for (const line of countLines(readRows(readFileSync(countFile, 'utf8')))) console.log(line);
    return;
  }
  const draws = await sample();
  const morpheus = argv.includes('--morpheus') ? morpheusReadings(draws.flatMap((d) => d.picked.map((s) => s.word.form))) : undefined;
  for (const line of printSample(draws, RAW_DIR, at('--book'), morpheus)) console.log(line);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
