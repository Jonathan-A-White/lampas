// scripts/ladder-docs-text.ts — what `npm run ladder:docs` (scripts/ladder-docs.ts) writes from the ladder (mw-svw421.9), and ladderProblems, the one check
// tests/unit/ladder-single-source.test.ts runs: adding an idea is one entry in src/data/grammar/ladder.ts, and the docs/grammar.md ladder table, the
// docs/card-audit.md rows, the idea's card and the built grinds all follow from it. Pure: text in, text out.
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

const GRAMMAR_BEGIN = '<!-- ladder:begin — written by `npm run ladder:docs` from src/data/grammar/ladder.ts; edit the ladder, not this table -->';
const AUDIT_BEGIN = '<!-- audit:begin — the id and title columns are written by `npm run ladder:docs` from src/data/grammar/ladder.ts; the verdict and what-a-beginner-lacked columns are by hand -->';
const GRAMMAR_END = '<!-- ladder:end -->';
const AUDIT_END = '<!-- audit:end -->';

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
export function auditJudgements(auditDoc: string): Map<string, { verdict: string; lacked: string }> {
  const [, lines] = split(auditDoc, AUDIT_BEGIN, AUDIT_END, AUDIT_DOC);
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

/** docs/grammar.md with its ladder table written from `ladder`. */
export function withGrammarTable(doc: string, ladder: readonly DocIdea[]): string {
  const [head, , tail] = split(doc, GRAMMAR_BEGIN, GRAMMAR_END, GRAMMAR_DOC);
  return [head, ...grammarTable(ladder), tail].join('\n');
}

/** docs/card-audit.md with its rows written from `ladder`, the hand-written columns kept by idea id. */
export function withAuditTable(doc: string, ladder: readonly DocIdea[]): string {
  const [head, , tail] = split(doc, AUDIT_BEGIN, AUDIT_END, AUDIT_DOC);
  return [head, ...auditTable(ladder, auditJudgements(doc)), tail].join('\n');
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

/** Every way the ladder and what follows from it disagree, each naming the idea and the file; empty when the ladder is the single source. */
export function ladderProblems(src: LadderSources): string[] {
  const problems = pathProblems(src.ladder).map((p) => `src/data/grammar/ladder.ts: ${p}`);
  for (const idea of src.ladder) {
    if (!src.cardIds.has(idea.id)) problems.push(`${idea.id}: no teach card; add one in src/data/grammar/teach/${idea.tier}.ts`);
  }
  for (const id of src.cardIds) if (!src.ladder.some((i) => i.id === id)) problems.push(`${id}: a teach card for an idea the ladder has not`);

  try {
    const [, grammarLines] = split(src.grammarDoc, GRAMMAR_BEGIN, GRAMMAR_END, GRAMMAR_DOC);
    const wanted = grammarTable(src.ladder);
    problems.push(...rowProblems(GRAMMAR_DOC, src.ladder, wanted, grammarLines, (line) => /^\| \d+ \| \w+ \| `([^`]+)`/.exec(line)?.[1]));
    const [, auditLines] = split(src.auditDoc, AUDIT_BEGIN, AUDIT_END, AUDIT_DOC);
    const wantedAudit = auditTable(src.ladder, auditJudgements(src.auditDoc));
    problems.push(...rowProblems(AUDIT_DOC, src.ladder, wantedAudit, auditLines, (line) => /^\| `([^`]+)`/.exec(line)?.[1]));
  } catch (e) {
    problems.push((e as Error).message);
  }

  // the grinds: the ids the bridge may name are exactly the ladder's, in its order (grind-build.ts writes them with withBridgeIdeas)
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
