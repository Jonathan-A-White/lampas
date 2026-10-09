// learner_grammar: where his grammar stands, in at most 900 bytes, for the two tutor grinds (mw-hqd5bz.12).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { LADDER } from '../../src/data/grammar/ladder';
import { moveFor } from '../../src/data/grammar/move';
import {
  GRAMMAR_TITLES_MAX,
  LEARNER_GRAMMAR_MAX_BYTES,
  learnerGrammar,
  learnerGrammarOf,
  type GrammarSnapshot,
} from '../../src/data/grammar/learnerGrammar';
import { setGoal, setGrammarApproach, setPickerGrammar, pushGrammarAnswer } from '../../src/data/repositories/settings';
import { setLevel } from '../../src/data/repositories/grammarLevels';
import { stubChapterFetch } from '../support/chapter-fetch';

const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;
const many = (level: 'solid' | 'frontier' | 'notYet', title: (i: number) => string) =>
  Array.from({ length: 40 }, (_, i) => ({ id: `${level}-${i}`, title: title(i), level }));

const snapshot = (over: Partial<GrammarSnapshot> = {}): GrammarSnapshot => ({
  goal: 'Read 1 John 1:1',
  words: { solid: 3, frontier: 2, notYet: 9 },
  ideas: [],
  placed: true,
  move: 'none',
  pickerLevel: 'frontier',
  approach: { name: 'BMA Tutor', credit: 'Biblical Mastery Academy', nextLesson: 'The nominative' },
  ...over,
});

describe('learnerGrammarOf', () => {
  it('caps the titles at 12 a list and keeps them in the order given (the goal\'s needs come first)', () => {
    const ideas = [...many('solid', (i) => `Solid ${i}`), ...many('frontier', (i) => `Frontier ${i}`), ...many('notYet', (i) => `Not yet ${i}`)];
    const out = learnerGrammarOf(snapshot({ ideas }));
    expect(GRAMMAR_TITLES_MAX).toBe(12);
    expect(out.ideas.solid).toEqual(Array.from({ length: 12 }, (_, i) => `Solid ${i}`));
    expect(out.ideas.frontier).toEqual(Array.from({ length: 12 }, (_, i) => `Frontier ${i}`));
    expect(out.ideas.not_yet).toEqual(Array.from({ length: 12 }, (_, i) => `Not yet ${i}`));
    expect(out.words).toEqual({ solid: 3, frontier: 2, not_yet: 9 });
  });

  it('is under 900 bytes as JSON with 40 ideas at each level, even with long titles', () => {
    for (const title of [(i: number) => `The idea ${i}`, (i: number) => `A long title for grammar idea number ${i}`.padEnd(42, 'x')]) {
      const ideas = [...many('solid', title), ...many('frontier', title), ...many('notYet', title)];
      const out = learnerGrammarOf(snapshot({ ideas }));
      expect(LEARNER_GRAMMAR_MAX_BYTES).toBe(900);
      expect(bytes(out)).toBeLessThanOrEqual(900);
      expect(out.ideas.frontier.length).toBeGreaterThan(0);
    }
  });

  it('carries the goal, whether he is placed, the picker level and the approach', () => {
    const out = learnerGrammarOf(snapshot({ move: 'up', placed: false, pickerLevel: 'solid' }));
    expect(out).toMatchObject({ goal: 'Read 1 John 1:1', placed: false, suggested_move: 'up', picker_level: 'solid' });
    expect(out.approach).toEqual({ name: 'BMA Tutor', credit: 'Biblical Mastery Academy', next_lesson: 'The nominative' });
  });
});

describe('learnerGrammar', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.words.clear(), db.settings.clear(), db.grammarLevels.clear(), db.meta.clear()]);
    stubChapterFetch();
  });
  afterAll(() => db.close());

  it('with no goal: goal is null and the ideas are the whole ladder\'s, every idea not yet when none has a level', async () => {
    const out = await learnerGrammar();
    expect(out.goal).toBeNull();
    expect(out.placed).toBe(false);
    expect(out.ideas.solid).toEqual([]);
    expect(out.ideas.frontier).toEqual([]);
    expect(out.ideas.not_yet).toEqual(LADDER.slice(0, 12).map((i) => i.title));
    expect(bytes(out)).toBeLessThanOrEqual(900);
  });

  it('names the approach BMA Tutor with its credit and the title of its next lesson', async () => {
    const out = await learnerGrammar();
    expect(out.approach.name).toBe('BMA Tutor');
    expect(out.approach.credit).toBe('Biblical Mastery Academy');
    expect(typeof out.approach.next_lesson).toBe('string');
    await setGrammarApproach('ladder');
    expect((await learnerGrammar()).approach.name).not.toBe('BMA Tutor');
  });

  it('with a goal: its title, the goal\'s needs first in each list, then by rung', async () => {
    await setGoal('Read 1 John 1:1');
    const out = await learnerGrammar();
    expect(out.goal).toBe('Read 1 John 1:1');
    // the goal's own ideas head the not-yet list; the ladder alone would put the letters (Alpha, Beta ...) next
    expect(out.ideas.not_yet.slice(0, 3)).toEqual(['The Greek alphabet', 'Breathing marks', 'Accents and stress']);
    expect(out.ideas.not_yet[3]).not.toBe('Alpha');
    expect(out.words.solid + out.words.frontier + out.words.not_yet).toBeGreaterThan(0);
  });

  it('puts an idea in the list of its level, and counts words by state', async () => {
    await setGoal('Read 1 John 1:1');
    await setLevel('case-genitive', 'frontier', 'sheet');
    await setLevel('case-nominative', 'solid', 'sheet');
    await db.words.bulkPut([
      { lemma: 'θεός', lemmas: [], gloss: 'God', lesson: 0, state: 'solid', since: 0 },
      { lemma: 'λόγος', lemmas: [], gloss: 'word', lesson: 0, state: 'learning', since: 0 },
    ]);
    const out = await learnerGrammar();
    expect(out.ideas.frontier).toContain('The genitive case');
    expect(out.ideas.solid).toContain('The nominative case');
    expect(out.ideas.not_yet).not.toContain('The genitive case');
  });

  it('suggests the move moveFor gives, for the picker level he has', async () => {
    await setPickerGrammar('solid');
    for (let i = 0; i < 20; i++) await pushGrammarAnswer(true);
    expect(moveFor('solid', Array(20).fill(true))).toBe('up');
    const out = await learnerGrammar();
    expect(out).toMatchObject({ suggested_move: 'up', picker_level: 'solid' });
    await setPickerGrammar('frontier');
    expect(await learnerGrammar()).toMatchObject({ suggested_move: 'none', picker_level: 'frontier' });
  });
});
