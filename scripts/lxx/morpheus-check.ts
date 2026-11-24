// scripts/lxx/morpheus-check.ts — npm run lxx:morpheus-check -- --known Jhn.1 Rom.8 | --coverage
// What Morpheus's mapping does on real output (docs/lxx-derivation.md, 'Morpheus, the second method'; story mw-u2w5klk.14), measured with the image:
//   --known <chapter>...  the known-answer check: each word of a New Testament chapter's NA28 text is asked of Morpheus, and TAGNT's lemma and parsing are looked for
//                         among the readings the mapping covers (lemmas compared by their letters without accents, as 'The mapping' says: γίγνομαι and γίνομαι differ).
//                         How often a candidate Morpheus offers is the right one, and what the misses are.
//   --coverage            over the forms the sweep asked (the cache's, data/lxx/morpheus): forms asked, known, readings, mapped, and the readings left out by reason;
//                         then the words that still have no candidate, by the reason their form's readings are left out.
//   --all                 (story mw-u2w5klk.381) builds the Morpheus cache of every book that has none (data/lxx/morpheus/<book>.tsv, the 39 books), resumably (a book's file is written as
//                         its forms are answered, and a book whose cache is there asks Morpheus nothing), and prints a line a book with the wall time, then how many books have a cache.
//                         It writes only the caches. On the Laptop: sg docker -c 'npm run lxx:morpheus-check -- --all'; then `npm run lxx:pack -- --out <archive>` carries them to the other hosts.
// Needs Docker and the image (morpheus.ts's dockerEngine); --coverage and --known write nothing. The pure parts are tested on a captured sample (tests/unit/lxx-morpheus.test.ts).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT_DIR, deriveBook, loadInput, splitBooks, train, withMorpheus, type DeriveInput } from './derive';
import { chapterRows, parseChapter } from './known';
import {
  dockerEngine,
  formOf,
  mapAnalysis,
  morpheusKey,
  cacheIsCurrent,
  parseCruncher,
  readMorpheusCache,
  toBeta,
  unmappedWhy,
  type CrunchEntry,
  type MorpheusEngine,
} from './morpheus';
import { OLD_TESTAMENT } from './report';
import { bareOf } from './swete';
import type { TagntRow } from './tagnt';

/** The forms (Greek, as morpheusKey writes them) asked of the engine in one run, each answered once: a form with a character beta code cannot write is not asked. */
export function crunchForms(engine: MorpheusEngine, forms: Iterable<string>): Map<string, CrunchEntry> {
  const sent = [...new Set([...forms].map((f) => f.normalize('NFC')))].flatMap((form) => {
    const beta = toBeta(form);
    return beta ? [[form, beta] as const] : [];
  });
  const entries = parseCruncher(engine.crunch(sent.map(([, beta]) => beta)), sent.map(([, beta]) => beta));
  return new Map(sent.map(([form], i) => [form, entries[i]]));
}

// ------------------------------------------------------------------------------------------------------------------------------- the known-answer check

/** How one word of a chapter stands against Morpheus: its answer is among the mapped readings (`hit`), or something else. */
export type Outcome = 'hit' | 'wrong parsing' | 'wrong lemma' | 'not mapped' | 'unknown';

export interface Verdict {
  outcome: Outcome;
  /** the lemma/code readings Morpheus gave (mapped), as the cache writes them */
  readings: string[];
}

/** One word of TAGNT against the entry Morpheus gave its form. 'wrong parsing': a mapped reading has the lemma (by its letters), none has the parsing too. */
export function verdictOf(row: Pick<TagntRow, 'lemma' | 'morph'>, entry: CrunchEntry | undefined): Verdict {
  if (!entry || entry.raws.filter((r) => r.pos !== 'E').length === 0) return { outcome: 'unknown', readings: [] };
  const mapped = formOf(entry).analyses;
  const readings = mapped.map((m) => `${m.lemma}/${m.code}`);
  if (mapped.length === 0) return { outcome: 'not mapped', readings };
  const sameLemma = mapped.filter((m) => bareOf(m.lemma) === bareOf(row.lemma));
  if (sameLemma.some((m) => m.code === row.morph)) return { outcome: 'hit', readings };
  return { outcome: sameLemma.length > 0 ? 'wrong parsing' : 'wrong lemma', readings };
}

export interface KnownCheck {
  chapter: string;
  words: number;
  outcomes: Record<Outcome, number>;
  /** words whose TAGNT parsing is of a kind the mapping has no code for (pronouns, numerals, perfects, ...), by TAGNT's own letter before the first hyphen, among `not mapped` and `unknown` */
  misses: Array<{ form: string; tagnt: string; readings: string[]; outcome: Outcome }>;
  /** the same count by the first letter of TAGNT's code (N, V, A, T, CONJ, ...): words, hits, words that had mapped readings */
  byKind: Map<string, { words: number; hits: number; offered: number }>;
}

const kindOf = (morph: string): string => morph.split('-')[0];

/** The words of TAGNT's NA28 chapter against Morpheus's entries (by morpheusKey of each form). */
export function checkKnown(chapter: string, rows: readonly TagntRow[], entries: ReadonlyMap<string, CrunchEntry>): KnownCheck {
  const check: KnownCheck = {
    chapter,
    words: rows.length,
    outcomes: { hit: 0, 'wrong parsing': 0, 'wrong lemma': 0, 'not mapped': 0, unknown: 0 },
    misses: [],
    byKind: new Map(),
  };
  for (const row of rows) {
    const v = verdictOf(row, entries.get(morpheusKey(row.form).normalize('NFC')));
    check.outcomes[v.outcome]++;
    const kind = check.byKind.get(kindOf(row.morph)) ?? { words: 0, hits: 0, offered: 0 };
    kind.words++;
    if (v.outcome === 'hit') kind.hits++;
    if (v.outcome === 'hit' || v.outcome === 'wrong parsing' || v.outcome === 'wrong lemma') kind.offered++;
    check.byKind.set(kindOf(row.morph), kind);
    if (v.outcome === 'wrong parsing' || v.outcome === 'wrong lemma') check.misses.push({ form: row.form, tagnt: `${row.lemma}/${row.morph}`, readings: v.readings, outcome: v.outcome });
  }
  return check;
}

/** The share of the words whose form got mapped readings (`offered`) that had the right one among them: the rate of a candidate that is not false. */
export const offeredRight = (c: KnownCheck): { offered: number; hits: number } => ({
  offered: c.outcomes.hit + c.outcomes['wrong parsing'] + c.outcomes['wrong lemma'],
  hits: c.outcomes.hit,
});

// ------------------------------------------------------------------------------------------------------------------------------------- the coverage

export interface Coverage {
  asked: number;
  known: number;
  /** every reading but Morpheus's English glosses */
  readings: number;
  mapped: number;
  /** readings left out, by reason (`unmappedWhy`) */
  unmapped: Map<string, number>;
  /** forms with at least one mapped reading */
  formsMapped: number;
  /** forms known whose readings are all left out, and each reason found among them */
  formsLost: number;
  lost: Map<string, number>;
}

/** The count over the entries of the forms asked (a form the engine did not know has none). */
export function coverageOf(entries: Iterable<CrunchEntry>): Coverage {
  const c: Coverage = { asked: 0, known: 0, readings: 0, mapped: 0, unmapped: new Map(), formsMapped: 0, formsLost: 0, lost: new Map() };
  const bump = (m: Map<string, number>, k: string): void => void m.set(k, (m.get(k) ?? 0) + 1);
  for (const entry of entries) {
    c.asked++;
    const raws = entry.raws.filter((r) => r.pos !== 'E');
    if (raws.length === 0) continue;
    c.known++;
    let any = false;
    for (const raw of raws) {
      c.readings++;
      if (mapAnalysis(raw)) {
        c.mapped++;
        any = true;
      } else bump(c.unmapped, unmappedWhy(raw) ?? 'unknown');
    }
    if (any) c.formsMapped++;
    else {
      c.formsLost++;
      for (const why of new Set(raws.map((r) => unmappedWhy(r) ?? 'unknown'))) bump(c.lost, why);
    }
  }
  return c;
}

const table = (m: ReadonlyMap<string, number>): string[] => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `  ${String(v).padStart(6)}  ${k}`);
const pct = (a: number, b: number): string => (b === 0 ? '—' : `${((100 * a) / b).toFixed(1)}%`);

export function knownLines(c: KnownCheck): string[] {
  const o = c.outcomes;
  const { offered, hits } = offeredRight(c);
  return [
    `${c.chapter}: ${c.words} words; Morpheus did not know ${o.unknown}, knew but the mapping left every reading out ${o['not mapped']}, offered readings for ${offered}`,
    `  TAGNT's lemma and parsing among them: ${hits} of ${offered} (${pct(hits, offered)}); lemma right, parsing not ${o['wrong parsing']}; lemma not among them ${o['wrong lemma']}`,
    `  of all ${c.words} words: ${hits} (${pct(hits, c.words)}) got the right candidate`,
    ...[...c.byKind].sort((a, b) => b[1].words - a[1].words).map(([k, v]) => `    ${k.padEnd(5)} ${String(v.words).padStart(4)} words, ${String(v.offered).padStart(4)} offered, ${String(v.hits).padStart(4)} right`),
  ];
}

// ------------------------------------------------------------------------------------------------------------------------------------- every book's cache

export interface BuiltBook {
  book: string;
  /** 'built' (no file before), 'rebuilt' (a file of an earlier mapping), 'grown' (forms added), 'cache there' (nothing to ask), 'no cache' (Morpheus could not run), 'no forms to ask' */
  status: 'built' | 'rebuilt' | 'grown' | 'cache there' | 'no cache' | 'no forms to ask';
  forms: number;
  /** wall time of the book, in milliseconds */
  ms: number;
}

/**
 * The cache of each of `books` (Swete's codes in lower case; default the 39 of the Old Testament) made or completed under `outDir`/morpheus, in the order of Swete's file: the book is derived as
 * `lxx:derive` does (the forms with no candidate, thin lone candidates, guesses and unattested words are asked), and only a form the cache lacks goes to Morpheus, so a second run asks nothing.
 * Nothing but the cache files is written.
 */
export function buildAll(
  input: DeriveInput,
  outDir: string,
  engine: MorpheusEngine,
  log: (line: string) => void,
  books: readonly string[] = OLD_TESTAMENT.map(([code]) => code.toLowerCase()),
  now: () => number = Date.now,
): BuiltBook[] {
  const wanted = new Set(books.map((b) => b.toLowerCase()));
  const trained = train(input);
  const rows: BuiltBook[] = [];
  const step = { engine, choicesDir: join(outDir, 'choices'), said: false };
  for (const [code, tokens] of splitBooks(input)) {
    if (tokens.words.length === 0 || !wanted.has(code.toLowerCase())) continue;
    const book = code.toLowerCase();
    const file = join(outDir, 'morpheus', `${book}.tsv`);
    const text = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
    const before = text === undefined ? 0 : readMorpheusCache(join(outDir, 'morpheus'), book)!.size;
    const started = now();
    const first = deriveBook(input, code, undefined, trained, tokens);
    withMorpheus(first, (cache) => deriveBook(input, code, undefined, trained, tokens, cache), outDir, step, log);
    const after = existsSync(file) ? readMorpheusCache(join(outDir, 'morpheus'), book)!.size : 0;
    const status: BuiltBook['status'] =
      after === 0 && !existsSync(file) ? (step.said ? 'no cache' : 'no forms to ask') : text === undefined ? 'built' : !cacheIsCurrent(text) && after > 0 ? 'rebuilt' : after > before ? 'grown' : 'cache there';
    rows.push({ book, status, forms: after, ms: now() - started });
  }
  return rows;
}

/** The lines of a `--all` run: a line a book (its status, forms, wall time), then how many books have a cache and which were built. */
export function allLines(rows: readonly BuiltBook[]): string[] {
  const secs = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;
  const lines = rows.map((r) => `${r.book.padEnd(4)}  ${r.status.padEnd(15)}  ${String(r.forms).padStart(6)} forms  ${secs(r.ms).padStart(9)}`);
  const have = rows.filter((r) => r.status !== 'no cache');
  const built = rows.filter((r) => r.status === 'built' || r.status === 'rebuilt' || r.status === 'grown');
  const without = rows.filter((r) => r.status === 'no cache').map((r) => r.book);
  lines.push(
    `${have.length} of ${rows.length} books have a Morpheus cache; ` +
      (without.length > 0 ? `without: ${without.join(', ')}` : `built in this run: ${built.length > 0 ? built.map((r) => r.book).join(', ') : 'none'} (${secs(built.reduce((n, r) => n + r.ms, 0))})`),
  );
  return lines;
}

// ---------------------------------------------------------------------------------------------------------------------------------------- the runs

async function main(argv: readonly string[]): Promise<void> {
  if (argv[0] === '--all') {
    const engine = dockerEngine();
    const input = await loadInput();
    const rows = buildAll(input, OUT_DIR, engine, console.log);
    for (const line of allLines(rows)) console.log(line);
    if (rows.some((r) => r.status === 'no cache')) process.exitCode = 1;
    return;
  }
  const engine = dockerEngine();
  const why = engine.unavailable();
  if (why) throw new Error(`Morpheus is not available: ${why}`);
  const input = await loadInput();
  if (argv[0] === '--known') {
    const chapters = argv.slice(1);
    if (chapters.length === 0) throw new Error('usage: npm run lxx:morpheus-check -- --known <chapter>... | --coverage | --all');
    const sum = { words: 0, hits: 0, offered: 0 };
    for (const chapter of chapters) {
      const rows = chapterRows(input.tagnt, parseChapter(chapter));
      const entries = crunchForms(engine, rows.map((r) => morpheusKey(r.form)));
      const check = checkKnown(chapter, rows, entries);
      for (const line of knownLines(check)) console.log(line);
      for (const m of check.misses) console.log(`    ${m.outcome}: ${m.form}: TAGNT ${m.tagnt}; Morpheus ${m.readings.join(' | ')}`);
      sum.words += check.words;
      sum.hits += check.outcomes.hit;
      sum.offered += offeredRight(check).offered;
    }
    console.log(`all: ${sum.words} words, ${sum.offered} offered readings, TAGNT's answer among them for ${sum.hits} (${pct(sum.hits, sum.offered)} of those offered; ${pct(sum.hits, sum.words)} of all words)`);
    return;
  }
  if (argv[0] === '--coverage') {
    const dir = join(OUT_DIR, 'morpheus');
    const forms = new Set<string>();
    for (const f of readdirSync(dir)) for (const form of readMorpheusCache(dir, f.replace(/\.tsv$/, ''))!.keys()) forms.add(form);
    const entries = crunchForms(engine, forms);
    const c = coverageOf(entries.values());
    console.log(`forms asked ${c.asked} (cache ${dir}), known ${c.known}, readings ${c.readings}, mapped ${c.mapped} (${pct(c.mapped, c.readings)}), forms with a mapped reading ${c.formsMapped}`);
    console.log('readings left out, by reason:');
    for (const line of table(c.unmapped)) console.log(line);
    console.log(`known forms with no mapped reading ${c.formsLost}; reasons found among their readings (a form may have several):`);
    for (const line of table(c.lost)) console.log(line);
    // the words that still have no candidate, by the reasons of their form's readings
    const trained = train(input);
    const books = splitBooks(input);
    const words = new Map<string, number>();
    const only = new Map<string, number>();
    let left = 0;
    for (const [code] of OLD_TESTAMENT) {
      const tokens = books.get(code);
      if (!tokens) continue;
      const cache = readMorpheusCache(dir, code);
      const result = deriveBook(input, code, undefined, trained, tokens, cache);
      const formOfRef = new Map(result.words.map((w) => [w.ref, morpheusKey(w.form).normalize('NFC')]));
      // a name read from its own form (support `form`) has no lexicon's candidate: still counted here, as before the form was read as a lemma
      for (const w of result.pending.filter((p) => p.candidates.every((c) => c.source === 'form'))) {
        left++;
        const entry = entries.get(formOfRef.get(w.ref) ?? '');
        const reasons = new Set((entry?.raws ?? []).filter((r) => r.pos !== 'E').map((r) => unmappedWhy(r) ?? 'unknown'));
        for (const r of reasons.size ? reasons : ['Morpheus does not know the form']) words.set(r, (words.get(r) ?? 0) + 1);
        if (reasons.size === 1) only.set([...reasons][0], (only.get([...reasons][0]) ?? 0) + 1);
      }
    }
    console.log(`words of the 39 books that still have no candidate: ${left}; by the reasons among their form's readings (a word may have several):`);
    for (const line of table(words)) console.log(line);
    console.log('and the words whose form has only readings left out for one reason (mapping that reason would give exactly these words candidates):');
    for (const line of table(only)) console.log(line);
    return;
  }
  throw new Error('usage: npm run lxx:morpheus-check -- --known <chapter>... | --coverage | --all');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
