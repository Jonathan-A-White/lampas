import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { approachOf, orderOf } from '../../src/approaches';
import type { BookIndex, Chapter } from '../../src/data/chapter';
import { ideaOf } from '../../src/data/grammar/ladder';
import { passageNeeds, type Level, type PassageNeeds } from '../../src/data/grammar/needs';
import {
  QUESTION_LIMIT,
  answer,
  currentIdea,
  resumePlacement,
  startPlacement,
  summarize,
  type PlacementState,
} from '../../src/data/grammar/placement';
import { answerPlacement, type PlacementWriter } from '../../src/data/grammar/placementWrite';

const fromDisk = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const needs: PassageNeeds = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, fromDisk, index);

const BMA = orderOf(approachOf('bma-tutor')!);
const LADDER_ORDER = orderOf(approachOf('ladder')!);
const NONE = new Map<string, Level>();
const FOUNDATION = ['letters', 'sounds', 'marks'];

const start = (known: Map<string, Level> = NONE, order = BMA): PlacementState => startPlacement(needs, known, order, 7);
const times = (state: PlacementState, right: boolean, n: number): PlacementState => {
  for (let i = 0; i < n; i += 1) state = answer(state, right);
  return state;
};
const idx = (state: PlacementState, id: string): number => state.ideas.indexOf(id);

describe('where the placement starts', () => {
  it('is the first idea past the letters, marks and sounds in the approach sequence, with nothing known', () => {
    // 1 John 1:1 needs the noun before the article, in BMA Tutor's sequence and in the ladder's
    const first = (order: string[]) => order.find((id) => needs.ideas.some((n) => n.id === id) && !FOUNDATION.includes(ideaOf(id).tier));
    expect(first(BMA)).toBe('noun');
    expect(currentIdea(start())).toBe('noun');
    expect(first(LADDER_ORDER)).toBe('noun');
    expect(currentIdea(start(NONE, LADDER_ORDER))).toBe('noun');
  });

  it('walks the needed ideas in the approach order, with the letters, sounds and marks below them', () => {
    const state = start();
    expect(state.ideas).toEqual(expect.arrayContaining(['letter-alpha', 'diphthongs', 'syllables', 'accents', 'noun', 'article']));
    expect(state.ideas).not.toContain('mood-subjunctive');
    expect(state.ideas).not.toContain('case-vocative');
    const order = state.ideas.map((id) => BMA.indexOf(id));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(state.needed).toEqual(expect.arrayContaining(['noun', 'article', 'pronoun-relative']));
  });

  it('with no goal walks the whole ladder', () => {
    const state = startPlacement(null, NONE, BMA, 1);
    expect(state.ideas).toEqual(BMA);
    expect(currentIdea(state)).toBe('noun');
  });

  it('starts after the ideas he already has solid, and skips nothing that is not', () => {
    const known = new Map<string, Level>([['noun', 'solid'], ['article', 'solid'], ['case-accusative', 'solid']]);
    // the accusative is solid but the nominative is not: nothing below the first idea that is not solid is skipped
    expect(currentIdea(start(known))).toBe('case-nominative');
    known.set('case-nominative', 'solid');
    expect(currentIdea(start(known))).toBe('person-1st');
  });

  it('is finished at once when everything from there up is solid', () => {
    const known = new Map<string, Level>(start().ideas.map((id): [string, Level] => [id, 'solid']));
    const state = start(known);
    expect(state.done).toBe('finished');
    expect(currentIdea(state)).toBeNull();
  });
});

describe('answering', () => {
  it('two rights mark the idea solid and move to the next needed idea in the sequence', () => {
    let state = start();
    const first = currentIdea(state)!;
    state = answer(state, true);
    expect(currentIdea(state)).toBe(first);
    expect(state.levels.has(first)).toBe(false);
    state = answer(state, true);
    expect(state.levels.get(first)).toBe('solid');
    expect(currentIdea(state)).toBe(state.ideas[idx(state, first) + 1]);
    expect(currentIdea(state)).toBe('article');
  });

  it('one right marks the idea frontier and moves on', () => {
    let state = start();
    const first = currentIdea(state)!;
    state = answer(answer(state, true), false);
    expect(state.levels.get(first)).toBe('frontier');
    expect(currentIdea(state)).toBe('article');
    state = answer(answer(state, false), true);
    expect(state.levels.get('article')).toBe('frontier');
  });

  it('two wrongs mark the idea not yet and move back', () => {
    let state = start();
    const first = currentIdea(state)!;
    state = times(state, false, 2);
    expect(state.levels.get(first)).toBe('notYet');
    expect(currentIdea(state)).toBe(state.ideas[idx(state, first) - 1]);
    expect(currentIdea(state)).toBe('punctuation');
  });

  it('records every answer in order', () => {
    const state = answer(answer(start(), true), false);
    expect(state.asked).toEqual([{ ideaId: 'noun', right: true }, { ideaId: 'noun', right: false }]);
    expect(state.questionsLeft).toBe(QUESTION_LIMIT - 2);
  });

  it('two idea misses in a row leave every idea later in the sequence untested', () => {
    let state = start();
    state = times(state, false, 4);
    expect(state.levels.get('noun')).toBe('notYet');
    expect(state.levels.get('punctuation')).toBe('notYet');
    // only the ideas asked have a level; nothing above the first miss does
    const later = state.ideas.slice(idx(state, 'noun') + 1);
    expect(later.length).toBeGreaterThan(10);
    expect(later.filter((id) => state.levels.has(id))).toEqual([]);
    // and the walk only goes down from here, even when he gets the next ideas right
    state = times(state, true, 2);
    expect(state.levels.get('iota-subscript')).toBe('solid');
    expect(state.done).toBe('finished');
    expect(later.filter((id) => state.levels.has(id))).toEqual([]);
  });

  it('after one miss and a frontier idea below it, the walk goes up past the missed idea', () => {
    let state = times(start(), false, 2);
    expect(currentIdea(state)).toBe('punctuation');
    state = answer(answer(state, true), false);
    expect(state.levels.get('punctuation')).toBe('frontier');
    expect(currentIdea(state)).toBe('article');
  });

  it('a walk of wrongs reaches a letter idea within the twenty questions', () => {
    let state = start();
    let asked = 0;
    while (currentIdea(state) !== null && ideaOf(currentIdea(state)!).tier !== 'letters') {
      state = answer(state, false);
      asked += 1;
    }
    expect(asked).toBeLessThanOrEqual(QUESTION_LIMIT);
    expect(ideaOf(currentIdea(state)!).tier).toBe('letters');
    expect(currentIdea(state)).toBe('letter-omega');
  });

  it('a wrong walk ends when there is no idea left below', () => {
    let state = startPlacement(null, NONE, BMA, 1);
    for (let i = 0; i < 100 && state.done === null; i += 1) {
      state = answer(state, false);
      if (state.done === 'paused') state = resumePlacement(state);
    }
    expect(state.done).toBe('finished');
    expect(state.levels.get('alphabet')).toBe('notYet');
  });
});

describe('where the placement stops', () => {
  it('a step down onto an idea that is already solid ends it: the ceiling is found', () => {
    const known = new Map<string, Level>([['noun', 'solid'], ['article', 'solid']]);
    let state = start(known);
    expect(currentIdea(state)).toBe('case-nominative');
    state = times(state, false, 2);
    expect(state.levels.get('case-nominative')).toBe('notYet');
    expect(state.done).toBe('finished');
    expect(currentIdea(state)).toBeNull();
    expect(state.levels.get('article')).toBe('solid');
  });

  it('a step down onto an idea that turns out solid ends it too', () => {
    let state = times(start(), false, 2);
    state = times(state, true, 2);
    expect(state.levels.get('punctuation')).toBe('solid');
    expect(state.done).toBe('finished');
  });

  it('the 21st question is not asked: the state is paused', () => {
    let state = start();
    state = times(state, true, QUESTION_LIMIT - 1);
    expect(state.done).toBeNull();
    expect(currentIdea(state)).not.toBeNull();
    state = answer(state, true);
    expect(state.asked).toHaveLength(QUESTION_LIMIT);
    expect(state.done).toBe('paused');
    expect(currentIdea(state)).toBeNull();
    expect(answer(state, true)).toBe(state);
  });

  it('resuming a paused state asks the next question', () => {
    const paused = times(start(), true, QUESTION_LIMIT);
    const idea = paused.ideas[paused.at];
    const state = resumePlacement(paused);
    expect(state.done).toBeNull();
    expect(state.questionsLeft).toBe(QUESTION_LIMIT);
    expect(currentIdea(state)).toBe(idea);
    expect(state.asked).toHaveLength(QUESTION_LIMIT);
    expect(answer(answer(state, true), true).asked).toHaveLength(QUESTION_LIMIT + 2);
  });

  it('does not resume a finished state', () => {
    const finished = times(start(new Map([['noun', 'solid'], ['article', 'solid']])), false, 2);
    expect(resumePlacement(finished)).toBe(finished);
  });
});

describe('summarize', () => {
  it('counts the needed ideas by level and what is untested, and groups them by tier', () => {
    const state = answer(answer(answer(answer(start(), true), true), true), false);
    const sum = summarize(state);
    expect(sum).toMatchObject({ solid: 1, frontier: 1, notYet: 0 });
    expect(sum.untested).toBe(sum.total - 2);
    expect(sum.total).toBe(state.needed.length);
    const nouns = sum.tiers.find((t) => t.tier === 'nouns')!;
    expect(nouns.ideas.find((i) => i.id === 'noun')).toMatchObject({ level: 'solid' });
    expect(nouns.ideas.find((i) => i.id === 'article')).toMatchObject({ level: 'frontier' });
    expect(nouns.ideas.find((i) => i.id === 'case-genitive')).toMatchObject({ level: null });
  });
});

describe('every answer goes on the schedule', () => {
  it('calls the writer once per answer and once per level written', async () => {
    const calls: string[] = [];
    const writer: PlacementWriter = {
      answer: async (id, right) => void calls.push(`answer ${id} ${right}`),
      level: async (id, level) => void calls.push(`level ${id} ${level}`),
      credit: async () => undefined,
    };
    let state = start();
    for (const right of [true, false, false, false]) state = await answerPlacement(state, right, writer);
    expect(calls).toEqual([
      'answer noun true',
      'answer noun false',
      'level noun frontier',
      'answer article false',
      'answer article false',
      'level article notYet',
    ]);
    expect(state.asked).toHaveLength(4);
  });

  it('asks nothing of the writer once the placement is done', async () => {
    const calls: string[] = [];
    const writer: PlacementWriter = { answer: async () => void calls.push('a'), level: async () => void calls.push('l'), credit: async () => void calls.push('c') };
    const done = times(start(), true, QUESTION_LIMIT);
    await answerPlacement(done, true, writer);
    expect(calls).toEqual([]);
  });
});

describe('what his right answers show (mw-hqd5bz.17)', () => {
  const tap = (right: string) => ({ kind: 'tap-form', ideaId: 'noun', form: undefined, right }) as const;
  const ask = (state: PlacementState, right: boolean, form: string) => answer(state, right, tap(form));

  it('lifts a letter to solid, inferred, once three forms read right use it, without asking it', () => {
    let state = start();
    for (const form of ['λόγος', 'ἄνθρωπος']) state = ask(state, true, form);
    expect(state.levels.get('letter-omicron')).toBeUndefined();
    state = ask(state, true, 'θεός');
    state = ask(state, true, 'κόσμος');
    expect(state.levels.get('letter-omicron')).toBe('solid');
    expect(state.inferred).toContain('letter-omicron');
    expect(state.asked.every((a) => !a.ideaId.startsWith('letter-'))).toBe(true);
    expect(summarize(state).tiers.find((t) => t.tier === 'letters')!.ideas.find((i) => i.id === 'letter-omicron')).toMatchObject({ level: 'solid', inferred: true });
  });

  it('steps a miss down to the letters, sounds and marks of the forms missed, not to the whole alphabet', () => {
    let state = ask(ask(start(), false, 'ζωή'), false, 'ὁ');
    expect(state.focus).toEqual(expect.arrayContaining(['letter-zeta', 'letter-omega', 'breathings', 'accents']));
    const seen: string[] = [];
    while (state.done === null) {
      seen.push(currentIdea(state)!);
      state = ask(state, false, 'ζωή');
    }
    expect(seen).not.toContain('alphabet');
    expect(seen).not.toContain('punctuation');
    expect(seen).not.toContain('letter-beta');
    expect(seen).toEqual(expect.arrayContaining(['accents', 'breathings', 'letter-omega', 'letter-zeta']));
  });

  it('passes over a letter of the missed form that is already solid', () => {
    let state = start(new Map<string, Level>([['letter-omega', 'solid'], ['accents', 'solid']]));
    state = ask(ask(state, false, 'ζωή'), false, 'ζωή');
    expect(currentIdea(state)).toBe('letter-eta');
  });

  it('ends a walk down at a needed idea that is solid, however many letters were left', () => {
    let state = start();
    state = ask(ask(state, true, 'ἀρχή'), true, 'ζωή');
    state = ask(ask(state, false, 'λόγος'), false, 'θεός');
    expect(state.done).toBe('finished');
  });

  it('counts a miss on an inferred letter against it', () => {
    let state = start();
    for (const form of ['ξένος', 'ξηρός', 'ξύλον']) state = ask(state, true, form);
    expect(state.levels.get('letter-xi')).toBe('solid');
    state = answer(state, false, { kind: 'letter', ideaId: 'letter-xi', form: undefined, right: 'ξ' });
    expect(state.levels.get('letter-xi')).toBe('frontier');
    expect(state.inferred).not.toContain('letter-xi');
  });

  it('is unchanged when no question is given: it steps down through every idea below', () => {
    const state = times(start(), false, 4);
    expect(currentIdea(state)).toBe('iota-subscript');
    expect(state.focus).toBeNull();
  });

  it('writes the idea its own two answers give, then what the answer showed', async () => {
    const calls: string[] = [];
    const writer: PlacementWriter = {
      answer: async (id, right) => void calls.push(`answer ${id} ${right}`),
      level: async (id, level) => void calls.push(`level ${id} ${level}`),
      credit: async (q, right) => void calls.push(`credit ${q.right} ${right}`),
    };
    let state = start();
    state = await answerPlacement(state, true, writer, tap('λόγος'));
    state = await answerPlacement(state, false, writer, tap('ζωή'));
    expect(calls).toEqual(['answer noun true', 'credit λόγος true', 'answer noun false', 'level noun frontier', 'credit ζωή false']);
    expect(state.asked[0].form).toBe('λόγος');
  });
});
