// src/data/grammar/teach/sounds.ts — the cards of the sounds tier (mw-5r3p30.234): the pairs of vowels, the pairs of consonants, each pair, and
// syllables. They teach how to SEE a pair; how it sounds is only the chosen pronunciation's lesson (lessons.ts), never written here. The marks are
// not taught yet, so a worked word is in capitals with no marks, as the oldest copies wrote it.
import { itemsOf } from '../ladder';
import { inSmall, spelledOut } from './letters';
import type { Teach } from './types';

/** For each pair: a word in capitals with it (no other pair, no marks), the form the text writes, and what it means. */
const PAIR_WORDS: Record<string, [capitals: string, say: string, gloss: string, ref?: string]> = {
  'diphthong-ai': ['ΚΑΙ', 'καὶ', 'and', '1 John 1:1'],
  'diphthong-ei': ['ΕΙΡΗΝΗ', 'εἰρήνη', 'peace'],
  'diphthong-oi': ['ΟΙΚΟΣ', 'οἶκος', 'house'],
  'diphthong-ui': ['ΥΙΟΣ', 'υἱός', 'son'],
  'diphthong-ou': ['ΛΟΓΟΥ', 'λόγου', 'word', '1 John 1:1'],
  'diphthong-au': ['ΑΥΤΟΣ', 'αὐτός', 'he'],
  'diphthong-eu': ['ΕΥΘΥΣ', 'εὐθύς', 'at once'],
  'diphthong-eeu': ['ΗΥΞΑΝΕΝ', 'ηὔξανεν', 'it grew'],
  'pair-mp': ['ΕΜΠΡΟΣΘΕΝ', 'ἔμπροσθεν', 'in front of'],
  'pair-nt': ['ΠΑΝΤΑ', 'πάντα', 'all things'],
  'pair-gk': ['ΑΝΑΓΚΗ', 'ἀνάγκη', 'need'],
  'pair-gg': ['ΑΓΓΕΛΟΣ', 'ἄγγελος', 'angel'],
  'pair-gch': ['ΕΛΕΓΧΩ', 'ἐλέγχω', 'I expose'],
  'pair-gks': ['ΕΛΕΓΞΟΝ', 'ἔλεγξον', 'expose'],
};

function pairTeach(id: string, pair: string, vowels: boolean): Teach {
  const [first, second] = [...pair];
  const [word, say, gloss, ref] = PAIR_WORDS[id];
  const capitals = pair.toUpperCase();
  return {
    whatItIs: vowels
      ? `${pair} is one of the eight pairs of vowels: ${first} and ${second} written side by side and said as one sound, not two, as the two letters of English “ea” in “team” make one sound.`
      : `${pair} is one of the six pairs of consonants: ${first} and ${second} side by side make a sound of their own, as English “ng” in “sing” is not an n and then a g.`,
    howToSpot: `Look for ${first} followed straight by ${second}, inside a word or at its start: ${capitals} in capitals. Read the two letters together as one pair, never one by one. Hear it on the tile above.`,
    worked: [
      {
        word,
        say,
        ref,
        gloss,
        steps: [
          `Letter by letter: ${spelledOut(word)}.`,
          `${capitals} stand side by side: the pair ${pair}, read as one.`,
          `In small letters it is ${inSmall(word)}, which the text writes ${say}: “${gloss}”.`,
        ],
      },
    ],
  };
}

const items = (group: string): [string, Teach][] => itemsOf(group).map((item) => [item.id, pairTeach(item.id, item.pair!, group === 'diphthongs')]);

export const SOUNDS: Record<string, Teach> = {
  diphthongs: {
    whatItIs:
      'A pair of vowels is two vowels written side by side and said as one sound, as the two letters of English “ea” in “team” make one sound. Greek has eight such pairs. Each counts as one vowel sound in a word.',
    howToSpot:
      'Look for two vowels side by side whose second is ι or υ: αι, ει, οι, υι and αυ, ευ, ηυ, ου. Read the pair as one sound, never as two. Two vowels side by side whose second is not ι or υ (such as οα or εο) are not a pair: say each one. The tiles above give each pair its sound.',
    table: {
      caption: 'The eight pairs of vowels',
      columns: ['second ι', 'second υ'],
      rows: [
        { label: 'α first', cells: ['αι', 'αυ'] },
        { label: 'ε first', cells: ['ει', 'ευ'] },
        { label: 'η first', cells: ['', 'ηυ'] },
        { label: 'ο first', cells: ['οι', 'ου'] },
        { label: 'υ first', cells: ['υι', ''] },
      ],
    },
    worked: [
      {
        word: 'ΛΟΓΟΥ',
        say: 'λόγου',
        ref: '1 John 1:1',
        gloss: 'word',
        steps: [
          `Letter by letter: ${spelledOut('ΛΟΓΟΥ')}.`,
          'The last two letters, Ο and Υ, are both vowels, and the second is υ: they are the pair ου.',
          'So the word has two vowel sounds, not three: Ο, then ΟΥ.',
          'The text writes it λόγου, a form of λόγος, “word”.',
        ],
      },
      {
        word: 'ΚΑΙ',
        say: 'καὶ',
        gloss: 'and',
        steps: [`Letter by letter: ${spelledOut('ΚΑΙ')}.`, 'Α and Ι side by side, the second ι: the pair αι, one sound.', 'The text writes it καί or καὶ, the commonest word in the New Testament: “and”.'],
      },
    ],
  },
  ...Object.fromEntries(items('diphthongs')),

  'consonant-pairs': {
    whatItIs:
      'A pair of consonants is two consonants side by side that make a sound of their own, as English “ng” in “sing” is not an n and then a g. Greek has six such pairs. Most begin with γ.',
    howToSpot:
      'Look for μ before π (μπ), ν before τ (ντ), or γ before γ, κ, χ or ξ (γγ, γκ, γχ, γξ). Read the two letters together as the pair, not one by one. The tiles above give each pair its sound.',
    table: {
      caption: 'The six pairs of consonants',
      columns: ['the pair', 'in a word'],
      rows: [
        { label: 'μ then π', cells: ['μπ', 'ΕΜΠΡΟΣΘΕΝ'] },
        { label: 'ν then τ', cells: ['ντ', 'ΠΑΝΤΑ'] },
        { label: 'γ then κ', cells: ['γκ', 'ΑΝΑΓΚΗ'] },
        { label: 'γ then γ', cells: ['γγ', 'ΑΓΓΕΛΟΣ'] },
        { label: 'γ then χ', cells: ['γχ', 'ΕΛΕΓΧΩ'] },
        { label: 'γ then ξ', cells: ['γξ', 'ΕΛΕΓΞΟΝ'] },
      ],
    },
    worked: [
      {
        word: 'ΑΓΓΕΛΟΣ',
        say: 'ἄγγελος',
        gloss: 'angel',
        steps: [
          `Letter by letter: ${spelledOut('ΑΓΓΕΛΟΣ')}.`,
          'Two Γ stand side by side: γ before γ makes the pair γγ. Read them together.',
          'The rest are single letters: Α, then Ε, Λ, Ο, Σ.',
          'The text writes it ἄγγελος: “angel”, “messenger”, the word English “angel” comes from.',
        ],
      },
    ],
  },
  ...Object.fromEntries(items('consonant-pairs')),

  syllables: {
    whatItIs:
      'A syllable is one beat of a word, built round one vowel sound: English “Jesus” has two (Je-sus), “beginning” has three (be-gin-ning). A Greek word has as many syllables as it has vowel sounds, and a pair of vowels counts as one.',
    howToSpot:
      'First count the vowel sounds: each single vowel, and each pair of vowels, is one syllable. Then cut the word after each vowel sound. One consonant between two vowels starts the next syllable (ΛΟ-ΓΟΣ). Of two or more consonants, the last starts the next syllable (ΑΡ-ΧΗΣ), except a group that can begin a word, which goes on together: a consonant before λ or ρ (ΠΑ-ΤΡΟΣ), σ before τ, π or κ (Ε-ΣΤΙΝ), and γν, κτ, πτ, φθ, χθ.',
    table: {
      caption: 'Words cut into syllables',
      columns: ['syllables', 'how many'],
      rows: [
        { label: 'ΛΟΓΟΣ', cells: ['ΛΟ-ΓΟΣ', '2'] },
        { label: 'ΛΟΓΟΥ', cells: ['ΛΟ-ΓΟΥ', '2'] },
        { label: 'ΑΡΧΗΣ', cells: ['ΑΡ-ΧΗΣ', '2'] },
        { label: 'ΑΝΘΡΩΠΟΣ', cells: ['ΑΝ-ΘΡΩ-ΠΟΣ', '3'] },
        { label: 'ΑΚΗΚΟΑΜΕΝ', cells: ['Α-ΚΗ-ΚΟ-Α-ΜΕΝ', '5'] },
      ],
    },
    worked: [
      {
        word: 'ΑΚΗΚΟΑΜΕΝ',
        say: 'ἀκηκόαμεν',
        ref: '1 John 1:1',
        gloss: 'we have heard',
        steps: [
          'Find the vowel sounds: Α, Η, Ο, Α, Ε. Ο and Α stand side by side, but the second is not ι or υ, so they are two sounds. Five vowel sounds: five syllables.',
          'Each single consonant between two vowels starts the next syllable: Α-ΚΗ-ΚΟ-Α-ΜΕ…',
          'The last consonant, Ν, ends the word, so it stays in the last syllable: Α-ΚΗ-ΚΟ-Α-ΜΕΝ.',
          'The text writes it ἀκηκόαμεν: “we have heard”.',
        ],
      },
    ],
  },
};
