// src/speech/accents/ipa.ts — IPA, the standard, as one more accent (mw-5r3p30.353, his words: "the user is more advanced he knows the standard to be an
// option so they can serve American British"): no English key word at all, each sound is shown by its own standard id. Made from the inventory
// (src/speech/sounds.ts), not written out, so a new sound needs nothing here: this is the accent the other tables are measured against.
import { SOUND_IDS, type SoundId } from '../sounds';
import type { EnglishAccent, SoundHint } from './types';

export const IPA: EnglishAccent = {
  id: 'ipa',
  label: 'IPA (the standard)',
  hintedBy: 'by its IPA symbol, with no English word',
  hints: Object.fromEntries(SOUND_IDS.map((id): [SoundId, SoundHint] => [id, { note: id }])) as Record<SoundId, SoundHint>,
};
