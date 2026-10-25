// scripts/logos-fit.ts — the fit report (`npm run logos:fit -- <csv>`; mw-rfjjzd.2, docs/design/library-at-scale.md 3.1 and 5.4): the rows of a Logos export that the catalogue's
// rules do not take, by the kind each would be, with the Logos type and the data types of its ReferenceSupersets (`ltrntg`, `bdf`, `bible+esv`: the names a section link could use,
// docs/research/logos-section-refs.md). It is the Mayor's reading of a list a reader sent: what could join with a rule, and what is outside the vision. Rows that look like none of the seven
// kinds are counted by type, not listed. Nothing is written.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Kind } from '../src/resources/catalogue.ts';
import { KIND_LIST, buildCatalogue, coversOfSupersets, loadRules, readExport, type ExportRow, type Rules } from './logos-catalogue.ts';

export type FitKind = Kind | 'other';

/** The kind a row would be if the rules took it, by its Logos type and language. A Bible in English is a Bible, in Greek a Greek text; anything else is 'other'. */
export function guessKind(row: Pick<ExportRow, 'type' | 'languages'>): FitKind {
  const { type, languages } = row;
  if (type === 'text.monograph.lexicon') return 'lexicon';
  if (type === 'text.monograph.grammar') return 'grammar';
  if (type.startsWith('text.monograph.commentary')) return 'commentary';
  if (type === 'text.monograph.critical-apparatus.bible') return 'greek-text';
  if (type === 'text.monograph.bible') return languages === 'el' ? 'greek-text' : languages === 'en' ? 'bible' : 'other';
  if (type === 'lbx.reverse-interlinear') return 'interlinear';
  if (type === 'lbx.calendar-devotional') return 'devotional';
  return 'other';
}

/** The data types of a ReferenceSupersets cell: each token's name with its numbers dropped (`bible+esv.61-87` is `bible+esv`), once each, in order. */
export function dataTypesOf(supersets: string): string[] {
  const names = supersets.split('\t').map((t) => /^[A-Za-z][A-Za-z0-9+_-]*/.exec(t.trim())?.[0] ?? '').filter((n) => n !== '');
  return [...new Set(names)];
}

export interface FitRow {
  resource: string;
  type: string;
  title: string;
  dataTypes: string[];
  /** why a rule would not take it, when the report can tell: 'Old Testament' */
  reason?: string;
}

export interface FitKindRows {
  kind: FitKind;
  rows: FitRow[];
  /** the Logos types of these rows, with how many of each */
  types: Record<string, number>;
}

export interface Fit {
  rows: number;
  matched: number;
  unmatched: number;
  byKind: FitKindRows[];
  /** the rules of the catalogue that took no row of this export, by name (buildCatalogue's `unmatched`) */
  unmatchedRules: string[];
}

/** What the rules take of the export and what they leave, by kind (the seven, then 'other'). */
export function fitReport(rules: Rules, rows: readonly ExportRow[]): Fit {
  const { files, unmatched } = buildCatalogue(rules, rows);
  const taken = new Set(KIND_LIST.flatMap((k) => files[k].entries.map((e) => e.resource)));
  const byKind: FitKindRows[] = [...KIND_LIST, 'other' as const].map((kind) => ({ kind, rows: [], types: {} }));
  let matched = 0;
  for (const row of rows) {
    if (taken.has(row.resource)) {
      matched++;
      continue;
    }
    const bucket = byKind.find((b) => b.kind === guessKind(row)) as FitKindRows;
    const offTestament = ['commentary', 'interlinear', 'bible'].includes(bucket.kind) && row.supersets.includes('bible') && coversOfSupersets(row.supersets).length === 0;
    bucket.rows.push({ resource: row.resource, type: row.type, title: row.title, dataTypes: dataTypesOf(row.supersets), ...(offTestament ? { reason: 'Old Testament' } : {}) });
    bucket.types[row.type] = (bucket.types[row.type] ?? 0) + 1;
  }
  return { rows: rows.length, matched, unmatched: rows.length - matched, byKind, unmatchedRules: unmatched };
}

/** The report as text: a line of totals, then each kind that has rows left: its rows (resource, type, title, data types, reason), or for 'other' its types with counts. */
export function formatFit(fit: Fit): string {
  const lines = [`${fit.rows} rows: ${fit.matched} taken by the catalogue, ${fit.unmatched} not.`];
  if (fit.unmatchedRules.length > 0) lines.push(`rules that match no row (${fit.unmatchedRules.length}): ${fit.unmatchedRules.join('; ')}`);
  for (const { kind, rows, types } of fit.byKind) {
    if (rows.length === 0) continue;
    if (kind === 'other') {
      const counts = Object.entries(types).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      lines.push(`other (${rows.length}): ${counts.map(([t, n]) => `${t} ${n}`).join(', ')}`);
      continue;
    }
    lines.push(`${kind} (${rows.length})`);
    for (const r of rows) lines.push(`  ${[r.resource, r.type, r.title].join('  ')}${r.dataTypes.length > 0 ? `  [${r.dataTypes.join(', ')}]` : ''}${r.reason ? `  (${r.reason})` : ''}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(argv: string[]): void {
  const csv = argv[2];
  if (!csv) {
    console.error('usage: npm run logos:fit -- <export.csv>');
    process.exit(2);
  }
  const fit = fitReport(loadRules(), readExport(readFileSync(resolve(csv), 'utf8')));
  process.stdout.write(`${csv}: ${formatFit(fit)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv);
