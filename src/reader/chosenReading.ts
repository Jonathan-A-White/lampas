// src/reader/chosenReading.ts — a reading laid into the text in place (mw-9ji6ek0.24). Pure. The reading set in force (src/reader/readingSets.ts) says which reading of each variant unit he
// reads; where it is not the text's own, VerseText (src/reader/VerseText.tsx) draws the reading's words in place of the unit's: its tagged Greek words, or its short English in place of the
// unit's chunks with their edge marks kept, or a small ⸆ where the reading leaves the words out. Read aloud, copy, Read check and the diagram keep the Byzantine words in this wave (the plan's Q6).
import type { Chapter, GreekWord, VariantCode, VariantReading, VariantUnit, Verse } from '../data/chapter';
import { sameInVerse } from '../data/variantVerse';
import { readingOf, unitKeys, type ReadingSet } from './readingSets';
import { readingTokens, variantWord } from './variantWords';

/** What stands for a reading that leaves the unit's words out: drawn small, in the accent, where the words were. */
export const OMISSION_MARK = '⸆';

/** A unit whose reading in place is one of the alternatives, not the text's own. */
export interface ChosenUnit {
  unit: VariantUnit;
  /** the unit's key (src/reader/readingSets.ts unitKey) */
  key: string;
  /** the alternative's index in `unit.alts` */
  index: number;
  alt: VariantReading;
  code: VariantCode;
  /** the reading's short English ('' for a reading that leaves the words out) */
  english: string;
  /** its English leaves the verse's English as the text's own does: the MSB's words stay, marked */
  sameEnglish: boolean;
  /** the reading leaves the unit's words out */
  omitted: boolean;
}

/** The units of `chapter` that `set` reads other than the text's own, in the chapter's order. A reading `apart` (in pieces) cannot be laid over the text and is never chosen; where two chosen
 * units share a word the first stands. */
export function chosenUnits(chapter: Pick<Chapter, 'code' | 'chapter' | 'variants'> & Partial<Pick<Chapter, 'verses'>>, set: ReadingSet): ChosenUnit[] {
  const units = chapter.variants ?? [];
  const keys = unitKeys(chapter, units);
  const out: ChosenUnit[] = [];
  units.forEach((unit, at) => {
    const { index, code } = readingOf(unit, set, keys[at]);
    const alt = unit.alts[index];
    if (!alt || code === null || alt.apart) return;
    if (out.some((c) => c.unit.v === unit.v && c.unit.w.some((w) => unit.w.includes(w)))) return;
    const verse: Pick<Verse, 'e'> | undefined = chapter.verses?.find((v) => v.n === unit.v);
    const omitted = alt.text.trim() === '';
    const english = unit.english.alts[index] ?? '';
    // an English the build gave no words for, beside Greek that has words, is no English at all: the MSB's stay
    const sameEnglish = !omitted && (english.trim() === '' || sameInVerse(verse, unit.w, unit.english.base, english));
    out.push({ unit, key: keys[at], index, alt, code, english, sameEnglish, omitted });
  });
  return out;
}

/** The marks that open and close a run of chunks, which a replacement keeps: '(' from '(except', ';' from 'to die;'. */
export function edgeMarks(first: string, last: string): { lead: string; trail: string } {
  return { lead: /^[^\p{L}\p{N}]*/u.exec(first.trim())?.[0] ?? '', trail: /[^\p{L}\p{N}]*$/u.exec(last.trim())?.[0] ?? '' };
}

/** The words of the reading in place, one by one, for the Greek view and the weave: the ones the build tagged, else its Greek read form by form (a form the verse itself has opens as the verse has it). */
export function chosenWords(verse: Verse, chosen: ChosenUnit): GreekWord[] {
  if (chosen.omitted) return [];
  const tagged = chosen.alt.g?.filter((w) => readingTokens(w.t).length > 0);
  if (tagged?.length) return tagged.map((w) => variantWord(verse, w.t, tagged));
  return readingTokens(chosen.alt.text).map((f) => variantWord(verse, f));
}

/** The English of the reading in place as the chunks it replaces read: the first chunk's opening marks, the reading's words, the last chunk's closing marks. */
export function chosenEnglish(chosen: ChosenUnit, first: string, last: string): string {
  const { lead, trail } = edgeMarks(first, last);
  return `${lead}${chosen.english.trim()}${trail}`;
}
