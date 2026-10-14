// src/data/grammar/teach/letters.ts — the cards of the letters tier (mw-5r3p30.234): the alphabet and its 24 letters. Before the marks are taught, a
// worked word is written in capitals with no marks, as the oldest copies of the New Testament wrote it; the voice and the respelling take the
// word as the text has it (`say`). How a letter SOUNDS is never written here: it is the chosen pronunciation's (the tiles and 'How it sounds').
import { itemsOf } from '../ladder';
import type { Teach, WorkedExample } from './types';

/** The capital letter's name: 'Λ' is 'lambda'. */
const NAMES = new Map(itemsOf('alphabet').map((letter) => [letter.glyphs![1], letter.title.toLowerCase()]));

/** A word in capitals named letter by letter: 'Λ lambda · Ο omicron · Γ gamma ...'. */
export const spelledOut = (capitals: string): string => [...capitals].map((c) => `${c} ${NAMES.get(c) ?? c}`).join(' · ');

/** A word in capitals in small letters, the last sigma written ς: 'ΛΟΓΟΣ' is 'λογος'. */
export const inSmall = (capitals: string): string => capitals.toLowerCase().replace(/σ$/u, 'ς');

/** What each letter looks like, and what it must not be taken for. */
const LOOKS: Record<string, string> = {
  alpha: 'α is round, like an a with no top: Α as a capital.',
  beta: 'β is tall, with a stroke that goes down below the line; Β is the capital.',
  gamma: 'γ hangs below the line, like a y with a loop; Γ is the capital, a right angle.',
  delta: 'δ has a round body and a curl on top; Δ, the capital, is a triangle.',
  epsilon: 'ε is like a backwards 3; Ε is the capital.',
  zeta: 'ζ hangs a tail below the line; Ζ is the capital, like a Z.',
  eta: 'η looks like an English n with a long right leg going down below the line. It is not an n. Η is the capital, like an H.',
  theta: 'θ is an oval with a bar across it; Θ is the capital.',
  iota: 'ι is a short stroke with no dot; Ι is the capital.',
  kappa: 'κ is like a small k; Κ is the capital.',
  lambda: 'λ has a long arm and a short leg; Λ, the capital, has no bar.',
  mu: 'μ looks like a u with a tail going down at the left; Μ is the capital.',
  nu: 'ν looks like an English v. It is not a v: it is nu. Ν is the capital, like an N.',
  xi: 'ξ is a squiggle that hangs below the line; Ξ, the capital, is three bars.',
  omicron: 'ο is a small round o; Ο is the capital.',
  pi: 'π is two legs under a roof; Π is the capital.',
  rho: 'ρ looks like an English p. It is not a p: it is rho. Ρ is the capital, like a P.',
  sigma: 'σ is round with a tail going right; at the end of a word it is written ς. Σ is the capital.',
  tau: 'τ is like a t with no foot; Τ is the capital.',
  upsilon: 'υ is like a u with a round bottom; Υ is the capital, like a Y.',
  phi: 'φ is a circle with a stroke through it, top to bottom; Φ is the capital.',
  chi: 'χ looks like an English x. It is not an x: it is chi. Χ is the capital.',
  psi: 'ψ is like a trident, a fork with three prongs; Ψ is the capital.',
  omega: 'ω looks like an English w with round bottoms. It is not a w: it is omega. Ω is the capital.',
};

/** A word for each letter, in capitals with no marks (no pair of vowels or of consonants in it), with the form the text writes. */
const WORDS: Record<string, [capitals: string, say: string, gloss: string, ref?: string]> = {
  alpha: ['ΑΡΧΗΣ', 'ἀρχῆς', 'beginning', '1 John 1:1'],
  beta: ['ΒΙΒΛΟΣ', 'Βίβλος', 'book', 'Matthew 1:1'],
  gamma: ['ΛΟΓΟΣ', 'λόγος', 'word', 'John 1:1'],
  delta: ['ΔΟΞΑ', 'δόξα', 'glory'],
  epsilon: ['ΘΕΟΣ', 'θεὸς', 'God', 'John 1:1'],
  zeta: ['ΖΩΗΣ', 'ζωῆς', 'life', '1 John 1:1'],
  eta: ['ΗΝ', 'ἦν', 'was', '1 John 1:1'],
  theta: ['ΘΕΟΣ', 'θεὸς', 'God', 'John 1:1'],
  iota: ['ΧΡΙΣΤΟΣ', 'Χριστός', 'Christ'],
  kappa: ['ΚΟΣΜΟΣ', 'κόσμος', 'world', 'John 1:10'],
  lambda: ['ΛΟΓΟΣ', 'λόγος', 'word', 'John 1:1'],
  mu: ['ΚΟΣΜΟΣ', 'κόσμος', 'world', 'John 1:10'],
  nu: ['ΗΝ', 'ἦν', 'was', '1 John 1:1'],
  xi: ['ΔΟΞΑ', 'δόξα', 'glory'],
  omicron: ['ΛΟΓΟΣ', 'λόγος', 'word', 'John 1:1'],
  pi: ['ΠΑΤΗΡ', 'πατήρ', 'father'],
  rho: ['ΑΡΧΗΣ', 'ἀρχῆς', 'beginning', '1 John 1:1'],
  sigma: ['ΚΟΣΜΟΣ', 'κόσμος', 'world', 'John 1:10'],
  tau: ['ΠΑΤΗΡ', 'πατήρ', 'father'],
  upsilon: ['ΥΔΩΡ', 'ὕδωρ', 'water'],
  phi: ['ΦΩΣ', 'φῶς', 'light', 'John 1:5'],
  chi: ['ΧΑΡΙΣ', 'χάρις', 'grace', 'John 1:17'],
  psi: ['ΨΥΧΗ', 'ψυχή', 'soul'],
  omega: ['ΖΩΗΣ', 'ζωῆς', 'life', '1 John 1:1'],
};

const VOWELS = 'αεηιουω';

function letterTeach(key: string, name: string, small: string, capital: string): Teach {
  const vowel = VOWELS.includes(small);
  const [word, say, gloss, ref] = WORDS[key];
  const places = [...word].flatMap((c, i) => (c === capital ? [i + 1] : []));
  const where = places.length === 1 ? `letter ${places[0]}` : `letters ${places.slice(0, -1).join(', ')} and ${places[places.length - 1]}`;
  const worked: WorkedExample = {
    word,
    say,
    ref,
    gloss,
    steps: [
      `Letter by letter: ${spelledOut(word)}.`,
      `${capital} is the capital of ${small}, ${name}: it is ${where} of the word.`,
      `In small letters the word is ${inSmall(word)}, which the text writes ${say} with its marks: “${gloss}”.`,
    ],
  };
  return {
    whatItIs: `${name[0].toUpperCase()}${name.slice(1)} is one of the 24 letters of the Greek alphabet, and one of its ${vowel ? 'seven vowels' : 'seventeen consonants'}. Its name is said “${name}”, and each letter has a small form and a capital.`,
    howToSpot: `${LOOKS[key]}${key === 'upsilon' ? ' With another vowel before it, it is often half of a pair: αυ, ευ, ηυ, ου; and υι too.' : ''}`,
    worked: [worked],
  };
}

const ALPHABET: Teach = {
  whatItIs:
    'An alphabet is the set of letters a language is written with. Greek has 24 letters, and English takes its word “alphabet” from the first two: alpha and beta. Each letter has a small form, a capital form and a name. Seven are vowels (α ε η ι ο υ ω); the other seventeen are consonants.',
  howToSpot:
    'A printed Greek text is mostly small letters; a capital starts a name, a paragraph or something said. A few letters look like English ones but are other letters: η (eta) looks like an n, ν (nu) like a v, ρ (rho) like a p, χ (chi) like an x and ω (omega) like a w. The tiles above show all 24 in order; tap one to hear it, and tap its name to open its own card.',
  worked: [
    {
      word: 'ΖΩΗΣ',
      say: 'ζωῆς',
      ref: '1 John 1:1',
      gloss: 'life',
      steps: [
        'The oldest copies of the New Testament were written like this: all in capitals, with no small marks.',
        `Letter by letter: ${spelledOut('ΖΩΗΣ')}.`,
        'In small letters it is ζωης; at the end of a word sigma is written ς.',
        'The text writes it ζωῆς, with marks you will meet soon: “life”, as in “the Word of life”.',
      ],
    },
    {
      word: 'ΛΟΓΟΣ',
      say: 'λόγος',
      ref: 'John 1:1',
      gloss: 'word',
      steps: [
        'The oldest copies of the New Testament were written like this: all in capitals, with no small marks.',
        `Letter by letter: ${spelledOut('ΛΟΓΟΣ')}.`,
        'In small letters it is λογος; at the end of a word sigma is written ς.',
        'The text writes it λόγος: “word”, as in “In the beginning was the Word”.',
      ],
    },
  ],
};

export const LETTERS: Record<string, Teach> = {
  alphabet: ALPHABET,
  ...Object.fromEntries(
    itemsOf('alphabet').map((letter) => {
      const key = letter.id.replace(/^letter-/, '');
      return [letter.id, letterTeach(key, letter.title.toLowerCase(), letter.glyphs![0], letter.glyphs![1])];
    }),
  ),
};
