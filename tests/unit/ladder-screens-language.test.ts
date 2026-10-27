// The ladder screens read the ladder of the language in hand (mw-gdcyf98.10): the chapter's where one is open, else the one chosen language, else the Greek | Hebrew
// segment (src/ui/SourceSegment.tsx); the Greek screens' data is what it was before, and the Hebrew ladder's one idea is the whole of the Hebrew Goal.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { approachOf, DEFAULT_APPROACH, orderOf } from '../../src/approaches';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import { db } from '../../src/data/db';
import { learnNext, learningNow } from '../../src/data/grammar/goalProgress';
import { languageInHand, ladderLangsOf } from '../../src/data/grammar/languageInHand';
import { ladderFor, ideaOfAny } from '../../src/data/grammar/ladders';
import { LADDER, ALWAYS_NEEDED } from '../../src/data/grammar/ladder';
import { learnerGrammarOf, orderedIdeas } from '../../src/data/grammar/learnerGrammar';
import { passageNeeds } from '../../src/data/grammar/needs';
import { answer, startPlacement, summarize } from '../../src/data/grammar/placement';
import { loadChapter } from '../../src/data/chapter';
import { getLevel, otherFrontier, teachIdea } from '../../src/data/repositories';
import { readSourceSegment, writeSourceSegment, SOURCE_SEGMENT_KEY } from '../../src/ui/sourceSegmentStore';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.reviews.clear(), db.grammarLevels.clear(), db.meta.clear(), db.settings.clear()]);
});

describe('the language in hand', () => {
  it('is the chapter\'s where a chapter is open, the one chosen language otherwise, and the segment\'s when both are chosen', () => {
    // a chapter open
    expect(languageInHand({ chapter: 'hbo', languages: 'both', segment: 'grc' })).toBe('hbo');
    expect(languageInHand({ chapter: 'grc', languages: 'both', segment: 'hbo' })).toBe('grc');
    // the one chosen language, whatever the segment holds
    expect(languageInHand({ languages: 'greek', segment: 'hbo' })).toBe('grc');
    expect(languageInHand({ languages: 'hebrew', segment: 'grc' })).toBe('hbo');
    // both chosen: the segment
    expect(languageInHand({ languages: 'both', segment: 'grc' })).toBe('grc');
    expect(languageInHand({ languages: 'both', segment: 'hbo' })).toBe('hbo');
  });

  it('is none at English only, even with a chapter open, and a chapter of a language not chosen does not count', () => {
    expect(languageInHand({ languages: 'english', segment: 'grc' })).toBeNull();
    expect(languageInHand({ chapter: 'hbo', languages: 'english', segment: 'hbo' })).toBeNull();
    expect(languageInHand({ chapter: 'hbo', languages: 'greek', segment: 'hbo' })).toBe('grc');
    expect(ladderLangsOf('english')).toEqual([]);
    expect(ladderLangsOf('greek')).toEqual(['grc']);
    expect(ladderLangsOf('hebrew')).toEqual(['hbo']);
    expect(ladderLangsOf('both')).toEqual(['grc', 'hbo']);
  });

  it('keeps the segment in a setting-less localStorage key, Greek until he chooses', () => {
    expect(SOURCE_SEGMENT_KEY).toBe('lampas.sourceSegment');
    expect(readSourceSegment()).toBe('grc');
    writeSourceSegment('hbo');
    expect(window.localStorage.getItem('lampas.sourceSegment')).toBe('hbo');
    expect(readSourceSegment()).toBe('hbo');
    window.localStorage.setItem('lampas.sourceSegment', 'nonsense');
    expect(readSourceSegment()).toBe('grc');
  });
});

describe('the Greek screens\' data is what it was', () => {
  it('has the same ladder, ideas and titles with the language named or not', async () => {
    expect(ladderFor('grc').ideas).toBe(LADDER);
    expect(ideaOfAny('alphabet')).toBe(ladderFor('grc').ideaOf('alphabet'));
    const levels = new Map([['alphabet', 'frontier' as const]]);
    expect(learningNow(levels)).toEqual(learningNow(levels, 'grc'));
    expect(learningNow(levels)?.id).toBe('alphabet');
    expect(orderedIdeas(undefined, levels)).toEqual(orderedIdeas(undefined, levels, 'grc'));
    expect(orderedIdeas(undefined, levels).map((i) => i.id)).toEqual(LADDER.map((i) => i.id));
  });

  it('works out the same needs and the same placement', async () => {
    const goal = { book: '1jn', chapter: 1, verse: 1 };
    const [plain, named] = await Promise.all([passageNeeds(goal, loadChapter, BOOK_INDEX), passageNeeds(goal, loadChapter, BOOK_INDEX, 'grc')]);
    expect(named).toEqual(plain);
    expect(plain.ideas.slice(0, ALWAYS_NEEDED.length).map((i) => i.id)).toEqual([...ALWAYS_NEEDED]);
    const approach = approachOf(DEFAULT_APPROACH)!;
    const walk = startPlacement(plain, new Map(), orderOf(approach), 3);
    expect(startPlacement(plain, new Map(), orderOf(approach), 3, new Map(), 'grc')).toEqual(walk);
    expect('lang' in walk).toBe(false);
    expect(summarize(walk).tiers[0].tier).toBe('letters');
    const next = learnNext(plain, approach, new Map());
    expect(next?.idea.id).toBe('alphabet');
  });

  it('writes a Greek idea\'s level and schedule row as before', async () => {
    expect(await teachIdea('alphabet', 'got-it')).toEqual({ status: 'taught' });
    expect((await getLevel('alphabet'))?.level).toBe('frontier');
    expect(await db.reviews.count()).toBe(1);
  });
});

describe('the Hebrew ladder on the screens', () => {
  const hebrew = ladderFor('hbo');

  it('holds the 70 ideas of its nine tiers, the alphabet first, found by ideaOfAny', () => {
    expect(hebrew.ideas).toHaveLength(70);
    expect(hebrew.ideas[0].id).toBe('he-alphabet');
    expect(ideaOfAny('he-letter-alef').title).toBe('Alef');
    expect(ideaOfAny('he-alphabet').title).toBe('The Hebrew alphabet');
  });

  it('places at its foundation: the screen finishes the walk at once (no Hebrew question exists yet), every idea untested, and the Greek ladder\'s ideas nowhere in it', () => {
    const walk = startPlacement(null, new Map(), hebrew.ideas.map((i) => i.id), 0, new Map(), 'hbo');
    expect(walk.lang).toBe('hbo');
    expect(walk.ideas).toEqual(hebrew.ideas.map((i) => i.id));
    // the walk would begin at the first idea past the foundation, he-gender: src/HebrewPlacement.tsx ends it there, as the Hebrew ladder has no question to ask (story l)
    expect(walk.ideas[walk.at]).toBe('he-gender');
    const state = { ...walk, done: 'finished' as const };
    const summary = summarize(state);
    expect(summary.tiers.map((t) => t.tier)).toEqual(['letters', 'sounds', 'marks', 'nouns', 'pronouns', 'prepositions', 'verbs', 'joiners', 'sentences']);
    expect(summary.total).toBe(70);
    expect(summary.untested).toBe(70);
    expect(answer(state, true)).toBe(state);
  });

  it('names the Hebrew idea to learn next and, once it is at the frontier, learning now', () => {
    const approach = approachOf(DEFAULT_APPROACH)!;
    const needs = { ideas: [{ id: 'he-alphabet', count: 1, example: { form: '', code: '', ref: '' } }] };
    expect(learnNext(needs, approach, new Map(), undefined, 'hbo')?.idea.id).toBe('he-alphabet');
    expect(learningNow(new Map([['he-alphabet', 'frontier' as const]]), 'hbo')?.id).toBe('he-alphabet');
    expect(learningNow(new Map([['he-alphabet', 'frontier' as const]]), 'grc')).toBeUndefined();
    expect(learnNext(needs, approach, new Map([['he-alphabet', 'frontier' as const]]), undefined, 'hbo')).toBeUndefined();
  });

  it('is told to the tutor in its own titles when the learner\'s grammar is of Hebrew', () => {
    const ideas = orderedIdeas(undefined, new Map([['he-alphabet', 'solid' as const]]), 'hbo');
    expect(ideas).toHaveLength(70);
    expect(ideas[0]).toEqual({ id: 'he-alphabet', title: 'The Hebrew alphabet', level: 'solid' });
    expect(ideas.slice(1).every((i) => i.level === 'notYet')).toBe(true);
    const field = learnerGrammarOf({ goal: null, words: { solid: 0, frontier: 0, notYet: 0 }, ideas, placed: false, move: 'none' as never, pickerLevel: 'any' as never, approach: { name: 'x', credit: null, nextLesson: null } });
    expect(field.ideas.solid).toEqual(['The Hebrew alphabet']);
  });

  it('is taught and marked known with the level written and no review row, and its frontier is its own', async () => {
    expect(await teachIdea('he-alphabet', 'known')).toEqual({ status: 'taught' });
    expect((await getLevel('he-alphabet'))?.level).toBe('solid');
    expect(await db.reviews.count()).toBe(0);
    // a Greek idea at the frontier does not keep a Hebrew one from it, and the other way round
    expect(await teachIdea('alphabet', 'got-it')).toEqual({ status: 'taught' });
    expect(await teachIdea('he-alphabet', 'got-it')).toEqual({ status: 'taught' });
    expect(await otherFrontier('he-alphabet')).toBeUndefined();
    expect(await otherFrontier('alphabet')).toBeUndefined();
    expect((await getLevel('alphabet'))?.level).toBe('frontier');
    expect((await getLevel('he-alphabet'))?.level).toBe('frontier');
  });
});
