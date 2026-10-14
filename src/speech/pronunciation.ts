// src/speech/pronunciation.ts — how the Greek is spoken and respelled, as a registry so another way (such as Erasmian)
// is one more file in ./schemes/ plus one line in SCHEMES below; nothing else names 'modern'. Modern Greek is the only
// scheme for now. docs/pronunciation.md says how to add one.
import { MODERN } from './schemes/modern';

/** The id of a scheme in the registry. */
export type GreekPronunciation = string;

/** What a scheme teaches of one sound-bearing ladder idea (a letter, a vowel pair, a consonant pair, a breathing or one of the groups): `sound` is
 * how the idea sounds in this scheme, asked by the questions ('v, as in “vase”'); `text` is the whole lesson. Either may be left out: with a `sound`
 * and no `text` the lesson is the idea's spelling facts plus 'In <label> it sounds like <sound>.' (src/data/grammar/lessons.ts). */
export interface SoundLesson {
  text?: string;
  sound?: string;
}

/** One side of a sound rule: when it holds, and the words that stand on it. */
export interface SoundRuleSide {
  /** 'soft', 'hard', 'voiced' ...: unique in its rule */
  id: string;
  /** a short name for the side, a Drill it facet's label: 'χ before ε, ι, η: hy' */
  label: string;
  /** the one line a wrong pick on a word of this side shows: 'χ before ε, ι, η, υ, αι, ει or οι is soft: hy, as in “huge”' */
  line: string;
  /** New Testament words that stand on this side only (none where the text has none: no word begins with μπ) */
  words: readonly string[];
}

/** A sound that changes by the letter next to it (χ is kh before α and hy before ε): what Drill it drills both sides of (mw-i7xe0n.7). */
export interface SoundRule {
  /** the ladder idea whose sound it changes: 'letter-chi', 'diphthong-au', 'pair-mp' */
  ideaId: string;
  sides: readonly SoundRuleSide[];
  /** the side `word` stands on, or null when it has no such letter, or has it on both sides */
  sideOf(word: string): string | null;
  /** `word` respelled with the rule turned the other way, the near miss of the rule: χάρις 'KHA-rees' is misread 'HYA-rees' */
  misread(word: string): string;
}

export interface Pronunciation {
  id: GreekPronunciation;
  /** what Settings shows */
  label: string;
  /** the language tag put on every utterance, and the language of the voices offered for it */
  lang: string;
  /** the language the mill scores a reading of the Greek in (a grind's scoring.langs): modern Greek is 'el' */
  scoringLang: string;
  /** a line under the label in Settings */
  note: string;
  /** the Greek word as syllables an English reader can say, the stressed one in capitals: 'χριστῷ' is 'khree-STO' */
  respell(greekWord: string): string;
  /** An English word that has each sound the respelling writes ('e' is the e of 'pet'): the lessons give every sound with its key word, so another scheme changes them */
  keyWords: Readonly<Record<string, string>>;
  /** The bundled clip (a root-absolute path under public/sounds/<scheme>/) of the sound of a Greek word of ONE letter (ὁ, ἡ, ὦ, Ὃ), played instead of
   * any voice: a Greek voice handed one letter names it ('omicron'), with or without an accent (mw-5r3p30.347). Null for a letter the scheme has no
   * clip for. Modern Greek's are its vowels' sounds, '/sounds/modern/o.mp3' for ὁ. */
  loneLetterClip(word: string): string | null;
  /** What this scheme's voice is handed for Greek text (a word, or a run of words read aloud), so that it says the sounds the respelling writes. A
   * voice reads the Greek its own way: a Modern Greek voice drops the n of ντ inside a word ('PA-do-te' for Πάντοτε, respelt 'PAN-do-te'), so Modern
   * Greek hands it 'πάν-ντοτε' (mw-5r3p30.264). A scheme whose voice already says its respelling gives the text back as it is. */
  voiceForm(text: string): string;
  /** What this scheme's voice is handed to name a LETTER (a letter drill's 'Tap to hear', where the letter itself is asked about, not a word): Modern
   * Greek gives the bare letter in lower case, which a Greek voice names the modern way ('vita' for β; mw-5r3p30.268). */
  letterForm(letter: string): string;
  /** What the tutor is told of this scheme: its name and the sound rules it respells and speaks by, sent with every ask that may speak of a sound
   * (the grinds' `pronunciation_guide`), so the grinds' instructions name no sound of their own (mw-5r3p30.268). */
  tutorGuide: string;
  /** The sound lessons this scheme teaches, keyed by ladder idea id ('letter-beta', 'diphthong-ou', 'breathings' ...), in its own sounds: the idea sheet and the
   * sound questions read them (mw-5r3p30.229). An idea it gives none for falls back to a text that names no sound, never to another scheme's. */
  lessons?: Readonly<Record<string, SoundLesson>>;
  /** The sounds of this scheme that change by the next letter, one rule per ladder idea (mw-i7xe0n.7): Drill it asks words on both sides of each and offers
   * the word misread by the rule as a wrong choice. A scheme with none leaves it out. */
  soundRules?: readonly SoundRule[];
}

/** The rule of `scheme` that changes the sound of the ladder idea `ideaId`, if any. */
export const soundRuleOf = (scheme: Pronunciation, ideaId: string): SoundRule | undefined => scheme.soundRules?.find((r) => r.ideaId === ideaId);

const SCHEMES: Pronunciation[] = [MODERN];

/** Every scheme, in the order Settings lists them. Read it at use, not at load: registerPronunciation adds to it. */
export const PRONUNCIATIONS: readonly Pronunciation[] = SCHEMES;

export const DEFAULT_PRONUNCIATION: GreekPronunciation = MODERN.id;

/** Adds a scheme at the end of the list (tests do, to prove the list drives Settings and the word sheet); returns the
 * function that takes it out again. */
export function registerPronunciation(scheme: Pronunciation): () => void {
  SCHEMES.push(scheme);
  return () => {
    const at = SCHEMES.indexOf(scheme);
    if (at >= 0) SCHEMES.splice(at, 1);
  };
}

export function isPronunciation(value: unknown): value is GreekPronunciation {
  return PRONUNCIATIONS.some((p) => p.id === value);
}

/** The entry for `id`; the default's when it is not one (a saved value from a later version). */
export function pronunciationOf(id: unknown): Pronunciation {
  return PRONUNCIATIONS.find((p) => p.id === id) ?? PRONUNCIATIONS.find((p) => p.id === DEFAULT_PRONUNCIATION)!;
}
