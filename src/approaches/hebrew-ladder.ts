// src/approaches/hebrew-ladder.ts — the Hebrew ladder as an approach (mw-5r3p30.914, use case grammar-approach): the Hebrew inventory by rung, one lesson per idea, the tiers as levels, and each Hebrew
// passage lesson (HEBREW_PASSAGE_LESSONS) standing right after the lesson of its last idea. PROVISIONAL, the Governor to confirm: the order is the Hebrew ladder's own, which opens as the grammar he pinned
// (Biblical Hebrew Step by Step, mw-5r3p30.890) does, with the alphabet; the catalogue maps no later lesson of that book yet (data/logos/catalogue-rules.json), so no other order of it is followed.
import { HEBREW_LADDER, HEBREW_PASSAGE_LESSONS, HEBREW_TIERS } from '../data/grammar/hebrew/ladder';
import { TIER_TITLES } from './ladder';
import type { ApproachLesson, GrammarApproach } from './types';

const lastIdeaAt = (lesson: ApproachLesson): number => Math.max(...lesson.ideas.map((id) => HEBREW_LADDER.findIndex((i) => i.id === id)));

export const hebrewLadder: GrammarApproach = {
  id: 'hebrew-ladder',
  lang: 'hbo',
  name: 'Lampas Hebrew ladder',
  credit: null,
  method:
    'Easiest first: the letters, the vowel points and the marks, then nouns, pronouns, prepositions, verbs and the joining words, and last the sentences: what the words do together. Every idea rests only on ideas below it. A lesson is one idea: read it, see it in a verse of Genesis or Jonah, then answer on the back-off schedule until it holds. Jonah 1:1-3 is read once the ideas it uses are known.',
  stages: [
    {
      title: 'The Hebrew ladder',
      levels: HEBREW_TIERS.map((tier) => ({
        title: TIER_TITLES[tier],
        lessons: HEBREW_LADDER.flatMap((idea, at): ApproachLesson[] =>
          idea.tier === tier ? [{ title: idea.title, ideas: [idea.id] }, ...HEBREW_PASSAGE_LESSONS.filter((p) => lastIdeaAt(p) === at)] : [],
        ),
      })).filter((level) => level.lessons.length > 0),
    },
  ],
};
