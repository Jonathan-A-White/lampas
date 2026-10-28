// src/reader/witness.ts — the witness of an apparatus reading spelled out, one line each, for the brace sheet (mw-9ji6ek0.6, src/reader/VariantSheet.tsx).
// The codes are byztxt's (src/data/chapter.ts VariantCode); the brace's chips (B, NA, ECM) say it in a letter or two, this says it in a sentence.
import type { VariantCode } from '../data/chapter';

const LINES: Record<VariantCode, string> = {
  B: 'B: the Byzantine text is split here',
  N: 'NA27/NA28: Nestle-Aland reads this',
  C: 'NA27/NA28: Nestle-Aland reads this',
  S: 'NA27: Nestle-Aland (27th edition) reads this',
  E: 'NA28: Nestle-Aland (28th edition) reads this',
  M: 'ECM: the Editio Critica Maior reads this',
};

/** The line that spells out what a code says about a reading. */
export const witnessLine = (code: VariantCode): string => LINES[code];

/** The lines for the codes of one reading, each once, in the order given. */
export const witnessLines = (codes: readonly VariantCode[]): string[] => [...new Set(codes.map(witnessLine))];
