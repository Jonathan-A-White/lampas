// src/data/grammar/ladders.ts — the one door to a grammar ladder (mw-gdcyf98.9): ladderFor('grc') is the Greek ladder (ladder.ts, unchanged behind it),
// ladderFor('hbo') the Hebrew one (hebrew/ladder.ts). A ladder answers with its ideas, tiers, teach cards, grammar terms, the foundation a placement
// walks first and the ideas a word needs. Every Hebrew idea id starts 'he-' (ladderLangOf), so a level, a review row and a drill plan never collide
// with a Greek one. The bridge enum of the built grinds stays the Greek ladder's (grind-build.ts, bridge.ts). The Goal, Placement, Drill it and the idea sheet read the
// ladder of the language in hand (languageInHand.ts, mw-gdcyf98.10; an idea's own language is ladderLangOf): a consumer that reads LADDER directly is Greek by name.
import { GRAMMAR_TERMS } from '../parseCode';
import { ALWAYS_NEEDED, LADDER, LADDER_PATH, TIERS, ideaOf as greekIdeaOf, ideaOfTerm as greekIdeaOfTerm, ideasOf as greekIdeasOf, ideasOfWord as greekIdeasOfWord, type GrammarIdea, type Tier } from './ladder';
import { HEBREW_ALWAYS_NEEDED, HEBREW_FOUNDATION_TIERS, isHebrewIdeaId, HEBREW_LADDER, HEBREW_PATH, HEBREW_TIERS } from './hebrew/ladder';
import { HEBREW_TEACH } from './hebrew/teach';
import { HEBREW_TERMS, hebrewIdeaOfTerm } from './hebrew/terms';
import { GREEK_TEACH } from './teach';
import type { Teach } from './teach/types';
import type { Path } from './pathGraph';

/** The languages that have a ladder: Koine Greek and Biblical Hebrew (ISO 639-3). */
export const LADDER_LANGS = ['grc', 'hbo'] as const;
export type LadderLang = (typeof LADDER_LANGS)[number];

/** What a ladder answers. */
export interface LadderOf {
  lang: LadderLang;
  /** every idea, easy first */
  ideas: readonly GrammarIdea[];
  tiers: readonly Tier[];
  /** the ideas as a path (pathGraph.ts): what each needs, the frontier, the depth */
  path: Path<GrammarIdea>;
  /** every card's teaching, by idea id */
  teach: Readonly<Record<string, Teach>>;
  /** the grammar terms the ladder's ideas cover: GRAMMAR_TERMS for Greek, the Hebrew parsing terms (hebrew/terms.ts) for Hebrew */
  terms: readonly string[];
  /** the id of the idea that covers a term, or undefined for a word that is no term of this ladder */
  ideaOfTerm(term: string): string | undefined;
  /** the tiers a placement walks first */
  foundationTiers: readonly Tier[];
  /** the ideas every word needs and every goal needs, in ladder order (Greek ALWAYS_NEEDED) */
  foundation: readonly string[];
  /** the idea with this id; throws on one the ladder lacks */
  ideaOf(id: string): GrammarIdea;
  /** the ids of the ideas a word with this parsing code needs, sorted by rung; none for Hebrew until its words carry a code */
  ideasOf(code: string): string[];
  /** the ids of the ideas a word of the text needs, sorted by rung */
  ideasOfWord(word: { l: string; p: string; t?: string }): string[];
}

const GREEK: LadderOf = {
  lang: 'grc',
  ideas: LADDER,
  path: LADDER_PATH,
  tiers: TIERS,
  teach: GREEK_TEACH,
  terms: GRAMMAR_TERMS,
  ideaOfTerm: greekIdeaOfTerm,
  foundationTiers: ['letters', 'sounds', 'marks'],
  foundation: ALWAYS_NEEDED,
  ideaOf: greekIdeaOf,
  ideasOf: greekIdeasOf,
  ideasOfWord: greekIdeasOfWord,
};

const HEBREW: LadderOf = {
  lang: 'hbo',
  ideas: HEBREW_LADDER,
  path: HEBREW_PATH,
  tiers: HEBREW_TIERS,
  teach: HEBREW_TEACH,
  terms: HEBREW_TERMS,
  ideaOfTerm: hebrewIdeaOfTerm,
  foundationTiers: HEBREW_FOUNDATION_TIERS,
  foundation: HEBREW_ALWAYS_NEEDED,
  ideaOf(id) {
    const idea = HEBREW_PATH.byId.get(id);
    if (!idea) throw new Error(`Unknown grammar idea: ${JSON.stringify(id)}`);
    return idea;
  },
  // stories g and h give a Hebrew word its ideas; until then no word needs one (its parsing's terms are tied to ideas already: terms.ts)
  ideasOf: () => [],
  ideasOfWord: () => [],
};

const LADDERS: Readonly<Record<LadderLang, LadderOf>> = { grc: GREEK, hbo: HEBREW };

/** The ladder of a language. */
export const ladderFor = (lang: LadderLang): LadderOf => LADDERS[lang];

/** The language whose ladder an idea id belongs to: a Hebrew idea's id starts 'he-'. */
export const ladderLangOf = (ideaId: string): LadderLang => (isHebrewIdeaId(ideaId) ? 'hbo' : 'grc');

/** The idea with this id, from the ladder of its own language: a Greek id from the Greek ladder, a 'he-' id from the Hebrew one; throws on one that ladder lacks. */
export const ideaOfAny = (id: string): GrammarIdea => ladderFor(ladderLangOf(id)).ideaOf(id);
