// src/data/grammar/teach/marks.ts — the cards of the marks tier (mw-5r3p30.234): breathings, accents, the iota under a letter, the words a pronunciation
// may say alike, punctuation, movable letters, the marks that change a word, and enclitics. From here a worked word is written as the text has it,
// with only the marks the cards below taught. No sound is written here: how a breathing or an accent sounds is the chosen pronunciation's.
import type { Teach } from './types';

export const MARKS: Record<string, Teach> = {
  breathings: {
    whatItIs:
      'A breathing is a small mark written over the first vowel of a word that begins with a vowel. Every such word has one. English has nothing like it: take it as part of the spelling, as the dot is part of an English i.',
    howToSpot:
      'Look at the first letter of a word. If it is a vowel, a small curl sits over it: ʽ, curling like a small c, is the rough breathing; ᾿, curling the other way like a raised comma, is the smooth breathing. On a pair of vowels it sits on the second (αὐ, εἰ, οὐ). Before a capital it stands to the left of the letter (Ἐν). A word that begins with ρ or υ always takes the rough one.',
    worked: [
      {
        word: 'αἱ',
        ref: '1 John 1:1',
        gloss: 'the',
        steps: [
          'αἱ begins with a vowel, so it carries a breathing.',
          'Its two letters are the pair of vowels αι, so the breathing sits on the second, ι.',
          'The mark ʽ curls like a small c: it is the rough breathing.',
          'αἱ is “the”: αἱ χεῖρες, “the hands”.',
        ],
      },
      {
        word: 'Ἐν',
        ref: 'John 1:1',
        gloss: 'in',
        steps: [
          'Ἐν begins with a vowel, the capital Ε, so it carries a breathing.',
          'Before a capital the breathing stands to its left: ᾿Ε.',
          'The mark ᾿ curls like a raised comma: it is the smooth breathing.',
          'Ἐν is “in”: Ἐν ἀρχῇ, “In the beginning”.',
        ],
      },
    ],
  },
  'breathing-rough': {
    whatItIs: 'The rough breathing is one of the two breathings: a small mark that curls like the letter c (ʽ), over the first vowel of a word.',
    howToSpot:
      'Look over the first vowel of a word: ʽ curls like a c, opening to the right. On a pair of vowels it sits on the second (οὗτος); before a capital it stands to the left (Ὁ). Every word that begins with ρ or υ has it (ῥῆμα, υἱός).',
    worked: [
      {
        word: 'αἱ',
        ref: '1 John 1:1',
        gloss: 'the',
        steps: ['αἱ begins with the pair of vowels αι.', 'The breathing sits on the second vowel, ι: ἱ.', 'It curls like a c: ʽ, the rough breathing.'],
      },
      {
        word: 'ὁ',
        ref: 'John 1:1',
        gloss: 'the',
        steps: ['ὁ is one letter, the vowel ο, and a word that begins with a vowel carries a breathing.', 'The mark over it curls like a c: ʽ, the rough breathing.', 'ὁ λόγος: “the Word”.'],
      },
    ],
  },
  'breathing-smooth': {
    whatItIs: 'The smooth breathing is the other of the two breathings: a small mark that curls like a raised comma (᾿), over the first vowel of a word. It is the commoner of the two.',
    howToSpot:
      'Look over the first vowel of a word: ᾿ curls like a raised comma, opening to the left, the other way from the rough breathing. On a pair of vowels it sits on the second (αὐτός); before a capital it stands to the left (Ἐν).',
    worked: [
      {
        word: 'Ἐν',
        ref: 'John 1:1',
        gloss: 'in',
        steps: ['Ἐν begins with the capital vowel Ε.', 'The breathing stands to the left of the capital: ᾿Ε.', 'It curls like a raised comma: the smooth breathing. Ἐν ἀρχῇ: “In the beginning”.'],
      },
      {
        word: 'ἐν',
        gloss: 'in',
        steps: ['ἐν begins with the vowel ε.', 'Over it, ᾿ curls like a raised comma: the smooth breathing.', 'ἐν is “in”, one of the commonest words of the New Testament.'],
      },
    ],
  },
  accents: {
    whatItIs:
      'An accent is a small mark over a vowel that shows which syllable of a word to stress, as English stresses the second syllable of “be-GIN-ning” but writes no mark. Most Greek words carry one accent, and only one.',
    howToSpot:
      'There are three marks, and all three mark the syllable to stress. The acute ά rises to the right; the grave ὰ falls to the right, and stands only on a last syllable when another word follows; the circumflex ᾶ is a small wave, over a long vowel or a pair of vowels. A few small words have none.',
    table: {
      caption: 'The three accents',
      columns: ['the mark', 'in a word'],
      rows: [
        { label: 'acute', cells: ['ά', 'λόγου'] },
        { label: 'grave', cells: ['ὰ', 'καὶ'] },
        { label: 'circumflex', cells: ['ᾶ', 'ζωῆς'] },
      ],
    },
    worked: [
      {
        word: 'λόγου',
        ref: '1 John 1:1',
        gloss: 'word',
        steps: ['λόγου has two syllables: λό-γου.', 'The acute ό stands on the first: that is the syllable to stress.', 'λόγου is a form of λόγος: “word”.'],
      },
      {
        word: 'λόγος',
        ref: 'John 1:1',
        gloss: 'word',
        steps: ['λόγος has two syllables: λό-γος.', 'The acute ό stands on the first: stress the first.', 'ὁ λόγος: “the Word”.'],
      },
    ],
  },
  'iota-subscript': {
    whatItIs:
      'The iota under a letter (the iota subscript) is a tiny ι written beneath α, η or ω. It is easy to miss, but it is part of the spelling, and it often shows how a word ends.',
    howToSpot: 'Look under α, η and ω, mostly at the end of a word: ᾳ, ῃ, ῳ. With the tiny ι the word is another form: ἀρχῇ is not ἀρχή.',
    table: {
      caption: 'The iota under a letter',
      columns: ['with it', 'in a word'],
      rows: [
        { label: 'under α', cells: ['ᾳ', 'ἀληθείᾳ'] },
        { label: 'under η', cells: ['ῃ', 'ἀρχῇ'] },
        { label: 'under ω', cells: ['ῳ', 'λόγῳ'] },
      ],
    },
    worked: [
      {
        word: 'ἀρχῇ',
        ref: 'John 1:1',
        gloss: 'beginning',
        steps: ['Look under the last letter, η: a tiny ι hangs there (ῃ).', 'It is part of the spelling: ἀρχῇ is a form of ἀρχή, “beginning”.', 'Ἐν ἀρχῇ: “In the beginning”.'],
      },
    ],
  },
  'words-sound-alike': {
    whatItIs:
      'Some words differ by one letter yet may sound the same, as English “their” and “there” do. In Greek the one letter can change who is meant, or whether a thing is said as a fact.',
    howToSpot: 'Do not trust your ear: look at the letters. Check η against υ at the start (ἡμεῖς, ὑμεῖς), ο against ω (ἔχομεν, ἔχωμεν), and ει against ῃ (ἔχει, ἔχῃ).',
    table: {
      caption: 'Words told apart only by the spelling',
      columns: ['means', 'but this', 'means'],
      rows: [
        { label: 'ἡμεῖς', cells: ['we', 'ὑμεῖς', 'you'] },
        { label: 'ἔχομεν', cells: ['we have', 'ἔχωμεν', 'let us have'] },
        { label: 'ἔχει', cells: ['he has', 'ἔχῃ', 'he may have'] },
      ],
    },
    worked: [
      {
        word: 'ἡμῶν',
        ref: '1 John 1:1',
        gloss: 'our',
        steps: ['ἡμῶν begins with η: it means “our”.', 'Change η to υ and you have ὑμῶν, “your”.', 'Your ear may not tell them apart; the first letter does. αἱ χεῖρες ἡμῶν: “our hands”.'],
      },
    ],
  },
  punctuation: {
    whatItIs: 'Punctuation is the set of small signs that show how a sentence runs: in English the comma, the full stop and the question mark.',
    howToSpot:
      'The comma and the full stop are as in English. A question ends with ; (it looks like an English semicolon). A raised dot · does the work of a colon or a semicolon. An apostrophe after a word shows its last vowel was dropped before a word that begins with a vowel (ἀπ᾿ for ἀπό). Two dots over a vowel (ϊ, ϋ) show it is not part of a pair of vowels.',
    table: {
      caption: 'The signs',
      columns: ['the sign', 'what it does'],
      rows: [
        { label: 'comma', cells: [',', 'as in English'] },
        { label: 'full stop', cells: ['.', 'as in English'] },
        { label: 'question', cells: [';', 'ends a question'] },
        { label: 'raised dot', cells: ['·', 'a colon or a semicolon'] },
        { label: 'apostrophe', cells: ['᾿', 'a vowel was dropped'] },
        { label: 'two dots', cells: ['¨', 'not a pair of vowels'] },
      ],
    },
    worked: [
      {
        word: "ἀπ'",
        ref: '1 John 1:1',
        gloss: 'from',
        steps: ["ἀπ' ends in an apostrophe: a vowel has been dropped.", 'The whole word is ἀπό, “from”. Its last vowel, ο, went because the next word, ἀρχῆς, begins with a vowel.', "So ἀπ' ἀρχῆς is ἀπό ἀρχῆς: “from the beginning”."],
      },
    ],
  },
  'movable-letters': {
    whatItIs: 'Some small words change their last letter to suit the word after them, as English says “a pear” but “an apple”. The meaning stays the same.',
    howToSpot:
      'Learn the few that do. “Not” is οὐ before a consonant, οὐκ before a smooth breathing and οὐχ before a rough one. “Out of” is ἐκ before a consonant and ἐξ before a vowel. Many words may end in a movable ν, which is there or not: ἐστι or ἐστιν, “is”.',
    table: {
      caption: 'Words that change their last letter',
      columns: ['before a consonant', 'before a vowel'],
      rows: [
        { label: 'not', cells: ['οὐ', 'οὐκ or οὐχ'] },
        { label: 'out of', cells: ['ἐκ', 'ἐξ'] },
        { label: 'is', cells: ['ἐστί', 'ἐστίν'] },
      ],
    },
    worked: [
      {
        word: 'οὐκ',
        ref: '1 John 1:5',
        gloss: 'not',
        steps: ['οὐκ is “not”; its plain form is οὐ.', 'The next word, ἔστιν, begins with a vowel with a smooth breathing, so a κ is added: οὐκ.', 'Before a rough breathing it would be οὐχ; before a consonant, οὐ. σκοτία ἐν αὐτῷ οὐκ ἔστιν: “in him is no darkness”.'],
      },
    ],
  },
  'marks-change-word': {
    whatItIs:
      'Some Greek words are spelt with the same letters and differ only in a breathing or an accent, and the mark makes them two different words. English does the like with stress alone: “record” the thing and “record” the act are one spelling, two words.',
    howToSpot: 'Read both marks on a small word: which way the breathing curls, and whether there is an accent. ὁ with no accent is “the”; ὅ with one is “which”.',
    table: {
      caption: 'Words a mark tells apart',
      columns: ['means', 'but this', 'means'],
      rows: [
        { label: 'ἡ', cells: ['the', 'ἤ', 'or'] },
        { label: 'ὁ', cells: ['the', 'ὅ', 'which'] },
        { label: 'εἰ', cells: ['if', 'εἶ', 'you are'] },
        { label: 'ἐν', cells: ['in', 'ἕν', 'one'] },
        { label: 'οὐ', cells: ['not', 'οὗ', 'where'] },
        { label: 'ἀλλά', cells: ['but', 'ἄλλα', 'other things'] },
        { label: 'αὐτή', cells: ['she', 'αὕτη', 'this'] },
      ],
    },
    worked: [
      {
        word: 'Ὃ',
        ref: '1 John 1:1',
        gloss: 'that which',
        steps: [
          'Ὃ is the capital Ο with a rough breathing and an accent.',
          'With no accent, ὁ is “the”. With the accent, ὅ is “which”, “that which”.',
          'So 1 John opens Ὃ ἦν ἀπ᾿ ἀρχῆς: “That which was from the beginning”.',
        ],
      },
    ],
  },
  enclitics: {
    whatItIs:
      'An enclitic is a small word with no stress of its own: it leans on the word before it and is said with it, almost as one word, as English “him” leans on “saw” in “I saw him”.',
    howToSpot:
      'Look for a small common word with no accent of its own after another word: μου, σου, μοι, σοι, με, σε (“my, your, to me, to you, me, you”), τις, τι (“someone, something”) and the short forms of “I am”. The word before may then carry a second accent: ἄνθρωπός τις, “a certain man”.',
    table: {
      caption: 'The commonest enclitics',
      columns: ['means'],
      rows: [
        { label: 'μου', cells: ['my'] },
        { label: 'σου', cells: ['your'] },
        { label: 'με', cells: ['me'] },
        { label: 'σε', cells: ['you'] },
        { label: 'τις', cells: ['someone'] },
        { label: 'ἐστιν', cells: ['is'] },
        { label: 'εἰσιν', cells: ['are'] },
      ],
    },
    worked: [
      {
        word: 'μου',
        ref: '1 John 2:1',
        gloss: 'my',
        steps: ['μου has no accent: it is an enclitic.', 'It leans on the word before it, τεκνία, and is said with it: τεκνία μου.', 'τεκνία μου: “my little children”.'],
      },
    ],
  },
};
