// src/reader/variants.ts — which of a chapter's variant units the Reader shows, and what each brace holds (mw-9ji6ek0.5). The units are the chapter file's
// (src/data/chapter.ts VariantUnit, docs/data.md 'Variants'); Settings > Reading > Variants says which (src/settings/definitions/variants.ts): 'english' keeps the
// readings whose English differs from the text's, 'all' every reading, and Witnesses is cumulative (the Byzantine split; with Nestle-Aland; with ECM too).
// A reading is shown when it passes both; a unit is shown when one of its readings is. With Variants Off nothing is shown; the Immersive reader shows them as the plain one does (mw-9ji6ek0.12), save the header's chip, which slides away with the bars.
// The header's chip (src/reader/VariantChip.tsx) counts the units shown; VerseText marks their words and draws a brace after them (src/reader/VariantBrace.tsx).
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Chapter, GreekWord, VariantCode, VariantUnit, VariantWitness, Verse } from '../data/chapter';
import { plainEnglish, sameInVerse, wordOrderOnly } from '../data/variantVerse';
import { getVariantsLastOn } from '../data/repositories';
import { variantsSetting, variantWitnessesSetting } from '../settings/definitions';
import { getActiveSet } from '../data/repositories';
import { chosenUnits, type ChosenUnit } from './chosenReading';
import type { ReadingSet } from './readingSets';
import type { Variants, VariantWitnesses } from '../settings/definitions/variants';
import { useSetting } from '../settings/store';

/** The two filters of a shown variant: what the English filter keeps ('english' or 'all') and the widest witness that counts. */
export interface VariantFilter {
  english: Exclude<Variants, 'off'>;
  witnesses: VariantWitnesses;
}

/** The small chip a reading carries in its brace: B (the Byzantine manuscripts divide), NA (Nestle-Aland 27/28), ECM (the Editio Critica Maior), and RP (the Robinson-Pierpont text, the text's own
 * reading, which a brace holds once another reading is laid in place, mw-9ji6ek0.24). */
export type WitnessChip = 'B' | 'NA' | 'ECM' | 'RP';

const WITNESS: Record<VariantCode, VariantWitness> = { B: 'byz', N: 'na', C: 'na', S: 'na', E: 'na', M: 'ecm' };
const RANK: Record<VariantWitness, number> = { byz: 0, na: 1, ecm: 2 };
const CHIP: Record<VariantWitness, WitnessChip> = { byz: 'B', na: 'NA', ecm: 'ECM' };
const CHIPS: readonly WitnessChip[] = ['RP', 'B', 'NA', 'ECM'];

/** The chip of an apparatus code. */
export const chipOf = (code: VariantCode): WitnessChip => CHIP[WITNESS[code]];

export { plainEnglish };

/** One other reading of a unit: its Greek as the apparatus writes it ('' when it leaves the words out), its English, and its code. */
export interface ShownReading {
  /** the reading's index among the unit's alternatives (`unit.alts`) */
  index: number;
  greek: string;
  english: string;
  code: VariantCode;
  /** the reading's words one by one as the build tagged them (VariantReading.g); absent for a reading that leaves the words out or a unit without them */
  g?: readonly GreekWord[];
  /** its English leaves the verse's English as the text's own does: the snippets agree, or (with the verse) the verse reads the same either way, case and punctuation aside, or the reading is the text's own words in another order (wordOrderOnly) */
  sameEnglish: boolean;
  /** the reading is in pieces and cannot be laid over the text: no Read this */
  apart?: true;
}

/** A unit the Reader shows, with the readings of it that pass the filter, in the apparatus's order. `chosen` is the index of the alternative laid in place in the text, when one is (the readings
 * then include it even if the filter would hide it; the brace holds the others and the text's own under RP). */
export interface ShownUnit {
  unit: VariantUnit;
  readings: readonly ShownReading[];
  chosen?: number;
}

/** The readings of `unit` that pass `filter`: a witness no wider than the filter's, and under 'english' an English that changes the verse (`verse` is the unit's;
 * without it only the unit's own snippets are compared). The alternative `keep` (the one laid in place) is kept whatever the filter says. */
export function shownReadings(unit: VariantUnit, filter: VariantFilter, verse?: Pick<Verse, 'e'>, keep?: number): ShownReading[] {
  return unit.alts
    .map((alt, i): ShownReading => {
      const english = unit.english.alts[i] ?? '';
      return { index: i, greek: alt.text, english, code: alt.code, ...(alt.g ? { g: alt.g } : {}), ...(alt.apart ? { apart: true as const } : {}), sameEnglish: wordOrderOnly(unit.base, alt.text) || sameInVerse(verse, unit.w, unit.english.base, english) };
    })
    .filter((r) => r.index === keep || (RANK[WITNESS[r.code]] <= RANK[filter.witnesses] && (filter.english === 'all' || !r.sameEnglish)));
}

/** The units of `units` shown under `filter`, each with its shown readings; a unit none of whose readings passes is left out. `chosen` are the units with a reading laid in place
 * (by unit): such a unit is shown whatever the filter says, with that reading in its readings and its index in `chosen`. */
export function shownUnits(units: readonly VariantUnit[], filter: VariantFilter, verses: readonly Verse[] = [], chosen: ReadonlyMap<VariantUnit, number> = new Map()): ShownUnit[] {
  const verseOf = new Map(verses.map((v) => [v.n, v]));
  return units.flatMap((unit) => {
    const keep = chosen.get(unit);
    const readings = shownReadings(unit, filter, verseOf.get(unit.v), keep);
    return readings.length ? [{ unit, readings, ...(keep === undefined ? {} : { chosen: keep }) }] : [];
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
  /** the reading's Greek words as the build tagged them, when it did */
  g?: readonly GreekWord[];
}

export function braceReadings(shown: ShownUnit, language: 'greek' | 'english'): BraceReading[] {
  const out: (BraceReading & { key: string })[] = [];
  const add = (text: string, same: boolean, chip: WitnessChip, greek: string, english: string, g?: readonly GreekWord[]) => {
    const key = same ? '=' : language === 'greek' ? text.normalize('NFC') : plainEnglish(text);
    const had = out.find((b) => b.key === key);
    if (!had) out.push({ key, text, same, chips: [chip], greek, english, ...(g ? { g } : {}) });
    else if (!had.chips.includes(chip)) had.chips = CHIPS.filter((c) => c === chip || had.chips.includes(c));
  };
  const inPlace = shown.chosen === undefined ? undefined : shown.readings.find((r) => r.index === shown.chosen);
  // with a reading laid in place the brace holds the text's own, under RP, then the others: what is already in the text (the same Greek, or the same English) is not said again
  if (inPlace) {
    const { base, english } = shown.unit;
    const own = language === 'greek' ? base : english.base;
    const inKey = language === 'greek' ? inPlace.greek.normalize('NFC') : plainEnglish(inPlace.english);
    const sameAsPlace = language === 'english' && inPlace.sameEnglish;
    if (sameAsPlace || (language === 'greek' ? base.normalize('NFC') : plainEnglish(english.base)) !== inKey) add(own, sameAsPlace, 'RP', base, english.base);
  }
  for (const r of shown.readings) {
    if (r === inPlace) continue;
    const text = language === 'greek' ? r.greek : r.english;
    const same = language === 'english' && r.sameEnglish;
    if (inPlace && !same && (language === 'greek' ? text.normalize('NFC') === inPlace.greek.normalize('NFC') : plainEnglish(text) === plainEnglish(inPlace.english) && !inPlace.sameEnglish)) continue;
    add(text, same, chipOf(r.code), r.greek, r.english, r.g);
  }
  return out.map(({ text, same, chips, greek, english, g }) => ({ text, same, chips, greek, english, ...(g ? { g } : {}) }));
}

/** What a brace says of a reading with no words of its own: the English that reads as the text's own ('same'), or a reading that leaves the words out. */
export const SAME = 'same';
export const LEFT_OUT = 'left out';

/** The words a brace draws for one reading, before its chips. */
export const braceWords = (r: BraceReading): string => (r.same ? SAME : r.text || LEFT_OUT);

/** A brace as plain text, as VariantBrace draws it (the same readings, separators and sigla) and Copy writes it: '{left out NA}', '{for you B | left out NA}'. */
export function braceText(shown: ShownUnit, language: 'greek' | 'english'): string {
  return `{${braceReadings(shown, language)
    .map((r) => [braceWords(r), ...r.chips].join(' '))
    .join(' | ')}}`;
}

/** The variant units of a chapter as the Reader has them: `byVerse` the shown units of each verse (null while nothing is shown: Variants Off or no
 * chapter), and `count` how many units the filter shows, with Off counted under the filter a tap on the chip would turn on. `any` is false for a chapter with no units at all.
 * `chosenByVerse` are the units of each verse with a reading laid in place by the set in force (src/reader/chosenReading.ts), shown or not: the reading in place shows with Variants Off too. */
export interface ReaderVariants {
  any: boolean;
  on: boolean;
  count: number;
  byVerse: ReadonlyMap<number, readonly ShownUnit[]> | null;
  chosenByVerse: ReadonlyMap<number, readonly ChosenUnit[]>;
}

/** The value a tap on the chip turns Variants on to: the last value it had before it was turned off, 'english' the first time. */
export const onValue = (lastOn: Variants | null | undefined): Exclude<Variants, 'off'> => (lastOn === 'all' ? 'all' : 'english');

export function readerVariants(
  chapter: (Pick<Chapter, 'variants'> & Partial<Pick<Chapter, 'verses' | 'code' | 'chapter'>>) | null,
  { variants, witnesses, lastOn, set }: { variants: Variants; witnesses: VariantWitnesses; lastOn?: Variants | null; set?: ReadingSet | null },
): ReaderVariants {
  const units = chapter?.variants ?? [];
  const on = variants !== 'off';
  const chosen = chapter && set && chapter.code !== undefined && chapter.chapter !== undefined && units.length ? chosenUnits({ code: chapter.code, chapter: chapter.chapter, variants: units, verses: chapter.verses }, set) : [];
  const chosenByVerse = new Map<number, ChosenUnit[]>();
  for (const c of chosen) chosenByVerse.set(c.unit.v, [...(chosenByVerse.get(c.unit.v) ?? []), c]);
  const shown = shownUnits(units, { english: on ? variants : onValue(lastOn), witnesses }, chapter?.verses, on ? new Map(chosen.map((c) => [c.unit, c.index])) : undefined);
  if (!on || !units.length) return { any: units.length > 0, on, count: shown.length, byVerse: null, chosenByVerse };
  const byVerse = new Map<number, ShownUnit[]>();
  for (const s of shown) byVerse.set(s.unit.v, [...(byVerse.get(s.unit.v) ?? []), s]);
  return { any: true, on, count: shown.length, byVerse, chosenByVerse };
}

/** The Reader's variants of `chapter`, following Settings > Variants and Witnesses and the reading set in force; nothing while they load. */
export function useReaderVariants(chapter: Chapter | null): ReaderVariants & { lastOn: Variants | null } {
  const variants = useSetting(variantsSetting);
  const witnesses = useSetting(variantWitnessesSetting);
  const lastOn = useLiveQuery(getVariantsLastOn, []) ?? null;
  const set = useLiveQuery(getActiveSet, []) ?? null;
  return useMemo(
    () => ({ ...readerVariants(variants && witnesses ? chapter : null, { variants: variants ?? 'off', witnesses: witnesses ?? 'ecm', lastOn, set }), lastOn }),
    [chapter, variants, witnesses, lastOn, set],
  );
}
