// src/resources/strongs.ts — Strong's numbers (public domain): the word's G-number on the word sheet, a link to its STEPBible entry.
import { STEP_LETTER, STEP_NO_VERSES } from './stepExtended';
import type { StudyResource } from './types';

/** 'G25' -> 'G0025': STEPBible writes its Strong's numbers with four digits. */
const padded = (strongs: string): string => strongs.replace(/^([GH])(\d+)/, (_, letter: string, digits: string) => letter + digits.padStart(4, '0'));

/** The number as STEPBible searches it: 'G2424' (Jesus) finds nothing there, 'G2424G' lists 886 verses (stepExtended.ts). */
export const stepNumber = (strongs: string): string => {
  const number = padded(strongs);
  return number + (STEP_LETTER[number] ?? '');
};

/** The last number Strong's own list has: Blue Letter Bible answers a higher one with the entry for G1, so those get no link. */
const STRONGS_LAST = 5624;

/**
 * Where to read about a number: STEP's verse list, or, for the few numbers STEP lists no verses for, the lexicon entry on Blue Letter Bible;
 * null for the three TBESG-only numbers (G6029, G6856, G6897) that have neither.
 */
export const strongsUrl = (strongs: string): string | null => {
  const number = padded(strongs);
  if (STEP_NO_VERSES.has(number)) {
    if (Number(number.slice(1)) > STRONGS_LAST) return null;
    return `https://www.blueletterbible.org/lexicon/${number.replace(/^G0*/, 'g')}/kjv/tr/0-1/`;
  }
  return `https://www.stepbible.org/?q=strong=${stepNumber(strongs)}`;
};

export const strongs: StudyResource = {
  id: 'strongs',
  name: "Strong's",
  kind: 'number',
  describe: "Shows the word's Strong's number, a link to its entry on STEPBible.",
  linksFor: (word) => {
    const url = strongsUrl(word.strongs);
    return url ? [{ label: word.strongs, url }] : [];
  },
};
