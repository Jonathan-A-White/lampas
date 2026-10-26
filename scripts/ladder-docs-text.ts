// scripts/ladder-docs-text.ts — what `npm run ladder:docs` (scripts/ladder-docs.ts) writes from the ladder (mw-svw421.9), and ladderProblems, the one check
// tests/unit/ladder-single-source.test.ts runs: adding an idea is one entry in src/data/grammar/ladder.ts, and the docs/grammar.md ladder table, the
// docs/card-audit.md rows, the idea's card and the built grinds all follow from it. Pure: text in, text out.
// Both ladders are held (mw-gdcyf98.9): the Greek one's table sits between the plain markers of each doc, the Hebrew one's (src/data/grammar/hebrew/ladder.ts) between
// the '-hbo' markers after it, and a problem of the Hebrew ladder says so. The built grinds' bridge enum stays the Greek ladder's.
import { pathProblems } from '../src/data/grammar/pathGraph.ts';

/** The part of an idea these docs read. */
export interface DocIdea {
  id: string;
  title: string;
  tier: string;
  rung: number;
  terms: readonly string[];
  needs: readonly string[];
}

export const GRAMMAR_DOC = 'docs/grammar.md';
export const AUDIT_DOC = 'docs/card-audit.md';

/** The ladders these docs hold: Koine Greek and Biblical Hebrew (ladders.ts LADDER_LANGS). */
export type DocLang = 'grc' | 'hbo';

interface Markers {
  grammarBegin: string;
  grammarEnd: string;
  auditBegin: string;
  auditEnd: string;
  /** where the ladder is written, for a problem to name */
  ladderFile: string;
  /** where its cards are written */
  teachFile: (tier: string) => string;
}

const MARKERS: Record<DocLang, Markers> = {
  grc: {
    grammarBegin: '<!-- ladder:begin — written by `npm run ladder:docs` from src/data/grammar/ladder.ts; edit the ladder, not this table -->',
    grammarEnd: '<!-- ladder:end -->',
    auditBegin: '<!-- audit:begin — the id and title columns are written by `npm run ladder:docs` from src/data/grammar/ladder.ts; the verdict and what-a-beginner-lacked columns are by hand -->',
    auditEnd: '<!-- audit:end -->',
    ladderFile: 'src/data/grammar/ladder.ts',
    teachFile: (tier) => `src/data/grammar/teach/${tier}.ts`,
  },
  hbo: {
    grammarBegin: '<!-- ladder-hbo:begin — written by `npm run ladder:docs` from src/data/grammar/hebrew/ladder.ts; edit the Hebrew ladder, not this table -->',
    grammarEnd: '<!-- ladder-hbo:end -->',
    auditBegin: '<!-- audit-hbo:begin — the id and title columns are written by `npm run ladder:docs` from src/data/grammar/hebrew/ladder.ts; the verdict and what-a-beginner-lacked columns are by hand -->',
    auditEnd: '<!-- audit-hbo:end -->',
    ladderFile: 'src/data/grammar/hebrew/ladder.ts',
    teachFile: () => 'src/data/grammar/hebrew/teach/index.ts',
  },
};

/** The verdict and note of a new idea's audit row, until someone judges its card by hand. */
export const NEW_VERDICT = 'teaches a beginner';
export const NEW_LACKED = 'New, so no card before it; judge the card by hand.';

const cell = (text: string): string => text.replace(/\|/g, '\\|');
const ticks = (ids: readonly string[]): string => (ids.length === 0 ? '–' : ids.map((id) => `\`${id}\``).join(', '));

/** The block between the markers of one doc: [text before and including the begin marker line, the lines between, text from the end marker]. */
function split(doc: string, begin: string, end: string, file: string): [string, string[], string] {
  const lines = doc.split('\n');
  const from = lines.indexOf(begin);
  const to = lines.indexOf(end);
  if (from < 0 || to < from) throw new Error(`${file}: the block between "${begin.slice(0, 20)}…" and "${end}" is missing; run npm run ladder:docs after restoring both marker lines`);
  return [lines.slice(0, from + 1).join('\n'), lines.slice(from + 1, to), lines.slice(to).join('\n')];
}

/** The ladder table lines of docs/grammar.md. */
export function grammarTable(ladder: readonly DocIdea[]): string[] {
  return [
    '| Rung | Tier | Id | Title | Terms | Rests on |',
    '| --- | --- | --- | --- | --- | --- |',
    ...ladder.map((i) => `| ${i.rung} | ${i.tier} | \`${i.id}\` | ${cell(i.title)} | ${i.terms.length === 0 ? '–' : i.terms.join(', ')} | ${ticks(i.needs)} |`),
  ];
}

/** The hand-written columns of the audit rows now in the doc, by idea id. */
export function auditJudgements(auditDoc: string, lang: DocLang = 'grc'): Map<string, { verdict: string; lacked: string }> {
  const [, lines] = split(auditDoc, MARKERS[lang].auditBegin, MARKERS[lang].auditEnd, AUDIT_DOC);
  const out = new Map<string, { verdict: string; lacked: string }>();
  for (const line of lines) {
    const m = /^\| `([^`]+)` \| (.*?) \| ([^|]*?) \| (.*) \|$/.exec(line);
    if (m) out.set(m[1], { verdict: m[3], lacked: m[4] });
  }
  return out;
}

/** The audit table lines: one row per idea, in ladder order, the verdict and the note kept from `judged` (or the new-idea default). */
export function auditTable(ladder: readonly DocIdea[], judged: ReadonlyMap<string, { verdict: string; lacked: string }>): string[] {
  return [
    '| id | title | verdict | what a beginner lacked |',
    '| --- | --- | --- | --- |',
    ...ladder.map((i) => {
      const j = judged.get(i.id) ?? { verdict: NEW_VERDICT, lacked: NEW_LACKED };
      return `| \`${i.id}\` | ${cell(i.title)} | ${j.verdict} | ${j.lacked} |`;
    }),
  ];
}

/** docs/grammar.md with the ladder table of `lang` (the Greek one by default) written from `ladder`. */
export function withGrammarTable(doc: string, ladder: readonly DocIdea[], lang: DocLang = 'grc'): string {
  const [head, , tail] = split(doc, MARKERS[lang].grammarBegin, MARKERS[lang].grammarEnd, GRAMMAR_DOC);
  return [head, ...grammarTable(ladder), tail].join('\n');
}

/** docs/card-audit.md with the rows of `lang` (the Greek ladder by default) written from `ladder`, the hand-written columns kept by idea id. */
export function withAuditTable(doc: string, ladder: readonly DocIdea[], lang: DocLang = 'grc'): string {
  const [head, , tail] = split(doc, MARKERS[lang].auditBegin, MARKERS[lang].auditEnd, AUDIT_DOC);
  return [head, ...auditTable(ladder, auditJudgements(doc, lang)), tail].join('\n');
}

/** Everything the single-source check reads. */
export interface LadderSources {
  ladder: readonly DocIdea[];
  /** the ids that have a teach card */
  cardIds: ReadonlySet<string>;
  grammarDoc: string;
  auditDoc: string;
  /** the answer schemas the grind build writes, by file */
  schemas: Readonly<Record<string, object>>;
  /** the Hebrew ladder and the ids that have a card of its own, held to the same rules (none: not checked) */
  hebrew?: { ladder: readonly DocIdea[]; cardIds: ReadonlySet<string> };
}

const sameLines = (file: string, what: string, wanted: readonly string[], found: readonly string[]): string[] => {
  const problems: string[] = [];
  for (let n = 0; n < Math.max(wanted.length, found.length); n++) {
    if (wanted[n] === found[n]) continue;
    problems.push(`${file}: ${what} is stale at line ${n + 1} of its block: wanted ${JSON.stringify(wanted[n] ?? null)}, found ${JSON.stringify(found[n] ?? null)}; run npm run ladder:docs`);
    break;
  }
  return problems;
};

/** The problems of one ladder, apart from the grinds: its path, a card for each idea and none for another, and its rows in both docs. */
function docProblems(lang: DocLang, ladder: readonly DocIdea[], cardIds: ReadonlySet<string>, grammarDoc: string, auditDoc: string): string[] {
  const m = MARKERS[lang];
  const problems = pathProblems(ladder).map((p) => `${m.ladderFile}: ${p}`);
  for (const idea of ladder) {
    if (!cardIds.has(idea.id)) problems.push(`${idea.id}: no teach card; add one in ${m.teachFile(idea.tier)}`);
  }
  for (const id of cardIds) if (!ladder.some((i) => i.id === id)) problems.push(`${id}: a teach card for an idea the ladder has not`);

  try {
    const [, grammarLines] = split(grammarDoc, m.grammarBegin, m.grammarEnd, GRAMMAR_DOC);
    problems.push(...rowProblems(GRAMMAR_DOC, ladder, grammarTable(ladder), grammarLines, (line) => /^\| \d+ \| \w+ \| `([^`]+)`/.exec(line)?.[1]));
    const [, auditLines] = split(auditDoc, m.auditBegin, m.auditEnd, AUDIT_DOC);
    problems.push(...rowProblems(AUDIT_DOC, ladder, auditTable(ladder, auditJudgements(auditDoc, lang)), auditLines, (line) => /^\| `([^`]+)`/.exec(line)?.[1]));
  } catch (e) {
    problems.push((e as Error).message);
  }
  return problems;
}

/** The prefix every Hebrew idea id has (src/data/grammar/hebrew/ladder.ts HEBREW_ID_PREFIX), so a level, a review row and a drill plan never collide with a Greek one's. */
const HEBREW_PREFIX = 'he-';

/** Every way the ladder and what follows from it disagree, each naming the idea and the file; empty when the ladder is the single source. A problem of the Hebrew
 * ladder starts 'the Hebrew ladder (hbo): '; the Greek ladder's are as they were. */
export function ladderProblems(src: LadderSources): string[] {
  const problems = docProblems('grc', src.ladder, src.cardIds, src.grammarDoc, src.auditDoc);
  for (const idea of src.ladder) if (idea.id.startsWith(HEBREW_PREFIX)) problems.push(`${idea.id}: an idea of the Greek ladder whose id starts ${HEBREW_PREFIX}, the Hebrew ladder's`);
  if (src.hebrew) {
    const hbo = docProblems('hbo', src.hebrew.ladder, src.hebrew.cardIds, src.grammarDoc, src.auditDoc);
    for (const idea of src.hebrew.ladder) if (!idea.id.startsWith(HEBREW_PREFIX)) hbo.push(`${idea.id}: an idea of the Hebrew ladder whose id does not start ${HEBREW_PREFIX}`);
    problems.push(...hbo.map((p) => `the Hebrew ladder (hbo): ${p}`));
  }

  // the grinds: the ids the bridge may name are exactly the Greek ladder's, in its order (grind-build.ts writes them with withBridgeIdeas)
  const want = src.ladder.map((i) => i.id);
  for (const [file, schema] of Object.entries(src.schemas)) {
    for (const [where, have] of Object.entries(bridgeIds(schema))) {
      if (JSON.stringify(have) === JSON.stringify(want)) continue;
      const missing = want.filter((id) => !have.includes(id));
      const extra = have.filter((id) => !want.includes(id));
      problems.push(`${file}: bridge ${where} is older than the ladder (${missing.length + extra.length === 0 ? 'the ids are right, the order differs' : `missing ${missing.join(', ') || 'none'}; not on the ladder ${extra.join(', ') || 'none'}`}); run npm run grind:build`);
    }
  }
  return problems;
}

type Json = Record<string, unknown>;
/** The two id lists of an answer schema's `bridge`: what `missing` may name and what `next` may. */
const bridgeIds = (schema: object): Record<string, string[]> => {
  const props = (((schema as Json).properties as Json).bridge as Json).properties as Record<string, Json>;
  return { missing: (props.missing.items as Json).enum as string[], next: props.next.enum as string[] };
};

/** The problems of one doc's table, each naming the idea whose row is wrong. */
function rowProblems(file: string, ladder: readonly DocIdea[], wanted: readonly string[], found: readonly string[], idOf: (line: string) => string | undefined): string[] {
  const rowsFound = new Map(found.map((l) => [idOf(l), l] as const).filter(([id]) => id !== undefined));
  const rowsWanted = new Map(wanted.map((l) => [idOf(l), l] as const).filter(([id]) => id !== undefined));
  const problems: string[] = [];
  for (const idea of ladder) {
    const want = rowsWanted.get(idea.id);
    const have = rowsFound.get(idea.id);
    if (have === undefined) problems.push(`${idea.id}: no row in ${file}; run npm run ladder:docs`);
    else if (have !== want) problems.push(`${idea.id}: its row in ${file} differs from the ladder's: wanted ${want}, found ${have}; run npm run ladder:docs`);
  }
  for (const id of rowsFound.keys()) if (!rowsWanted.has(id)) problems.push(`${id}: a row in ${file} for an idea the ladder has not; run npm run ladder:docs`);
  if (problems.length === 0) problems.push(...sameLines(file, 'the table', wanted, found));
  return problems;
}
