// src/library/exportRules.ts — which rule of data/logos/catalogue-rules.json takes a row of a Logos export, pure: the one place that says what a series rule and a type rule match, read by the
// tool that writes the catalogue (scripts/logos-catalogue.ts) and by the phone that matches a reader's list (src/library/matchExport.ts), so a row is taken by the same rule in both.
import type { Kind } from '../resources/catalogue.ts';
import { coversNewTestament, coversOfSupersets, type ExportRow } from './parseExport.ts';

/** Every row of the export of this Logos type joins (`needs: 'nt'`: only if it covers some book of the New Testament; `'bible'`: only if it covers some book of the Bible, Old Testament or New;
 *  `languages`: only if its Languages cell is this). */
export interface TypeRule {
  type: string;
  kind: Kind;
  needs?: 'nt' | 'bible';
  languages?: string;
}

/** Every commentary volume of the export in this series that covers some book of the New Testament joins. */
export interface SeriesRule {
  series: string;
  kind: Kind;
}

/** A book a type rule would take that is not what the type says (a book about preaching typed as sermons): no rule takes it (mw-qtu3zvz.108). */
export interface ExcludeRule {
  resource: string;
  /** one line: why it is left out */
  reason: string;
}

/** The rule that takes a row, a series rule before a type rule; undefined when none does, and always undefined for a book `exclude` names. */
export function ruleOf<S extends SeriesRule, T extends TypeRule>(row: ExportRow, rules: { series: readonly S[]; types: readonly T[]; exclude?: readonly { resource: string }[] }): { by: 'series'; rule: S } | { by: 'type'; rule: T } | undefined {
  if (rules.exclude?.some((x) => x.resource === row.resource)) return undefined;
  const nt = coversNewTestament(row.supersets).length > 0;
  const series = rules.series.find((s) => s.series === row.series && row.type.startsWith('text.monograph.commentary') && nt);
  if (series) return { by: 'series', rule: series };
  const type = rules.types.find((t) => t.type === row.type && (t.languages === undefined || t.languages === row.languages) && (t.needs === undefined || (t.needs === 'nt' ? nt : coversOfSupersets(row.supersets).length > 0)));
  return type ? { by: 'type', rule: type } : undefined;
}
