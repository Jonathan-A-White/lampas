// src/library/matchExport.ts — matches the rows of his Logos list to what Lampas can open (docs/design/library-at-scale.md 5.2), pure. A row matches by its Resource ID (the catalogue
// has the book), by its Series (a series rule of data/logos/catalogue-rules.json takes a commentary volume that covers some of the New Testament) or by its Type (a type rule), the rules read
// by src/library/exportRules.ts as the catalogue tool reads them. `covers` is read from the row's ReferenceSupersets then and there. A row a rule takes whose Resource ID the catalogue does
// not list yet is `listed: false`: Lampas knows the kind of book but this version has no entry for it, so nothing is written for it until an update lists it (rematch). Every other row
// is left with the key of a reason (src/library/reasons.ts).
import { series, types } from '../../data/logos/catalogue-rules.json' with { type: 'json' };
import { CATALOGUE, type CatalogueEntry, type Kind } from '../resources/catalogue';
import { ruleOf, type SeriesRule, type TypeRule } from './exportRules';
import { coversOfSupersets, type ExportRow } from './parseExport';
import { reasonOf } from './reasons';

/** The two rules the phone needs from the rules file: the series and the Logos types that join the catalogue from an export. */
export interface MatchRules {
  series: readonly SeriesRule[];
  types: readonly TypeRule[];
}

export const RULES: MatchRules = { series, types } as unknown as MatchRules;

export interface Matched {
  row: ExportRow;
  /** how the row matched: its Resource ID is in the catalogue, or a series rule or a type rule takes it */
  by: 'id' | 'series' | 'type';
  kind: Kind;
  /** the books of the Bible the row covers (our codes), from its ReferenceSupersets; empty is none */
  covers: string[];
  /** the catalogue's entry, when the catalogue lists the book; undefined while only a rule takes it */
  entry?: CatalogueEntry;
}

export interface Unmatched {
  row: ExportRow;
  /** the key of a reason in reasons.ts */
  reason: string;
}

export interface MatchResult {
  /** every row that matched, listed or not */
  matched: Matched[];
  unmatched: Unmatched[];
}

/** Whether the book is one Lampas lists now: the catalogue has its entry. */
export const isListed = (m: Matched): m is Matched & { entry: CatalogueEntry } => m.entry !== undefined;

/** The rows sorted into matched and unmatched. A Resource ID that appears twice in the list is read once (the first). */
export function matchExport(rows: readonly ExportRow[], catalogue: readonly CatalogueEntry[] = CATALOGUE, matchRules: MatchRules = RULES): MatchResult {
  const byId = new Map(catalogue.map((e) => [e.resource, e]));
  const seen = new Set<string>();
  const result: MatchResult = { matched: [], unmatched: [] };
  for (const row of rows) {
    if (seen.has(row.resource)) continue;
    seen.add(row.resource);
    const covers = coversOfSupersets(row.supersets);
    const entry = byId.get(row.resource);
    if (entry) {
      result.matched.push({ row, by: 'id', kind: entry.kind, covers, entry });
      continue;
    }
    const found = ruleOf(row, matchRules);
    if (found) result.matched.push({ row, by: found.by, kind: found.rule.kind, covers });
    else result.unmatched.push({ row, reason: reasonOf(row, covers) });
  }
  return result;
}
