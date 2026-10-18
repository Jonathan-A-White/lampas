// src/approaches/ladder.ts — the Lampas ladder as an approach: the inventory by rung, one lesson per idea, the tiers as levels.
import { LADDER, TIERS, type Tier } from '../data/grammar/ladder';
import { JOHN_LESSONS } from './john-lessons';
import type { GrammarApproach } from './types';

/** The tier's name as the ladder approach and the Paradigms list say it. */
export const TIER_TITLES: Record<Tier, string> = {
  letters: 'Letters',
  sounds: 'Sounds',
  marks: 'Marks',
  nouns: 'Nouns',
  pronouns: 'Pronouns',
  prepositions: 'Prepositions',
  verbs: 'Verbs',
  joiners: 'Joining words',
  sentences: 'Sentences',
};

export const ladder: GrammarApproach = {
  id: 'ladder',
  name: 'Lampas ladder',
  credit: null,
  method:
    'Easiest first: letters, sounds and marks, then nouns, pronouns, prepositions, verbs and the joining words, and last the sentences: what the words do together. Every idea rests only on ideas below it, so nothing is met before what it needs. A lesson is one idea: read it, see it in a verse, then answer on the back-off schedule until it holds. The last lessons read the letters of John, a passage each.',
  stages: [
    {
      title: 'The ladder',
      levels: TIERS.map((tier) => ({
        title: TIER_TITLES[tier],
        lessons: LADDER.filter((i) => i.tier === tier).map((i) => ({ title: i.title, ideas: [i.id] })),
      })),
    },
    // the last stage reads: each lesson has him read a passage once the ideas it uses are at least frontier (mw-z370x5.1); its ideas are revisits, so the order of the ideas stays the rung order
    { title: 'Reading', levels: [{ title: 'Reading the letters of John', lessons: JOHN_LESSONS }] },
  ],
};
