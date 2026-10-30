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

/** The last number Strong's own list has, Greek and Hebrew: Blue Letter Bible answers a higher Greek one with the entry for G1, a higher Hebrew one with a redirect, so those get no link. */
const STRONGS_LAST = { G: 5624, H: 8674 };

/**
 * The version a link opens STEP in. Without one STEP searches the visitor's saved primary version, and a version that does not tag the
 * Strong's number (his LSB) answers 'did not yield any results' (mw-5r3p30.891). The ESV covers both testaments and lists the same verses.
 */
export const STEP_VERSION = 'ESV';

const entryUrl = (number: string): string => {
  const side = number[0] === 'H' ? 'wlc' : 'tr';
  return `https://www.blueletterbible.org/lexicon/${number.replace(/^([GH])0*/, (_, letter: string) => letter.toLowerCase())}/kjv/${side}/0-1/`;
};

/**
 * Where to read about a number: STEP's verse list, or, for the few numbers STEP lists no verses for, the lexicon entry on Blue Letter Bible;
 * null for the TBESG-only numbers (G6029, G6856, G6897) that have neither.
 */
export const strongsUrl = (strongs: string): string | null => {
  const number = padded(strongs);
  if (STEP_NO_VERSES.has(number)) {
    if (Number(number.slice(1)) > STRONGS_LAST[number[0] as 'G' | 'H']) return null;
    return entryUrl(number);
  }
  return `https://www.stepbible.org/?q=version=${STEP_VERSION}|strong=${stepNumber(strongs)}`;
};

export const strongs: StudyResource = {
  id: 'strongs',
  lang: 'grc',
  name: "Strong's",
  kind: 'number',
  describe: "Shows the word's Strong's number, a link to its entry on STEPBible.",
  linksFor: (word) => {
    const url = strongsUrl(word.strongs);
    return url ? [{ label: word.strongs, url }] : [];
  },
};
