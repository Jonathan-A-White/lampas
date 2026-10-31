// tests/support/parityTable.ts — the golden list as the docs show it (docs/language-parity.md), from the registry (src/languages/useCases.ts) and
// the tags under features/ (tests/support/features.ts). scripts/language-parity-docs.ts writes it; tests/unit/language-parity.test.ts holds the doc
// to it. Shared so the two cannot drift.
import { LANGUAGES, USE_CASES, isGap, isNa, type Language, type UseCase } from '../../src/languages/useCases';
import type { TaggedFeature } from './features';

export const PARITY_DOC = 'docs/language-parity.md';
export const TABLE_START = '<!-- parity-table -->';
export const TABLE_END = '<!-- /parity-table -->';
export const GAPS_START = '<!-- hebrew-gaps -->';
export const GAPS_END = '<!-- /hebrew-gaps -->';

const cell = (text: string): string => text.replace(/\|/g, '\\|');

/** The feature files with a scenario tagged for the use case and the language, each once, in order. */
export function provingFiles(features: TaggedFeature[], useCase: string, language: Language): string[] {
  const files = new Set<string>();
  for (const f of features) {
    if (f.scenarios.some((s) => s.tags.includes(`uc-${useCase}`) && s.tags.includes(language))) files.add(f.file);
  }
  return [...files];
}

const statusCell = (features: TaggedFeature[], u: UseCase, language: Language): string => {
  const status = u.status[language];
  if (status === 'has') return provingFiles(features, u.id, language).join(', ') || '(no scenario)';
  if (isGap(status)) return 'gap';
  if (isNa(status)) return `n/a: ${status.na}`;
  return '?';
};

/** The golden list: one row per use case, a column per language naming the feature files that prove it. */
export function parityTable(features: TaggedFeature[]): string {
  const head = `| id | use case | ${LANGUAGES.map((l) => l.label + (l.enabled ? '' : ' (not yet enabled)')).join(' | ')} |`;
  const rule = `| --- | --- | ${LANGUAGES.map(() => '---').join(' | ')} |`;
  const rows = USE_CASES.map((u) => `| \`${u.id}\` | ${cell(u.title)} | ${LANGUAGES.map((l) => cell(statusCell(features, u, l.id))).join(' | ')} |`);
  return [TABLE_START, head, rule, ...rows, TABLE_END].join('\n');
}

/** The Hebrew gaps, one line each: the backfill names the scenario, the files and a size (the Mayor files each as a story). */
export function hebrewGapsSection(gaps: UseCase[]): string {
  const lines = gaps.map((u) => {
    const status = u.status.hebrew;
    return `- \`${u.id}\` (${cell(u.title)}): ${isGap(status) ? cell(status.gap) : ''}`;
  });
  return [GAPS_START, ...lines, GAPS_END].join('\n');
}

/** `doc` with the text between the markers replaced by `block` (which carries the markers). */
export function withBlock(doc: string, start: string, end: string, block: string): string {
  const from = doc.indexOf(start);
  const to = doc.indexOf(end);
  if (from < 0 || to < 0) throw new Error(`${PARITY_DOC} has no ${start} ... ${end} block`);
  return doc.slice(0, from) + block + doc.slice(to + end.length);
}
