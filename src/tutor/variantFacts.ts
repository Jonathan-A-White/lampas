// src/tutor/variantFacts.ts — the variants the tutor is told (mw-9ji6ek0.7, docs/ask-tutor.md 'Variants'). With Settings > Reading > Variants on, the verse in hand carries the variant units set in it:
// the text's own reading and each other reading in Greek and in English, the witness of each spelled out (src/reader/witness.ts), and how many units the chapter has. The units are the ones the Reader's
// braces show, under the same two filters (src/reader/variants.ts), so the tutor knows what he sees. The same facts ride in the Bible talk's request as `variants` (buildTalkRequest), are the fact
// `variants` the tutor may ask for (src/tutor/registry.ts), and the sheet's Ask the tutor leaves VARIANT_QUESTION ready to send.
import type { Chapter, VariantUnit } from '../data/chapter';
import { shownUnits, type VariantFilter } from '../reader/variants';
import { readingsOf } from '../reader/witness';
import type { Variants, VariantWitnesses } from '../settings/definitions/variants';
import type { SettingValue } from '../settings/define';

/** The question the brace sheet's Ask the tutor leaves in the talk's box, ready to send. */
export const VARIANT_QUESTION = 'What is the difference, and does it change the sense?';

/** What the tutor is told of a reading that leaves the text's words out. */
const LEFT_OUT = 'left out';

/** One reading of a unit in Greek and English. */
export interface VariantReadingFact {
  greek: string;
  english: string;
}

/** One unit: the verse it is set in, the text's own reading and each other reading (a different Greek once) with the witness lines of the manuscripts and editions that read it. */
export interface VariantUnitFact {
  verse: number;
  /** true on the one unit he opened the brace sheet's Ask the tutor on; the talk is about that unit */
  asked?: true;
  text: VariantReadingFact;
  other_readings: (VariantReadingFact & { witness: string[] })[];
}

export interface VariantFacts {
  /** how many units the chapter has under the filters Settings gives (the count the Reader's chip shows) */
  chapter_units: number;
  /** the units set in the verses in hand, in the apparatus's order; empty where those verses have none */
  units: VariantUnitFact[];
}

/** The two settings the facts follow. */
export interface VariantSettings {
  variants: Variants;
  witnesses: VariantWitnesses;
}

/** The units one verse (or the verses of a passage) carries, and the chapter's count; undefined with Variants Off and for a chapter with no unit shown. */
export function variantFactsOf(chapter: Pick<Chapter, 'variants'> & Partial<Pick<Chapter, 'verses'>>, verses: readonly number[], { variants, witnesses }: VariantSettings, isAsked: (unit: VariantUnit) => boolean = () => false): VariantFacts | undefined {
  if (variants === 'off') return undefined;
  const filter: VariantFilter = { english: variants, witnesses };
  const shown = shownUnits(chapter.variants ?? [], filter, chapter.verses);
  if (shown.length === 0) return undefined;
  const units = shown
    .filter((s) => verses.includes(s.unit.v))
    .map(
      (s): VariantUnitFact => ({
        verse: s.unit.v,
        ...(isAsked(s.unit) ? { asked: true as const } : {}),
        text: { greek: s.unit.base, english: s.unit.english.base },
        other_readings: readingsOf(s).map((r) => ({ greek: r.greek || LEFT_OUT, english: r.english || LEFT_OUT, witness: r.lines })),
      }),
    );
  return { chapter_units: shown.length, units };
}

/** The facts for the verses a talk holds (a part is a verse, or a passage `n` to `to`), from the settings as the request carries them (`variants`, `variantWitnesses`); a missing or odd value reads as the default. */
export function variantFactsHeld(chapter: Pick<Chapter, 'variants' | 'code' | 'chapter'>, parts: readonly { n: number; to?: number }[], settings: Record<string, SettingValue>): VariantFacts | undefined {
  const { variants, variantWitnesses } = settings;
  const on = variants === 'english' || variants === 'all' ? variants : 'off';
  const witnesses = variantWitnesses === 'byz' || variantWitnesses === 'na' ? variantWitnesses : 'ecm';
  const verses = parts.flatMap((p) => Array.from({ length: (p.to ?? p.n) - p.n + 1 }, (_, i) => p.n + i));
  return variantFactsOf(chapter, verses, { variants: on, witnesses }, (unit) => isAskedUnit(chapter, unit));
}

// The unit the brace sheet's Ask the tutor opened a talk on: the talk is about that one unit, which the facts mark `asked` until the Talk sheet closes (the Reader clears it).
let askedAbout: { code: string; chapter: number; verse: number; words: string } | null = null;

const keyOf = (chapter: Pick<Chapter, 'code' | 'chapter'>, unit: VariantUnit) => ({ code: chapter.code, chapter: chapter.chapter, verse: unit.v, words: unit.w.join(',') });

/** Notes that a talk is being opened on `unit` of `chapter`. */
export function askAboutVariant(chapter: Pick<Chapter, 'code' | 'chapter'>, unit: VariantUnit): void {
  askedAbout = keyOf(chapter, unit);
}

/** Forgets the unit a talk was opened on. */
export function clearVariantAsked(): void {
  askedAbout = null;
}

function isAskedUnit(chapter: Pick<Chapter, 'code' | 'chapter'>, unit: VariantUnit): boolean {
  const key = keyOf(chapter, unit);
  return askedAbout !== null && askedAbout.code === key.code && askedAbout.chapter === key.chapter && askedAbout.verse === key.verse && askedAbout.words === key.words;
}
