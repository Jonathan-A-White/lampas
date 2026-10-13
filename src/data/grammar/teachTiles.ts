// src/data/grammar/teachTiles.ts — the teach tiles of the idea sheet (mw-5r3p30.232): for an idea of the letters, sounds and marks tiers, its items as
// tiles to look at and to hear, so a beginner meets the letter, its name and its sound instead of reading about them. The alphabet is its 24 letters, a
// group is its items (vowel pairs, consonant pairs, breathings), a letter or a pair is itself, and the other marks (accents, the iota under a letter,
// punctuation, movable letters, words a mark tells apart, enclitics) are tiles written here with a real New Testament word. How a tile SOUNDS is only the
// chosen pronunciation's (lessons.ts ideaSound): a scheme that gives none leaves the tile without a sound line, never Modern Greek's. Pure: no store, no screen.
import type { Pronunciation } from '../../speech/pronunciation';
import { itemsOf, type GrammarIdea } from './ladder';
import { ideaSound } from './lessons';

export interface TeachTile {
  /** the ladder id of the item, or the tile's own for a mark that has no idea of its own */
  id: string;
  /** what is shown large: 'Α α', 'ου', 'ʽ', 'ἡ' */
  form: string;
  /** 'alpha', 'rough breathing', '“the”' */
  name?: string;
  /** how it sounds in the chosen pronunciation, as that scheme's lesson says it; missing when the scheme says none */
  sound?: string;
  /** what it is, for a mark with no sound of its own: 'as in English', 'a dropped vowel' */
  note?: string;
  /** a vowel letter */
  vowel?: boolean;
  /** a tap on the tile says this: a letter by its name (the Greek voice names it), a word as the pronunciation says it */
  say?: { text: string; as: 'letter' | 'word' };
  /** a word of the New Testament with the item in it, with its own play button */
  example?: { word: string; gloss: string };
  /** the idea sheet of this item, where one exists and is not the sheet being shown */
  ideaId?: string;
}

const VOWELS = 'αεηιουω';

const lowerName = (idea: GrammarIdea): string => idea.title.replace(/^The /, '').toLowerCase();
const isVowel = (idea: GrammarIdea): boolean => VOWELS.includes(idea.glyphs?.[0] ?? '');

function letterTile(idea: GrammarIdea, scheme: Pronunciation): TeachTile {
  const [small, capital] = idea.glyphs ?? ['', ''];
  return {
    id: idea.id,
    form: `${capital} ${small}`,
    name: idea.title.toLowerCase(),
    sound: ideaSound(idea, scheme),
    vowel: isVowel(idea) || undefined,
    say: { text: small, as: 'letter' },
    ideaId: idea.id,
  };
}

/** A New Testament word that has each pair, and the two breathings, each in the Greek text of the app (the forms are the ones public/data holds). */
const EXAMPLES: Record<string, { word: string; gloss: string }> = {
  'diphthong-ai': { word: 'καί', gloss: 'and' },
  'diphthong-ei': { word: 'εἰρήνη', gloss: 'peace' },
  'diphthong-oi': { word: 'οἶκος', gloss: 'house' },
  'diphthong-ui': { word: 'υἱός', gloss: 'son' },
  'diphthong-ou': { word: 'λόγου', gloss: 'of the word' },
  'diphthong-au': { word: 'αὐτός', gloss: 'he' },
  'diphthong-eu': { word: 'εὐαγγέλιον', gloss: 'good news' },
  'diphthong-eeu': { word: 'ηὔξανεν', gloss: 'it grew' },
  'pair-mp': { word: 'ἔμπροσθεν', gloss: 'in front of' },
  'pair-nt': { word: 'πάντα', gloss: 'all things' },
  'pair-gk': { word: 'ἀνάγκη', gloss: 'necessity' },
  'pair-gg': { word: 'ἄγγελος', gloss: 'angel' },
  'pair-gch': { word: 'ἐλέγχω', gloss: 'I reprove' },
  'pair-gks': { word: 'ἔλεγξον', gloss: 'reprove!' },
  'breathing-rough': { word: 'ἅγιος', gloss: 'holy' },
  'breathing-smooth': { word: 'ἀγάπη', gloss: 'love' },
};

function itemTile(idea: GrammarIdea, scheme: Pronunciation, own: string): TeachTile {
  return {
    id: idea.id,
    form: idea.pair ?? idea.title,
    name: idea.id.startsWith('breathing-') ? lowerName(idea) : undefined,
    sound: ideaSound(idea, scheme),
    example: EXAMPLES[idea.id],
    ideaId: idea.id === own ? undefined : idea.id,
  };
}

/** A word he can hear, with what it means. */
const word = (id: string, form: string, name: string, note?: string): TeachTile => ({ id, form, name, note, say: { text: form, as: 'word' } });

const MARKS: Record<string, TeachTile[]> = {
  accents: [
    { id: 'accent-acute', form: 'ά', name: 'acute', note: 'stress this syllable', example: { word: 'ἀγάπη', gloss: 'love' } },
    { id: 'accent-grave', form: 'ὰ', name: 'grave', note: 'the same stress, written over a last syllable', example: { word: 'καὶ', gloss: 'and' } },
    { id: 'accent-circumflex', form: 'ᾶ', name: 'circumflex', note: 'the same stress, written ˜', example: { word: 'τοῦ', gloss: 'of the' } },
  ],
  'iota-subscript': [
    { id: 'subscript-alpha', form: 'ᾳ', name: 'iota under α', note: 'written, not said', example: { word: 'ἀληθείᾳ', gloss: 'in truth' } },
    { id: 'subscript-eta', form: 'ῃ', name: 'iota under η', note: 'written, not said', example: { word: 'ἀρχῇ', gloss: 'beginning' } },
    { id: 'subscript-omega', form: 'ῳ', name: 'iota under ω', note: 'written, not said', example: { word: 'λόγῳ', gloss: 'word' } },
  ],
  punctuation: [
    { id: 'punct-comma', form: ',', name: 'comma', note: 'as in English' },
    { id: 'punct-stop', form: '.', name: 'full stop', note: 'as in English' },
    { id: 'punct-question', form: ';', name: 'question mark', note: 'a question ends with it' },
    { id: 'punct-raised-dot', form: '·', name: 'raised dot', note: 'a colon or a semicolon' },
    { id: 'punct-elision', form: "'", name: 'apostrophe', note: 'a dropped vowel', example: { word: "δι'", gloss: 'through' } },
    { id: 'punct-diaeresis', form: '¨', name: 'two dots', note: 'the vowel is not part of a pair', example: { word: 'Ἠσαΐας', gloss: 'Isaiah' } },
  ],
  'movable-letters': [
    { id: 'movable-nu', form: 'ἐστι(ν)', name: 'movable ν', note: 'the ν may be there or not', example: { word: 'ἐστιν', gloss: 'is' } },
    { id: 'movable-ou', form: 'οὐ οὐκ οὐχ', name: '“not”', note: 'οὐκ before a smooth breathing, οὐχ before a rough one', example: { word: 'οὐκ', gloss: 'not' } },
    { id: 'movable-ek', form: 'ἐκ ἐξ', name: '“out of”', note: 'ἐξ before a vowel', example: { word: 'ἐξ', gloss: 'out of' } },
  ],
  'marks-change-word': [
    word('mark-hee', 'ἡ', '“the”', 'not ἤ “or”'),
    word('mark-hee-or', 'ἤ', '“or”', 'not ἡ “the”'),
    word('mark-o', 'ὁ', '“the”', 'not ὅ “which”'),
    word('mark-o-which', 'ὅ', '“which”', 'not ὁ “the”'),
    word('mark-ei', 'εἰ', '“if”', 'not εἶ “you are”'),
    word('mark-ei-are', 'εἶ', '“you are”', 'not εἰ “if”'),
    word('mark-en', 'ἐν', '“in”', 'not ἕν “one”'),
    word('mark-en-one', 'ἕν', '“one”', 'not ἐν “in”'),
  ],
  enclitics: [
    word('enclitic-estin', 'ἐστιν', '“is”'),
    word('enclitic-eisin', 'εἰσιν', '“are”'),
    word('enclitic-mou', 'μου', '“my”'),
    word('enclitic-sou', 'σου', '“your”'),
    word('enclitic-me', 'με', '“me”'),
    word('enclitic-se', 'σε', '“you”'),
    word('enclitic-tis', 'τις', '“someone”'),
  ],
};

/**
 * The tiles of an idea of the letters, sounds and marks tiers, in the order to learn them, with every sound as `scheme` says it; an empty list for any other
 * idea (a grammar idea has its examples and its table, not tiles). The alphabet is its 24 letters, alpha to omega; syllables are the seven vowels, each one
 * sound; a group is its items; a letter or a pair or a breathing is its own tile, with no link to its own sheet.
 */
export function teachTiles(idea: GrammarIdea, scheme: Pronunciation): TeachTile[] {
  if (idea.glyphs) return [{ ...letterTile(idea, scheme), ideaId: undefined }];
  if (idea.parent) return [itemTile(idea, scheme, idea.id)];
  if (idea.id === 'alphabet') return itemsOf('alphabet').map((letter) => letterTile(letter, scheme));
  if (idea.id === 'syllables') return itemsOf('alphabet').filter(isVowel).map((letter) => letterTile(letter, scheme));
  if (idea.id === 'diphthongs' || idea.id === 'consonant-pairs' || idea.id === 'breathings') return itemsOf(idea.id).map((item) => itemTile(item, scheme, idea.id));
  return MARKS[idea.id] ?? [];
}
