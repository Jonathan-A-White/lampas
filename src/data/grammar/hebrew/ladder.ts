// src/data/grammar/hebrew/ladder.ts — the Hebrew grammar ladder (mw-gdcyf98.9, PROVISIONAL, docs/grammar.md 'The Hebrew ladder'): the ideas of Biblical Hebrew a reader of the
// Old Testament meets, easy first, in the shape of the Greek ladder (src/data/grammar/ladder.ts: the same GrammarIdea, the same tiers) and one door away from it
// (ladders.ts ladderFor('hbo')). It holds one idea to start, the alphabet; stories g and h add the ideas of the other tiers. Every id starts 'he-' so a grammar
// level, a review row and a drill plan of a Hebrew idea never collide with a Greek one, and an id, once shipped, is not renamed. Pure: no store and no screen.
import type { GrammarIdea, Tier } from '../ladder';
import { makePath } from '../pathGraph';

/** The prefix of every Hebrew idea id. */
export const HEBREW_ID_PREFIX = 'he-';

/** Whether an idea id is a Hebrew idea's. */
export const isHebrewIdeaId = (id: string): boolean => id.startsWith(HEBREW_ID_PREFIX);

/** The Hebrew ladder's tiers, in order (PROVISIONAL): the Greek ladder's names, each Hebrew idea in the one that suits it. */
export const HEBREW_TIERS: readonly Tier[] = ['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences'];

/** The tiers a reader meets first, the foundation of a placement (the Greek ladder's are the same three). */
export const HEBREW_FOUNDATION_TIERS: readonly Tier[] = ['letters', 'sounds', 'marks'];

/** The ideas every Hebrew word needs, in ladder order (the Greek ALWAYS_NEEDED): the alphabet to start. */
export const HEBREW_ALWAYS_NEEDED: readonly string[] = ['he-alphabet'];

type Def = Omit<GrammarIdea, 'rung' | 'level'>;

const def = (id: string, tier: Tier, title: string, needs: string[], text: string): Def => ({ id, tier, title, terms: [], needs, text });

const DEFS: Def[] = [
  def(
    'he-alphabet',
    'letters',
    'The Hebrew alphabet',
    [],
    'Hebrew has 22 letters, and all of them are consonants. It is written and read from right to left, so the first letter of a word is the one on the right. Each letter has a name, such as aleph and bet, and five of them take a second shape at the end of a word. Learn the letters first: every word of the Old Testament is built from them.',
  ),
];

/** The Hebrew ladder, easy first. */
export const HEBREW_LADDER: readonly GrammarIdea[] = DEFS.map((d, i) => ({ ...d, rung: i + 1, level: i + 1 }));

/** The Hebrew ladder as a path (pathGraph.ts): makePath throws, naming it, on an idea listed twice, a need that is no idea, a need of a higher rung or a cycle. */
export const HEBREW_PATH = makePath(HEBREW_LADDER);

for (const idea of HEBREW_LADDER) if (!isHebrewIdeaId(idea.id)) throw new Error(`Hebrew idea ${JSON.stringify(idea.id)} does not start ${JSON.stringify(HEBREW_ID_PREFIX)}`);
