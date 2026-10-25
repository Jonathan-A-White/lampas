// scripts/data/tbes.ts — the reader of STEPBible's Translators Brief lexicons of Extended Strongs, TBESG for Greek and TBESH for Hebrew
// (CC BY 4.0), shared by the New Testament build and the Old Testament build. The two files are tab separated, one entry per row, in the same
// columns: the extended Strong's number, the disambiguated and unified numbers, the headword, its transliteration, the morph, the gloss and the meaning.
import { cleanGloss, rangeAndChosen } from '../../src/data/gloss';

const DEFINITION_MAX = 300;

export interface LexiconEntry {
  lemma: string;
  gloss: string;
  definition: string;
  /** TBESH only: the part of speech the entry's morph gives ('noun', 'verb') */
  pos?: string;
  /** TBESH only: the entry is a name (a person, a place, a people: the morph's language is 'N') */
  name?: boolean;
}

export interface Lexicon {
  get(strongs: string): LexiconEntry | undefined;
}

/** Removes markup, scripture references, daggers and source tags; cuts at a word boundary near 300 characters. */
export function cleanDefinition(raw: string): string {
  const text = raw
    .replace(/<ref[^>]*>.*?<\/ref>/gis, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/†/g, '')
    .replace(/\((?:AS|ML)\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([,;])(?:\s*[,;])+/g, '$1') // what a removed reference leaves behind
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
  if (text.length <= DEFINITION_MAX) return text;
  const cut = text.slice(0, DEFINITION_MAX);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, '')}…`;
}

/** The part of speech TBESH's morph 'Language:Type-Gender-Extra' names in its Type, in words. */
const HEBREW_TYPES: Readonly<Record<string, string>> = {
  A: 'adjective',
  Adv: 'adverb',
  Art: 'article',
  Cond: 'conditional',
  Conj: 'conjunction',
  Cor: 'correlative',
  DemP: 'demonstrative pronoun',
  ImpP: 'impersonal pronoun',
  Intg: 'interrogative',
  Intj: 'interjection',
  N: 'noun',
  Neg: 'negative',
  Part: 'particle',
  Prep: 'preposition',
  PerP: 'personal pronoun',
  PosP: 'possessive pronoun',
  RefP: 'reflexive pronoun',
  RelP: 'relative pronoun',
  V: 'verb',
};

/** TBESH writes a range with a bracketed word in it ('to come (in): come', 'to come (in): (sun)set'), which cleanGloss leaves for the Greek's glosses have none: it is one list of meanings all the same ('to come (in), come'). */
export function cleanHebrewGloss(raw: string): string {
  const gloss = cleanGloss(raw);
  const split = /^([^:]+):\s*([^:]+)$/.exec(gloss);
  return split ? rangeAndChosen(split[1], split[2]) : gloss;
}

export interface TbesOptions {
  /** 'G' for TBESG, 'H' for TBESH */
  letter: 'G' | 'H';
  /** the gloss as Lampas shows it, from the lemma and the file's gloss (the NT adds the aorist of a verb whose aorist cannot be guessed) */
  gloss: (lemma: string, raw: string) => string;
}

/**
 * A Strong's number with several entries resolves to its first. TBESG's keys are 'G0686'; TBESH's are 'H0001' and, for a number with several
 * senses, 'H0834a', 'H0834b' ('a' is the number's main sense and comes first in the file, so it is the one the number resolves to). The entry's
 * key here is the number with no padding: 'G686', 'H834'.
 */
export function parseTbes(text: string, { letter, gloss }: TbesOptions): Lexicon {
  const entries = new Map<string, LexiconEntry>();
  const keyPattern = new RegExp(letter === 'H' ? '^H\\d{4}[a-z]?$' : '^G\\d{4}$');
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const f = line.split('\t');
    if (f.length < 8 || !keyPattern.test(f[0])) continue;
    const key = `${letter}${Number(f[0].slice(1, 5))}`;
    if (entries.has(key)) continue;
    const lemma = f[3].trim().normalize('NFC');
    const entry: LexiconEntry = {
      lemma,
      gloss: gloss(lemma, cleanGloss(f[6].trim().normalize('NFC'))),
      definition: cleanDefinition(f[7]).normalize('NFC'),
    };
    if (letter === 'H') {
      const morph = /^([A-Za-z]):([A-Za-z]*)/.exec(f[5]);
      if (morph) {
        const pos = HEBREW_TYPES[morph[2]];
        if (pos) entry.pos = pos;
        if (morph[1] === 'N') entry.name = true;
      }
    }
    entries.set(key, entry);
  }
  return { get: (strongs) => entries.get(strongs) };
}
