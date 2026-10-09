// src/approaches/ladder.ts — the Lampas ladder as an approach: the inventory by rung, one lesson per idea, the tiers as levels.
import { LADDER, TIERS, type Tier } from '../data/grammar/ladder';
import type { GrammarApproach } from './types';

const TIER_TITLES: Record<Tier, string> = {
  letters: 'Letters',
  sounds: 'Sounds',
  marks: 'Marks',
  nouns: 'Nouns',
  pronouns: 'Pronouns',
  prepositions: 'Prepositions',
  verbs: 'Verbs',
  joiners: 'Joining words',
};

export const ladder: GrammarApproach = {
  id: 'ladder',
  name: 'Lampas ladder',
  credit: null,
  method:
    'Easiest first: letters, sounds and marks, then nouns, pronouns, prepositions, verbs and the joining words. Every idea rests only on ideas below it, so nothing is met before what it needs. A lesson is one idea: read it, see it in a verse, then answer on the back-off schedule until it holds.',
  stages: [
    {
      title: 'The ladder',
      levels: TIERS.map((tier) => ({
        title: TIER_TITLES[tier],
        lessons: LADDER.filter((i) => i.tier === tier).map((i) => ({ title: i.title, ideas: [i.id] })),
      })),
    },
  ],
};
