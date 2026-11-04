// scripts/lxx/lone-support.ts — npm run lxx:lone-support
// The measurement behind LONE_MIN_STEM_SUPPORT and LONE_MIN_ANALOGY_SUPPORT in parser.ts (docs/lxx-derivation.md, 'A lone candidate on thin support'; stories
// mw-u2w5klk.28 and .30). Each of the New Testament's 27 books is hidden in turn from the form index and the parser, as a known-answer run hides one; each of its
// NA28 words whose form the other books lack is parsed by the ending rules, and where they leave one candidate it is scored against TAGNT's own row (lemma and full
// parsing). It prints, by the candidate's stem support (Candidate.stemSupport), how many such words there are and how many are right, and the least support at which
// the lone candidates taken are right at least LONE_MIN_SHARE of the time together. The same for analogy (story .30): of the words whose form the other books lack and
// for which the rules leave nothing, those to which byAnalogy gives one candidate, by that candidate's support (the pairs of forms of one lemma behind it), at
// LONE_ANALOGY_MIN_SHARE and at LONE_MIN_SHARE. And (story .31) what analogy's readings offered beside a thin lone rule candidate hold (besideCounts). Nothing is written; it reads the pinned files as lxx:derive does.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadInput } from './derive';
import { byAnalogy, isThinLone, parse, trainParser } from './parser';
import { keyOf } from './swete';
import { inNa28, readTagnt, type TagntRow } from './tagnt';
import { readTbesg, type Lexicon } from './tbesg';

/** The share of right answers the lone candidates taken must reach together: the bar's line for full parsing (bar.ts). */
export const LONE_MIN_SHARE = 0.98;
/**
 * The share analogy's lone candidates taken must reach together: the highest the New Testament offers where a support is more than a few words. Analogy's reach 98%
 * only at a support of 63 or more, on 6 words; from 4 up they are right 96.0%, and no support above adds more than half a point (the best, at 8 and 9, is 96.5%).
 */
export const LONE_ANALOGY_MIN_SHARE = 0.96;

export interface LoneRow {
  /** the stem support (a row for each value met) */
  stem: number;
  words: number;
  right: number;
}

/** Which method's lone candidates are measured: the ending rules (by stem support), or analogy, when the rules leave nothing (by the candidate's support). */
export type LoneMethod = 'rules' | 'analogy';

/**
 * Every NA28 word of each book whose form the other books lack and to which the method gives one candidate: its support (the rules' stem support; analogy's
 * pairs), and whether it is TAGNT's answer. Analogy is asked only where the rules give nothing, as derive.ts asks it.
 */
export function loneCandidates(rows: readonly TagntRow[], lexicon: Lexicon, method: LoneMethod = 'rules'): Array<{ stem: number; right: boolean }> {
  const out: Array<{ stem: number; right: boolean }> = [];
  for (const book of [...new Set(rows.map((r) => r.book))]) {
    const rest = rows.filter((r) => r.book !== book);
    const known = new Set(rest.map((r) => keyOf(r.form)));
    const parser = trainParser(rest, lexicon);
    for (const r of rows) {
      if (r.book !== book || !inNa28(r) || known.has(keyOf(r.form))) continue;
      const ruled = parse(r.form, parser);
      const cs = method === 'rules' ? ruled : ruled.length ? [] : byAnalogy(r.form, parser);
      if (cs.length !== 1) continue;
      out.push({ stem: method === 'rules' ? (cs[0].stemSupport ?? 0) : cs[0].support, right: cs[0].lemma === r.lemma && cs[0].morph === r.morph });
    }
  }
  return out;
}

/** The words by stem support, the least first. */
export function loneTable(lone: ReadonlyArray<{ stem: number; right: boolean }>): LoneRow[] {
  const by = new Map<number, LoneRow>();
  for (const { stem, right } of lone) {
    let row = by.get(stem);
    if (!row) by.set(stem, (row = { stem, words: 0, right: 0 }));
    row.words++;
    if (right) row.right++;
  }
  return [...by.values()].sort((a, b) => a.stem - b.stem);
}

/** The least support at which every lone candidate at it or above is right at least `share` of the time together; undefined when none is. */
export function leastSupport(table: readonly LoneRow[], share: number = LONE_MIN_SHARE): number | undefined {
  for (const row of table) {
    const above = table.filter((r) => r.stem >= row.stem);
    const words = above.reduce((n, r) => n + r.words, 0);
    if (above.reduce((n, r) => n + r.right, 0) >= share * words) return row.stem;
  }
  return undefined;
}

export interface BesideCounts {
  /** the words whose form the other books lack and for which the rules leave one candidate on thin support (isThinLone) */
  thin: number;
  /** of those, the lone candidate is TAGNT's answer */
  right: number;
  /** thin and wrong, and analogy gives some reading beside it, and one of them is TAGNT's answer */
  wrongMended: number;
  /** thin and wrong, and analogy gives a reading beside it but none is TAGNT's answer */
  wrongNotHeld: number;
  /** thin and wrong, and analogy gives nothing */
  wrongNone: number;
  /** thin and right, and analogy gives readings beside it: the model has the right one and others to weigh */
  rightWithBeside: number;
  /** thin and right, and analogy gives nothing */
  rightAlone: number;
}

/**
 * What analogy's readings beside a thin lone rule candidate (derive.ts analogyBeside: byAnalogy's candidates other than the rule's own) hold, each New Testament book
 * hidden in turn: of the thin lone candidates that are wrong, those for which analogy offers TAGNT's answer (for the model to choose; the check does not read them), and
 * of the right ones, those with readings beside them (a cost to the model's choice, a settled answer made wrong by none: the check does not read them).
 */
export function besideCounts(rows: readonly TagntRow[], lexicon: Lexicon): BesideCounts {
  const n: BesideCounts = { thin: 0, right: 0, wrongMended: 0, wrongNotHeld: 0, wrongNone: 0, rightWithBeside: 0, rightAlone: 0 };
  for (const book of [...new Set(rows.map((r) => r.book))]) {
    const rest = rows.filter((r) => r.book !== book);
    const known = new Set(rest.map((r) => keyOf(r.form)));
    const parser = trainParser(rest, lexicon);
    for (const r of rows) {
      if (r.book !== book || !inNa28(r) || known.has(keyOf(r.form))) continue;
      const ruled = parse(r.form, parser);
      if (!isThinLone(ruled)) continue;
      const [lone] = ruled;
      const beside = byAnalogy(r.form, parser).filter((c) => !(c.lemma === lone.lemma && c.morph === lone.morph));
      const right = lone.lemma === r.lemma && lone.morph === r.morph;
      n.thin++;
      if (right) {
        n.right++;
        if (beside.length) n.rightWithBeside++;
        else n.rightAlone++;
      } else if (!beside.length) n.wrongNone++;
      else if (beside.some((c) => c.lemma === r.lemma && c.morph === r.morph)) n.wrongMended++;
      else n.wrongNotHeld++;
    }
  }
  return n;
}

const pct = (k: number, n: number): string => `${((100 * k) / n).toFixed(1)}%`;

function report(label: string, column: string, lone: ReadonlyArray<{ stem: number; right: boolean }>, shares: readonly number[] = [LONE_MIN_SHARE]): void {
  const table = loneTable(lone);
  console.log(`lone candidates of ${label}, each New Testament book hidden in turn: ${lone.length} words`);
  console.log([column, 'words', 'right', 'share', 'this and above'].join('\t'));
  // each support up to 15 on a line of its own, then the rest together
  const rest = table.filter((r) => r.stem >= 16);
  const shown = [...table.filter((r) => r.stem < 16), ...(rest.length ? [{ stem: 16, words: rest.reduce((n, r) => n + r.words, 0), right: rest.reduce((n, r) => n + r.right, 0) }] : [])];
  for (const row of shown) {
    const above = table.filter((r) => r.stem >= row.stem);
    const words = above.reduce((n, r) => n + r.words, 0);
    const right = above.reduce((n, r) => n + r.right, 0);
    console.log([row.stem === 16 ? '16 or more' : row.stem, row.words, row.right, pct(row.right, row.words), `${right} of ${words}, ${pct(right, words)}`].join('\t'));
  }
  for (const share of shares) {
    const least = leastSupport(table, share);
    const taken = least === undefined ? 0 : table.filter((r) => r.stem >= least).reduce((n, r) => n + r.words, 0);
    console.log(`least ${column} right ${Math.round(100 * share)}% of the time together: ${least ?? 'none'}${least === undefined ? '' : ` (${taken} of ${lone.length} words taken)`}`);
  }
}

async function main(): Promise<void> {
  const input = await loadInput();
  const rows = readTagnt(input.tagnt);
  const lexicon = readTbesg(input.tbesg);
  report('the rules', 'stem support', loneCandidates(rows, lexicon, 'rules'));
  console.log('');
  report('analogy (where the rules give nothing)', 'support', loneCandidates(rows, lexicon, 'analogy'), [LONE_ANALOGY_MIN_SHARE, LONE_MIN_SHARE]);
  console.log('');
  const b = besideCounts(rows, lexicon);
  const wrong = b.thin - b.right;
  console.log(`analogy's readings beside a thin lone rule candidate, each New Testament book hidden in turn: ${b.thin} words`);
  console.log(`wrong ${wrong}: analogy offers TAGNT's answer for ${b.wrongMended} (${pct(b.wrongMended, wrong)}); readings beside it but not TAGNT's ${b.wrongNotHeld}; nothing beside it ${b.wrongNone}`);
  console.log(`right ${b.right}: readings beside it ${b.rightWithBeside}; alone ${b.rightAlone}; settled answers changed: none, since the check does not read them (npm run lxx:derive compares)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
