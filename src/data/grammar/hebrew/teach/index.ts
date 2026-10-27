// src/data/grammar/hebrew/teach/index.ts — the Hebrew cards' teaching, by Hebrew ladder idea id (mw-gdcyf98.9, .11): the same Teach shape as the Greek cards (src/data/grammar/teach), written so a total
// beginner learns the idea from the card alone. One file per tier beside this one: letters.ts, sounds.ts, marks.ts; story 12 adds the grammar tiers'.
import { HEBREW_LADDER } from '../ladder';
import type { Teach } from '../../teach/types';
import { LETTERS_TEACH } from './letters';
import { MARKS_TEACH } from './marks';
import { SOUNDS_TEACH } from './sounds';

export const HEBREW_TEACH: Readonly<Record<string, Teach>> = { ...LETTERS_TEACH, ...SOUNDS_TEACH, ...MARKS_TEACH };

for (const id of Object.keys(HEBREW_TEACH)) if (!HEBREW_LADDER.some((i) => i.id === id)) throw new Error(`Teaching for ${JSON.stringify(id)}, which the Hebrew ladder has not`);
