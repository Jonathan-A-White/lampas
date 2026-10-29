// src/reader/englishSource.ts — where the English on the variant card comes from (mw-9ji6ek0.29, src/reader/VariantSheet.tsx). Each English line of the card carries a small caption: MSB (the
// Majority Standard Bible's words, its text or its CT footnote), BSB (the Berean Standard Bible, the English of the Old Testament) or Lampas (AI) (a word-for-word rendering made at build time by
// the tutor's model, data/variant-english.json). A tap on the caption says in a line what the source is.
import type { SourceLanguage, VariantUnit, Verse } from '../data/chapter';
import { plainEnglish } from '../data/variantVerse';

export type EnglishSource = 'msb' | 'bsb' | 'lampas';

/** The caption of each source. PROVISIONAL wording (the Governor confirms it). */
export const SOURCE_CAPTION: Record<EnglishSource, string> = { msb: 'MSB', bsb: 'BSB', lampas: 'Lampas (AI)' };

/** What a tap on a caption says: one line. */
export const SOURCE_SAYS: Record<EnglishSource, string> = {
  msb: 'The Majority Standard Bible, the English beside the Greek (public domain); its footnotes give the critical text’s reading.',
  bsb: 'The Berean Standard Bible, the English of the Old Testament here (public domain).',
  lampas: 'English made for Lampas by an AI model, word for word to the Greek; it is not a published translation.',
};

/** The Preface link under the line a caption says. */
export const SOURCE_LINK = 'The sources, in the Preface';

/** One English line of the card: its words and where they come from. `verse` marks the words the verse itself has under the unit (the text reads). */
export interface EnglishLine {
  text: string;
  source: EnglishSource;
  /** the English the verse itself shows under the unit's words */
  verse?: true;
}

/** The translation a chapter's English is from: the Old Testament's is the Berean Standard Bible's, the New Testament's the Majority Standard Bible's. */
export const translationOf = (lang: SourceLanguage | undefined): 'msb' | 'bsb' => (lang === 'hbo' ? 'bsb' : 'msb');

/** The source of the unit's own English (VariantUnit.english.source): the MSB's footnote is the MSB (the BSB in the Old Testament), the rest the model's. */
export const unitSource = (unit: Pick<VariantUnit, 'english'>, lang: SourceLanguage | undefined): EnglishSource => (unit.english.source === 'lampas' ? 'lampas' : translationOf(lang));

/** The English the verse shows under the unit's words: the chunks that hold them, when each holds none but the unit's (a chunk that also holds other words — 'was reigning in' — is more than
 * the unit's, so it is not offered); null when the verse is not to hand or has none. Punctuation and quotation marks at the ends are set aside. */
export function verseEnglish(verse: Pick<Verse, 'e'> | undefined, unitWords: readonly number[]): string | null {
  if (!verse) return null;
  const held = new Set(unitWords);
  const chunks = verse.e.filter((c) => c.g.some((i) => held.has(i)));
  if (!chunks.length || chunks.some((c) => c.g.some((i) => !held.has(i)))) return null;
  const text = chunks.map((c) => c.t).join(' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
  return text || null;
}

/** The lines of 'The text reads': the verse's own English under the unit first (the MSB or BSB), then the unit's rendering when it is not the same words, each with its source. */
export function textReadsEnglish(unit: VariantUnit, verse: Pick<Verse, 'e'> | undefined, lang: SourceLanguage | undefined): EnglishLine[] {
  const base = unit.english.base;
  const own: EnglishLine | null = base ? { text: base, source: unitSource(unit, lang) } : null;
  const seen = verseEnglish(verse, unit.w);
  if (!seen) return own ? [own] : [];
  const page: EnglishLine = { text: seen, source: translationOf(lang), verse: true };
  return own && plainEnglish(own.text) !== plainEnglish(seen) ? [page, own] : [page];
}
