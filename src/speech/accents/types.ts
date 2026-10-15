// src/speech/accents/types.ts — the shape of an English accent's table of sound hints (mw-5r3p30.352): ./index.ts lists the accents.
import type { SoundId } from '../sounds';

/** How an English reader of one accent hears a standard sound: an English word that has it ('or'), and what to say beside it ('short'), or what to
 * say instead of a word where English has none ('a soft throaty g'). */
export type SoundHint = { word: string; note?: string } | { word?: undefined; note: string };

/** One English accent: a hint for every standard sound, so a Greek pronunciation's lessons are said in words this reader hears right. */
export interface EnglishAccent {
  /** 'american', 'british' */
  id: string;
  /** what a choice of accent will show: 'American' */
  label: string;
  hints: Readonly<Record<SoundId, SoundHint>>;
}
