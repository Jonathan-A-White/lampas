// src/reader/readingSets.ts — which reading of a variant unit a reading set holds (mw-9ji6ek0.23). Pure: no Dexie. A set is the text he reads: the three built-in
// sets (Byzantine, NA, ECM) are rules over a unit's alternatives, and Mine and his named sets (the `readingSets` table, src/data/repositories/readingSets.ts) hold a
// choice per unit. A unit is known by its key, not by its word indexes, because the RP 2026 overlay moved indexes (mw-9ji6ek0.9, .11).
import type { Chapter, VariantCode, VariantUnit } from '../data/chapter';
import type { ReadingSetRow } from '../data/db';

export type { ReadingSetRow };

/** A reading set as readingOf reads it: a row of the table, or one of the built-in sets (which hold no choices). */
export type ReadingSet = ReadingSetRow;

/** The index of the text's own reading in a choice; an alternative is its index in the unit's `alts`. */
export const BASE = -1;

export const BYZANTINE_ID = 'byzantine';
export const NA_ID = 'na';
export const ECM_ID = 'ecm';
/** The id of the set he starts by choosing a reading under a built-in one (PROVISIONAL, the plan's Q5). */
export const MINE_ID = 'mine';
export const DEFAULT_SET_ID = BYZANTINE_ID;

export const BYZANTINE: ReadingSet = { id: BYZANTINE_ID, name: 'Byzantine', choices: {} };
export const NA: ReadingSet = { id: NA_ID, name: 'NA', choices: {} };
export const ECM: ReadingSet = { id: ECM_ID, name: 'ECM', choices: {} };
/** The built-in sets, in the order they are offered. */
export const BUILT_IN_SETS: readonly ReadingSet[] = [BYZANTINE, NA, ECM];

/** What a built-in set reads: a set started from NA or ECM reads it where it has no choice of its own. */
export type BuiltInRule = 'na' | 'ecm';

export const isBuiltIn = (id: string): boolean => BUILT_IN_SETS.some((s) => s.id === id);
export const builtInOf = (id: string): ReadingSet | undefined => BUILT_IN_SETS.find((s) => s.id === id);

/** One reading of a unit: its index (BASE for the text's own), its Greek ('' for a reading that leaves the words out) and the code it carries (null for the text's own). */
export interface Reading {
  index: number;
  text: string;
  code: VariantCode | null;
}

/** The keys of the units of a chapter, in the order of `units`: `<book code> <chapter>:<verse> <base NFC>`, and `#2`, `#3` on a second and third unit of the same base in
 * the same verse (in the chapter file's order, which the build keeps stable). */
export function unitKeys(chapter: Pick<Chapter, 'code' | 'chapter'>, units: readonly VariantUnit[]): string[] {
  const seen = new Map<string, number>();
  return units.map((unit) => {
    const key = `${chapter.code} ${chapter.chapter}:${unit.v} ${unit.base.normalize('NFC')}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? key : `${key}#${n}`;
  });
}

/** The key of `unit`, one of `units` (the chapter's variant units): a unit that is not in `units` is keyed as the first of its base. */
export function unitKey(chapter: Pick<Chapter, 'code' | 'chapter'>, unit: VariantUnit, units: readonly VariantUnit[]): string {
  const at = units.indexOf(unit);
  return at < 0 ? unitKeys(chapter, [unit])[0] : unitKeys(chapter, units)[at];
}

/** The keys of the other units of `units` that share a word with `unit` (the same verse, a word index in common): choosing one of two overlapping units clears a choice on the other. */
export function sharingKeys(chapter: Pick<Chapter, 'code' | 'chapter'>, unit: VariantUnit, units: readonly VariantUnit[]): string[] {
  const keys = unitKeys(chapter, units);
  return units.flatMap((other, i) => (other !== unit && other.v === unit.v && other.w.some((w) => unit.w.includes(w)) ? [keys[i]] : []));
}

const NA_ORDER: readonly VariantCode[] = ['E', 'C', 'N', 'S'];

/** The index of the alternative a built-in rule reads in `unit`, BASE when it reads the text's own: NA the alternative coded E (NA28), else C, else N, else S;
 * ECM the one coded M, else as NA. */
export function builtInIndex(unit: VariantUnit, rule: BuiltInRule): number {
  const order: readonly VariantCode[] = rule === 'ecm' ? ['M', ...NA_ORDER] : NA_ORDER;
  for (const code of order) {
    const at = unit.alts.findIndex((a) => a.code === code);
    if (at >= 0) return at;
  }
  return BASE;
}

const reading = (unit: VariantUnit, index: number): Reading =>
  index === BASE ? { index, text: unit.base, code: null } : { index, text: unit.alts[index].text, code: unit.alts[index].code };

/** The reading `set` gives for `unit`, whose key is `key`: Byzantine always the text's own; NA and ECM by their rule; Mine and his named sets their choice, else the text's own
 * (or, for a set started from NA or ECM, that built-in's reading). A choice the unit no longer has is no choice. */
export function readingOf(unit: VariantUnit, set: ReadingSet, key: string): Reading {
  if (set.id === BYZANTINE_ID) return reading(unit, BASE);
  if (set.id === NA_ID) return reading(unit, builtInIndex(unit, 'na'));
  if (set.id === ECM_ID) return reading(unit, builtInIndex(unit, 'ecm'));
  const chosen = set.choices[key];
  if (chosen !== undefined && chosen >= BASE && chosen < unit.alts.length) return reading(unit, chosen);
  return reading(unit, set.from ? builtInIndex(unit, set.from) : BASE);
}
