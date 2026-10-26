// src/script/hebrewSpeech.ts — what a Hebrew word's tap and guide share besides their drawing (mw-5r3p30.98): saying it, the line for a phone with no Hebrew voice,
// and what a conversation lets a Hebrew word ask.
import { createContext } from 'react';
import { speak } from '../speech/greek';
import { DEFAULT_HEBREW_PRONUNCIATION, pronunciationsOf } from '../speech/pronunciation';

/** What a conversation lets its Hebrew words do: ask the tutor how one is said. Without one (the Verse view's answers) the guide only has Hear it. */
export interface HebrewAsk {
  ask: (word: string) => void;
  /** a message is still waiting for its answer */
  busy: boolean;
}

export const HebrewAskContext = createContext<HebrewAsk | null>(null);

/** The id a Hebrew word or syllable is spoken under, so every button for the same text agrees on whether it is playing. */
export const hebrewKey = (text: string): string => `he:${text}`;

/** The line shown when the phone has no Hebrew voice. */
export const noHebrewVoice = 'No Hebrew voice on this phone';

/** Says `text` in the Hebrew voice; false when the phone has none (nothing is spoken then). */
export const speakHebrew = (text: string): boolean => speak(text, hebrewKey(text), 'hebrew') !== 'no-voice';

/** A Hebrew word in syllables an English reader can say, the stressed one in capitals ('בְּרֵאשִׁית' is 'be-reh-SHEET'), by the chosen Hebrew scheme; `tr` is the data's transliteration of it, where it has one. */
export const hebrewRespelling = (word: string, tr?: string): string =>
  (pronunciationsOf('he').find((p) => p.id === DEFAULT_HEBREW_PRONUNCIATION) ?? pronunciationsOf('he')[0]).respell(word, tr);
