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
  /** TBESH only, a verb whose definition gives a stem a sense of its own: the stem as TBESH spells it ('Piel', 'Hiphil') and the short gloss of that sense ('to appoint') */
  stems?: Record<string, string>;
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

/** The stems of a Hebrew verb TBESH's definitions name, by the way the Berean table's parsing codes spell them ('V-Hifil-Perf-3ms'). The Qal is the lemma's own sense and has none here. */
const TABLE_STEMS: Readonly<Record<string, string>> = {
  Qal: 'Qal',
  Nifal: 'Niphal',
  Piel: 'Piel',
  Pual: 'Pual',
  Hifil: 'Hiphil',
  Hofal: 'Hophal',
  Hitpael: 'Hithpael',
};
const STEM_NAMES = new Set(Object.values(TABLE_STEMS));

/** The stem a Berean parsing code ('Conj-w | V-Piel-ConsecImperf-3ms') names, as TBESH spells it ('Piel'); undefined for a word that is no verb or a stem the table has no name for here. */
export function hebrewStem(parse: string): string | undefined {
  const verb = /(?:^|\| )V-([A-Za-z]+)/.exec(parse);
  return verb ? TABLE_STEMS[verb[1]] : undefined;
}

/**
 * The senses TBESH's definition gives a verb's stems, from the raw definition (before cleanDefinition cuts it): '1c) (Piel) to appoint, ordain' or '1b) (Piel)' with its
 * sense on the line under it ('1b1) to destroy, kill'). The gloss of a stem is the first meaning of its sense, and only a sense that begins with 'to ' (so a participle's
 * 'appointed (participle)' is left). The Qal's is not kept: it is the lemma's gloss.
 */
function stemSenses(rawDefinition: string): Record<string, string> | undefined {
  const lines = rawDefinition.split(/<br\s*\/?>/i).map((l) => l.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim());
  const stems: Record<string, string> = {};
  lines.forEach((line, i) => {
    const head = /^\d+[a-z]?\d*\)\s*\((\w+)\)\s*(.*)$/.exec(line);
    if (!head || !STEM_NAMES.has(head[1]) || head[1] === 'Qal' || head[1] in stems) return;
    const sense = head[2] || /^\d+[a-z]?\d*\)\s*(.*)$/.exec(lines[i + 1] ?? '')?.[1] || '';
    const first = sense.split(/[,;(]| or /)[0].replace(/\s+/g, ' ').trim().normalize('NFC');
    if (/^to \S/.test(first)) stems[head[1]] = first;
  });
  return Object.keys(stems).length ? stems : undefined;
}

export interface TbesOptions {
  /** 'G' for TBESG, 'H' for TBESH */
  letter: 'G' | 'H';
  /** the gloss as Lampas shows it, from the lemma and the file's gloss (the NT adds the aorist of a verb whose aorist cannot be guessed) */
  gloss: (lemma: string, raw: string) => string;
}

/** A TBESH line whose second column is a bare '=' ('H1709H ='): no 'a Name of' or 'in Hebrew of' follows it. */
const isPlain = (f: string[]): boolean => /=\s*$/.test(f[1]);
/** A gloss that is the part of a name ('Fish (Gate)', '(LORD)-Elohe', 'Dung (Gate)') on a word whose morph does not call it a name. */
const isNamePart = (f: string[]): boolean => /^[A-Z([]/.test(f[6].trim()) && !f[5].startsWith('N:');
/** Which of a TBESH number's lines the number resolves to. */
const mainSense = (own: string[][]): string[] => (isPlain(own[0]) && isNamePart(own[0]) ? own.find((f) => isPlain(f) && !isNamePart(f)) ?? own[0] : own[0]);

/** A TBESG lemma column is sometimes 'form=lemma' ('Ἕλλην=Ἕλλην', 'Ἑλληνιστί=Ἑλληνικός': a word and the entry it is a spelling of); the word is the lemma, said once (mw-5r3p30.864). */
export const headLemma = (column: string): string => column.split('=')[0].trim().normalize('NFC');

/**
 * A Strong's number with several entries resolves to its first. TBESG's keys are 'G0686'; TBESH's are 'H0001' and, for a number with several
 * senses, 'H0834a', 'H0834b' ('a' is the number's main sense and comes first in the file, so it is the one the number resolves to). The entry's
 * key here is the number with no padding: 'G686', 'H834'.
 *
 * TBESH has one exception (mw-gdcyf98.7): a number whose first line is only the part of a name ('H1709G' 'Fish (Gate)', a capitalised or bracketed gloss on a word
 * the morph does not call a name) and whose second line is a plain sense of its own ('H1709H' 'fish', its second column too a bare '='): the number is the plain sense.
 * A first line that is a related sense ('a Name of', 'in Hebrew of', 'a Meaning of') is never passed over, and TBESG has no such lines.
 */
export function parseTbes(text: string, { letter, gloss }: TbesOptions): Lexicon {
  const entries = new Map<string, LexiconEntry>();
  const keyPattern = new RegExp(letter === 'H' ? '^H\\d{4}[a-z]?$' : '^G\\d{4}$');
  const lines = new Map<string, string[][]>();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const f = line.split('\t');
    if (f.length < 8 || !keyPattern.test(f[0])) continue;
    const key = `${letter}${Number(f[0].slice(1, 5))}`;
    lines.set(key, [...(lines.get(key) ?? []), f]);
  }
  for (const [key, own] of lines) {
    const f = letter === 'H' ? mainSense(own) : own[0];
    const lemma = headLemma(f[3]);
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
      const stems = stemSenses(f[7]);
      if (stems) entry.stems = stems;
    }
    entries.set(key, entry);
  }
  return { get: (strongs) => entries.get(strongs) };
}
