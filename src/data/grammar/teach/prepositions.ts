// src/data/grammar/teach/prepositions.ts — the cards of the prepositions tier (mw-5r3p30.234): the preposition, and each of the twelve made from its
// lesson in src/data/grammar/prepositions.ts (how it is spelt, each case it takes with its meaning and a real phrase), so the card and the questions
// teach the same thing. A preposition that 1 John 1:1 or John 1:1 has is worked on that verse's phrase first. The preposition draws Ἐν ἀρχῇ as a
// sentence diagram (mw-5r3p30.792).
import { greek, hang, prep, slot } from '../../../diagram/handwritten';
import { bookOf } from '../../books';
import { PREPOSITIONS, type Preposition, type PrepUse } from '../prepositions';
import type { Teach, WorkedExample } from './types';

const CASES = ['genitive', 'dative', 'accusative'] as const;

/** The first sense of a meaning: 'in, among' is 'in', 'by (the one who does it)' is 'by'. */
const firstSense = (meaning: string): string => meaning.split(/,| \(/)[0].trim();

/** Every way the preposition is spelt: 'διά or δι᾿'. */
const spellings = (p: Preposition): string => [p.greek, ...p.before].join(' or ');

const placeOf = (u: PrepUse): string => `${bookOf(u.ref.book)?.name} ${u.ref.chapter}:${u.ref.verse}`;

/** The phrase's first word worked: what it is, the case after it, what the whole means. */
function workedOn(p: Preposition, u: PrepUse): WorkedExample {
  const [first, ...rest] = u.phrase.split(' ');
  return {
    word: first,
    ref: placeOf(u),
    gloss: firstSense(u.meaning),
    steps: [
      `${first} is ${p.greek}, a preposition.`,
      `The words after it, ${rest.join(' ')}, are in the ${u.case}, so it means “${u.meaning}”.`,
      `${u.phrase}: “${u.gloss}”.`,
    ],
  };
}

/** The verse he is likeliest to read first, where it holds the preposition. */
const ON_HIS_VERSE: Record<string, WorkedExample> = {
  apo: {
    word: "ἀπ'",
    ref: '1 John 1:1',
    gloss: 'from',
    steps: ["ἀπ' is ἀπό, a preposition, its last vowel dropped before the vowel of ἀρχῆς.", 'ἀρχῆς, after it, is in the genitive, so it means “from”.', "ἀπ' ἀρχῆς: “from the beginning”."],
  },
  peri: {
    word: 'περὶ',
    ref: '1 John 1:1',
    gloss: 'concerning',
    steps: ['περὶ is περί, a preposition.', 'τοῦ λόγου, after it, is in the genitive, so it means “about”, “concerning”.', 'περὶ τοῦ λόγου τῆς ζωῆς: “concerning the Word of life”.'],
  },
  en: {
    word: 'Ἐν',
    ref: 'John 1:1',
    gloss: 'in',
    steps: ['Ἐν is ἐν, a preposition, with a capital as the first word.', 'ἀρχῇ, after it, is in the dative, the only case ἐν takes: “in”.', 'Ἐν ἀρχῇ: “In the beginning”.'],
  },
  pros: {
    word: 'πρὸς',
    ref: 'John 1:1',
    gloss: 'with',
    steps: ['πρὸς is πρός, a preposition.', 'τὸν θεόν, after it, is in the accusative: “toward”, here “with”, turned toward God.', 'ὁ λόγος ἦν πρὸς τὸν θεόν: “the Word was with God”.'],
  },
};

function prepositionTeach(p: Preposition): Teach {
  const one = p.uses.length === 1;
  const changes = p.before.length ? ` Before a vowel it may be written ${p.before.join(' or ')}.` : '';
  return {
    whatItIs: `${p.greek} is a preposition: a small word before a noun that says where, when or how. It means ${p.uses.map((u) => `“${u.meaning}”`).join(' or ')}${one ? '' : ', and the case of the noun after it decides which'}.`,
    howToSpot: `Look for ${spellings(p)} with a noun after it.${changes} ${p.uses.map((u) => `With the ${u.case} it means “${u.meaning}”: ${u.phrase}, “${u.gloss}”.`).join(' ')}`,
    table: {
      caption: `${p.greek} and its cases`,
      columns: ['spelt', 'means', 'for example'],
      rows: p.uses.map((u) => ({ label: `with the ${u.case}`, cells: [spellings(p), u.meaning, u.phrase] })),
    },
    worked: [...(ON_HIS_VERSE[p.key] ? [ON_HIS_VERSE[p.key]] : []), ...p.uses.map((u) => workedOn(p, u))],
  };
}

const PREPOSITION: Teach = {
  whatItIs: 'A preposition is a small word before a noun that says where, when or how: in, into, from, with, through. Example: “in the beginning”, “from the beginning”.',
  howToSpot:
    'A Greek preposition comes before a noun in a set case, and the case can change what it means: διά with the genitive is “through”, with the accusative “because of”. Learn each one with its cases; the table gives the twelve commonest.',
  table: {
    caption: 'The twelve commonest prepositions',
    columns: ['spelt', 'with the genitive', 'with the dative', 'with the accusative'],
    rows: PREPOSITIONS.map((p) => ({ label: p.greek, cells: [spellings(p), ...CASES.map((c) => p.uses.find((u) => u.case === c)?.meaning ?? '')] })),
  },
  // Ἐν ἀρχῇ ἦν ὁ λόγος, “in the beginning was the Word”: Ἐν on the slanted line under ἦν, ἀρχῇ its object on the level line
  diagram: {
    reference: 'John 1:1',
    verse: { book: 'jhn', chapter: 1, verse: 1 },
    mode: 'greek',
    words: greek([0, 'Ἐν'], [1, 'ἀρχῇ'], [2, 'ἦν'], [3, 'ὁ'], [4, 'λόγος']),
    diagram: { clauses: [{ clause: { subject: slot([4], [hang(3)]), verb: slot([2], [prep(0, slot([1]))]) } }] },
    lit: [0, 1],
  },
  worked: [ON_HIS_VERSE.apo, ON_HIS_VERSE.en],
};

export const PREPOSITIONS_TEACH: Record<string, Teach> = {
  preposition: PREPOSITION,
  ...Object.fromEntries(PREPOSITIONS.map((p) => [`preposition-${p.key}`, prepositionTeach(p)])),
};
