// scripts/lxx/grammar-gaps.ts — npm run lxx:grammar-gaps [-- --dir <folder>] [--out <file>] (story mw-u2w5klk.277; docs/lxx-derivation.md, 'The grammar check')
// The Governor's question of 2026-11-05: "Is there anything we need to update in the Greek lessons or Greek paradigm tables to read the septuagint in Greek?"
// Reads every shipped Septuagint chapter (dist/data-lxx, which `npm run lxx:ship -- --out dist/data-lxx` writes; the repo's own public/data-lxx when that holds chapters; or --dir),
// runs each parsing code with a lemma through the paradigm tables (tableFor, src/data/paradigms) and the grammar ideas (ideasOf, src/data/grammar/ladder.ts, and the Reading lessons'
// ideas, src/approaches/john-lessons.ts), and writes docs/lxx-grammar-gaps.md (the file's name and place are PROVISIONAL, the Governor to confirm):
//   * the codes with no table (tableFor says none), and the codes with a table that holds no cell for the form (the table is the one the app shows the word, but none of its cells
//     carries every case, gender, number, person, tense, voice and mood the code names), by mood and part of speech, each with its count and an example word and verse;
//   * the lemmas with no lexicon entry (lexicon-grc-lxx.json), and those with a blank one;
//   * the grammar ideas the shipped forms need that no table teaches or no Reading lesson practises.
// A second run on the same files writes the same bytes. It reads the shipped chapters and the New Testament's parsing codes (public/data) and writes only the one doc.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JOHN_LESSONS } from '../../src/approaches/john-lessons';
import { ideasOf, ideasOfWord } from '../../src/data/grammar/ladder';
import { splitParse } from '../../src/data/parseCode';
import { PARADIGMS, cellsOf, languageOf, tableFor, type Paradigm } from '../../src/data/paradigms';

export const GAPS_DOC = join('docs', 'lxx-grammar-gaps.md');
/** Where the shipped chapters are looked for, in order (the first whose index names a shipped chapter). */
export const SHIPPED_DIRS = [join('dist', 'data-lxx'), join('public', 'data-lxx')];
/** How many rows a long list of the doc shows before saying how many more there are. */
const LIST_CAP = 150;

export interface ShippedWord {
  t: string;
  l: string;
  p: string;
}
export interface ShippedChapter {
  /** Swete's book code ('gen', 'psa') */
  code: string;
  /** the Greek chapter number */
  chapter: number;
  verses: { n: number; g: ShippedWord[] }[];
}

export interface Example {
  t: string;
  l: string;
  ref: string;
}
export interface LemmaFigure {
  count: number;
  example: Example;
}
export interface CodeFigure {
  count: number;
  example: Example;
  /** each lemma the code is found with, in the order they are met */
  lemmas: Map<string, LemmaFigure>;
}
export type Figures = Map<string, CodeFigure>;

const refOf = (code: string, chapter: number, verse: number): string => `${code.charAt(0).toUpperCase()}${code.slice(1)} ${chapter}:${verse}`;

/** Every parsing code of the chapters with how often it is met, its first word and verse, and the lemmas it is met with. A word with no code is left out. */
export function collectCodes(chapters: readonly ShippedChapter[]): Figures {
  const figures: Figures = new Map();
  for (const chapter of chapters)
    for (const verse of chapter.verses)
      for (const word of verse.g) {
        if (!word.p) continue;
        const example = { t: word.t, l: word.l, ref: refOf(chapter.code, chapter.chapter, verse.n) };
        const figure = figures.get(word.p) ?? { count: 0, example, lemmas: new Map<string, LemmaFigure>() };
        figure.count++;
        const lemma = figure.lemmas.get(word.l);
        if (lemma) lemma.count++;
        else figure.lemmas.set(word.l, { count: 1, example });
        figures.set(word.p, figure);
      }
  return figures;
}

/** The ideas that say which cell of a table a form is: the ladder's case, gender, number, person, tense, voice and mood. The rest (a declension, a pronoun's kind) is what the table is for, not a cell. */
const FORM_IDEA = /^(case|gender|number|person|tense|voice|mood)-/;
/** The ideas that say what kind of word a form is: a cell of another kind of word (a noun's vocative for the article's) is not a cell for it. */
const KIND_IDEA = new Set(['verb', 'article', 'adjective', 'noun']);
/** A deponent voice is the voice it is written in: the cell for it is the middle's or the passive's. */
const baseIdea = (id: string): string => id.replace(/-deponent$/, '');

/** The parts of speech that are not declined or conjugated: a code of one has no table, and needs none. */
const INDECLINABLE = new Set(['PREP', 'CONJ', 'ADV', 'PRT', 'COND', 'INJ']);
const headOf = (code: string): string => code.split(/[-\s]/)[0];

export type GapKind = 'no-table' | 'no-cell' | 'other-table' | 'unreadable';
export interface CodeGap {
  code: string;
  count: number;
  example: Example;
  kind: GapKind;
  /** the id of the table tableFor gave the code's first lemma; undefined for no table */
  table?: string;
  /** the form ideas no cell of the table carries together with the rest of the code: the fewest any cell lacks */
  missing: string[];
  /** 'optative', 'participle', ... or 'none' for a form with no mood (a noun) */
  mood: string;
  pos: string;
  indeclinable: boolean;
  /** kind 'other-table': the id of a table that does hold a cell for the form, where the one tableFor gave does not */
  heldBy?: string;
  /** the code is met in no chapter of the New Testament */
  septuagintOnly: boolean;
  lemmas: number;
}

/** The form ideas of `wanted` that no cell of the table carries (with the ideas the table itself teaches): the fewest any one cell lacks. */
function fewestMissing(table: Paradigm, wanted: readonly string[]): string[] {
  const own = table.ideas.map(baseIdea);
  let best = [...wanted];
  for (const cell of cellsOf(table)) {
    const have = new Set([...cell.ideas.map(baseIdea), ...own]);
    const lacks = wanted.filter((i) => !have.has(i));
    if (lacks.length < best.length) best = lacks;
  }
  return best;
}

/**
 * Each code run through the tables as the app does for a word (tableFor with the code's first lemma and form): the codes with no table, and those whose table has no cell
 * that carries every form idea the code names (the fewest missing from the best cell are named). A code the ladder cannot read (ideasOf throws) is named too.
 * Most gaps first within a kind: by how often the code is met. `newTestament` is the codes of the New Testament, to say which gaps are the Septuagint's own.
 */
export function codeGaps(figures: Figures, newTestament: ReadonlySet<string>): CodeGap[] {
  const gaps: CodeGap[] = [];
  for (const [code, figure] of figures) {
    const first = figure.lemmas.entries().next().value as [string, LemmaFigure];
    const base = { code, count: figure.count, example: figure.example, lemmas: figure.lemmas.size, septuagintOnly: !newTestament.has(code), indeclinable: INDECLINABLE.has(headOf(code)) };
    let ideas: string[];
    try {
      ideas = ideasOf(code);
    } catch {
      gaps.push({ ...base, kind: 'unreadable', missing: [], mood: 'none', pos: 'unknown' });
      continue;
    }
    const mood = ideas.find((i) => i.startsWith('mood-'))?.slice('mood-'.length) ?? 'none';
    const pos = splitParse(code).pos;
    const table = tableFor(code, { l: first[0], t: first[1].example.t });
    if (!table) {
      gaps.push({ ...base, kind: 'no-table', missing: [], mood, pos });
      continue;
    }
    const wanted = ideas.filter((i) => FORM_IDEA.test(i) || KIND_IDEA.has(i)).map(baseIdea);
    const here = fewestMissing(table, wanted);
    if (here.length === 0) continue;
    // the table the app shows lacks the cell: another table may still hold it (the word sheet's table is the best match by ideas, not by cell)
    const elsewhere = PARADIGMS.filter((t) => languageOf(t) === 'grc' && t !== table).map((t) => ({ id: t.id, missing: fewestMissing(t, wanted) })).sort((a, b) => a.missing.length - b.missing.length)[0];
    if (elsewhere && elsewhere.missing.length === 0) gaps.push({ ...base, kind: 'other-table', table: table.id, missing: here, mood, pos, heldBy: elsewhere.id });
    else gaps.push({ ...base, kind: 'no-cell', table: table.id, missing: elsewhere && elsewhere.missing.length < here.length ? elsewhere.missing : here, mood, pos });
  }
  return gaps.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export interface LexiconEntry {
  g: string;
  d: string;
  s: string;
}
export interface LemmaGap {
  lemma: string;
  count: number;
  example: Example;
}

/** The entry the app lays into a chapter for a lemma: the lemma whole, else (a lemma written with its forms, 'ὕδωρ, ὕδατος') by each form. */
const entryOf = (lexicon: Readonly<Record<string, LexiconEntry>>, lemma: string): LexiconEntry | undefined =>
  lexicon[lemma] ?? lemma.split(', ').map((form) => lexicon[form]).find((entry) => entry !== undefined);

/** The lemmas of the chapters with no entry in the lexicon (`missing`), and those with an entry that holds no gloss and no definition (`blank`: TBESG lacks the word); the most met first. */
export function lexiconGaps(figures: Figures, lexicon: Readonly<Record<string, LexiconEntry>>): { missing: LemmaGap[]; blank: LemmaGap[] } {
  const lemmas = new Map<string, LemmaGap>();
  for (const figure of figures.values())
    for (const [lemma, found] of figure.lemmas) {
      const seen = lemmas.get(lemma);
      if (seen) seen.count += found.count;
      else lemmas.set(lemma, { lemma, count: found.count, example: found.example });
    }
  const order = (a: LemmaGap, b: LemmaGap): number => b.count - a.count || a.lemma.localeCompare(b.lemma, 'el');
  const all = [...lemmas.values()];
  return {
    missing: all.filter((l) => !entryOf(lexicon, l.lemma)).sort(order),
    blank: all.filter((l) => {
      const entry = entryOf(lexicon, l.lemma);
      return entry !== undefined && !entry.g && !entry.d;
    }).sort(order),
  };
}

export interface IdeaNeed {
  id: string;
  /** words of the shipped text that need the idea */
  words: number;
  /** how many parsing codes name it */
  codes: number;
  /** the tables that teach it (their `ideas` name it) */
  tables: number;
  /** a Reading lesson (the letters of John) practises it */
  readInLesson: boolean;
  /** a code of the New Testament needs it too */
  newTestament: boolean;
}

/** A table teaches an idea when the table names it or one of its cells carries it (a mood is in the cells of the tables, not in their headline ideas). */
const taughtBy = (table: Paradigm, id: string): boolean => table.ideas.includes(id) || cellsOf(table).some((c) => c.ideas.includes(id));

const READ_IN_LESSONS = new Set(JOHN_LESSONS.flatMap((lesson) => lesson.ideas));

/** Every grammar idea the shipped forms need (ideasOfWord of each lemma and code, once), with whether a table teaches it and a Reading lesson practises it; the most needed first. */
export function ideaNeeds(figures: Figures, newTestament: ReadonlySet<string>): IdeaNeed[] {
  const needs = new Map<string, { words: number; codes: Set<string> }>();
  for (const [code, figure] of figures)
    for (const [lemma, found] of figure.lemmas) {
      let ideas: string[];
      try {
        ideas = ideasOfWord({ l: lemma, p: code, t: found.example.t });
      } catch {
        continue;
      }
      for (const id of ideas) {
        const need = needs.get(id) ?? { words: 0, codes: new Set<string>() };
        need.words += found.count;
        need.codes.add(code);
        needs.set(id, need);
      }
    }
  const inNewTestament = new Set<string>();
  for (const code of newTestament)
    try {
      for (const id of ideasOf(code)) inNewTestament.add(id);
    } catch {
      // a code the ladder cannot read names no idea
    }
  return [...needs]
    .map(([id, need]) => ({ id, words: need.words, codes: need.codes.size, tables: PARADIGMS.filter((t) => languageOf(t) === 'grc' && taughtBy(t, id)).length, readInLesson: READ_IN_LESSONS.has(id), newTestament: inNewTestament.has(id) }))
    .sort((a, b) => b.words - a.words || a.id.localeCompare(b.id));
}

/** A form idea (a case, a gender, a number, a person, a tense, a voice, a mood) the shipped forms need that no table teaches or no Reading lesson practises: the ideas that say which form a word is. */
export const isIdeaGap = (need: IdeaNeed): boolean => FORM_IDEA.test(need.id) && (need.tables === 0 || !need.readInLesson);

export interface GapsInput {
  figures: Figures;
  codes: readonly CodeGap[];
  lexicon: { missing: readonly LemmaGap[]; blank: readonly LemmaGap[] };
  ideas: readonly IdeaNeed[];
  /** where the chapters were read from, for the doc's first lines */
  source: string;
}

const exampleText = (e: Example): string => `${e.t} (${e.l}) ${e.ref}`;
const cell = (text: string): string => text.replace(/\|/g, '\\|');
const listOf = <T>(rows: readonly T[], line: (row: T) => string): string[] => [...rows.slice(0, LIST_CAP).map(line), ...(rows.length > LIST_CAP ? [`\n…and ${rows.length - LIST_CAP} more.`] : [])];

/** The codes grouped by mood and then part of speech (verbs first, by mood name), each group a table of code, words, what is missing, table, whether the New Testament has it, and an example. */
function groupedCodes(gaps: readonly CodeGap[], missingColumn: boolean): string[] {
  const out: string[] = [];
  const moods = [...new Set(gaps.map((g) => g.mood))].sort((a, b) => (a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)));
  for (const mood of moods) {
    const inMood = gaps.filter((g) => g.mood === mood);
    for (const pos of [...new Set(inMood.map((g) => g.pos))].sort()) {
      const rows = inMood.filter((g) => g.pos === pos);
      out.push(`#### ${mood === 'none' ? 'No mood' : `Mood: ${mood}`}, ${pos} (${rows.length} code${rows.length === 1 ? '' : 's'}, ${rows.reduce((n, g) => n + g.count, 0).toLocaleString('en-US')} words)`, '');
      out.push(`| Code | Words | ${missingColumn ? 'Table | Missing | ' : ''}Septuagint only | Example |`, `| --- | ---: | ${missingColumn ? '--- | --- | ' : ''}--- | --- |`);
      out.push(...listOf(rows, (g) => `| ${cell(g.code)} | ${g.count.toLocaleString('en-US')} | ${missingColumn ? `${g.table} | ${g.missing.join(', ')} | ` : ''}${g.septuagintOnly ? 'yes' : 'no'} | ${cell(exampleText(g.example))} |`), '');
    }
  }
  return out;
}

/** The doc's text: pure of the input, so a second run on the same files is the same bytes. */
export function gapsMarkdown({ figures, codes, lexicon, ideas, source }: GapsInput): string {
  const words = [...figures.values()].reduce((n, f) => n + f.count, 0);
  const noCell = codes.filter((g) => g.kind === 'no-cell');
  const otherTable = codes.filter((g) => g.kind === 'other-table');
  const noTable = codes.filter((g) => g.kind === 'no-table' && !g.indeclinable);
  const indeclinable = codes.filter((g) => g.kind === 'no-table' && g.indeclinable);
  const unreadable = codes.filter((g) => g.kind === 'unreadable');
  const needed = ideas.filter(isIdeaGap);
  const lines = [
    '# Septuagint grammar gaps',
    '',
    '<!-- toc: none -->',
    '',
    `GENERATED by \`npm run lxx:grammar-gaps\` (scripts/lxx/grammar-gaps.ts, docs/lxx-derivation.md 'The grammar check'); do not edit by hand. It answers the Governor's question of 2026-11-05: what in the paradigm tables and the grammar lessons does reading the Septuagint in Greek need that they lack? Read from \`${source}\`; the file's name and place are PROVISIONAL.`,
    '',
    '## What was read',
    '',
    `* ${words.toLocaleString('en-US')} words of the shipped chapters, ${figures.size} distinct parsing codes (${codes.filter((g) => g.septuagintOnly).length} of the gaps below are in no chapter of the New Testament).`,
    `* **${noCell.length} codes have a table but no cell for the form** (${noCell.reduce((n, g) => n + g.count, 0).toLocaleString('en-US')} words), ${otherTable.length} have a cell in another table than the one the word sheet shows (${otherTable.reduce((n, g) => n + g.count, 0).toLocaleString('en-US')} words), **${noTable.length} have no table** though they are declined or conjugated (${noTable.reduce((n, g) => n + g.count, 0).toLocaleString('en-US')} words), ${indeclinable.length} are indeclinable and need none (${indeclinable.reduce((n, g) => n + g.count, 0).toLocaleString('en-US')} words), ${unreadable.length} the ladder cannot read.`,
    `* ${lexicon.missing.length} lemmas have no lexicon entry and ${lexicon.blank.length} a blank one; ${ideas.filter((n) => isIdeaGap(n) && n.tables === 0).length} form ideas the text needs are in no table (${ideas.filter((n) => isIdeaGap(n) && n.tables === 0).map((n) => n.id).join(', ') || 'none'}), ${needed.filter((n) => !n.readInLesson).length} of the ${ideas.filter((n) => FORM_IDEA.test(n.id)).length} form ideas it needs are practised by no Reading lesson.`,
    '',
    'How a gap is found: `tableFor(code, word)` (src/data/paradigms/index.ts) is the table the app shows the word. A code **has no cell** when no cell of that table (with the ideas the table itself teaches) carries every case, gender, number, person, tense, voice and mood the code names (a deponent voice is read as its voice); the ideas of the best cell that are missing are named.',
    '',
    '## Codes with a table but no cell for the form',
    '',
    ...(noCell.length === 0 ? ['None.', ''] : groupedCodes(noCell, true)),
    '## Codes whose cell is in another table than the one the word sheet shows',
    '',
    otherTable.length === 0 ? 'None.' : '| Code | Words | Shown | Missing there | Held by | Example |\n| --- | ---: | --- | --- | --- | --- |',
    ...listOf(otherTable, (g) => `| ${cell(g.code)} | ${g.count.toLocaleString('en-US')} | ${g.table} | ${g.missing.join(', ')} | ${g.heldBy} | ${cell(exampleText(g.example))} |`),
    '',
    '## Codes with no table',
    '',
    ...(noTable.length === 0 ? ['None.', ''] : groupedCodes(noTable, false)),
    `### Indeclinable codes (no table is wanted)`,
    '',
    indeclinable.length === 0 ? 'None.' : indeclinable.map((g) => `${g.code} (${g.count.toLocaleString('en-US')})`).join(', '),
    '',
    ...(unreadable.length === 0 ? [] : ['### Codes the ladder cannot read', '', ...unreadable.map((g) => `* ${g.code}: ${g.count.toLocaleString('en-US')} words, ${exampleText(g.example)}`), '']),
    '## Lemmas with no lexicon entry',
    '',
    lexicon.missing.length === 0 ? 'None.' : '| Lemma | Words | Example |\n| --- | ---: | --- |',
    ...listOf(lexicon.missing, (l) => `| ${cell(l.lemma)} | ${l.count.toLocaleString('en-US')} | ${cell(exampleText(l.example))} |`),
    '',
    '### Lemmas whose entry is blank (TBESG lacks the word)',
    '',
    lexicon.blank.length === 0 ? 'None.' : '| Lemma | Words | Example |\n| --- | ---: | --- |',
    ...listOf(lexicon.blank, (l) => `| ${cell(l.lemma)} | ${l.count.toLocaleString('en-US')} | ${cell(exampleText(l.example))} |`),
    '',
    '## Ideas the Septuagint needs that no table teaches or no Reading lesson practises',
    '',
    'Only the ideas that say which form a word is (a case, a gender, a number, a person, a tense, a voice, a mood). A table teaches an idea when the table names it or one of its cells carries it; a Reading lesson practises it when a lesson of the letters of John (src/approaches/john-lessons.ts) names it. Every idea has its own card on the ladder (src/data/grammar/teach), so none lacks a lesson of its own: what is missing is a table to see the form in, and a reading lesson of the Septuagint to meet it in.',
    '',
    needed.length === 0 ? 'None.' : '| Idea | Words | Codes | Tables | In a Reading lesson | In the New Testament |\n| --- | ---: | ---: | ---: | --- | --- |',
    ...listOf(needed, (n) => `| ${n.id} | ${n.words.toLocaleString('en-US')} | ${n.codes} | ${n.tables} | ${n.readInLesson ? 'yes' : 'no'} | ${n.newTestament ? 'yes' : 'no'} |`),
    '',
  ];
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

/** The shipped chapters of a folder in the index's order; an index with no shipped chapter gives none. */
export function readShipped(dir: string): ShippedChapter[] {
  const index = join(dir, 'index.json');
  if (!existsSync(index)) return [];
  const chapters: ShippedChapter[] = [];
  for (const book of (JSON.parse(readFileSync(index, 'utf8')) as { books?: { code: string; chapters: number }[] }).books ?? [])
    for (let n = 1; n <= book.chapters; n++) {
      const file = join(dir, book.code, `${n}.json`);
      if (existsSync(file)) chapters.push(JSON.parse(readFileSync(file, 'utf8')) as ShippedChapter);
    }
  return chapters;
}

/** The parsing codes of the New Testament's chapters (public/data: each chapter's `parse` is keyed by its codes). */
export function newTestamentCodes(dataDir = join('public', 'data')): Set<string> {
  const codes = new Set<string>();
  for (const entry of readdirSync(dataDir, { withFileTypes: true }).filter((e) => e.isDirectory()))
    for (const file of readdirSync(join(dataDir, entry.name)).filter((f) => /^\d+\.json$/.test(f))) {
      const chapter = JSON.parse(readFileSync(join(dataDir, entry.name, file), 'utf8')) as { lang?: string; parse?: Record<string, string> };
      if (chapter.lang === 'hbo') continue;
      for (const code of Object.keys(chapter.parse ?? {})) codes.add(code);
    }
  return codes;
}

export interface GapsOptions {
  log?: (line: string) => void;
}

export function runGrammarGaps(argv: readonly string[], { log = () => {} }: GapsOptions = {}): { dir: string; out: string; changed: boolean } {
  const flag = (name: string): string | undefined => argv[argv.indexOf(name) + 1];
  const dirs = argv.includes('--dir') ? [flag('--dir') as string] : SHIPPED_DIRS;
  const out = argv.includes('--out') ? (flag('--out') as string) : GAPS_DOC;
  const found = dirs.map((dir) => ({ dir, chapters: readShipped(dir) })).find((d) => d.chapters.length > 0);
  if (!found) throw new Error(`No shipped Septuagint chapter under ${dirs.join(' or ')}: run \`npm run lxx:ship -- --out dist/data-lxx\` first.`);
  const lexiconFile = join(found.dir, 'lexicon-grc-lxx.json');
  const lexicon = existsSync(lexiconFile) ? (JSON.parse(readFileSync(lexiconFile, 'utf8')) as Record<string, LexiconEntry>) : {};
  const figures = collectCodes(found.chapters);
  const newTestament = newTestamentCodes();
  const text = gapsMarkdown({ figures, codes: codeGaps(figures, newTestament), lexicon: lexiconGaps(figures, lexicon), ideas: ideaNeeds(figures, newTestament), source: found.dir.split('\\').join('/') });
  const before = existsSync(out) ? readFileSync(out, 'utf8') : undefined;
  if (before !== text) writeFileSync(out, text);
  log(`${found.chapters.length} chapters of ${found.dir}, ${figures.size} codes, ${PARADIGMS.length} tables: ${before === text ? 'unchanged' : 'wrote'} ${out}`);
  return { dir: found.dir, out, changed: before !== text };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    runGrammarGaps(process.argv.slice(2), { log: console.log });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
