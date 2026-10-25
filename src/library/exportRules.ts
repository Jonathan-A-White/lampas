// src/library/exportRules.ts — which rule of data/logos/catalogue-rules.json takes a row of a Logos export, pure: the one place that says what a series rule and a type rule match, read by the
// tool that writes the catalogue (scripts/logos-catalogue.ts) and by the phone that matches a reader's list (src/library/matchExport.ts), so a row is taken by the same rule in both.
import type { Kind } from '../resources/catalogue.ts';
import { coversOfSupersets, coversOldTestament, type ExportRow } from './parseExport.ts';

/** Every row of the export of this Logos type joins (`needs: 'nt'`: only if it covers some book of the New Testament; `'nt-only'`: only if it covers some and none of the Old Testament, so a commentary on the whole Bible waits for the
 *  Old Testament reader; `languages`: only if its Languages cell is this). */
export interface TypeRule {
  type: string;
  kind: Kind;
  needs?: 'nt' | 'nt-only';
  languages?: string;
}

/** Every commentary volume of the export in this series that covers some book of the New Testament joins. */
export interface SeriesRule {
  series: string;
  kind: Kind;
}

/** The rule that takes a row, a series rule before a type rule; undefined when none does. */
export function ruleOf<S extends SeriesRule, T extends TypeRule>(row: ExportRow, rules: { series: readonly S[]; types: readonly T[] }): { by: 'series'; rule: S } | { by: 'type'; rule: T } | undefined {
  const nt = coversOfSupersets(row.supersets).length > 0;
  const series = rules.series.find((s) => s.series === row.series && row.type.startsWith('text.monograph.commentary') && nt);
  if (series) return { by: 'series', rule: series };
  const type = rules.types.find((t) => t.type === row.type && (t.languages === undefined || t.languages === row.languages) && (t.needs === undefined || (nt && (t.needs !== 'nt-only' || !coversOldTestament(row.supersets)))));
  return type ? { by: 'type', rule: type } : undefined;
}
