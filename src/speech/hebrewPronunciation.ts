// src/speech/hebrewPronunciation.ts — how Hebrew is spoken, as a registry like the Greek's (src/speech/pronunciation.ts): another way to say it is one more file in ./schemes/
// plus one line in HEBREW_PRONUNCIATIONS below. Israeli is the only scheme for now and nothing outside this registry names it. docs/pronunciation.md says how to add one.
import { ISRAELI } from './schemes/hebrew-israeli';

/** The id of a scheme in the registry. */
export type HebrewPronunciationId = string;

export interface HebrewPronunciation {
  id: HebrewPronunciationId;
  /** what a list of the schemes shows */
  label: string;
  /** the language tag put on every utterance, and the language of the voices for it */
  lang: string;
  /** one line on how it says the text */
  note: string;
  /** what the scheme's voice is handed for any Hebrew text (a held word, a verse read aloud): the text as the voice says it */
  voiceForm(text: string): string;
}

export const HEBREW_PRONUNCIATIONS: readonly HebrewPronunciation[] = [ISRAELI];

export const DEFAULT_HEBREW_PRONUNCIATION: HebrewPronunciationId = ISRAELI.id;

/** The scheme with this id; the default when there is none or the registry does not hold it. */
export function hebrewPronunciationOf(id?: HebrewPronunciationId): HebrewPronunciation {
  return HEBREW_PRONUNCIATIONS.find((p) => p.id === id) ?? ISRAELI;
}

/** What the voice is handed for Hebrew `text`, in the chosen scheme (there is no setting to choose another yet: the default's). */
export const hebrewVoiceForm = (text: string): string => hebrewPronunciationOf(DEFAULT_HEBREW_PRONUNCIATION).voiceForm(text);
