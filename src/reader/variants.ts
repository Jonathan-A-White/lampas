// src/reader/variants.ts — which of a chapter's variant units the Reader shows, and what each brace holds (mw-9ji6ek0.5). The units are the chapter file's
// (src/data/chapter.ts VariantUnit, docs/data.md 'Variants'); Settings > Reading > Variants says which (src/settings/definitions/variants.ts): 'english' keeps the
// readings whose English differs from the text's, 'all' every reading, and Witnesses is cumulative (the Byzantine split; with Nestle-Aland; with ECM too).
// A reading is shown when it passes both; a unit is shown when one of its readings is. With Variants Off nothing is shown; the Immersive reader shows them as the plain one does (mw-9ji6ek0.12), save the header's chip, which slides away with the bars.
// The header's chip (src/reader/VariantChip.tsx) counts the units shown; VerseText marks their words and draws a brace after them (src/reader/VariantBrace.tsx).
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Chapter, VariantCode, VariantUnit, VariantWitness } from '../data/chapter';
import { getVariantsLastOn } from '../data/repositories';
import { variantsSetting, variantWitnessesSetting } from '../settings/definitions';
import type { Variants, VariantWitnesses } from '../settings/definitions/variants';
import { useSetting } from '../settings/store';

/** The two filters of a shown variant: what the English filter keeps ('english' or 'all') and the widest witness that counts. */
export interface VariantFilter {
  english: Exclude<Variants, 'off'>;
  witnesses: VariantWitnesses;
}

/** The small chip a reading carries in its brace: B (the Byzantine manuscripts divide), NA (Nestle-Aland 27/28), ECM (the Editio Critica Maior). */
export type WitnessChip = 'B' | 'NA' | 'ECM';

const WITNESS: Record<VariantCode, VariantWitness> = { B: 'byz', N: 'na', C: 'na', S: 'na', E: 'na', M: 'ecm' };
const RANK: Record<VariantWitness, number> = { byz: 0, na: 1, ecm: 2 };
const CHIP: Record<VariantWitness, WitnessChip> = { byz: 'B', na: 'NA', ecm: 'ECM' };
const CHIPS: readonly WitnessChip[] = ['B', 'NA', 'ECM'];

/** The chip of an apparatus code. */
export const chipOf = (code: VariantCode): WitnessChip => CHIP[WITNESS[code]];

/** An English reading with case, punctuation and white space set aside, for comparing two (the build's changesEnglish compares so, scripts/data/variantEnglish.ts). */
export const plainEnglish = (s: string): string =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** One other reading of a unit: its Greek as the apparatus writes it ('' when it leaves the words out), its English, and its code. */
export interface ShownReading {
  greek: string;
  english: string;
  code: VariantCode;
  /** its English is the text's own, case and punctuation aside */
  sameEnglish: boolean;
}

/** A unit the Reader shows, with the readings of it that pass the filter, in the apparatus's order. */
export interface ShownUnit {
  unit: VariantUnit;
  readings: readonly ShownReading[];
}

/** The readings of `unit` that pass `filter`: a witness no wider than the filter's, and under 'english' an English that is not the text's. */
export function shownReadings(unit: VariantUnit, filter: VariantFilter): ShownReading[] {
  const base = plainEnglish(unit.english.base);
  return unit.alts
    .map((alt, i): ShownReading => {
      const english = unit.english.alts[i] ?? '';
      return { greek: alt.text, english, code: alt.code, sameEnglish: plainEnglish(english) === base };
    })
    .filter((r) => RANK[WITNESS[r.code]] <= RANK[filter.witnesses] && (filter.english === 'all' || !r.sameEnglish));
}

/** The units of `units` shown under `filter`, each with its shown readings; a unit none of whose readings passes is left out. */
export function shownUnits(units: readonly VariantUnit[], filter: VariantFilter): ShownUnit[] {
  return units.flatMap((unit) => {
    const readings = shownReadings(unit, filter);
    return readings.length ? [{ unit, readings }] : [];
  });
}

/** What a brace holds in one language: each different reading once, with the chips of every witness that reads it (B, NA, ECM order). `text` is '' for a reading
 * that leaves the words out; `same` marks an English reading that is the text's own English (shown only under 'all'). */
export interface BraceReading {
  text: string;
  same: boolean;
  chips: WitnessChip[];
  /** the reading's Greek and English, whichever language `text` is in (the Greek is '' for a reading that leaves the words out): a tap on a word of the text looks it up by these */
  greek: string;
  english: string;
}

export function braceReadings(shown: ShownUnit, language: 'greek' | 'english'): BraceReading[] {
  const out: (BraceReading & { key: string })[] = [];
  for (const r of shown.readings) {
    const text = language === 'greek' ? r.greek : r.english;
    const same = language === 'english' && r.sameEnglish;
    const key = same ? '=' : language === 'greek' ? text.normalize('NFC') : plainEnglish(text);
    const chip = chipOf(r.code);
    const had = out.find((b) => b.key === key);
    if (!had) out.push({ key, text, same, chips: [chip], greek: r.greek, english: r.english });
    else if (!had.chips.includes(chip)) had.chips = CHIPS.filter((c) => c === chip || had.chips.includes(c));
  }
  return out.map(({ text, same, chips, greek, english }) => ({ text, same, chips, greek, english }));
}

/** The variant units of a chapter as the Reader has them: `byVerse` the shown units of each verse (null while nothing is shown: Variants Off or no
 * chapter), and `count` how many units the filter shows, with Off counted under the filter a tap on the chip would turn on. `any` is false for a chapter with no units at all. */
export interface ReaderVariants {
  any: boolean;
  on: boolean;
  count: number;
  byVerse: ReadonlyMap<number, readonly ShownUnit[]> | null;
}

/** The value a tap on the chip turns Variants on to: the last value it had before it was turned off, 'english' the first time. */
export const onValue = (lastOn: Variants | null | undefined): Exclude<Variants, 'off'> => (lastOn === 'all' ? 'all' : 'english');

export function readerVariants(chapter: Pick<Chapter, 'variants'> | null, { variants, witnesses, lastOn }: { variants: Variants; witnesses: VariantWitnesses; lastOn?: Variants | null }): ReaderVariants {
  const units = chapter?.variants ?? [];
  const on = variants !== 'off';
  const shown = shownUnits(units, { english: on ? variants : onValue(lastOn), witnesses });
  if (!on || !units.length) return { any: units.length > 0, on, count: shown.length, byVerse: null };
  const byVerse = new Map<number, ShownUnit[]>();
  for (const s of shown) byVerse.set(s.unit.v, [...(byVerse.get(s.unit.v) ?? []), s]);
  return { any: true, on, count: shown.length, byVerse };
}

/** The Reader's variants of `chapter`, following Settings > Variants and Witnesses; nothing while they load. */
export function useReaderVariants(chapter: Chapter | null): ReaderVariants & { lastOn: Variants | null } {
  const variants = useSetting(variantsSetting);
  const witnesses = useSetting(variantWitnessesSetting);
  const lastOn = useLiveQuery(getVariantsLastOn, []) ?? null;
  return useMemo(
    () => ({ ...readerVariants(variants && witnesses ? chapter : null, { variants: variants ?? 'off', witnesses: witnesses ?? 'ecm', lastOn }), lastOn }),
    [chapter, variants, witnesses, lastOn],
  );
}
