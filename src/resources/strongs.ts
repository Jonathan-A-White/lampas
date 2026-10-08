// src/resources/strongs.ts — Strong's numbers (public domain): the word's G-number on the word sheet, a link to its STEPBible entry.
import type { StudyResource } from './types';

/** 'G25' -> 'G0025': STEPBible writes its Strong's numbers with four digits. */
const padded = (strongs: string): string => strongs.replace(/^([GH])(\d+)/, (_, letter: string, digits: string) => letter + digits.padStart(4, '0'));

export const strongs: StudyResource = {
  id: 'strongs',
  name: "Strong's",
  kind: 'number',
  describe: "Shows the word's Strong's number, a link to its entry on STEPBible.",
  linksFor: (word) => [{ label: word.strongs, url: `https://www.stepbible.org/?q=strong=${padded(word.strongs)}` }],
};
