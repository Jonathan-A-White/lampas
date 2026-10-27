// src/data/grammar/hebrew/teach/index.ts — the Hebrew cards' teaching, by Hebrew ladder idea id (mw-gdcyf98.9, .11): the same Teach shape as the Greek cards (src/data/grammar/teach), written so a total
// beginner learns the idea from the card alone. One file per tier beside this one: letters.ts, sounds.ts, marks.ts, and (mw-gdcyf98.12) the grammar tiers': nouns.ts, pronouns.ts, prepositions.ts, verbs.ts, joiners.ts, sentences.ts.
import { HEBREW_LADDER } from '../ladder';
import type { Teach } from '../../teach/types';
import { LETTERS_TEACH } from './letters';
import { JOINERS_TEACH } from './joiners';
import { MARKS_TEACH } from './marks';
import { NOUNS_TEACH } from './nouns';
import { PREPOSITIONS_TEACH } from './prepositions';
import { PRONOUNS_TEACH } from './pronouns';
import { SENTENCES_TEACH } from './sentences';
import { SOUNDS_TEACH } from './sounds';
import { VERBS_TEACH } from './verbs';

export const HEBREW_TEACH: Readonly<Record<string, Teach>> = {
  ...LETTERS_TEACH,
  ...SOUNDS_TEACH,
  ...MARKS_TEACH,
  ...NOUNS_TEACH,
  ...PRONOUNS_TEACH,
  ...PREPOSITIONS_TEACH,
  ...VERBS_TEACH,
  ...JOINERS_TEACH,
  ...SENTENCES_TEACH,
};

for (const id of Object.keys(HEBREW_TEACH)) if (!HEBREW_LADDER.some((i) => i.id === id)) throw new Error(`Teaching for ${JSON.stringify(id)}, which the Hebrew ladder has not`);
